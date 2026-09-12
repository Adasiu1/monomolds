import assert from "node:assert/strict";
import test from "node:test";

import {
  filterAndSortCatalogue,
  getCatalogueFilterOptions,
  parseCatalogueFilters,
} from "../lib/catalogue/presentation.ts";

function item(overrides) {
  return {
    id: overrides.id,
    slug: overrides.id,
    kind: "product",
    name: overrides.name,
    description: null,
    priceGrosze: overrides.priceGrosze,
    currency: "PLN",
    available: true,
    image: null,
    createdAt: overrides.createdAt,
    featuredRank: overrides.featuredRank ?? null,
    themes: overrides.themes ?? [],
    capacitiesMl: overrides.capacitiesMl ?? [],
    priceFrom: false,
    buySeparatelyGrosze: null,
    savingsPercent: null,
    availability: "made-to-order",
  };
}

const catalogue = [
  item({ id: "fox", name: "Lis", priceGrosze: 5200, createdAt: "2026-09-01T10:00:00Z", featuredRank: 2, themes: [{ slug: "animals", name: "Zwierzaki" }], capacitiesMl: [100, 130] }),
  item({ id: "apple", name: "Jabłko", priceGrosze: 4600, createdAt: "2026-09-03T10:00:00Z", themes: [{ slug: "fruit", name: "Owoce" }], capacitiesMl: [100] }),
  item({ id: "bear", name: "Miś", priceGrosze: 4900, createdAt: "2026-09-02T10:00:00Z", featuredRank: 1, themes: [{ slug: "animals", name: "Zwierzaki" }], capacitiesMl: [500] }),
];

test("parses repeatable catalogue filters and rejects an unknown sort", () => {
  assert.deepEqual(parseCatalogueFilters({
    theme: ["animals", "fruit", "animals"],
    capacity: ["100", "bad", "-1", "100"],
    sort: "unknown",
  }), {
    themes: ["animals", "fruit"],
    capacitiesMl: [100],
    sort: "featured",
  });
});

test("matches any selected theme and all selected filter groups", () => {
  const result = filterAndSortCatalogue(catalogue, {
    themes: ["animals", "fruit"],
    capacitiesMl: [100],
    sort: "name",
  });
  assert.deepEqual(result.map((product) => product.id), ["apple", "fox"]);
});

test("pins featured products by rank before ordering the rest newest first", () => {
  const result = filterAndSortCatalogue(catalogue, {
    themes: [],
    capacitiesMl: [],
    sort: "featured",
  });
  assert.deepEqual(result.map((product) => product.id), ["bear", "fox", "apple"]);
});

test("explicit price sorting takes priority over featured rank", () => {
  const result = filterAndSortCatalogue(catalogue, {
    themes: [],
    capacitiesMl: [],
    sort: "price-asc",
  });
  assert.deepEqual(result.map((product) => product.id), ["apple", "bear", "fox"]);
});

test("offers only unique themes and capacities present in the catalogue", () => {
  assert.deepEqual(getCatalogueFilterOptions(catalogue), {
    themes: [
      { slug: "fruit", name: "Owoce" },
      { slug: "animals", name: "Zwierzaki" },
    ],
    capacitiesMl: [100, 130, 500],
  });
});
