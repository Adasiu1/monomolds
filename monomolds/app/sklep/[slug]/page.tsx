import { notFound } from "next/navigation";

import { CatalogueDetailView } from "@/components/catalogue/catalogue-detail";
import { Notice } from "@/components/ui/feedback";
import { getPublishedCatalogueDetail } from "@/lib/catalogue/repository";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getPublishedCatalogueDetail(slug, "product");

  if (result.status === "not-found") notFound();
  return result.status === "ready"
    ? { title: result.item.name, description: result.item.description ?? undefined }
    : { title: "Forma" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getPublishedCatalogueDetail(slug, "product");

  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <ProductDetailError />;

  return <CatalogueDetailView item={result.item} />;
}

function ProductDetailError() {
  return (
    <div className="site-container ui-page-shell">
      <p className="eyebrow">Forma</p>
      <h1>Karta produktu jest chwilowo niedostępna</h1>
      <Notice tone="error" title="Nie udało się wczytać produktu.">
        Odśwież stronę lub spróbuj ponownie za chwilę.
      </Notice>
    </div>
  );
}
