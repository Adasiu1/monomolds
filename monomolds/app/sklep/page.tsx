import { connection } from "next/server";

import { CatalogueCard } from "@/components/catalogue/catalogue-card";
import { CatalogueControls } from "@/components/catalogue/catalogue-controls";
import { RetryButton } from "@/components/catalogue/retry-button";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import {
  filterAndSortCatalogue,
  getCatalogueFilterOptions,
  parseCatalogueFilters,
  type CatalogueSearchParams,
} from "@/lib/catalogue/presentation";
import { CatalogueRepositoryError, getPublishedCatalogue } from "@/lib/catalogue/repository";
import type { CatalogueItem } from "@/lib/catalogue/types";

export const metadata = { title: "Formy" };

type FormsPageProps = {
  searchParams: Promise<CatalogueSearchParams>;
};

export default async function FormsPage({ searchParams }: FormsPageProps) {
  await connection();
  let products: CatalogueItem[] | null;
  try {
    products = await getPublishedCatalogue("product");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    products = null;
  }
  if (!products) return <CatalogueError />;

  const filters = parseCatalogueFilters(await searchParams);
  const visibleProducts = filterAndSortCatalogue(products, filters);
  const options = getCatalogueFilterOptions(products);

  return (
    <div className="site-container catalogue-page">
      <header className="catalogue-header">
        <p className="eyebrow">Ręcznie wykonywane w Polsce</p>
        <h1>Formy</h1>
        <p>Pojedyncze formy silikonowe odlewane w małej pracowni Mono Molds.</p>
      </header>

      {products.length > 0 ? (
        <>
          <CatalogueControls
            key={`${filters.sort}:${filters.themes.join(",")}:${filters.capacitiesMl.join(",")}`}
            filters={filters}
            themes={options.themes}
            capacitiesMl={options.capacitiesMl}
            resultCount={visibleProducts.length}
          />
          {visibleProducts.length > 0 ? (
            <ul className="ui-product-grid">
              {visibleProducts.map((product) => <li key={product.id}><CatalogueCard item={product} /></li>)}
            </ul>
          ) : (
            <EmptyState
              title="Nie znaleźliśmy pasujących form"
              action={<LinkButton href="/sklep" variant="secondary">Wyczyść filtry</LinkButton>}
            >
              Zmień wybrane motywy lub pojemności i spróbuj ponownie.
            </EmptyState>
          )}
        </>
      ) : (
        <EmptyState
          title="Nie ma jeszcze dostępnych form"
          action={<LinkButton href="/zestawy" variant="secondary">Zobacz zestawy</LinkButton>}
        >
          Wróć wkrótce lub zobacz przygotowane przez nas zestawy.
        </EmptyState>
      )}
    </div>
  );
}

function CatalogueError() {
  return (
    <div className="site-container catalogue-page">
      <header className="catalogue-header">
        <p className="eyebrow">Ręcznie wykonywane w Polsce</p>
        <h1>Formy</h1>
      </header>
      <Notice tone="error" title="Nie udało się wczytać produktów.">
        <p>Spróbuj ponownie. Jeśli problem nie zniknie, wróć do nas za chwilę.</p>
        <RetryButton />
      </Notice>
    </div>
  );
}
