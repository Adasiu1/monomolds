alter table public.discounts
  add column valid_from timestamptz,
  add column valid_until timestamptz,
  add column min_subtotal_grosze integer not null default 0,
  add column max_uses_per_email integer default 1;

update public.discounts set code = upper(btrim(code));

alter table public.discounts
  drop constraint discounts_code_key,
  drop constraint discounts_type_check,
  drop constraint discounts_value_check,
  add constraint discounts_code_normalized_check check (code = upper(btrim(code)) and code <> ''),
  add constraint discounts_type_check check (type = 'percentage'),
  add constraint discounts_value_check check (value between 1 and 99),
  add constraint discounts_validity_check check (valid_until is null or valid_from is null or valid_until > valid_from),
  add constraint discounts_min_subtotal_check check (min_subtotal_grosze >= 0),
  add constraint discounts_max_uses_check check (max_uses_per_email is null or max_uses_per_email > 0);

create unique index discounts_normalized_code_key on public.discounts (upper(btrim(code)));

insert into public.products (id, type, slug, name, description, price, currency, stock_quantity, status)
values (
  '00000000-0000-0000-0000-000000000006', 'product', 'forma-serce-100-ml',
  'Forma Serce 100 ml', 'Forma silikonowa Serce o pojemności 100 ml.', 4000, 'PLN', 0, 'published'
)
on conflict (id) do nothing;

update public.products set bundle_product_id = '00000000-0000-0000-0000-000000000001'
where id = '00000000-0000-0000-0000-000000000021' and type = 'bundle_item' and bundle_product_id is null;
update public.products set bundle_product_id = '00000000-0000-0000-0000-000000000006'
where id = '00000000-0000-0000-0000-000000000022' and type = 'bundle_item' and bundle_product_id is null;

alter table public.products
  add constraint products_bundle_item_reference_check
  check (type <> 'bundle_item' or bundle_product_id is not null);

alter table public.checkout_quotes add column discount_code text;

alter table public.orders
  add column discount_type text,
  add column discount_percentage integer,
  add column discount_rule_version text,
  add constraint orders_discount_snapshot_check check (
    (discount_code is null and discount_type is null and discount_percentage is null and discount_rule_version is null)
    or
    (discount_code is not null and discount_type = 'percentage' and discount_percentage between 1 and 99 and discount_rule_version is not null)
  );

create table public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  normalized_email text not null check (normalized_email = lower(btrim(normalized_email)) and normalized_email <> ''),
  state text not null check (state in ('reserved', 'consumed', 'released')),
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  constraint discount_redemptions_state_timestamps_check check (
    (state = 'reserved' and consumed_at is null and released_at is null)
    or (state = 'consumed' and consumed_at is not null and released_at is null)
    or (state = 'released' and released_at is not null)
  )
);

create index discount_redemptions_discount_email_state_idx
  on public.discount_redemptions (discount_id, normalized_email, state);
create index discount_redemptions_discount_id_idx on public.discount_redemptions (discount_id);

alter table public.discount_redemptions enable row level security;
revoke all on public.discounts, public.discount_redemptions from anon, authenticated;
grant all on public.discounts, public.discount_redemptions to service_role;

drop function public.create_checkout_quote(jsonb,jsonb,text,text);

create or replace function private.commerce_apply_code_discount(
  p_items jsonb,
  p_amount integer
) returns jsonb
language sql
immutable
set search_path = ''
as $$
  with expanded as (
    select item_position, component_position, item, component,
      (component->>'paidAmountGrosze')::integer as paid_amount,
      sum((component->>'paidAmountGrosze')::integer) over () as total_paid
    from jsonb_array_elements(p_items) with ordinality as item_rows(item, item_position)
    cross join lateral jsonb_array_elements(item->'components') with ordinality as component_rows(component, component_position)
  ), floored as (
    select *,
      floor(p_amount::numeric * paid_amount / total_paid)::integer as allocation,
      mod(p_amount::bigint * paid_amount, total_paid) as remainder
    from expanded
  ), ranked as (
    select *,
      row_number() over (order by remainder desc, component->>'merchandiseId', item_position, component_position) as allocation_rank,
      p_amount - sum(allocation) over () as pennies_left
    from floored
  ), allocated as (
    select *, allocation + case when allocation_rank <= pennies_left then 1 else 0 end as code_discount
    from ranked
  ), rebuilt as (
    select item_position, item,
      jsonb_agg(component || jsonb_build_object(
        'discountGrosze', (component->>'discountGrosze')::integer + code_discount,
        'paidAmountGrosze', paid_amount - code_discount
      ) order by component_position) as components,
      sum(code_discount)::integer as item_code_discount
    from allocated
    group by item_position, item
  )
  select jsonb_agg(item || jsonb_build_object(
    'components', components,
    'discountGrosze', (item->>'discountGrosze')::integer + item_code_discount,
    'lineTotalGrosze', (item->>'lineTotalGrosze')::integer - item_code_discount
  ) order by item_position)
  from rebuilt
$$;

create or replace function private.commerce_build_quote(
  p_items jsonb,
  p_gifts jsonb,
  p_delivery_method text,
  p_discount_code text,
  p_created_at timestamptz,
  p_evaluated_at timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.commerce_settings%rowtype;
  gift_entry jsonb;
  merchandise record;
  campaign public.discounts%rowtype;
  quantity integer;
  unit_gross integer;
  unit_net integer;
  line_subtotal integer;
  line_discount integer;
  line_total integer;
  physical_per_unit integer;
  physical_total integer := 0;
  subtotal integer := 0;
  bundle_discount integer := 0;
  code_discount integer := 0;
  gift_quantity integer := 0;
  earned_gifts integer;
  shipping integer;
  items jsonb := '[]'::jsonb;
  components jsonb;
  gifts jsonb := '[]'::jsonb;
  gift_options jsonb;
  adjustments jsonb := '[]'::jsonb;
  applied_discount jsonb := null;
  normalized_code text := nullif(upper(btrim(coalesce(p_discount_code, ''))), '');
begin
  select * into strict settings from public.commerce_settings where singleton;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1
    or jsonb_typeof(coalesce(p_gifts, '[]'::jsonb)) <> 'array'
    or p_delivery_method not in ('inpost_locker', 'courier') then
    raise exception using errcode = 'P0001', message = 'INVALID_CART';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as rows(input_entry)
    where coalesce(input_entry->>'merchandiseId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(input_entry->>'quantity', '') !~ '^\d{1,2}$'
  ) then raise exception using errcode = 'P0001', message = 'INVALID_CART'; end if;
  if (select count(distinct input_entry->>'merchandiseId') from jsonb_array_elements(p_items) as rows(input_entry)) > 50
    or exists (
      select 1 from jsonb_array_elements(p_items) as rows(input_entry)
      group by input_entry->>'merchandiseId'
      having sum((input_entry->>'quantity')::integer) not between 1 and 99
    ) then raise exception using errcode = 'P0001', message = 'INVALID_CART'; end if;

  for merchandise in
    select input_entry->>'merchandiseId' as merchandise_id, sum((input_entry->>'quantity')::integer)::integer as requested_quantity
    from jsonb_array_elements(p_items) as rows(input_entry)
    group by input_entry->>'merchandiseId'
    order by input_entry->>'merchandiseId'
  loop
    quantity := merchandise.requested_quantity;
    select id, name, type, price, status into merchandise
    from public.products where id = merchandise.merchandise_id::uuid;
    if not found then raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND'; end if;
    if merchandise.status <> 'published' or merchandise.type not in ('product', 'variant', 'bundle') or merchandise.price is null then
      raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND';
    end if;

    unit_gross := round(merchandise.price * 1.23)::integer;
    line_subtotal := unit_gross * quantity;
    line_discount := case when merchandise.type = 'bundle' then round(line_subtotal * 0.10)::integer else 0 end;
    line_total := line_subtotal - line_discount;
    unit_net := case when merchandise.type = 'bundle'
      then merchandise.price - round(merchandise.price * 0.10)::integer else merchandise.price end;

    if merchandise.type = 'bundle' then
      if not exists (
        select 1 from public.products bundle_item
        join public.products linked on linked.id = bundle_item.bundle_product_id
        where bundle_item.parent_id = merchandise.id and bundle_item.type = 'bundle_item'
          and bundle_item.status = 'published' and linked.status = 'published'
          and linked.type in ('product', 'variant') and linked.price is not null
      ) or exists (
        select 1 from public.products bundle_item
        left join public.products linked on linked.id = bundle_item.bundle_product_id
        where bundle_item.parent_id = merchandise.id and bundle_item.type = 'bundle_item'
          and bundle_item.status = 'published'
          and (linked.id is null or linked.status <> 'published' or linked.type not in ('product', 'variant') or linked.price is null)
      ) then raise exception using errcode = 'P0001', message = 'PRODUCT_NOT_FOUND'; end if;

      with raw as (
        select linked.id, linked.name, bundle_item.bundle_quantity * quantity as component_quantity,
          round(linked.price * 1.23)::integer * bundle_item.bundle_quantity * quantity as list_amount
        from public.products bundle_item
        join public.products linked on linked.id = bundle_item.bundle_product_id
        where bundle_item.parent_id = merchandise.id and bundle_item.type = 'bundle_item'
          and bundle_item.status = 'published'
        order by linked.id
      ), weighted as (
        select *, case when sum(list_amount) over () = 0 then component_quantity else list_amount end as weight
        from raw
      ), totals as (
        select *, sum(weight) over () as total_weight from weighted
      ), floors as (
        select *,
          floor(line_subtotal::numeric * weight / total_weight)::integer as base_floor,
          mod(line_subtotal::bigint * weight, total_weight) as base_remainder,
          floor(line_total::numeric * weight / total_weight)::integer as paid_floor,
          mod(line_total::bigint * weight, total_weight) as paid_remainder
        from totals
      ), allocations as (
        select *,
          base_floor + case when row_number() over (order by base_remainder desc, id) <= line_subtotal - sum(base_floor) over () then 1 else 0 end as base_amount,
          paid_floor + case when row_number() over (order by paid_remainder desc, id) <= line_total - sum(paid_floor) over () then 1 else 0 end as paid_amount
        from floors
      )
      select jsonb_agg(jsonb_build_object(
        'merchandiseId', id::text, 'name', name, 'quantity', component_quantity,
        'baseAmountGrosze', base_amount, 'discountGrosze', base_amount - paid_amount,
        'paidAmountGrosze', paid_amount
      ) order by id), sum(component_quantity)::integer
      into components, physical_per_unit from allocations;
      physical_per_unit := physical_per_unit / quantity;
    else
      physical_per_unit := 1;
      components := jsonb_build_array(jsonb_build_object(
        'merchandiseId', merchandise.id::text, 'name', merchandise.name, 'quantity', quantity,
        'baseAmountGrosze', line_subtotal, 'discountGrosze', 0, 'paidAmountGrosze', line_total
      ));
    end if;

    physical_total := physical_total + physical_per_unit * quantity;
    subtotal := subtotal + line_subtotal;
    bundle_discount := bundle_discount + line_discount;
    items := items || jsonb_build_array(jsonb_build_object(
      'merchandiseId', merchandise.id::text, 'quantity', quantity, 'name', merchandise.name,
      'kind', case when merchandise.type = 'bundle' then 'bundle' else 'product' end,
      'physicalItemCount', physical_per_unit * quantity,
      'unitPriceGrosze', unit_gross, 'unitNetPriceGrosze', unit_net,
      'lineSubtotalGrosze', line_subtotal, 'discountGrosze', line_discount,
      'lineTotalGrosze', line_total, 'components', components
    ));
  end loop;

  if normalized_code is not null then
    select * into campaign from public.discounts where code = normalized_code;
    if not found then raise exception using errcode = 'P0001', message = 'DISCOUNT_NOT_FOUND'; end if;
    if not campaign.active then raise exception using errcode = 'P0001', message = 'DISCOUNT_INACTIVE'; end if;
    if campaign.valid_from is not null and p_evaluated_at < campaign.valid_from then
      raise exception using errcode = 'P0001', message = 'DISCOUNT_NOT_STARTED';
    end if;
    if campaign.valid_until is not null and p_evaluated_at >= campaign.valid_until then
      raise exception using errcode = 'P0001', message = 'DISCOUNT_EXPIRED';
    end if;
    if subtotal < campaign.min_subtotal_grosze then
      raise exception using errcode = 'P0001', message = 'DISCOUNT_MIN_SUBTOTAL';
    end if;
    code_discount := round((subtotal - bundle_discount) * campaign.value / 100.0)::integer;
    if code_discount > 0 then items := private.commerce_apply_code_discount(items, code_discount); end if;
    applied_discount := jsonb_build_object(
      'code', campaign.code, 'type', 'percentage', 'percentage', campaign.value,
      'amountGrosze', code_discount, 'ruleVersion', 'percentage-whole-cart-v1'
    );
  end if;

  earned_gifts := case when physical_total >= 24 then 3 when physical_total >= 12 then 1 else 0 end;
  for gift_entry in select value from jsonb_array_elements(coalesce(p_gifts, '[]'::jsonb)) loop
    if coalesce(gift_entry->>'merchandiseId', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(gift_entry->>'quantity', '') !~ '^\d{1,2}$' then
      raise exception using errcode = 'P0001', message = 'INVALID_GIFT_SELECTION';
    end if;
    quantity := (gift_entry->>'quantity')::integer;
    gift_quantity := gift_quantity + quantity;
    select id, name into merchandise from public.products
      where id = (gift_entry->>'merchandiseId')::uuid and status = 'published' and type in ('product', 'variant');
    if not found or quantity < 1 then raise exception using errcode = 'P0001', message = 'INVALID_GIFT_SELECTION'; end if;
    gifts := gifts || jsonb_build_array(jsonb_build_object(
      'merchandiseId', merchandise.id::text, 'name', merchandise.name, 'quantity', quantity,
      'unitPriceGrosze', 0, 'lineTotalGrosze', 0
    ));
  end loop;
  if gift_quantity > earned_gifts then raise exception using errcode = 'P0001', message = 'INVALID_GIFT_SELECTION'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('merchandiseId', id::text, 'name', name) order by name), '[]'::jsonb)
    into gift_options from public.products where status = 'published' and type in ('product', 'variant');
  shipping := case when physical_total >= settings.free_shipping_min_items then 0
    when p_delivery_method = 'inpost_locker' then settings.locker_price else settings.courier_price end;
  if bundle_discount > 0 then adjustments := adjustments || jsonb_build_array(jsonb_build_object(
    'type', 'bundle_discount', 'policyId', 'bundle-10-percent', 'amountGrosze', bundle_discount)); end if;
  if code_discount > 0 then adjustments := adjustments || jsonb_build_array(jsonb_build_object(
    'type', 'code_discount', 'policyId', 'percentage-whole-cart-v1', 'amountGrosze', code_discount)); end if;
  if shipping = 0 then adjustments := adjustments || jsonb_build_array(jsonb_build_object(
    'type', 'free_shipping', 'policyId', 'free-shipping-from-6-moulds',
    'amountGrosze', case when p_delivery_method = 'inpost_locker' then settings.locker_price else settings.courier_price end)); end if;

  return jsonb_build_object(
    'items', items, 'subtotalGrosze', subtotal, 'discountGrosze', bundle_discount + code_discount,
    'delivery', jsonb_build_object(
      'method', p_delivery_method, 'parcelSize', 'S', 'priceGrosze', shipping,
      'ruleVersion', case when p_delivery_method = 'inpost_locker' then settings.locker_rule_version else settings.courier_rule_version end
    ),
    'totalGrosze', subtotal - bundle_discount - code_discount + shipping,
    'currency', 'PLN', 'createdAt', p_created_at,
    'expiresAt', p_created_at + make_interval(mins => settings.quote_validity_minutes),
    'physicalItemCount', physical_total,
    'giftPromotion', jsonb_build_object('earnedQuantity', earned_gifts, 'selectedItems', gifts, 'options', gift_options),
    'pricingPolicyVersion', settings.pricing_policy_version, 'adjustments', adjustments,
    'appliedDiscount', applied_discount,
    'requiresLeadTimeConfirmation', physical_total > settings.large_order_threshold_items,
    'leadTimeNotice', case when physical_total > settings.large_order_threshold_items then settings.large_order_notice end,
    'leadTimeNoticeVersion', case when physical_total > settings.large_order_threshold_items then settings.large_order_notice_version end
  );
end;
$$;

create function public.create_checkout_quote(
  p_items jsonb,
  p_gifts jsonb,
  p_delivery_method text,
  p_discount_code text,
  p_request_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote_id uuid := gen_random_uuid();
  created_at timestamptz := now();
  quote jsonb;
  normalized_code text := nullif(upper(btrim(coalesce(p_discount_code, ''))), '');
begin
  perform private.commerce_rate_limit('quote', p_request_fingerprint, 30, interval '10 minutes');
  quote := private.commerce_build_quote(p_items, p_gifts, p_delivery_method, normalized_code, created_at, created_at);
  quote := quote || jsonb_build_object('id', quote_id::text);
  insert into public.checkout_quotes (id, input_items, input_gifts, delivery_method, discount_code, quote, created_at, expires_at)
  values (quote_id, p_items, coalesce(p_gifts, '[]'::jsonb), p_delivery_method, normalized_code, quote, created_at, created_at + interval '15 minutes');
  return quote;
end;
$$;

create or replace function private.commerce_input_item_errors(p_items jsonb) returns jsonb
language sql
security definer
set search_path = ''
as $$
  with requested as (
    select entry->>'merchandiseId' as merchandise_id,
      case when coalesce(entry->>'quantity', '') ~ '^\d{1,2}$' then (entry->>'quantity')::integer else 0 end as quantity
    from jsonb_array_elements(p_items) as rows(entry)
  ), merged as (
    select merchandise_id, sum(quantity)::integer as quantity from requested group by merchandise_id
  )
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'merchandiseId', merged.merchandise_id,
    'reason', case
      when merged.quantity not between 1 and 99 then 'QUANTITY_INVALID'
      when product.id is null then 'NOT_FOUND'
      when product.status <> 'published' or product.type not in ('product', 'variant', 'bundle') or product.price is null then 'UNAVAILABLE'
      when product.type = 'bundle' and not exists (
        select 1 from public.products bundle_item
        join public.products linked on linked.id = bundle_item.bundle_product_id
        where bundle_item.parent_id = product.id and bundle_item.type = 'bundle_item'
          and bundle_item.status = 'published' and linked.status = 'published'
          and linked.type in ('product', 'variant') and linked.price is not null
      ) then 'UNAVAILABLE'
    end,
    'requestedQuantity', merged.quantity
  ))) filter (where merged.quantity not between 1 and 99 or product.id is null
    or product.status <> 'published' or product.type not in ('product', 'variant', 'bundle') or product.price is null
    or (product.type = 'bundle' and not exists (
      select 1 from public.products bundle_item
      join public.products linked on linked.id = bundle_item.bundle_product_id
      where bundle_item.parent_id = product.id and bundle_item.type = 'bundle_item'
        and bundle_item.status = 'published' and linked.status = 'published'
        and linked.type in ('product', 'variant') and linked.price is not null
    ))), '[]'::jsonb)
  from merged left join public.products product on product.id::text = merged.merchandise_id
$$;

create or replace function public.finalize_guest_order(
  p_quote_id uuid,
  p_customer jsonb,
  p_delivery jsonb,
  p_invoice jsonb,
  p_accepted_terms_version text,
  p_accepted_lead_time_notice_version text,
  p_idempotency_key text,
  p_payload_hash text,
  p_guest_token_hash text,
  p_request_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_quote public.checkout_quotes%rowtype;
  current_quote jsonb;
  existing public.orders%rowtype;
  created public.orders%rowtype;
  settings public.commerce_settings%rowtype;
  campaign public.discounts%rowtype;
  item jsonb;
  current_item jsonb;
  item_errors jsonb;
  v_normalized_email text := lower(btrim(coalesce(p_customer->>'email', '')));
  invoice_requested boolean := p_invoice is not null and p_invoice <> 'null'::jsonb;
begin
  if p_idempotency_key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' or p_payload_hash !~ '^[0-9a-f]{64}$'
    or p_guest_token_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode = 'P0001', message = 'INVALID_INPUT'; end if;

  perform pg_advisory_xact_lock(hashtext('checkout-idempotency:' || p_idempotency_key));
  select * into existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    if existing.checkout_payload_hash <> p_payload_hash or existing.quote_id <> p_quote_id or existing.guest_token_hash <> p_guest_token_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('orderId', existing.id::text,
      'orderNumber', 'MON-' || lpad(existing.order_number::text, 6, '0'),
      'orderDisposition', 'reused', 'orderStatus', existing.status);
  end if;

  perform private.commerce_rate_limit('checkout', p_request_fingerprint, 5, interval '10 minutes');
  select * into stored_quote from public.checkout_quotes where id = p_quote_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'QUOTE_NOT_FOUND'; end if;
  if stored_quote.expires_at <= now() then raise exception using errcode = 'P0001', message = 'QUOTE_EXPIRED'; end if;
  if stored_quote.consumed_at is not null then raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT'; end if;

  item_errors := private.commerce_input_item_errors(stored_quote.input_items);
  if jsonb_array_length(item_errors) > 0 then
    raise exception using errcode = 'P0001', message = 'QUOTE_CHANGED', detail = jsonb_build_object('itemErrors', item_errors)::text;
  end if;

  if stored_quote.discount_code is not null then
    select * into campaign from public.discounts where code = stored_quote.discount_code for update;
    if not found then raise exception using errcode = 'P0001', message = 'QUOTE_CHANGED'; end if;
  end if;
  begin
    current_quote := private.commerce_build_quote(stored_quote.input_items, stored_quote.input_gifts,
      stored_quote.delivery_method, stored_quote.discount_code, stored_quote.created_at, now());
  exception when raise_exception then
    if sqlerrm like 'DISCOUNT_%' or sqlerrm = 'PRODUCT_NOT_FOUND' then
      raise exception using errcode = 'P0001', message = 'QUOTE_CHANGED';
    end if;
    raise;
  end;
  current_quote := current_quote || jsonb_build_object('id', stored_quote.id::text);
  if current_quote <> stored_quote.quote then
    item_errors := '[]'::jsonb;
    for item in select value from jsonb_array_elements(stored_quote.quote->'items') loop
      select value into current_item from jsonb_array_elements(current_quote->'items')
      where value->>'merchandiseId' = item->>'merchandiseId';
      if current_item is distinct from item then
        item_errors := item_errors || jsonb_build_array(jsonb_build_object(
          'merchandiseId', item->>'merchandiseId', 'reason', 'PRICE_CHANGED',
          'requestedQuantity', (item->>'quantity')::integer
        ));
      end if;
    end loop;
    raise exception using errcode = 'P0001', message = 'QUOTE_CHANGED', detail = jsonb_build_object('itemErrors', item_errors)::text;
  end if;

  select * into strict settings from public.commerce_settings where singleton;
  if p_accepted_terms_version <> settings.terms_version
    or v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or nullif(btrim(p_customer->>'firstName'),'') is null or nullif(btrim(p_customer->>'lastName'),'') is null
    or regexp_replace(coalesce(p_customer->>'phone',''), '\D', '', 'g') !~ '^\d{9,15}$'
    or p_delivery->>'method' <> stored_quote.delivery_method then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if stored_quote.delivery_method = 'inpost_locker' and nullif(btrim(p_delivery->>'pointId'),'') is null then
    raise exception using errcode = 'P0001', message = 'INVALID_INPUT';
  end if;
  if stored_quote.delivery_method = 'courier' and (
    nullif(btrim(p_delivery#>>'{address,line1}'),'') is null or p_delivery#>>'{address,postalCode}' !~ '^\d{2}-\d{3}$'
    or nullif(btrim(p_delivery#>>'{address,city}'),'') is null or p_delivery#>>'{address,countryCode}' <> 'PL'
  ) then raise exception using errcode = 'P0001', message = 'INVALID_INPUT'; end if;
  if (stored_quote.quote->>'requiresLeadTimeConfirmation')::boolean
    and p_accepted_lead_time_notice_version is distinct from stored_quote.quote->>'leadTimeNoticeVersion' then
    raise exception using errcode = 'P0001', message = 'LEAD_TIME_NOTICE_REQUIRED';
  end if;
  if invoice_requested and (
    nullif(btrim(p_invoice->>'companyName'),'') is null or not private.is_valid_polish_nip(p_invoice->>'nip')
    or nullif(btrim(p_invoice#>>'{address,line1}'),'') is null or p_invoice#>>'{address,postalCode}' !~ '^\d{2}-\d{3}$'
    or nullif(btrim(p_invoice#>>'{address,city}'),'') is null or p_invoice#>>'{address,countryCode}' <> 'PL'
  ) then raise exception using errcode = 'P0001', message = 'INVALID_INPUT'; end if;

  if stored_quote.discount_code is not null then
    perform pg_advisory_xact_lock(hashtext(campaign.id::text), hashtext(v_normalized_email));
    if campaign.max_uses_per_email is not null and (
      select count(*) from public.discount_redemptions
      where discount_id = campaign.id and discount_redemptions.normalized_email = v_normalized_email
        and state in ('reserved', 'consumed')
    ) >= campaign.max_uses_per_email then
      raise exception using errcode = 'P0001', message = 'DISCOUNT_USAGE_LIMIT';
    end if;
  end if;

  insert into public.orders (
    email, status, items, shipping_address, subtotal, discount_total, total, currency, discount_code,
    discount_type, discount_percentage, discount_rule_version,
    delivery_method, parcel_size, pricing_policy_version, shipping_rule_version, shipping_total,
    quote_id, first_name, last_name, phone, guest_token_hash, idempotency_key, checkout_payload_hash,
    accepted_terms_version, accepted_terms_at, accepted_lead_time_notice_version,
    accepted_lead_time_notice_at, invoice_requested, invoice_company_name, invoice_nip, invoice_email,
    invoice_address_line1, invoice_address_line2, invoice_postal_code, invoice_city, invoice_country_code
  ) values (
    v_normalized_email, 'pending_payment', stored_quote.quote->'items', p_delivery,
    (stored_quote.quote->>'subtotalGrosze')::integer, (stored_quote.quote->>'discountGrosze')::integer,
    (stored_quote.quote->>'totalGrosze')::integer, 'PLN', stored_quote.quote#>>'{appliedDiscount,code}',
    stored_quote.quote#>>'{appliedDiscount,type}', (stored_quote.quote#>>'{appliedDiscount,percentage}')::integer,
    stored_quote.quote#>>'{appliedDiscount,ruleVersion}', stored_quote.delivery_method,
    stored_quote.quote#>>'{delivery,parcelSize}', stored_quote.quote->>'pricingPolicyVersion',
    stored_quote.quote#>>'{delivery,ruleVersion}', (stored_quote.quote#>>'{delivery,priceGrosze}')::integer,
    stored_quote.id, btrim(p_customer->>'firstName'), btrim(p_customer->>'lastName'),
    regexp_replace(p_customer->>'phone', '\D', '', 'g'), p_guest_token_hash, p_idempotency_key, p_payload_hash,
    p_accepted_terms_version, now(), p_accepted_lead_time_notice_version,
    case when p_accepted_lead_time_notice_version is null then null else now() end,
    invoice_requested, p_invoice->>'companyName', p_invoice->>'nip',
    case when invoice_requested then coalesce(nullif(p_invoice->>'email',''), v_normalized_email) else null end,
    p_invoice#>>'{address,line1}', nullif(p_invoice#>>'{address,line2}',''), p_invoice#>>'{address,postalCode}',
    p_invoice#>>'{address,city}', p_invoice#>>'{address,countryCode}'
  ) returning * into created;

  for item in select value from jsonb_array_elements(stored_quote.quote->'items') loop
    insert into public.order_items (order_id, merchandise_id, name, quantity, unit_price, discount_total, line_total, components)
    values (created.id, item->>'merchandiseId', item->>'name', (item->>'quantity')::integer,
      (item->>'unitPriceGrosze')::integer, (item->>'discountGrosze')::integer,
      (item->>'lineTotalGrosze')::integer, item->'components');
  end loop;
  for item in select value from jsonb_array_elements(stored_quote.quote#>'{giftPromotion,selectedItems}') loop
    insert into public.order_items (order_id, merchandise_id, name, quantity, unit_price, line_total, is_gift)
    values (created.id, item->>'merchandiseId', item->>'name', (item->>'quantity')::integer, 0, 0, true);
  end loop;
  insert into public.order_deliveries (
    order_id, method, price, rule_version, parcel_size, point_id,
    address_line1, address_line2, postal_code, city, country_code
  ) values (
    created.id, stored_quote.delivery_method, (stored_quote.quote#>>'{delivery,priceGrosze}')::integer,
    stored_quote.quote#>>'{delivery,ruleVersion}', stored_quote.quote#>>'{delivery,parcelSize}',
    nullif(p_delivery->>'pointId',''), p_delivery#>>'{address,line1}', nullif(p_delivery#>>'{address,line2}',''),
    p_delivery#>>'{address,postalCode}', p_delivery#>>'{address,city}', p_delivery#>>'{address,countryCode}'
  );
  if stored_quote.discount_code is not null then
    insert into public.discount_redemptions (discount_id, order_id, normalized_email, state)
    values (campaign.id, created.id, v_normalized_email, 'reserved');
  end if;
  update public.checkout_quotes set consumed_at = now() where id = stored_quote.id;

  return jsonb_build_object('orderId', created.id::text,
    'orderNumber', 'MON-' || lpad(created.order_number::text, 6, '0'),
    'orderDisposition', 'created', 'orderStatus', created.status);
end;
$$;

create or replace function public.transition_discount_redemption(p_order_id uuid, p_target text) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare redemption public.discount_redemptions%rowtype;
begin
  if p_target not in ('consumed', 'released') then raise exception using errcode = 'P0001', message = 'INVALID_INPUT'; end if;
  select * into redemption from public.discount_redemptions where order_id = p_order_id for update;
  if not found then return jsonb_build_object('disposition', 'not_applicable'); end if;
  if redemption.state = p_target then return jsonb_build_object('disposition', 'already_applied'); end if;
  if redemption.state <> 'reserved' then raise exception using errcode = 'P0001', message = 'INVALID_TRANSITION'; end if;
  update public.discount_redemptions set state = p_target,
    consumed_at = case when p_target = 'consumed' then now() else null end,
    released_at = case when p_target = 'released' then now() else null end
  where id = redemption.id;
  return jsonb_build_object('disposition', 'transitioned');
end;
$$;

create or replace function private.release_discount_on_order_end() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelled', 'expired') and old.status is distinct from new.status then
    update public.discount_redemptions set state = 'released', released_at = now()
    where order_id = new.id and state = 'reserved';
  end if;
  return new;
end;
$$;

create trigger release_discount_on_order_end
after update of status on public.orders
for each row execute function private.release_discount_on_order_end();

revoke execute on function public.create_checkout_quote(jsonb,jsonb,text,text,text) from public, anon, authenticated;
revoke execute on function public.transition_discount_redemption(uuid,text) from public, anon, authenticated;
grant execute on function public.create_checkout_quote(jsonb,jsonb,text,text,text) to service_role;
grant execute on function public.transition_discount_redemption(uuid,text) to service_role;
revoke execute on function private.commerce_apply_code_discount(jsonb,integer) from public, anon, authenticated;
revoke execute on function private.commerce_build_quote(jsonb,jsonb,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke execute on function private.commerce_input_item_errors(jsonb) from public, anon, authenticated;
revoke execute on function private.release_discount_on_order_end() from public, anon, authenticated;

drop function private.commerce_build_quote(jsonb,jsonb,text,timestamptz);

comment on function public.create_checkout_quote(jsonb,jsonb,text,text,text) is
  'Creates an authoritative cart quote from database prices and an optional normalized percentage discount code.';
comment on function public.transition_discount_redemption(uuid,text) is
  'Service-role-only idempotent hook for a future verified payment webhook.';
