import { notFound } from "next/navigation";

import { CatalogueDetailView } from "@/components/catalogue/catalogue-detail";
import { Notice } from "@/components/ui/feedback";
import { getPublishedCatalogueDetail } from "@/lib/catalogue/repository";

export const dynamic = "force-dynamic";

type BundlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BundlePageProps) {
  const { slug } = await params;
  const result = await getPublishedCatalogueDetail(slug, "bundle");

  if (result.status === "not-found") notFound();
  return result.status === "ready"
    ? { title: result.item.name, description: result.item.description ?? undefined }
    : { title: "Zestaw" };
}

export default async function BundlePage({ params }: BundlePageProps) {
  const { slug } = await params;
  const result = await getPublishedCatalogueDetail(slug, "bundle");

  if (result.status === "not-found") notFound();
  if (result.status === "unavailable") return <BundleDetailError />;

  return <CatalogueDetailView item={result.item} />;
}

function BundleDetailError() {
  return (
    <div className="site-container ui-page-shell">
      <p className="eyebrow">Zestaw</p>
      <h1>Karta zestawu jest chwilowo niedostępna</h1>
      <Notice tone="error" title="Nie udało się wczytać zestawu.">
        Odśwież stronę lub spróbuj ponownie za chwilę.
      </Notice>
    </div>
  );
}
