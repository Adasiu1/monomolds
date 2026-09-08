import { notFound } from "next/navigation";

import { Notice } from "@/components/ui/feedback";
import { Price } from "@/components/ui/price";
import { ProductImage } from "@/components/ui/product-image";
import { CatalogueRepositoryError, getPublishedCatalogueItem } from "@/lib/catalogue/repository";
import type { CatalogueDetail } from "@/lib/catalogue/types";

export const dynamic = "force-dynamic";

type BundlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BundlePageProps) {
  const { slug } = await params;
  try {
    const bundle = await getPublishedCatalogueItem(slug, "bundle");
    return bundle ? { title: bundle.name, description: bundle.description ?? undefined } : {};
  } catch {
    return { title: "Zestaw" };
  }
}

export default async function BundlePage({ params }: BundlePageProps) {
  const { slug } = await params;
  let bundle: CatalogueDetail | null | undefined;
  try {
    bundle = await getPublishedCatalogueItem(slug, "bundle");
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    bundle = undefined;
  }
  if (bundle === undefined) return <div className="site-container ui-page-shell"><p className="eyebrow">Zestaw</p><h1>Karta zestawu jest chwilowo niedostępna</h1><Notice tone="error" title="Nie udało się wczytać zestawu.">Odśwież stronę lub spróbuj ponownie za chwilę.</Notice></div>;
  if (!bundle) notFound();
  return <div className="site-container grid gap-10 py-12 sm:py-20 lg:grid-cols-2 lg:gap-16"><div className="ui-product-media aspect-square">{bundle.image ? <ProductImage src={bundle.image.url} alt={bundle.image.alt} /> : <ProductImage alt={bundle.name} />}</div><article className="max-w-xl"><p className="eyebrow">Zestaw</p><h1 className="mt-5 text-4xl font-medium tracking-tight sm:text-6xl">{bundle.name}</h1>{bundle.description ? <p className="mt-6 leading-7 text-[var(--muted)]">{bundle.description}</p> : null}<div className="mt-8"><Price amountGrosze={bundle.priceGrosze} /></div><p className="mt-4 text-sm text-[var(--muted)]">{bundle.available ? "Dostępny" : "Chwilowo niedostępny"}</p><section className="mt-10"><h2 className="text-xl font-medium">W zestawie</h2>{bundle.bundleItems.length > 0 ? <ul className="mt-4 grid gap-3">{bundle.bundleItems.map((item) => <li key={item.id} className="rounded-xl border border-[var(--border)] p-4">{item.name}</li>)}</ul> : <p className="mt-4 text-[var(--muted)]">Skład zestawu jest w przygotowaniu.</p>}</section><Notice title="Zakupy w przygotowaniu" announce={false}>Dodawanie do koszyka uruchomimy wkrótce.</Notice></article></div>;
}
