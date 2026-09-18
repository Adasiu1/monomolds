select
  id,
  'MON-' || lpad(order_number::text, 6, '0') as order_number,
  status,
  created_at
from public.orders
order by created_at desc;