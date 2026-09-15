create or replace function public.create_checkout_quote(
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
  perform private.commerce_rate_limit('quote', p_request_fingerprint, 200, interval '10 minutes');
  quote := private.commerce_build_quote(p_items, p_gifts, p_delivery_method, normalized_code, created_at, created_at);
  quote := quote || jsonb_build_object('id', quote_id::text);
  insert into public.checkout_quotes (id, input_items, input_gifts, delivery_method, discount_code, quote, created_at, expires_at)
  values (quote_id, p_items, coalesce(p_gifts, '[]'::jsonb), p_delivery_method, normalized_code, quote, created_at, created_at + interval '15 minutes');
  return quote;
end;
$$;

revoke all on function public.create_checkout_quote(jsonb,jsonb,text,text,text) from public, anon, authenticated;
grant execute on function public.create_checkout_quote(jsonb,jsonb,text,text,text) to service_role;
