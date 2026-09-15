insert into public.products (id, type, slug, name, description, price, currency, stock_quantity, status)
values
  ('00000000-0000-0000-0000-000000000001', 'product', 'forma-malpka-100-ml', 'Forma Małpka 100 ml', 'Forma silikonowa Małpka o pojemności 100 ml.', 5000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000002', 'product', 'forma-mis-130-ml', 'Forma Miś 130 ml', 'Forma silikonowa Miś o pojemności 130 ml.', 6000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000003', 'product', 'forma-dracula-100-ml', 'Forma Dracula 100 ml', 'Forma silikonowa Dracula o pojemności 100 ml.', 5000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000005', 'product', 'forma-kokos-100-ml', 'Forma Kokos 100 ml', 'Forma silikonowa o pojemności 100 ml z wyraźną fakturą kokosa.', 5000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000006', 'product', 'forma-serce-100-ml', 'Forma Serce 100 ml', 'Forma silikonowa Serce o pojemności 100 ml.', 4000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000004', 'product', 'secret-monkey', 'Secret Monkey', 'Produkt tylko do testowania RLS.', 9999, 'PLN', 5, 'draft'),
  ('00000000-0000-0000-0000-000000000020', 'bundle', 'halloween-set', 'Halloween Zestaw', 'Zestaw siedmiu form.', null, 'PLN', 5, 'published'),
  ('00000000-0000-0000-0000-000000000030', 'bundle', 'zestaw-test', 'Zestaw test', 'Po jednej sztuce każdej formy dostępnej w katalogu.', null, 'PLN', 5, 'published')
on conflict (id) do update
set
  type = excluded.type,
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  stock_quantity = excluded.stock_quantity,
  status = excluded.status;

insert into public.products (id, parent_id, type, name, price, currency, stock_quantity, status)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'variant', 'Archiwalny wariant Małpki - 6 szt.', 4999, 'PLN', 0, 'archived'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'variant', 'Archiwalny wariant Małpki - 12 szt.', 7999, 'PLN', 0, 'archived')
on conflict (id) do update
set
  parent_id = excluded.parent_id,
  type = excluded.type,
  name = excluded.name,
  price = excluded.price,
  currency = excluded.currency,
  stock_quantity = excluded.stock_quantity,
  status = excluded.status;

insert into public.products (id, parent_id, type, name, status, bundle_product_id, bundle_quantity)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', 'bundle_item', 'Forma Małpka 100 ml', 'published', '00000000-0000-0000-0000-000000000001', 6),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', 'bundle_item', 'Forma Serce 100 ml', 'published', '00000000-0000-0000-0000-000000000006', 1),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000030', 'bundle_item', 'Forma Małpka 100 ml', 'published', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000030', 'bundle_item', 'Forma Miś 130 ml', 'published', '00000000-0000-0000-0000-000000000002', 1),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000030', 'bundle_item', 'Forma Dracula 100 ml', 'published', '00000000-0000-0000-0000-000000000003', 1),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000030', 'bundle_item', 'Forma Kokos 100 ml', 'published', '00000000-0000-0000-0000-000000000005', 1),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000030', 'bundle_item', 'Forma Serce 100 ml', 'published', '00000000-0000-0000-0000-000000000006', 1)
on conflict (id) do update
set
  parent_id = excluded.parent_id,
  type = excluded.type,
  name = excluded.name,
  status = excluded.status,
  bundle_product_id = excluded.bundle_product_id,
  bundle_quantity = excluded.bundle_quantity;

insert into public.product_details (product_id, capacity_ml, material, care_instructions, model_storage_path, model_alt_text)
values
  ('00000000-0000-0000-0000-000000000001', 100, 'Silikon platynowy', array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.'], null, null),
  ('00000000-0000-0000-0000-000000000002', 130, 'Silikon platynowy', array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.'], null, null),
  ('00000000-0000-0000-0000-000000000003', 100, 'Silikon platynowy', array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.'], null, null),
  ('00000000-0000-0000-0000-000000000005', 100, 'Silikon platynowy', array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.'], 'products/forma-kokos-100-ml/kokos.glb', 'Interaktywny model 3D formy Kokos 100 ml')
on conflict (product_id) do update
set
  capacity_ml = excluded.capacity_ml,
  material = excluded.material,
  care_instructions = excluded.care_instructions,
  model_storage_path = excluded.model_storage_path,
  model_alt_text = excluded.model_alt_text;

insert into public.product_images (id, product_id, storage_path, alt_text, position)
values
  ('00000000-0000-0000-0000-000000001051', '00000000-0000-0000-0000-000000000005', 'products/forma-kokos-100-ml/front.webp', 'Forma Kokos 100 ml i gotowy korpus widziane z przodu', 0),
  ('00000000-0000-0000-0000-000000001052', '00000000-0000-0000-0000-000000000005', 'products/forma-kokos-100-ml/left.webp', 'Forma Kokos 100 ml i gotowy korpus widziane z lewej strony', 1),
  ('00000000-0000-0000-0000-000000001053', '00000000-0000-0000-0000-000000000005', 'products/forma-kokos-100-ml/right.webp', 'Forma Kokos 100 ml i gotowy korpus widziane z prawej strony', 2)
on conflict (id) do update
set
  product_id = excluded.product_id,
  storage_path = excluded.storage_path,
  alt_text = excluded.alt_text,
  position = excluded.position;
