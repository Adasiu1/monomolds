create table public.payment_events (
  id uuid primary key default gen_random_uuid(),

  order_id uuid not null
    references public.orders(id)
    on delete cascade,

  provider text not null,

  provider_event_id text not null,

  event_type text not null,

  status text not null,

  payload jsonb,

  created_at timestamptz not null default now(),

  unique (provider, provider_event_id)
);