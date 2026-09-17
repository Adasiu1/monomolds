begin;

alter table public.checkout_rate_limits
  drop constraint checkout_rate_limits_operation_check;

alter table public.checkout_rate_limits
  add constraint checkout_rate_limits_operation_check
  check (operation in ('quote', 'checkout', 'status', 'status_link'));

commit;
