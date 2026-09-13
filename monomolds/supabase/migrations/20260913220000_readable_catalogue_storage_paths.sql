-- Keep existing UUID paths valid, but use product slugs for new Storage objects.
-- UUIDs remain the database identity; the folder name is only an operator-friendly label.
alter table public.product_images
  drop constraint if exists product_images_storage_path_check;

alter table public.product_images
  add constraint product_images_storage_path_check check (
    storage_path ~ '^products/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]+(-[a-z0-9]+)*)/[^/]+$'
  );

alter table public.product_details
  drop constraint if exists product_details_model_storage_path_format;

alter table public.product_details
  add constraint product_details_model_storage_path_format check (
    model_storage_path is null
    or model_storage_path ~ '^products/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[a-z0-9]+(-[a-z0-9]+)*)/[^/]+\.glb$'
  );

comment on column public.product_images.storage_path is
  'Storage path: products/<product slug>/<filename>. Existing UUID paths remain supported.';

comment on column public.product_details.model_storage_path is
  'Storage path: products/<product slug>/<filename>.glb. Existing UUID paths remain supported.';
