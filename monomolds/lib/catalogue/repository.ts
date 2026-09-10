import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

import type {
  CatalogueBundleItem,
  CatalogueDetail,
  CatalogueImage,
  CatalogueItem,
  CatalogueVariant,
} from "./types";

const IMAGE_BUCKET = "product-images";
const IMAGE_URL_TTL_SECONDS = 60 * 60;

export class CatalogueRepositoryError extends Error {
  constructor() {
    super("Nie udało się pobrać katalogu.");
  }
}

type ImageRow = { storage_path: string; alt_text: string; position: number };
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductWithImages = ProductRow & { product_images: ImageRow[] | null };
type ProductWithRelations = ProductWithImages & {
  variants: ProductRow[] | null;
  bundle_items: ProductRow[] | null;
};

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Catalogue configuration is missing required Supabase public environment variables.");
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

async function makeImages(rows: ProductWithImages[]): Promise<Map<string, CatalogueImage | null>> {
  const paths = rows.flatMap((product) => product.product_images?.map((image) => image.storage_path) ?? []);
  const urls = await signImages(paths);

  return new Map(rows.map((product) => {
    const image = [...(product.product_images ?? [])].sort((a, b) => a.position - b.position)[0];
    return [product.id, image && urls.get(image.storage_path) ? { url: urls.get(image.storage_path)!, alt: image.alt_text } : null];
  }));
}

function toItem(product: ProductRow, image: CatalogueImage | null): CatalogueItem {
  if (!product.slug || product.price === null || (product.type !== "product" && product.type !== "bundle")) {
    console.error("Catalogue contained an invalid published record.", { productId: product.id });
    throw new CatalogueRepositoryError();
  }

  return {
    id: product.id,
    slug: product.slug,
    kind: product.type,
    name: product.name,
    description: product.description,
    priceGrosze: product.price,
    currency: "PLN",
    // Published moulds remain orderable at zero stock because they are made to order.
    available: true,
    image,
  };
}

export async function getPublishedCatalogue(kind: CatalogueItem["kind"]): Promise<CatalogueItem[]> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("id, slug, name, description, price, currency, stock_quantity, type, parent_id, bundle_product_id, created_at, updated_at, product_images(storage_path, alt_text, position)")
    .eq("status", "published")
    .eq("type", kind)
    .order("created_at", { ascending: false });

  if (error || !data) {
    reportDataError("list-catalogue", error);
    throw new CatalogueRepositoryError();
  }

  const products = data as ProductWithImages[];
  const images = await makeImages(products);
  return products.map((product) => toItem(product, images.get(product.id) ?? null));
}

export async function getPublishedCatalogueItem(slug: string, kind: CatalogueItem["kind"]): Promise<CatalogueDetail | null> {
  const client = getClient();
  const { data, error } = await client
    .from("products")
    .select("id, slug, name, description, price, currency, stock_quantity, type, parent_id, bundle_product_id, created_at, updated_at, product_images(storage_path, alt_text, position), variants:products!products_parent_id_fkey(id, name, price, stock_quantity, status, type), bundle_items:products!products_parent_id_fkey(id, name, status, type)")
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
  const image = (await makeImages([product])).get(product.id) ?? null;
  const item = toItem(product, image);
  const variants: CatalogueVariant[] = (product.variants ?? [])
    .filter((variant) => variant.type === "variant" && variant.status === "published" && variant.price !== null)
    .map((variant) => ({ id: variant.id, name: variant.name, priceGrosze: variant.price!, available: true }));
  const bundleItems: CatalogueBundleItem[] = (product.bundle_items ?? [])
    .filter((bundleItem) => bundleItem.type === "bundle_item" && bundleItem.status === "published")
    .map((bundleItem) => ({ id: bundleItem.id, name: bundleItem.name }));

  return { ...item, variants, bundleItems };
}
