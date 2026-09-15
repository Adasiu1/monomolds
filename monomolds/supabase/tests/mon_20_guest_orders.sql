begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

set local role service_role;
create temporary table mon20_quote as
select public.create_checkout_quote(
  '[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]'::jsonb,
  '[]'::jsonb,
  'inpost_locker',
  null,
  repeat('a', 64)
) as value;
reset role;

select is((value#>>'{delivery,priceGrosze}')::integer, 1649, 'Paczkomat costs 16.49 PLN') from mon20_quote;
select is((value->>'totalGrosze')::integer, 7799, 'quote total uses authoritative gross product price') from mon20_quote;
select is(extract(epoch from ((value->>'expiresAt')::timestamptz - (value->>'createdAt')::timestamptz))::integer, 900, 'quote expires after 15 minutes') from mon20_quote;

set local role service_role;
create temporary table mon20_order as
select public.finalize_guest_order(
  (select (value->>'id')::uuid from mon20_quote),
  '{"email":"anna@example.test","firstName":"Anna","lastName":"Nowak","phone":"+48 123 123 123"}'::jsonb,
  '{"method":"inpost_locker","pointId":"POZ01A"}'::jsonb,
  '{"companyName":"Mono Test","nip":"5260250995","address":{"line1":"Prosta 1","postalCode":"00-001","city":"Warszawa","countryCode":"PL"}}'::jsonb,
  'mvp-2026-09-14', null,
  '00000000-0000-4000-8000-000000000001', repeat('b', 64), repeat('c', 64), repeat('a', 64)
) as value;
reset role;

select is((value->>'orderStatus'), 'pending_payment', 'new order waits for payment') from mon20_order;
select matches((value->>'orderNumber'), '^MON-[0-9]{6}$', 'order gets a readable sequence number') from mon20_order;
select is((select count(*)::integer from public.orders), 1, 'one order is stored');
select is((select count(*)::integer from public.order_items), 1, 'immutable item snapshot is stored');
select is((select invoice_nip from public.orders limit 1), '5260250995', 'normalized invoice data is stored relationally');

set local role service_role;
create temporary table mon20_reused as
select public.finalize_guest_order(
  (select (value->>'id')::uuid from mon20_quote),
  '{"email":"anna@example.test","firstName":"Anna","lastName":"Nowak","phone":"+48 123 123 123"}'::jsonb,
  '{"method":"inpost_locker","pointId":"POZ01A"}'::jsonb,
  '{"companyName":"Mono Test","nip":"5260250995","address":{"line1":"Prosta 1","postalCode":"00-001","city":"Warszawa","countryCode":"PL"}}'::jsonb,
  'mvp-2026-09-14', null,
  '00000000-0000-4000-8000-000000000001', repeat('b', 64), repeat('c', 64), repeat('a', 64)
) as value;
reset role;
select is((value->>'orderDisposition'), 'reused', 'same idempotency payload reuses the order') from mon20_reused;
select is((select count(*)::integer from public.orders), 1, 'idempotent retry creates no duplicate');

set local role service_role;
select throws_ok(
  $$ select public.get_guest_order_status(repeat('c', 64), '000000000', repeat('d', 64)) $$,
  'P0001', 'ORDER_NOT_FOUND', 'wrong phone reveals no order details'
);
reset role;
select ok(not has_table_privilege('anon', 'public.orders', 'select'), 'anon cannot read orders directly');
select ok(not has_function_privilege('anon', 'public.finalize_guest_order(uuid,jsonb,jsonb,jsonb,text,text,text,text,text,text)', 'execute'), 'anon cannot bypass the server action');

select * from finish();
rollback;
