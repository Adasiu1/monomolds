/** Public, presentation-ready catalogue contract. UI never receives database rows. */
export type CatalogueImage = {
  id: string;
  url: string;
  alt: string;
};

export type CatalogueMedia =
  | ({ kind: "image" } & CatalogueImage)
  | {
      kind: "model";
      id: string;
      url: string;
      alt: string;
      posterUrl: string | null;
    };

export type CatalogueVariant = {
  id: string;
  name: string;
  priceGrosze: number;
  netPriceGrosze: number;
  stockQuantity: number;
  available: boolean;
};

export type CatalogueBundleItem = {
  id: string;
  merchandiseId: string;
  productSlug: string;
  name: string;
  quantity: number;
  unitPriceGrosze: number;
  linePriceGrosze: number;
};

export type CatalogueOfferAvailability =
  | { status: "in-stock"; fulfilmentDays: null }
  | { status: "made-to-order"; fulfilmentDays: number }
  | { status: "unavailable"; fulfilmentDays: null };

export type CatalogueOffer = {
  merchandiseId: string;
  label: string | null;
  priceGrosze: number;
  netPriceGrosze: number;
  originalPriceGrosze: number | null;
  currency: "PLN";
  availability: CatalogueOfferAvailability;
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
  netPriceGrosze: number;
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
  physicalItemCount: number;
  availability: CatalogueAvailability;
};

export type CatalogueDetail = CatalogueItem & {
  media: CatalogueMedia[];
  variants: CatalogueVariant[];
  bundleItems: CatalogueBundleItem[];
  capacityMl: number | null;
  material: string | null;
  careInstructions: string[];
  offers: CatalogueOffer[];
  defaultMerchandiseId: string;
};

export type CatalogueDetailResult =
  | { status: "ready"; item: CatalogueDetail }
  | { status: "not-found" }
  | { status: "unavailable" };
