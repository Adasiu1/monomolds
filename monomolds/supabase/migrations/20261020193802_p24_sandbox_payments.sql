alter table public.checkout_rate_limits drop constraint checkout_rate_limits_operation_check;
alter table public.checkout_rate_limits add constraint checkout_rate_limits_operation_check
  check (operation in ('quote','checkout','status','status_link','payment'));

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null default 'przelewy24' check (provider = 'przelewy24'),
  session_id uuid not null unique default gen_random_uuid(),
  status text not null default 'created' check (status in ('created','pending','paid','failed','cancelled','expired')),
  amount integer not null check (amount > 0),
  currency text not null check (currency = 'PLN'),
  provider_token text,
  provider_order_id bigint unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  updated_at timestamptz not null default now()
);
create index payment_attempts_order_idx on public.payment_attempts(order_id, created_at desc);
create unique index payment_attempts_active_order_idx on public.payment_attempts(order_id) where status in ('created','pending');
alter table public.payment_attempts enable row level security;
revoke all on public.payment_attempts from public, anon, authenticated;
grant select, insert, update on public.payment_attempts to service_role;

-- Retain only signed notification fields, never customer details or provider credentials.
alter table public.payment_events add column attempt_id uuid references public.payment_attempts(id),
  add column updated_at timestamptz not null default now();
revoke all on public.payment_events from public, anon, authenticated;
grant select, insert, update on public.payment_events to service_role;

create function public.prepare_guest_payment(p_guest_token_hash text, p_phone text, p_request_fingerprint text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.orders%rowtype; a public.payment_attempts%rowtype; fresh boolean := false;
begin
  perform private.commerce_rate_limit('payment', p_request_fingerprint, 15, interval '10 minutes');
  select * into o from public.orders where guest_token_hash = p_guest_token_hash
    and phone = regexp_replace(p_phone, '\D', '', 'g') for update;
  if not found then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.status not in ('pending_payment','expired') or exists (
    select 1 from public.payment_events where order_id = o.id and status = 'review_required'
  ) then raise exception 'PAYMENT_NOT_ALLOWED'; end if;
  if exists (select 1 from public.payment_events where order_id = o.id and status = 'received') then
    raise exception 'PAYMENT_PENDING';
  end if;
  select * into a from public.payment_attempts where order_id = o.id and status in ('created','pending') for update;
  if not found then
    if exists (select 1 from public.payment_attempts where order_id = o.id and status = 'paid') then
      raise exception 'PAYMENT_NOT_ALLOWED';
    end if;
    insert into public.payment_attempts(order_id, amount, currency) values(o.id, o.total, o.currency) returning * into a;
    fresh := true;
    update public.orders set status = 'pending_payment', updated_at = now() where id = o.id;
  end if;
  return jsonb_build_object('attempt', to_jsonb(a), 'fresh', fresh, 'email', o.email,
    'orderNumber', 'MON-' || lpad(o.order_number::text, 6, '0'));
end;
$$;

create function public.complete_verified_payment(p_attempt_id uuid, p_provider_order_id bigint)
returns text language plpgsql security definer set search_path = '' as $$
declare a public.payment_attempts%rowtype; o public.orders%rowtype; event_id uuid; outcome text;
begin
  -- Lock the order first everywhere to serialize different attempts for the same order.
  select o2.* into o from public.orders o2 join public.payment_attempts a2 on a2.order_id = o2.id
    where a2.id = p_attempt_id for update of o2;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  select * into a from public.payment_attempts where id = p_attempt_id for update;
  select id into event_id from public.payment_events where attempt_id = a.id
    and provider = 'przelewy24' and provider_event_id = p_provider_order_id::text for update;
  if not found then raise exception 'PAYMENT_EVENT_NOT_FOUND'; end if;
  if exists (select 1 from public.payment_events where id = event_id and status in ('verified','review_required')) then
    return 'already_applied';
  end if;
  if a.provider_order_id is not null and a.provider_order_id <> p_provider_order_id then raise exception 'PAYMENT_MISMATCH'; end if;
  outcome := case when o.status in ('pending_payment','expired') and not exists (
    select 1 from public.payment_attempts where order_id = o.id and status = 'paid' and id <> a.id
  ) then 'verified' else 'review_required' end;
  -- A late verified payment is authoritative even after local expiry.
  update public.payment_attempts set status = 'paid', provider_order_id = p_provider_order_id, updated_at = now() where id = a.id;
  if outcome = 'verified' then
    update public.orders set status = 'paid', updated_at = now() where id = o.id;
    update public.payment_attempts set status = 'cancelled', updated_at = now()
      where order_id = o.id and id <> a.id and status in ('created','pending');
    -- Expiry may already have released this reservation. An actual payment still consumes it.
    update public.discount_redemptions set state = 'consumed', consumed_at = now(), released_at = null
      where order_id = o.id and state in ('reserved','released');
  end if;
  update public.payment_events set status = outcome, updated_at = now() where id = event_id;
  return outcome;
end;
$$;
revoke all on function public.prepare_guest_payment(text,text,text) from public, anon, authenticated;
revoke all on function public.complete_verified_payment(uuid,bigint) from public, anon, authenticated;
grant execute on function public.prepare_guest_payment(text,text,text) to service_role;
grant execute on function public.complete_verified_payment(uuid,bigint) to service_role;

-- Allow bounded status polling after guest authorization.
create or replace function public.get_guest_order_status(
  p_guest_token_hash text,
  p_phone text,
  p_request_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  perform private.commerce_rate_limit('status', p_request_fingerprint, 120, interval '10 minutes');
  select jsonb_build_object(
    'orderNumber', 'MON-' || lpad(o.order_number::text, 6, '0'), 'status', o.status,
    'createdAt', o.created_at, 'totalGrosze', o.total, 'currency', o.currency,
    'invoiceRequested', o.invoice_requested,
    'items', (select jsonb_agg(jsonb_build_object(
      'name', i.name, 'quantity', i.quantity, 'unitPriceGrosze', i.unit_price,
      'lineTotalGrosze', i.line_total, 'isGift', i.is_gift
    ) order by i.id) from public.order_items i where i.order_id = o.id),
    'delivery', jsonb_build_object(
      'method', d.method, 'pointId', d.point_id, 'city', d.city, 'priceGrosze', d.price
    )
  ) into result
  from public.orders o join public.order_deliveries d on d.order_id = o.id
  where o.guest_token_hash = p_guest_token_hash
    and o.phone = regexp_replace(p_phone, '\D', '', 'g');
  if result is null then raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND'; end if;
  return result;
end;
$$;

