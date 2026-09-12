import type { CatalogueItem, CatalogueTheme } from "./types";

export const CATALOGUE_SORTS = ["featured", "name", "price-asc", "price-desc"] as const;

export type CatalogueSort = (typeof CATALOGUE_SORTS)[number];

export type CatalogueFilters = {
  themes: string[];
  capacitiesMl: number[];
  sort: CatalogueSort;
};

export type CatalogueSearchParams = Record<
  string,
  string | string[] | undefined
>;

function values(value: string | string[] | undefined) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

export function parseCatalogueFilters(
  searchParams: CatalogueSearchParams,
): CatalogueFilters {
  const requestedSort = values(searchParams.sort)[0];
  const sort = CATALOGUE_SORTS.includes(requestedSort as CatalogueSort)
    ? (requestedSort as CatalogueSort)
    : "featured";

  return {
    themes: [...new Set(values(searchParams.theme).filter(Boolean))],
    capacitiesMl: [
      ...new Set(
        values(searchParams.capacity)
          .map(Number)
          .filter((capacity) => Number.isSafeInteger(capacity) && capacity > 0),
      ),
    ],
    sort,
  };
}

export function getCatalogueFilterOptions(items: CatalogueItem[]) {
  const themes = new Map<string, CatalogueTheme>();
  const capacities = new Set<number>();

  for (const item of items) {
    for (const theme of item.themes) themes.set(theme.slug, theme);
    for (const capacity of item.capacitiesMl) capacities.add(capacity);
  }

  return {
    themes: [...themes.values()].sort((left, right) =>
      left.name.localeCompare(right.name, "pl"),
    ),
    capacitiesMl: [...capacities].sort((left, right) => left - right),
  };
}

function compareFeatured(left: CatalogueItem, right: CatalogueItem) {
  const leftRank = left.featuredRank ?? Number.POSITIVE_INFINITY;
  const rightRank = right.featuredRank ?? Number.POSITIVE_INFINITY;
  return (
    leftRank - rightRank ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
    left.name.localeCompare(right.name, "pl")
  );
}

export function filterAndSortCatalogue(
  items: CatalogueItem[],
  filters: CatalogueFilters,
) {
  const selectedThemes = new Set(filters.themes);
  const selectedCapacities = new Set(filters.capacitiesMl);
  const filtered = items.filter((item) => {
    const themeMatches =
      selectedThemes.size === 0 ||
      item.themes.some((theme) => selectedThemes.has(theme.slug));
    const capacityMatches =
      selectedCapacities.size === 0 ||
      item.capacitiesMl.some((capacity) => selectedCapacities.has(capacity));
    return themeMatches && capacityMatches;
  });

  return [...filtered].sort((left, right) => {
    switch (filters.sort) {
      case "name":
        return left.name.localeCompare(right.name, "pl");
      case "price-asc":
        return left.priceGrosze - right.priceGrosze || left.name.localeCompare(right.name, "pl");
      case "price-desc":
        return right.priceGrosze - left.priceGrosze || left.name.localeCompare(right.name, "pl");
      default:
        return compareFeatured(left, right);
    }
  });
}
