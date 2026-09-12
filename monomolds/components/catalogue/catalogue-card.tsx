import { ProductCard } from "@/components/ui/product-card";
import type { CatalogueItem } from "@/lib/catalogue/types";

export function CatalogueCard({ item }: { item: CatalogueItem }) {
  const href = item.kind === "bundle" ? `/zestawy/${item.slug}` : `/sklep/${item.slug}`;
  const availabilityLabel = {
    "in-stock": "Dostępna od ręki",
    "made-to-order": "Wykonywana na zamówienie",
    "available-to-order": "Dostępny do zamówienia",
  }[item.availability];

  return (
    <ProductCard
      product={{
        name: item.name,
        href,
        amountGrosze: item.priceGrosze,
        prefix: item.priceFrom ? "od" : undefined,
        available: item.available,
        availabilityLabel,
        featured: item.featuredRank !== null,
        capacitiesMl: item.capacitiesMl,
        buySeparatelyGrosze: item.buySeparatelyGrosze ?? undefined,
        savingsPercent: item.savingsPercent ?? undefined,
        image: item.image ? { src: item.image.url, alt: item.image.alt } : undefined,
      }}
    />
  );
}
