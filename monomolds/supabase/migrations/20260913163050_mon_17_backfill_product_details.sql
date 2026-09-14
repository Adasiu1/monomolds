insert into public.product_details (
  product_id,
  capacity_ml,
  material,
  care_instructions
)
select seed.product_id, seed.capacity_ml, seed.material, seed.care_instructions
from (
  values
    (
      '00000000-0000-0000-0000-000000000001'::uuid,
      100,
      'Silikon platynowy',
      array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.']::text[]
    ),
    (
      '00000000-0000-0000-0000-000000000002'::uuid,
      130,
      'Silikon platynowy',
      array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.']::text[]
    ),
    (
      '00000000-0000-0000-0000-000000000003'::uuid,
      100,
      'Silikon platynowy',
      array['Myć ciepłą wodą z płynem do naczyń i miękką gąbką.', 'Dokładnie wypłukać i pozostawić do wyschnięcia.']::text[]
    )
) as seed(product_id, capacity_ml, material, care_instructions)
where exists (
  select 1
  from public.products
  where products.id = seed.product_id
)
on conflict (product_id) do update
set
  capacity_ml = excluded.capacity_ml,
  material = excluded.material,
  care_instructions = excluded.care_instructions;

update public.products
set name = case id
  when '00000000-0000-0000-0000-000000000021' then 'Forma Małpka 100 ml'
  when '00000000-0000-0000-0000-000000000022' then 'Forma Serce 100 ml'
  else name
end
where id in (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000022'
);
