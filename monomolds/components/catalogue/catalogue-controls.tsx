"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";

import type { CatalogueFilters } from "@/lib/catalogue/presentation";
import type { CatalogueTheme } from "@/lib/catalogue/types";

type CatalogueControlsProps = {
  filters: CatalogueFilters;
  themes: CatalogueTheme[];
  capacitiesMl: number[];
  resultCount: number;
};

const SORT_OPTIONS = [
  { value: "featured", label: "Polecane i najnowsze" },
  { value: "name", label: "Nazwa A-Z" },
  { value: "price-asc", label: "Cena od najniższej" },
  { value: "price-desc", label: "Cena od najwyższej" },
] as const;

export function CatalogueControls(props: CatalogueControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const activeFilterCount = props.filters.themes.length + props.filters.capacitiesMl.length;

  function navigate(form: HTMLFormElement) {
    const query = new URLSearchParams();
    const data = new FormData(form);
    for (const [name, value] of data.entries()) {
      if (typeof value === "string" && value) query.append(name, value);
    }
    if (query.get("sort") === "featured") query.delete("sort");
    const suffix = query.size > 0 ? `?${query.toString()}` : "";
    startTransition(() => router.push(`${pathname}${suffix}`, { scroll: false }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(event.currentTarget);
  }

  return (
    <div className="catalogue-controls" aria-busy={pending || undefined}>
      <div className="catalogue-results-row">
        <p role="status" aria-live="polite">
          {formatResultCount(props.resultCount)}
        </p>
        <details className="catalogue-mobile-filters">
          <summary>
            Filtry{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            <span aria-hidden="true">＋</span>
          </summary>
          <FilterForm {...props} idPrefix="mobile" onSubmit={submit} />
        </details>
      </div>

      <FilterForm
        {...props}
        idPrefix="desktop"
        className="catalogue-desktop-filters"
        onSubmit={submit}
        onChange={(event) => navigate(event.currentTarget)}
      />
    </div>
  );
}

type FilterFormProps = CatalogueControlsProps & {
  idPrefix: string;
  className?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange?: (event: FormEvent<HTMLFormElement>) => void;
};

function FilterForm({
  filters,
  themes,
  capacitiesMl,
  idPrefix,
  className,
  onSubmit,
  onChange,
}: FilterFormProps) {
  return (
    <form className={`catalogue-filter-form ${className ?? ""}`} method="get" onSubmit={onSubmit} onChange={onChange}>
      {themes.length > 0 ? (
        <fieldset>
          <legend>Motyw</legend>
          <div className="catalogue-filter-options">
            {themes.map((theme) => (
              <label key={theme.slug} className="catalogue-filter-chip" htmlFor={`${idPrefix}-theme-${theme.slug}`}>
                <input
                  id={`${idPrefix}-theme-${theme.slug}`}
                  type="checkbox"
                  name="theme"
                  value={theme.slug}
                  defaultChecked={filters.themes.includes(theme.slug)}
                />
                <span>{theme.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {capacitiesMl.length > 0 ? (
        <fieldset>
          <legend>Pojemność</legend>
          <div className="catalogue-filter-options">
            {capacitiesMl.map((capacity) => (
              <label key={capacity} className="catalogue-filter-chip" htmlFor={`${idPrefix}-capacity-${capacity}`}>
                <input
                  id={`${idPrefix}-capacity-${capacity}`}
                  type="checkbox"
                  name="capacity"
                  value={capacity}
                  defaultChecked={filters.capacitiesMl.includes(capacity)}
                />
                <span>{capacity} ml</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="catalogue-sort-field">
        <label htmlFor={`${idPrefix}-sort`}>Sortowanie</label>
        <select id={`${idPrefix}-sort`} name="sort" defaultValue={filters.sort}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="ui-button ui-button--primary catalogue-apply">
        Pokaż wyniki
      </button>
    </form>
  );
}

function formatResultCount(count: number) {
  if (count === 1) return "1 forma";
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} formy`;
  }
  return `${count} form`;
}
