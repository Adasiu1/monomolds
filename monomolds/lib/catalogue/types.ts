/** Public, presentation-ready catalogue contract. UI never receives database rows. */
export type CatalogueImage = {
  url: string;
  alt: string;
};

export type CatalogueVariant = {
  id: string;
  name: string;
  priceGrosze: number;
  available: boolean;
};

export type CatalogueBundleItem = {
  id: string;
  name: string;
};

export type CatalogueItem = {
  id: string;
  slug: string;
  kind: "product" | "bundle";
  name: string;
  description: string | null;
  priceGrosze: number;
  currency: "PLN";
  available: boolean;
  image: CatalogueImage | null;
};

export type CatalogueDetail = CatalogueItem & {
  variants: CatalogueVariant[];
  bundleItems: CatalogueBundleItem[];
};
