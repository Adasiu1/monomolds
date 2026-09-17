create or replace function private.commerce_bundle_net_price(p_bundle_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(linked.price * bundle_item.bundle_quantity), 0)::integer
  from public.products bundle_item
  join public.products linked on linked.id = bundle_item.bundle_product_id
  where bundle_item.parent_id = p_bundle_id
    and bundle_item.type = 'bundle_item'
    and bundle_item.status = 'published'
    and linked.status = 'published'
    and linked.type in ('product', 'variant')
    and linked.price is not null
$$;
