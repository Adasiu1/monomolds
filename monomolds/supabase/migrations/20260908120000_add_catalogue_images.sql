create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique
    check (storage_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'),
  alt_text text not null check (char_length(trim(alt_text)) > 0),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create index product_images_product_position_idx on public.product_images(product_id, position);

alter table public.product_images enable row level security;

create policy "Public can read images for published catalogue items"
on public.product_images
for select
to anon, authenticated
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.status = 'published'
      and products.type in ('product', 'bundle')
  )
);

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', false)
on conflict (id) do update set public = false;

create policy "Public can read published catalogue image files"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.product_images
    join public.products on products.id = product_images.product_id
    where product_images.storage_path = name
      and products.status = 'published'
      and products.type in ('product', 'bundle')
  )
);

comment on table public.product_images is 'Catalogue images live in the private product-images bucket at products/<product UUID>/<filename>.';
