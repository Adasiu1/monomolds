import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Formy" };

export default function FormsPage() {
  return (
    <div className="site-container py-12 sm:py-20">
      <p className="eyebrow">Ręcznie wykonywane w Polsce</p>
      <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Formy</h1>
      <p className="mt-6 max-w-xl leading-7 text-[var(--muted)]">
        Przygotowujemy naszą kolekcję form silikonowych. Zdjęcia, modele 3D,
        wymiary i ceny pojawią się tutaj po uzupełnieniu katalogu.
      </p>
      <p className="mt-4 text-sm text-[var(--muted)]">Katalog i wyszukiwanie nie są jeszcze dostępne.</p>
      <LinkButton href="/" className="mt-8">
        Wróć na stronę główną <span aria-hidden="true">→</span>
      </LinkButton>
    </div>
  );
}
