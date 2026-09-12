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

export type CatalogueTheme = {
  slug: string;
  name: string;
};

export type CatalogueAvailability = "in-stock" | "made-to-order" | "available-to-order";

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
  createdAt: string;
  featuredRank: 1 | 2 | 3 | null;
  themes: CatalogueTheme[];
  capacitiesMl: number[];
  priceFrom: boolean;
  buySeparatelyGrosze: number | null;
  savingsPercent: number | null;
  availability: CatalogueAvailability;
};

export type CatalogueDetail = CatalogueItem & {
  variants: CatalogueVariant[];
  bundleItems: CatalogueBundleItem[];
};
