insert into public.products (id, type, slug, name, description, price, currency, stock_quantity, status)
values
  ('00000000-0000-0000-0000-000000000001', 'product', 'forma-malpka-100-ml', 'Forma Małpka 100 ml', 'Forma silikonowa Małpka o pojemności 100 ml.', 5000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000002', 'product', 'forma-serce-130-ml', 'Forma Serce 130 ml', 'Forma silikonowa Serce o pojemności 130 ml.', 5500, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000003', 'product', 'forma-kostka-500-ml', 'Forma Kostka 500 ml', 'Forma silikonowa Kostka o pojemności 500 ml.', 9000, 'PLN', 0, 'published'),
  ('00000000-0000-0000-0000-000000000004', 'product', 'secret-monkey', 'Secret Monkey', 'Produkt tylko do testowania RLS.', 9999, 'PLN', 5, 'draft'),
  ('00000000-0000-0000-0000-000000000020', 'bundle', 'starter-set', 'Starter Set', 'Zestaw startowy foremek.', 9999, 'PLN', 5, 'published');

insert into public.products (id, parent_id, type, name, price, currency, stock_quantity, status)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'variant', 'Archiwalny wariant Małpki - 6 szt.', 4999, 'PLN', 0, 'archived'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'variant', 'Archiwalny wariant Małpki - 12 szt.', 7999, 'PLN', 0, 'archived');

insert into public.products (id, parent_id, type, name, status)
values
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000020', 'bundle_item', 'Monkey - 6 szt.', 'published'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000020', 'bundle_item', 'Heart', 'published');
