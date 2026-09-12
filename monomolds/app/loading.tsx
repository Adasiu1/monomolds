import { BrandLoader } from "@/components/ui/brand-loader";

export default function Loading() {
  return (
    <div className="ui-site-loading" aria-busy="true">
      <BrandLoader label="Przygotowujemy stronę..." />
    </div>
  );
}
