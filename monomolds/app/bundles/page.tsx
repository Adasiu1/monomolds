import { connection } from "next/server";

import { CatalogueCard } from "@/components/catalogue/catalogue-card";
import { RetryButton } from "@/components/catalogue/retry-button";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, Notice } from "@/components/ui/feedback";
import { CatalogueRepositoryError, getPublishedCatalogue } from "@/lib/catalogue/repository";
import type { CatalogueItem } from "@/lib/catalogue/types";

export const metadata = { title: "Zestawy" };

export default async function BundlesPage() {
  await connection();
  let bundles: CatalogueItem[] | null;
  try {
    bundles = await getPublishedCatalogue("bundle");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    bundles = null;
  }
  if (!bundles) return <CatalogueError />;

  return (
    <div className="site-container catalogue-page">
      <header className="catalogue-header">
        <p className="eyebrow">Gotowe komplety</p>
        <h1>Zestawy</h1>
        <p>Wybrane formy zebrane w jeden zestaw i opisane bez niedomówień.</p>
      </header>

      {bundles.length > 0 ? (
        <section aria-labelledby="bundle-results-title">
          <p id="bundle-results-title" className="catalogue-result-count">
            {formatBundleCount(bundles.length)}
          </p>
          <ul className="ui-product-grid">
            {bundles.map((bundle) => <li key={bundle.id}><CatalogueCard item={bundle} /></li>)}
          </ul>
        </section>
      ) : (
        <EmptyState
          title="Nie ma jeszcze dostępnych zestawów"
          action={<LinkButton href="/sklep" variant="secondary">Zobacz formy</LinkButton>}
        >
          Wróć wkrótce lub wybierz pojedyncze formy z katalogu.
        </EmptyState>
      )}
    </div>
  );
}

function formatBundleCount(count: number) {
  if (count === 1) return "1 zestaw";
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} zestawy`;
  }
  return `${count} zestawów`;
}

function CatalogueError() {
  return (
    <div className="site-container catalogue-page">
      <header className="catalogue-header">
        <p className="eyebrow">Gotowe komplety</p>
        <h1>Zestawy</h1>
      </header>
      <Notice tone="error" title="Nie udało się wczytać zestawów.">
        <p>Spróbuj ponownie. Jeśli problem nie zniknie, wróć do nas za chwilę.</p>
        <RetryButton />
      </Notice>
    </div>
  );
}
