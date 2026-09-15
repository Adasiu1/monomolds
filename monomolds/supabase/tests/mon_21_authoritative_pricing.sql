begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

select is((select count(*)::integer from public.discounts), 0, 'no active discount is seeded');

set local role service_role;
create temporary table mon21_merged_quote as
select public.create_checkout_quote(
  '[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":2,"price":1},{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":3,"amount":1}]'::jsonb,
  '[]'::jsonb, 'inpost_locker', null, repeat('1', 64)
) as value;
reset role;

select is(jsonb_array_length(value->'items'), 1, 'duplicate merchandise is merged') from mon21_merged_quote;
select is((value#>>'{items,0,quantity}')::integer, 5, 'merged quantity is preserved') from mon21_merged_quote;
select is((value#>>'{items,0,lineTotalGrosze}')::integer, 30750, 'client price and amount fields are ignored') from mon21_merged_quote;

set local role service_role;
select throws_ok(
  $$ select public.create_checkout_quote(
    '[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":60},{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":40}]',
    '[]', 'inpost_locker', null, repeat('2', 64)) $$,
  'P0001', 'INVALID_CART', 'merged quantity above 99 is rejected'
);
select throws_ok(
  $$ select public.create_checkout_quote(
    '[{"merchandiseId":"00000000-0000-0000-0000-000000000004","quantity":1}]',
    '[]', 'inpost_locker', null, repeat('3', 64)) $$,
  'P0001', 'PRODUCT_NOT_FOUND', 'draft merchandise is unavailable'
);
create temporary table mon21_zero_stock_quote as
select public.create_checkout_quote(
  '[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]',
  '[]', 'inpost_locker', null, repeat('4', 64)
) as value;
reset role;
select is((value#>>'{items,0,quantity}')::integer, 1, 'published zero-stock product remains orderable') from mon21_zero_stock_quote;

set local role service_role;
create temporary table mon21_bundle_quote as
select public.create_checkout_quote(
  '[{"merchandiseId":"00000000-0000-0000-0000-000000000020","quantity":1}]',
  '[]', 'inpost_locker', null, repeat('5', 64)
) as value;
reset role;
select is((value->>'physicalItemCount')::integer, 7, 'bundle uses real component quantities') from mon21_bundle_quote;
select is(jsonb_array_length(value#>'{items,0,components}'), 2, 'bundle snapshot contains real components') from mon21_bundle_quote;
select ok((value#>'{items,0,components}') @> '[{"merchandiseId":"00000000-0000-0000-0000-000000000001"},{"merchandiseId":"00000000-0000-0000-0000-000000000006"}]'::jsonb, 'bundle snapshot contains linked product ids') from mon21_bundle_quote;
select is((value#>>'{items,0,lineSubtotalGrosze}')::integer, 41820, 'bundle list price is the sum of current component prices') from mon21_bundle_quote;
select is((select sum((component->>'paidAmountGrosze')::integer) from mon21_bundle_quote, jsonb_array_elements(value#>'{items,0,components}') component), 37638::bigint, 'component allocation equals paid bundle price after 10 percent discount');
select is((select price from public.products where id = '00000000-0000-0000-0000-000000000020'), 34000, 'derived bundle net price is stored from its components');
select is((select bundle_discounted_price from public.products where id = '00000000-0000-0000-0000-000000000020'), 30600, 'database stores the automatically discounted bundle price');
update public.products set price = 1 where id = '00000000-0000-0000-0000-000000000020';
select is((select price from public.products where id = '00000000-0000-0000-0000-000000000020'), 34000, 'manual bundle price is replaced with the derived value');

insert into public.discounts (code, type, value, active, min_subtotal_grosze)
values ('JESIEN10', 'percentage', 10, true, 5000),
       ('OFF', 'percentage', 10, false, 0),
       ('LATER', 'percentage', 10, true, 0),
       ('OLD', 'percentage', 10, true, 0),
       ('BIG', 'percentage', 10, true, 100000);
update public.discounts set valid_from = now() + interval '1 day' where code = 'LATER';
update public.discounts set valid_until = now() where code = 'OLD';

set local role service_role;
create temporary table mon21_discount_quote as
select public.create_checkout_quote(
  '[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]',
  '[]', 'inpost_locker', '  jesien10 ', repeat('6', 64)
) as value;
reset role;
select is(value#>>'{appliedDiscount,code}', 'JESIEN10', 'discount code is trimmed and uppercased') from mon21_discount_quote;
select is((value#>>'{appliedDiscount,amountGrosze}')::integer, 615, 'percentage discount is calculated in integer grosze') from mon21_discount_quote;

set local role service_role;
select throws_ok($$ select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'MISSING', repeat('7', 64)) $$, 'P0001', 'DISCOUNT_NOT_FOUND', 'unknown code is rejected');
select throws_ok($$ select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'OFF', repeat('8', 64)) $$, 'P0001', 'DISCOUNT_INACTIVE', 'inactive code is rejected');
select throws_ok($$ select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'LATER', repeat('9', 64)) $$, 'P0001', 'DISCOUNT_NOT_STARTED', 'future code is rejected');
select throws_ok($$ select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'OLD', repeat('a', 64)) $$, 'P0001', 'DISCOUNT_EXPIRED', 'valid_until is exclusive');
select throws_ok($$ select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'BIG', repeat('b', 64)) $$, 'P0001', 'DISCOUNT_MIN_SUBTOTAL', 'minimum uses pre-discount product subtotal');
reset role;

set local role service_role;
create temporary table mon21_first_order as
select public.finalize_guest_order(
  (select (value->>'id')::uuid from mon21_discount_quote),
  '{"email":"ANNA@example.test","firstName":"Anna","lastName":"Nowak","phone":"+48 123 123 123"}',
  '{"method":"inpost_locker","pointId":"POZ01A"}', null,
  'mvp-2026-09-14', null, '00000000-0000-4000-8000-000000000021',
  repeat('c', 64), repeat('d', 64), repeat('e', 64)
) as value;
reset role;
select is((select discount_code from public.orders where id = (select (value->>'orderId')::uuid from mon21_first_order)), 'JESIEN10', 'order stores the normalized discount snapshot');
select is((select state from public.discount_redemptions where order_id = (select (value->>'orderId')::uuid from mon21_first_order)), 'reserved', 'checkout reserves redemption');

set local role service_role;
create temporary table mon21_second_quote as
select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'JESIEN10', repeat('f', 64)) as value;
select throws_ok(
  format($sql$select public.finalize_guest_order(%L, '{"email":"anna@example.test","firstName":"Anna","lastName":"Nowak","phone":"48123123123"}', '{"method":"inpost_locker","pointId":"POZ01A"}', null, 'mvp-2026-09-14', null, '00000000-0000-4000-8000-000000000022', %L, %L, %L)$sql$,
    (select value->>'id' from mon21_second_quote), repeat('1',64), repeat('2',64), repeat('3',64)),
  'P0001', 'DISCOUNT_USAGE_LIMIT', 'per-email limit counts normalized email atomically'
);
create temporary table mon21_release as select public.transition_discount_redemption((select (value->>'orderId')::uuid from mon21_first_order), 'released') as value;
reset role;
select is(value->>'disposition', 'transitioned', 'reserved redemption can be released') from mon21_release;

set local role service_role;
create temporary table mon21_second_order as
select public.finalize_guest_order(
  (select (value->>'id')::uuid from mon21_second_quote),
  '{"email":"anna@example.test","firstName":"Anna","lastName":"Nowak","phone":"48123123123"}',
  '{"method":"inpost_locker","pointId":"POZ01A"}', null,
  'mvp-2026-09-14', null, '00000000-0000-4000-8000-000000000023',
  repeat('4',64), repeat('5',64), repeat('6',64)
) as value;
create temporary table mon21_consume as select public.transition_discount_redemption((select (value->>'orderId')::uuid from mon21_second_order), 'consumed') as value;
reset role;
select is(value->>'orderStatus', 'pending_payment', 'released reservation permits a later order') from mon21_second_order;
select is(value->>'disposition', 'transitioned', 'reserved redemption can be consumed') from mon21_consume;
select is((select state from public.discount_redemptions where order_id = (select (value->>'orderId')::uuid from mon21_second_order)), 'consumed', 'consumed redemption remains counted');

set local role service_role;
create temporary table mon21_cancel_quote as
select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000005","quantity":1}]', '[]', 'inpost_locker', 'JESIEN10', repeat('a',64)) as value;
create temporary table mon21_cancel_order as
select public.finalize_guest_order(
  (select (value->>'id')::uuid from mon21_cancel_quote),
  '{"email":"cancel@example.test","firstName":"Anna","lastName":"Nowak","phone":"48123123123"}',
  '{"method":"inpost_locker","pointId":"POZ01A"}', null,
  'mvp-2026-09-14', null, '00000000-0000-4000-8000-000000000025',
  repeat('b',64), repeat('c',64), repeat('d',64)
) as value;
update public.orders set status = 'cancelled' where id = (select (value->>'orderId')::uuid from mon21_cancel_order);
reset role;
select is((select state from public.discount_redemptions where order_id = (select (value->>'orderId')::uuid from mon21_cancel_order)), 'released', 'cancelling an order releases a reserved redemption');
select ok((select released_at is not null from public.discount_redemptions where order_id = (select (value->>'orderId')::uuid from mon21_cancel_order)), 'automatic release records its timestamp');

set local role service_role;
create temporary table mon21_price_quote as
select public.create_checkout_quote('[{"merchandiseId":"00000000-0000-0000-0000-000000000002","quantity":1}]', '[]', 'courier', null, repeat('7',64)) as value;
update public.products set price = price + 100 where id = '00000000-0000-0000-0000-000000000002';
create temporary table mon21_diagnostic(message text, detail text);
do $$
declare
  v_message text;
  v_detail text;
begin
  perform public.finalize_guest_order(
    (select (value->>'id')::uuid from mon21_price_quote),
    '{"email":"price@example.test","firstName":"Anna","lastName":"Nowak","phone":"48123123123"}',
    '{"method":"courier","address":{"line1":"Prosta 1","postalCode":"00-001","city":"Warszawa","countryCode":"PL"}}',
    null, 'mvp-2026-09-14', null, '00000000-0000-4000-8000-000000000024', repeat('8',64), repeat('9',64), repeat('0',64)
  );
exception when raise_exception then
  get stacked diagnostics v_message = message_text, v_detail = pg_exception_detail;
  insert into mon21_diagnostic values (v_message, v_detail);
end $$;
reset role;
select is((select message from mon21_diagnostic limit 1), 'QUOTE_CHANGED', 'changed catalogue price blocks checkout');
select is(((select detail from mon21_diagnostic order by ctid desc limit 1)::jsonb#>>'{itemErrors,0,reason}'), 'PRICE_CHANGED', 'changed price includes a concrete item error');

select ok(not has_function_privilege('anon', 'public.create_checkout_quote(jsonb,jsonb,text,text,text)', 'execute'), 'anon cannot call authoritative quote RPC directly');
select ok(not has_function_privilege('anon', 'public.transition_discount_redemption(uuid,text)', 'execute'), 'anon cannot mutate redemption state');

select * from finish();
rollback;
