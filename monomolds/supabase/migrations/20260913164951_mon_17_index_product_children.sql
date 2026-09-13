create index if not exists products_parent_id_idx
  on public.products (parent_id)
  where parent_id is not null;
