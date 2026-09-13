create table public.product_details (
  product_id uuid primary key references public.products(id) on delete cascade,
  capacity_ml integer not null check (capacity_ml > 0),
  material text not null check (char_length(trim(material)) > 0),
  care_instructions text[] not null check (cardinality(care_instructions) > 0),
  model_storage_path text,
  model_alt_text text,
  constraint product_details_model_fields_together check (
    (model_storage_path is null and model_alt_text is null)
    or (
      model_storage_path is not null
      and model_alt_text is not null
      and char_length(trim(model_alt_text)) > 0
    )
  ),
  constraint product_details_model_storage_path_format check (
    model_storage_path is null
    or model_storage_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+\.glb$'
  )
);

comment on table public.product_details is
  'Customer-facing specifications and optional 3D media for a catalogue product.';

alter table public.product_details enable row level security;

grant select on public.product_details to anon, authenticated;

create policy "Public can read details for published products"
on public.product_details
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.products
    where products.id = product_details.product_id
      and products.status = 'published'
      and products.type = 'product'
  )
);

alter table public.products
  add column bundle_quantity integer;

update public.products
set bundle_quantity = case
  when id = '00000000-0000-0000-0000-000000000021' then 6
  else 1
end
where type = 'bundle_item';

alter table public.products
  add constraint products_bundle_quantity_matches_type check (
    (type = 'bundle_item' and bundle_quantity is not null and bundle_quantity > 0)
    or (type <> 'bundle_item' and bundle_quantity is null)
  );

insert into public.products (
  id,
  type,
  slug,
  name,
  description,
  price,
  currency,
  stock_quantity,
  status
)
values (
  '00000000-0000-0000-0000-000000000005',
  'product',
  'forma-kokos-100-ml',
  'Forma Kokos 100 ml',
  'Forma silikonowa o pojemności 100 ml z wyraźną fakturą kokosa.',
  5000,
  'PLN',
  0,
  'published'
)
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  stock_quantity = excluded.stock_quantity,
  status = excluded.status,
  updated_at = now();

insert into public.product_details (
  product_id,
  capacity_ml,
  material,
  care_instructions,
  model_storage_path,
  model_alt_text
)
values (
  '00000000-0000-0000-0000-000000000005',
  100,
  'Silikon platynowy',
  array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.'],
  'products/00000000-0000-0000-0000-000000000005/kokos.glb',
  'Interaktywny model 3D formy Kokos 100 ml'
)
on conflict (product_id) do update
set
  capacity_ml = excluded.capacity_ml,
  material = excluded.material,
  care_instructions = excluded.care_instructions,
  model_storage_path = excluded.model_storage_path,
  model_alt_text = excluded.model_alt_text;

insert into public.product_images (
  id,
  product_id,
  storage_path,
  alt_text,
  position
)
values
  (
    '00000000-0000-0000-0000-000000001051',
    '00000000-0000-0000-0000-000000000005',
    'products/00000000-0000-0000-0000-000000000005/front.webp',
    'Forma Kokos 100 ml i gotowy korpus widziane z przodu',
    0
  ),
  (
    '00000000-0000-0000-0000-000000001052',
    '00000000-0000-0000-0000-000000000005',
    'products/00000000-0000-0000-0000-000000000005/left.webp',
    'Forma Kokos 100 ml i gotowy korpus widziane z lewej strony',
    1
  ),
  (
    '00000000-0000-0000-0000-000000001053',
    '00000000-0000-0000-0000-000000000005',
    'products/00000000-0000-0000-0000-000000000005/right.webp',
    'Forma Kokos 100 ml i gotowy korpus widziane z prawej strony',
    2
  )
on conflict (id) do update
set
  product_id = excluded.product_id,
  storage_path = excluded.storage_path,
  alt_text = excluded.alt_text,
  position = excluded.position;
