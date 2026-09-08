import { ProductCard } from "@/components/ui/product-card";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { getPublishedCatalogue, CatalogueRepositoryError } from "@/lib/catalogue/repository";
import type { CatalogueItem } from "@/lib/catalogue/types";

export const metadata = { title: "Formy" };
export const dynamic = "force-dynamic";

export default async function FormsPage() {
  let products: CatalogueItem[] | null;
  try {
    products = await getPublishedCatalogue("product");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    products = null;
  }
  if (!products) return <CatalogueError />;

  return <div className="site-container py-12 sm:py-20"><p className="eyebrow">Ręcznie wykonywane w Polsce</p><h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Formy</h1><p className="mt-6 max-w-xl leading-7 text-[var(--muted)]">Poznaj ręcznie wykonywane formy silikonowe Mono Molds.</p>{products.length > 0 ? <div className="ui-product-grid">{products.map((product) => <ProductCard key={product.id} product={{ name: product.name, href: `/sklep/${product.slug}`, description: product.description ?? undefined, amountGrosze: product.priceGrosze, available: product.available, image: product.image ? { src: product.image.url, alt: product.image.alt } : undefined }} />)}</div> : <EmptyState title="Nie ma jeszcze dostępnych form">Wróć wkrótce - pracujemy nad kolekcją.</EmptyState>}</div>;
}

function CatalogueError() {
  return (
    <div className="site-container py-12 sm:py-20">
      <p className="eyebrow">Formy</p>
      <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">Katalog jest chwilowo niedostępny</h1>
      <Notice tone="error" title="Nie udało się wczytać produktów.">Odśwież stronę lub spróbuj ponownie za chwilę.</Notice>
    </div>
  );
}
