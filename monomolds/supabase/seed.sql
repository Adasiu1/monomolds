-- Produkty
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
values
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'monkey',
  'Monkey',
  'Forma do monoporcji Monkey.',
  4999,
  'PLN',
  10,
  'published'
),
(
  '00000000-0000-0000-0000-000000000002',
  'product',
  'heart',
  'Heart',
  'Forma do monoporcji Heart.',
  4499,
  'PLN',
  8,
  'published'
),
(
  '00000000-0000-0000-0000-000000000003',
  'product',
  'cube',
  'Cube',
  'Forma do monoporcji Cube.',
  3999,
  'PLN',
  15,
  'published'
),
(
  '00000000-0000-0000-0000-000000000004',
  'product',
  'secret-monkey',
  'Secret Monkey',
  'Produkt tylko do testowania RLS.',
  9999,
  'PLN',
  5,
  'draft'
);

-- Warianty Monkey
insert into public.products (
  id,
  parent_id,
  type,
  name,
  price,
  currency,
  stock_quantity,
  status
)
values
(
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'variant',
  'Monkey - 6 szt.',
  4999,
  'PLN',
  10,
  'published'
),
(
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  'variant',
  'Monkey - 12 szt.',
  7999,
  'PLN',
  5,
  'published'
);

-- Zestaw
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
values
(
  '00000000-0000-0000-0000-000000000020',
  'bundle',
  'starter-set',
  'Starter Set',
  'Zestaw startowy fikcyjnych foremek.',
  9999,
  'PLN',
  5,
  'published'
);

-- Elementy zestawu
insert into public.products (
  id,
  parent_id,
  type,
  name,
  status
)
values
(
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000020',
  'bundle_item',
  'Monkey - 6 szt.',
  'published'
),
(
  '00000000-0000-0000-0000-000000000022',
  '00000000-0000-0000-0000-000000000020',
  'bundle_item',
  'Heart',
  'published'
);

-- Rabat
insert into public.discounts (
  code,
  type,
  value,
  active
)
values
(
  'MONKEY10',
  'percentage',
  10,
  true
);