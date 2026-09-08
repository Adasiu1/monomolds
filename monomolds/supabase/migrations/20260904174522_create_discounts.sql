create table public.discounts (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,

  type text not null
    check (type in ('percentage', 'fixed')),

  value integer not null
    check (value > 0),

  active boolean not null default true,

  created_at timestamptz not null default now()
);