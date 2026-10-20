begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

create temporary table p24_order as
with inserted as (
  insert into public.orders(email, subtotal, total, phone, guest_token_hash)
  values ('p24@example.test', 7799, 7799, '48123123123', repeat('7',64)) returning id
) select id from inserted;
create temporary table p24_first as select public.prepare_guest_payment(repeat('7',64),'48123123123',repeat('a',64)) as value;
select is(value->>'fresh','true','first request owns registration') from p24_first;
select is((value#>>'{attempt,amount}')::integer,7799,'amount is taken from the stored order') from p24_first;
select is(public.prepare_guest_payment(repeat('7',64),'48123123123',repeat('a',64))->>'fresh','false','repeat reuses the attempt');
select is((select count(*)::integer from public.payment_attempts where order_id = (select id from p24_order)),1,'only one active attempt');
select throws_ok($$select public.prepare_guest_payment(repeat('8',64),'48123123123',repeat('a',64))$$,'P0001','ORDER_NOT_FOUND','wrong token rejected');
select throws_ok($$select public.prepare_guest_payment(repeat('7',64),'48123999999',repeat('a',64))$$,'P0001','ORDER_NOT_FOUND','wrong phone rejected');
select throws_ok($$insert into public.payment_attempts(order_id,amount,currency) select id,7799,'PLN' from p24_order$$,'23505',null,'unique index prevents concurrent attempts');
select ok(not has_table_privilege('anon','public.payment_attempts','SELECT'),'anon cannot read payment attempts');
select ok(not has_table_privilege('authenticated','public.payment_attempts','UPDATE'),'authenticated cannot update attempts');
select ok(not has_table_privilege('anon','public.payment_events','INSERT'),'anon cannot forge events');
select ok(not has_function_privilege('anon','public.complete_verified_payment(uuid,bigint)','EXECUTE'),'anon cannot confirm payment');
select ok(not has_function_privilege('authenticated','public.prepare_guest_payment(text,text,text)','EXECUTE'),'authenticated cannot bypass guest authorization');

create temporary table p24_discount as
with d as (insert into public.discounts(code,type,value) values(upper('P24-'||gen_random_uuid()::text),'percentage',10) returning id) select id from d;
insert into public.discount_redemptions(discount_id,order_id,normalized_email,state)
select d.id,o.id,'p24@example.test','reserved' from p24_discount d cross join p24_order o;

insert into public.payment_events(order_id,attempt_id,provider,provider_event_id,event_type,status)
select a.order_id,a.id,'przelewy24','90000000001','payment_notification','received' from public.payment_attempts a where order_id=(select id from p24_order);
select is((select status from public.orders where id=(select id from p24_order)),'pending_payment','notification alone never marks paid');
select throws_ok($$select public.prepare_guest_payment(repeat('7',64),'48123123123',repeat('a',64))$$,'P0001','PAYMENT_PENDING','unprocessed notification blocks another payment');
select is(public.complete_verified_payment((select (value#>>'{attempt,id}')::uuid from p24_first),90000000001),'verified','verified payment is applied');
select is((select status from public.orders where id=(select id from p24_order)),'paid','order is paid');
select is((select state from public.discount_redemptions where order_id=(select id from p24_order)),'consumed','payment consumes discount reservation');
select is(public.complete_verified_payment((select (value#>>'{attempt,id}')::uuid from p24_first),90000000001),'already_applied','duplicate has no side effects');
select throws_ok($$select public.prepare_guest_payment(repeat('7',64),'48123123123',repeat('a',64))$$,'P0001','PAYMENT_NOT_ALLOWED','paid order cannot start another attempt');

-- A delayed verified payment remains valid after local expiry.
create temporary table p24_late as
with inserted as (
 insert into public.orders(email,subtotal,total,phone,guest_token_hash,status)
 values('late@example.test',5000,5000,'48123123124',repeat('9',64),'expired') returning id
), a as (
 insert into public.payment_attempts(order_id,amount,currency,status) select id,5000,'PLN','expired' from inserted returning *
) select * from a;
insert into public.payment_events(order_id,attempt_id,provider,provider_event_id,event_type,status)
select order_id,id,'przelewy24','90000000002','payment_notification','received' from p24_late;
insert into public.discount_redemptions(discount_id,order_id,normalized_email,state,released_at)
select d.id,a.order_id,'late@example.test','released',now() from p24_discount d cross join p24_late a;
select is(public.complete_verified_payment((select id from p24_late),90000000002),'verified','late payment accepted after expiry');
select is((select status from public.orders where id=(select order_id from p24_late)),'paid','expired order becomes paid');
select is((select state from public.discount_redemptions where order_id=(select order_id from p24_late)),'consumed','late payment consumes released reservation');

-- A second genuine payment or a payment after cancellation requires manual review.
create temporary table p24_second as
with a as (insert into public.payment_attempts(order_id,amount,currency,status)
 select id,7799,'PLN','expired' from p24_order returning *) select * from a;
select throws_ok($$select public.complete_verified_payment((select id from p24_second),90000000003)$$,'P0001','PAYMENT_EVENT_NOT_FOUND','no paid state without durable notification');
insert into public.payment_events(order_id,attempt_id,provider,provider_event_id,event_type,status)
select order_id,id,'przelewy24','90000000003','payment_notification','received' from p24_second;
select is(public.complete_verified_payment((select id from p24_second),90000000003),'review_required','second genuine payment flagged');
select is((select status from public.orders where id=(select id from p24_order)),'paid','second payment cannot regress order');
update public.orders set status='cancelled' where id=(select order_id from p24_late);
create temporary table p24_cancelled as
with a as (insert into public.payment_attempts(order_id,amount,currency,status)
 select order_id,5000,'PLN','expired' from p24_late returning *) select * from a;
insert into public.payment_events(order_id,attempt_id,provider,provider_event_id,event_type,status)
select order_id,id,'przelewy24','90000000004','payment_notification','received' from p24_cancelled;
select is(public.complete_verified_payment((select id from p24_cancelled),90000000004),'review_required','cancelled order payment flagged');
select is((select status from public.orders where id=(select order_id from p24_late)),'cancelled','cancelled order is not reopened');
select * from finish();
rollback;
