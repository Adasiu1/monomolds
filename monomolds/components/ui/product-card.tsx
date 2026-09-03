import Link from "next/link";
import type { ReactNode } from "react";
import { Price, type PriceProps } from "./price";
import { ProductImage } from "./product-image";

export type ProductCardData = PriceProps & {
  name: string;
  href: string;
  image?: { src: string; alt: string };
  description?: string;
  available: boolean;
};

// One reusable product tile. The page supplies product details and the bottom button.
// This card does not fetch data or add items to a cart.
/** Presentation-only card. The parent owns data fetching, cart actions and inventory rules. */
export function ProductCard({ product, action }: { product: ProductCardData; action?: ReactNode }) {
  return <article className="ui-product-card">
    <Link href={product.href} className="ui-product-link">
      <div className="ui-product-media"><ProductImage src={product.image?.src} alt={product.image?.alt ?? product.name} /></div>
      <h3>{product.name}</h3>
    </Link>
    {product.description ? <p className="ui-muted">{product.description}</p> : null}
    <Price amountGrosze={product.amountGrosze} originalAmountGrosze={product.originalAmountGrosze} lowest30DaysGrosze={product.lowest30DaysGrosze} />
    <p className="ui-availability">{product.available ? "Dostępna" : "Chwilowo niedostępna"}</p>
    {action}
  </article>;
}
