alter table public.product_images
  drop constraint if exists product_images_storage_path_check;

alter table public.product_details
  drop constraint if exists product_details_model_storage_path_format;

update public.product_images
set storage_path = replace(
  storage_path,
  'products/00000000-0000-0000-0000-000000000005/',
  'products/forma-kokos-100-ml/'
)
where product_id = '00000000-0000-0000-0000-000000000005'
  and storage_path like 'products/00000000-0000-0000-0000-000000000005/%';

update public.product_details
set model_storage_path = 'products/forma-kokos-100-ml/kokos.glb'
where product_id = '00000000-0000-0000-0000-000000000005'
  and model_storage_path = 'products/00000000-0000-0000-0000-000000000005/kokos.glb';

alter table public.product_images
  add constraint product_images_storage_path_check check (
    storage_path ~ '^products/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]+(-[a-z0-9]+)*)/[^/]+$'
  );

alter table public.product_details
  add constraint product_details_model_storage_path_format check (
    model_storage_path is null
    or model_storage_path ~ '^products/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]+(-[a-z0-9]+)*)/[^/]+\.glb$'
  );
