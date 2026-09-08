import { ProductCard } from "@/components/ui/product-card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { CatalogueRepositoryError, getPublishedCatalogue } from "@/lib/catalogue/repository";
import type { CatalogueItem } from "@/lib/catalogue/types";

export const metadata = { title: "Zestawy" };
export const dynamic = "force-dynamic";

export default async function BundlesPage() {
  let bundles: CatalogueItem[] | null;
  try {
    bundles = await getPublishedCatalogue("bundle");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    bundles = null;
  }
  if (!bundles) return <div className="site-container py-12 sm:py-20"><p className="eyebrow">Zestawy</p><h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Katalog jest chwilowo niedostępny</h1><Notice tone="error" title="Nie udało się wczytać zestawów.">Odśwież stronę lub spróbuj ponownie za chwilę.</Notice></div>;
  return <div className="site-container py-12 sm:py-20"><p className="eyebrow">Mono Molds</p><h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Zestawy</h1><p className="mt-6 max-w-xl leading-7 text-[var(--muted)]">Gotowe zestawy form, z jasno opisanym składem.</p>{bundles.length > 0 ? <div className="ui-product-grid">{bundles.map((bundle) => <ProductCard key={bundle.id} product={{ name: bundle.name, href: `/zestawy/${bundle.slug}`, description: bundle.description ?? undefined, amountGrosze: bundle.priceGrosze, available: bundle.available, image: bundle.image ? { src: bundle.image.url, alt: bundle.image.alt } : undefined }} />)}</div> : <EmptyState title="Nie ma jeszcze dostępnych zestawów">Wróć wkrótce - pracujemy nad kolekcją.</EmptyState>}</div>;
}
