import type { ReactNode } from "react";

import { formatPrice } from "@/lib/format-price";

import { PageTransitionLink } from "../page-transition";
import { Price, type PriceProps } from "./price";
import { ProductImage } from "./product-image";

export type ProductCardData = PriceProps & {
  name: string;
  href: string;
  image?: { src: string; alt: string };
  description?: string;
  available: boolean;
  availabilityLabel?: string;
  featured?: boolean;
  capacitiesMl?: number[];
  buySeparatelyGrosze?: number;
  savingsPercent?: number;
};

// One reusable product tile. This card does not fetch data or add items to a cart.
/** Presentation-only card. The parent owns data fetching, cart actions and inventory rules. */
export function ProductCard({ product, action }: { product: ProductCardData; action?: ReactNode }) {
  return <article className="ui-product-card">
    <PageTransitionLink href={product.href} className="ui-product-link">
      <div className="ui-product-media">
        <ProductImage src={product.image?.src} alt={product.image?.alt ?? product.name} />
        {product.featured ? <span className="ui-featured-badge" aria-label="Produkt polecany"><span aria-hidden="true">★</span> Polecane</span> : null}
      </div>
      <h3>{product.name}</h3>
      <Price amountGrosze={product.amountGrosze} originalAmountGrosze={product.originalAmountGrosze} lowest30DaysGrosze={product.lowest30DaysGrosze} prefix={product.prefix} />
      {product.buySeparatelyGrosze !== undefined && product.buySeparatelyGrosze > product.amountGrosze ? <div className="ui-bundle-saving">
        <p>Kupowane osobno: <del>{formatPrice(product.buySeparatelyGrosze)}</del></p>
        {product.savingsPercent ? <span className="ui-badge">Oszczędzasz {product.savingsPercent}%</span> : null}
      </div> : null}
      {product.capacitiesMl && product.capacitiesMl.length > 0 ? <ul className="ui-capacity-list" aria-label="Dostępne pojemności">
        {product.capacitiesMl.map((capacity) => <li key={capacity}>{capacity} ml</li>)}
      </ul> : null}
      <p className="ui-availability">{product.availabilityLabel ?? (product.available ? "Dostępna" : "Chwilowo niedostępna")}</p>
      <span className="ui-product-action">Zobacz szczegóły <span aria-hidden="true">→</span></span>
    </PageTransitionLink>
    {action}
  </article>;
}
