create table public.orders (
  id uuid primary key default gen_random_uuid(),

  email text not null,

  status text not null default 'pending'
    check (status in (
      'pending',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled'
    )),

  items jsonb not null default '[]'::jsonb,

  shipping_address jsonb not null,

  subtotal integer not null
    check (subtotal >= 0),

  discount_total integer not null default 0
    check (discount_total >= 0),

  total integer not null
    check (total >= 0),

  currency text not null default 'PLN'
    check (currency = 'PLN'),

  discount_code text,

  created_at timestamptz not null default now()
);