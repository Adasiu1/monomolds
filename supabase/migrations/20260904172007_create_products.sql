create table public.products (
  id uuid primary key default gen_random_uuid(),

  parent_id uuid references public.products(id) on delete cascade,

  type text not null
    check (type in ('product', 'variant', 'bundle', 'bundle_item')),

  slug text unique,
  name text not null,
  description text,

  price integer
    check (price >= 0),

  currency text not null default 'PLN'
    check (currency = 'PLN'),

  stock_quantity integer not null default 0
    check (stock_quantity >= 0),

  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
    
  bundle_product_id uuid references public.products(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);