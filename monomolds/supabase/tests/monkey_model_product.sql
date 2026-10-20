begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select is(
  (select model_storage_path from public.product_details where product_id = '00000000-0000-0000-0000-000000000001'),
  'products/forma-malpka-100-ml/monkey.glb',
  'Małpka uses its product-scoped 3D model'
);
select is(
  (select model_alt_text from public.product_details where product_id = '00000000-0000-0000-0000-000000000001'),
  'Model 3D formy Małpka 100 ml',
  'Małpka model has Polish alternative text'
);

select * from finish();
rollback;
