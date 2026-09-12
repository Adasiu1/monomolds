import { BrandLoader } from "@/components/ui/brand-loader";

export function CatalogueLoading({ title }: { title: string }) {
  return (
    <div className="ui-site-loading" aria-busy="true">
      <BrandLoader label={`Wczytujemy ${title.toLocaleLowerCase()}...`} />
    </div>
  );
}
