import { type NextRequest, NextResponse } from "next/server";

const DETAIL_ROUTE = /^\/(sklep|zestawy)\/([^/]+)$/;

export async function proxy(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") return NextResponse.next();

  const match = DETAIL_ROUTE.exec(request.nextUrl.pathname);
  if (!match) return NextResponse.next();

  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !key) return NextResponse.next();

  try {
    const productsUrl = new URL(configuredUrl);
    productsUrl.pathname = `${productsUrl.pathname.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")}/rest/v1/products`;
    productsUrl.searchParams.set("select", "id");
    productsUrl.searchParams.set("slug", `eq.${decodeURIComponent(match[2])}`);
    productsUrl.searchParams.set("status", "eq.published");
    productsUrl.searchParams.set("type", `eq.${match[1] === "sklep" ? "product" : "bundle"}`);
    productsUrl.searchParams.set("limit", "1");

    const response = await fetch(productsUrl, {
      method: "GET",
      headers: { apikey: key, authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.next();

    const records: unknown = await response.json();
    if (Array.isArray(records) && records.length === 0) {
      const notFoundUrl = request.nextUrl.clone();
      notFoundUrl.pathname = "/_not-found";
      return NextResponse.rewrite(notFoundUrl, { status: 404 });
    }
  } catch {
    // Let the page distinguish a temporary data failure from a missing record.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/sklep/:slug", "/zestawy/:slug"],
};
