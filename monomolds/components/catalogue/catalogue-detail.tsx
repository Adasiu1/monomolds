import Link from "next/link";

import { ProductGallery } from "@/components/catalogue/product-gallery";
import { PurchasePanel } from "@/components/catalogue/purchase-panel";
import { formatPrice } from "@/lib/format-price";
import type { CatalogueDetail } from "@/lib/catalogue/types";

export function CatalogueDetailView({ item }: { item: CatalogueDetail }) {
  const isBundle = item.kind === "bundle";

  return (
    <main className="site-container product-detail-page">
      <div className="product-detail-layout">
        <ProductGallery media={item.media} productName={item.name} />

        <article className="product-detail-info">
          <p className="eyebrow">{isBundle ? "Zestaw" : "Forma"}</p>
          <h1>{item.name}</h1>
          {item.description ? <p className="product-detail-description">{item.description}</p> : null}

          <PurchasePanel offers={item.offers} defaultMerchandiseId={item.defaultMerchandiseId} />

          {!isBundle && (item.capacityMl || item.material) ? (
            <section className="product-detail-section" aria-labelledby="product-parameters-heading">
              <h2 id="product-parameters-heading">Parametry</h2>
              <dl className="product-parameters">
                {item.capacityMl ? <div><dt>Pojemność</dt><dd>{item.capacityMl} ml</dd></div> : null}
                {item.material ? <div><dt>Materiał</dt><dd>{item.material}</dd></div> : null}
              </dl>
            </section>
          ) : null}

          {!isBundle && item.careInstructions.length > 0 ? (
            <section className="product-detail-section" aria-labelledby="product-care-heading">
              <h2 id="product-care-heading">Pielęgnacja</h2>
              <ul className="product-care-list">
                {item.careInstructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
              </ul>
            </section>
          ) : null}

          {isBundle ? (
            <section className="product-detail-section" aria-labelledby="bundle-contents-heading">
              <h2 id="bundle-contents-heading">W zestawie</h2>
              {item.bundleItems.length > 0 ? (
                <ul className="bundle-contents">
                  {item.bundleItems.map((bundleItem) => (
                    <li key={bundleItem.id}>
                      <Link href={`/sklep/${bundleItem.productSlug}`}>
                        <span>{bundleItem.name} <small>{formatPrice(bundleItem.unitPriceGrosze)} za szt.</small></span>
                        <strong>{bundleItem.quantity} szt. - {formatPrice(bundleItem.linePriceGrosze)}</strong>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ui-muted">Skład zestawu jest w przygotowaniu.</p>
              )}
            </section>
          ) : null}
        </article>
      </div>
    </main>
  );
}
