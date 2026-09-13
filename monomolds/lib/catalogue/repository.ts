import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import type { Database } from "@/types/database";

import type {
  CatalogueBundleItem,
  CatalogueDetail,
  CatalogueDetailResult,
  CatalogueImage,
  CatalogueItem,
  CatalogueMedia,
  CatalogueOffer,
  CatalogueVariant,
} from "./types";

const IMAGE_BUCKET = "product-images";
const MODEL_BUCKET = "product-models";
const IMAGE_URL_TTL_SECONDS = 60 * 60;
const STANDARD_FULFILMENT_DAYS = 7;

export class CatalogueRepositoryError extends Error {
  constructor() {
    super("Nie udało się pobrać katalogu.");
  }
}

type ImageRow = { id: string; storage_path: string; alt_text: string; position: number };
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductDetailsRow = Database["public"]["Tables"]["product_details"]["Row"];
type ProductWithImages = ProductRow & { product_images: ImageRow[] | null };
type ProductWithRelations = ProductWithImages & {
  product_details: ProductDetailsRow | ProductDetailsRow[] | null;
};

function getClient() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configuredUrl || !key) {
    console.error("Catalogue configuration is missing required Supabase public environment variables.");
    throw new CatalogueRepositoryError();
  }

  let url: string;
  try {
    const parsedUrl = new URL(configuredUrl);
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    url = parsedUrl.toString().replace(/\/$/, "");
  } catch {
    console.error("Catalogue configuration contains an invalid Supabase URL.");
    throw new CatalogueRepositoryError();
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function reportDataError(operation: string, error: { code?: string; status?: number } | null) {
  // Do not log query values, headers, URLs with tokens, or Supabase error messages.
  console.error("Catalogue data request failed.", {
    operation,
    code: error?.code ?? "unknown",
    status: error?.status ?? "unknown",
  });
}

async function signImages(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const client = getClient();
  const { data, error } = await client.storage
    .from(IMAGE_BUCKET)
    .createSignedUrls(paths, IMAGE_URL_TTL_SECONDS);

  if (error || !data) {
    reportDataError("sign-images", error);
    throw new CatalogueRepositoryError();
  }

  return new Map(data.flatMap((image) => image.path && image.signedUrl ? [[image.path, image.signedUrl] as const] : []));
}

async function makeImages(rows: ProductWithImages[]): Promise<Map<string, CatalogueImage[]>> {
  const paths = rows.flatMap((product) => product.product_images?.map((image) => image.storage_path) ?? []);
  const urls = await signImages(paths);

  return new Map(rows.map((product) => {
    const images = [...(product.product_images ?? [])]
      .sort((left, right) => left.position - right.position)
      .flatMap((image) => {
        const url = urls.get(image.storage_path);
        return url ? [{ id: image.id, url, alt: image.alt_text }] : [];
      });
    return [product.id, images];
  }));
}

function toItem(
  product: ProductRow,
  image: CatalogueImage | null,
  variants: ProductRow[] = [],
): CatalogueItem {
  const publishedVariants = variants.filter(
    (variant) =>
      variant.type === "variant" &&
      variant.status === "published" &&
      variant.price !== null,
  );
  const prices = publishedVariants.map((variant) => variant.price!);

  if (
    !product.slug ||
    (product.price === null && prices.length === 0) ||
    product.currency !== "PLN" ||
    (product.type !== "product" && product.type !== "bundle")
  ) {
    console.error("Catalogue contained an invalid published record.", { productId: product.id });
    throw new CatalogueRepositoryError();
  }

  const displayPrice = prices.length > 0 ? Math.min(...prices) : product.price!;

  return {
    id: product.id,
    slug: product.slug,
    kind: product.type,
    name: product.name,
    description: product.description,
    priceGrosze: displayPrice,
    currency: product.currency,
    // Published moulds remain orderable at zero stock because they are made to order.
    available: true,
    image,
    createdAt: product.created_at,
    // MON-41 will populate these fields from structured catalogue data.
    featuredRank: null,
    themes: [],
    capacitiesMl: [],
    priceFrom: publishedVariants.length > 1,
    buySeparatelyGrosze: null,
    savingsPercent: null,
    availability:
      product.type === "bundle"
        ? "available-to-order"
        : product.stock_quantity > 0
          ? "in-stock"
          : "made-to-order",
  };
}

export async function getPublishedCatalogue(kind: CatalogueItem["kind"]): Promise<CatalogueItem[]> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("id, slug, name, description, price, currency, stock_quantity, type, parent_id, bundle_product_id, bundle_quantity, created_at, updated_at, product_images(id, storage_path, alt_text, position)")
    .eq("status", "published")
    .eq("type", kind)
    .order("created_at", { ascending: false });

  if (error || !data) {
    reportDataError("list-catalogue", error);
    throw new CatalogueRepositoryError();
  }

  const products = data as ProductWithImages[];
  const variantsByParent = new Map<string, ProductRow[]>();
  if (products.length > 0) {
    const { data: variantData, error: variantError } = await client
      .from("products")
      .select("id, slug, name, description, price, currency, stock_quantity, type, parent_id, bundle_product_id, bundle_quantity, created_at, updated_at")
      .eq("status", "published")
      .eq("type", "variant")
      .in("parent_id", products.map((product) => product.id));

    if (variantError || !variantData) {
      reportDataError("list-catalogue-variants", variantError);
      throw new CatalogueRepositoryError();
    }
    for (const variant of variantData as ProductRow[]) {
      if (!variant.parent_id) continue;
      const siblings = variantsByParent.get(variant.parent_id) ?? [];
      siblings.push(variant);
      variantsByParent.set(variant.parent_id, siblings);
    }
  }

  const images = await makeImages(products);
  return products.map((product) =>
    toItem(product, images.get(product.id)?.[0] ?? null, variantsByParent.get(product.id) ?? []),
  );
}

async function loadPublishedCatalogueItem(slug: string, kind: CatalogueItem["kind"]): Promise<CatalogueDetail | null> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("id, slug, name, description, price, currency, stock_quantity, type, parent_id, bundle_product_id, bundle_quantity, created_at, updated_at, product_images(id, storage_path, alt_text, position), product_details(capacity_ml, material, care_instructions, model_storage_path, model_alt_text, product_id)")
    .eq("status", "published")
    .eq("type", kind)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    reportDataError("get-catalogue-item", error);
    throw new CatalogueRepositoryError();
  }
  if (!data) return null;

  const product = data as ProductWithRelations;
  const { data: childData, error: childError } = await client
    .from("products")
    .select("id, slug, name, description, price, currency, stock_quantity, status, type, parent_id, bundle_product_id, bundle_quantity, created_at, updated_at")
    .eq("parent_id", product.id)
    .eq("status", "published")
    .in("type", ["variant", "bundle_item"]);

  if (childError || !childData) {
    reportDataError("get-catalogue-item-children", childError);
    throw new CatalogueRepositoryError();
  }

  const children = childData as ProductRow[];
  const images = (await makeImages([product])).get(product.id) ?? [];
  const item = toItem(product, images[0] ?? null, children);
  const variants: CatalogueVariant[] = children
    .filter((variant) => variant.type === "variant" && variant.status === "published" && variant.price !== null)
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      priceGrosze: variant.price!,
      stockQuantity: variant.stock_quantity,
      available: true,
    }));
  const bundleItems: CatalogueBundleItem[] = children
    .filter((bundleItem) => bundleItem.type === "bundle_item" && bundleItem.status === "published")
    .map((bundleItem) => ({ id: bundleItem.id, name: bundleItem.name, quantity: bundleItem.bundle_quantity ?? 1 }));

  const details = Array.isArray(product.product_details)
    ? product.product_details[0] ?? null
    : product.product_details;
  const model = details?.model_storage_path && details.model_alt_text
    ? client.storage.from(MODEL_BUCKET).getPublicUrl(details.model_storage_path).data.publicUrl
    : null;
  const media: CatalogueMedia[] = [
    ...images.map((image) => ({ kind: "image" as const, ...image })),
    ...(model && details?.model_alt_text
      ? [{
          kind: "model" as const,
          id: `${product.id}-model`,
          url: model,
          alt: details.model_alt_text,
          posterUrl: images[0]?.url ?? null,
        }]
      : []),
  ];
  const variantOffers: CatalogueOffer[] = variants.map((variant) => ({
    merchandiseId: variant.id,
    label: variant.name,
    priceGrosze: variant.priceGrosze,
    currency: "PLN",
    availability: !variant.available
      ? { status: "unavailable", fulfilmentDays: null }
      : variant.stockQuantity > 0
        ? { status: "in-stock", fulfilmentDays: null }
        : { status: "made-to-order", fulfilmentDays: STANDARD_FULFILMENT_DAYS },
  }));
  const offers: CatalogueOffer[] = variantOffers.length > 0
    ? variantOffers
    : [{
        merchandiseId: product.id,
        label: null,
        priceGrosze: item.priceGrosze,
        currency: "PLN",
        availability: product.stock_quantity > 0
          ? { status: "in-stock", fulfilmentDays: null }
          : { status: "made-to-order", fulfilmentDays: STANDARD_FULFILMENT_DAYS },
      }];

  return {
    ...item,
    media,
    variants,
    bundleItems,
    capacityMl: details?.capacity_ml ?? null,
    material: details?.material ?? null,
    careInstructions: details?.care_instructions ?? [],
    offers,
    defaultMerchandiseId: offers[0].merchandiseId,
  };
}

export const getPublishedCatalogueItem = cache(loadPublishedCatalogueItem);

export async function getPublishedCatalogueDetail(
  slug: string,
  kind: CatalogueItem["kind"],
): Promise<CatalogueDetailResult> {
  try {
    const item = await getPublishedCatalogueItem(slug, kind);
    return item ? { status: "ready", item } : { status: "not-found" };
  } catch (error) {
    if (!(error instanceof CatalogueRepositoryError)) throw error;
    return { status: "unavailable" };
  }
}
