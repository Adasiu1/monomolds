alter table public.products enable row level security;

drop policy if exists "Public can read published products"
on public.products;

create policy "Public can read published products"
on public.products
for select
to anon, authenticated
using (status = 'published');

grant select on public.products to anon, authenticated;