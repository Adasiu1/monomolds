alter table public.products
  add column bundle_discounted_price integer,
  add constraint products_bundle_discounted_price_check check (
    (type = 'bundle' and bundle_discounted_price is not null and bundle_discounted_price >= 0)
    or (type <> 'bundle' and bundle_discounted_price is null)
  ) not valid;

create or replace function private.commerce_bundle_net_price(p_bundle_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select sum(linked.price * bundle_item.bundle_quantity)::integer
  from public.products bundle_item
  join public.products linked on linked.id = bundle_item.bundle_product_id
  where bundle_item.parent_id = p_bundle_id
    and bundle_item.type = 'bundle_item'
    and bundle_item.status = 'published'
    and linked.status = 'published'
    and linked.type in ('product', 'variant')
    and linked.price is not null
$$;

create or replace function private.commerce_refresh_bundle_price(p_bundle_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.products
  set price = private.commerce_bundle_net_price(p_bundle_id)
  where id = p_bundle_id and type = 'bundle'
$$;

create or replace function private.commerce_derive_bundle_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'bundle' then
    new.price := private.commerce_bundle_net_price(new.id);
    new.bundle_discounted_price := new.price - round(new.price * 0.10)::integer;
  else
    new.bundle_discounted_price := null;
  end if;
  return new;
end;
$$;

create trigger products_derive_bundle_price
before insert or update of price, bundle_discounted_price on public.products
for each row execute function private.commerce_derive_bundle_price();

create or replace function private.commerce_refresh_affected_bundles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.type = 'bundle_item' then
    perform private.commerce_refresh_bundle_price(old.parent_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.type = 'bundle_item' then
    perform private.commerce_refresh_bundle_price(new.parent_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.type in ('product', 'variant') then
    update public.products bundle
    set price = private.commerce_bundle_net_price(bundle.id)
    where bundle.type = 'bundle'
      and exists (
        select 1 from public.products bundle_item
        where bundle_item.parent_id = bundle.id
          and bundle_item.type = 'bundle_item'
          and bundle_item.bundle_product_id = old.id
      );
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.type in ('product', 'variant') then
    update public.products bundle
    set price = private.commerce_bundle_net_price(bundle.id)
    where bundle.type = 'bundle'
      and exists (
        select 1 from public.products bundle_item
        where bundle_item.parent_id = bundle.id
          and bundle_item.type = 'bundle_item'
          and bundle_item.bundle_product_id = new.id
      );
  end if;

  return null;
end;
$$;

create trigger products_refresh_affected_bundles
after insert or update of price, status, parent_id, bundle_product_id, bundle_quantity or delete
on public.products
for each row execute function private.commerce_refresh_affected_bundles();

update public.products bundle
set price = private.commerce_bundle_net_price(bundle.id)
where bundle.type = 'bundle';

alter table public.products validate constraint products_bundle_discounted_price_check;

revoke all on function private.commerce_bundle_net_price(uuid) from public, anon, authenticated;
revoke all on function private.commerce_refresh_bundle_price(uuid) from public, anon, authenticated;
revoke all on function private.commerce_derive_bundle_price() from public, anon, authenticated;
revoke all on function private.commerce_refresh_affected_bundles() from public, anon, authenticated;
