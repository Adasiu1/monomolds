drop policy if exists "Public can read published catalogue image files" on storage.objects;

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
    where product_images.storage_path = storage.objects.name
      and products.status = 'published'
      and products.type in ('product', 'bundle')
  )
);
