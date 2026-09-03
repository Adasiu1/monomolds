"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BrandLogo } from "./brand-logo";

type NavigationItem = {
  href: string;
  label: string;
};

type MobileNavigationProps = {
  items: readonly NavigationItem[];
};

export function MobileNavigation({ items }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open or close the browser's dialog when React's menu state changes.
  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (isOpen && !dialog.open) {
      dialog.showModal();
    }

    if (!isOpen && dialog.open) {
      dialog.close();
    }

    if (!isOpen) return;

    // Stop the page behind the menu scrolling, then restore its old setting on close.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 64rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setIsOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [isOpen]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="icon-button inline-flex"
        aria-label="Otwórz menu"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(event) => {
          setKeyboardOpen(event.detail === 0);
          setIsOpen(true);
        }}
      >
        <span className="hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="mobile-menu-dialog"
        data-keyboard-open={keyboardOpen || undefined}
        aria-label="Menu główne"
        onCancel={() => setIsOpen(false)}
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <div className="mobile-menu-panel">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <BrandLogo />
            <button
              type="button"
              className="icon-button inline-flex"
              aria-label="Zamknij menu"
              onClick={() => setIsOpen(false)}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M5 5l14 14M19 5 5 19" />
              </svg>
            </button>
          </div>

          <div className="mobile-menu-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6">
            <form action="/sklep" role="search" className="search-field">
              <label htmlFor="mobile-search" className="sr-only">
                Szukaj produktów
              </label>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4 4" />
              </svg>
              <input
                id="mobile-search"
                name="q"
                type="search"
                placeholder="Szukaj form i zestawów…"
                autoComplete="off"
              />
            </form>

            <nav aria-label="Nawigacja mobilna" className="mt-8">
              <ul className="divide-y divide-[var(--border)]">
                {items.filter((item) => item.href === "/sklep" || item.href === "/zestawy").map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="mobile-nav-link"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Informacje o zakupach" className="mt-8 grid gap-2">
              {[
                ...items.filter((item) => item.href !== "/sklep" && item.href !== "/zestawy"),
                { href: "/dostawa-i-zwroty", label: "Dostawa i zwroty" },
                { href: "/regulamin", label: "Regulamin sklepu" },
                { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="footer-link" onClick={() => setIsOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <p className="mt-auto pt-10 text-sm leading-6 text-[var(--muted)]">
              Ręcznie wykonywane formy silikonowe dla cukierników.
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
