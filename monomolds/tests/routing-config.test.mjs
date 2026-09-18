import assert from "node:assert/strict";
import test from "node:test";

import importedConfig from "../next.config.ts";

const nextConfig = importedConfig.default ?? importedConfig;

const publicToInternal = [
  ["/sklep/:path*", "/shop/:path*"],
  ["/zestawy/:path*", "/bundles/:path*"],
  ["/koszyk/:path*", "/cart/:path*"],
  ["/zamowienie/:path*", "/checkout/:path*"],
];

test("keeps Polish storefront URLs over English source routes", async () => {
  assert.equal(typeof nextConfig.rewrites, "function");
  assert.equal(typeof nextConfig.redirects, "function");

  const rewrites = await nextConfig.rewrites();
  const redirects = await nextConfig.redirects();

  assert.deepEqual(
    rewrites.map(({ source, destination }) => [source, destination]),
    publicToInternal,
  );
  assert.deepEqual(
    redirects.map(({ source, destination, permanent }) => [source, destination, permanent]),
    publicToInternal.map(([publicPath, internalPath]) => [internalPath, publicPath, true]),
  );
});
