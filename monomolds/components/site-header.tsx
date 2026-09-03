import Link from "next/link";

import { BrandLogo } from "./brand-logo";
import { MobileNavigation } from "./mobile-navigation";
import { LinkButton } from "./ui/button";

// The mobile menu uses this full list. Desktop shows only Formy and Zestawy here.
const navigationItems = [
  { href: "/", label: "Strona główna" },
  { href: "/sklep", label: "Formy" },
  { href: "/zestawy", label: "Zestawy" },
  { href: "/o-nas", label: "O nas" },
  { href: "/faq", label: "FAQ" },
  { href: "/kontakt", label: "Kontakt" },
  // Temporary review shortcut. Remove together with the showcase route.
  { href: "/ui-kit", label: "UI Kit" },
] as const;

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M5.5 8.5h13l-1 11h-11l-1-11Z" />
      <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-container flex h-[4.75rem] items-center gap-4 lg:h-[5.25rem]">
        <div className="flex flex-1 items-center lg:flex-none">
          <MobileNavigation items={navigationItems} />
          <Link
            href="/"
            className="ml-3 inline-flex items-center lg:ml-0"
            aria-label="Mono Molds - strona główna"
          >
            <BrandLogo />
          </Link>
        </div>

        <nav aria-label="Nawigacja główna" className="hidden flex-1 lg:block">
          <ul className="flex items-center justify-center gap-1">
            {navigationItems.slice(1, 3).map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="desktop-nav-link">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1 lg:flex-none">
          <div className="hidden lg:block">
            <LinkButton href="/ui-kit" variant="secondary" className="ui-kit-shortcut" aria-label="UI Kit - test komponentów">
              UI Kit
            </LinkButton>
          </div>
          <form action="/sklep" role="search" className="desktop-search-form">
            <label htmlFor="desktop-search" className="sr-only">
              Szukaj produktów
            </label>
            <div className="desktop-search">
              <SearchIcon />
              <input
                id="desktop-search"
                name="q"
                type="search"
                placeholder="Szukaj form…"
                autoComplete="off"
              />
            </div>
          </form>

          <Link
            href="/koszyk"
            className="cart-link"
            aria-label="Koszyk, 0 produktów"
          >
            <BagIcon />
            <span className="hidden sm:inline">Koszyk</span>
            <span className="cart-count" aria-hidden="true">
              0
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
