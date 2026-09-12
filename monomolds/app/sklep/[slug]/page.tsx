import { notFound } from "next/navigation";

import { Notice } from "@/components/ui/feedback";
import { Price } from "@/components/ui/price";
import { ProductImage } from "@/components/ui/product-image";
import { CatalogueRepositoryError, getPublishedCatalogueItem } from "@/lib/catalogue/repository";
import type { CatalogueDetail } from "@/lib/catalogue/types";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  try {
    const product = await getPublishedCatalogueItem(slug, "product");
    return product ? { title: product.name, description: product.description ?? undefined } : {};
  } catch {
    return { title: "Forma" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let product: CatalogueDetail | null | undefined;
  try {
    product = await getPublishedCatalogueItem(slug, "product");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    product = undefined;
  }
  if (product === undefined) return <DetailError />;
  if (!product) notFound();
  return <CatalogueDetail kindLabel="Forma" product={product} />;
}

function CatalogueDetail({ kindLabel, product }: { kindLabel: string; product: CatalogueDetail }) {
  return <div className="site-container grid gap-10 py-12 sm:py-20 lg:grid-cols-2 lg:gap-16">
    <div className="ui-product-media aspect-square">{product.image ? <ProductImage src={product.image.url} alt={product.image.alt} /> : <ProductImage alt={product.name} />}</div>
    <article className="max-w-xl">
      <p className="eyebrow">{kindLabel}</p>
      <h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">{product.name}</h1>
      {product.description ? <p className="mt-6 leading-7 text-[var(--muted)]">{product.description}</p> : null}
      <div className="mt-8"><Price amountGrosze={product.priceGrosze} /></div>
      <p className="mt-4 text-sm text-[var(--muted)]">{product.available ? "Dostępna" : "Chwilowo niedostępna"}</p>
      {product.variants.length > 0 ? <section className="mt-10"><h2 className="text-xl font-medium">Warianty</h2><ul className="mt-4 grid gap-3">{product.variants.map((variant) => <li key={variant.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap justify-between gap-3"><span>{variant.name}</span><Price amountGrosze={variant.priceGrosze} /></div><p className="mt-2 text-sm text-[var(--muted)]">{variant.available ? "Dostępny" : "Chwilowo niedostępny"}</p></li>)}</ul></section> : null}
    </article>
  </div>;
}

function DetailError() {
  return <div className="site-container ui-page-shell"><p className="eyebrow">Forma</p><h1>Karta produktu jest chwilowo niedostępna</h1><Notice tone="error" title="Nie udało się wczytać produktu.">Odśwież stronę lub spróbuj ponownie za chwilę.</Notice></div>;
}
