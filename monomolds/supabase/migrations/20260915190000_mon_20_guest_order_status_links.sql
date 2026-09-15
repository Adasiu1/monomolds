begin;

create or replace function public.resend_guest_order_status_link(
  p_order_number bigint,
  p_email text,
  p_phone text,
  p_request_fingerprint text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_order public.orders%rowtype;
  new_token text;
begin
  perform private.commerce_rate_limit('status_link', p_request_fingerprint, 5, interval '10 minutes');

  select *
  into found_order
  from public.orders
  where order_number = p_order_number
    and lower(email) = lower(trim(p_email))
    and phone = regexp_replace(p_phone, '\D', '', 'g');

  if found_order.id is null then
    raise exception using errcode = 'P0001', message = 'ORDER_NOT_FOUND';
  end if;

  new_token := encode(extensions.gen_random_bytes(32), 'hex');

  update public.orders
  set guest_token_hash = encode(extensions.digest(new_token, 'sha256'), 'hex'),
      updated_at = now()
  where id = found_order.id;

  return jsonb_build_object(
    'orderNumber', 'MON-' || lpad(found_order.order_number::text, 6, '0'),
    'token', new_token
  );
end;
$$;

revoke execute on function public.resend_guest_order_status_link(bigint,text,text,text) from public, anon, authenticated;
grant execute on function public.resend_guest_order_status_link(bigint,text,text,text) to service_role;

comment on function public.resend_guest_order_status_link(bigint,text,text,text) is
  'Rotates a guest status token after matching order number, email, and phone. The plaintext token is returned only to the trusted server caller for email delivery.';

commit;
