-- Włącz RLS na wszystkich tabelach
alter table public.products enable row level security;
alter table public.discounts enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;


-- PUBLICZNY KATALOG
-- Anon oraz zalogowani użytkownicy mogą czytać
-- wyłącznie opublikowane produkty.

create policy "Public can read published products"
on public.products
for select
to anon, authenticated
using (
  status = 'published'
);