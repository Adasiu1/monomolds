import Link from "next/link";

import { FooterLogo } from "./footer-logo";

// Each list becomes a footer column. Add future links to the matching group.
const shopLinks = [
  { href: "/sklep", label: "Formy" },
  { href: "/zestawy", label: "Zestawy" },
  { href: "/dostawa-i-zwroty", label: "Dostawa i zwroty" },
] as const;

const informationLinks = [
  { href: "/", label: "Strona główna" },
  { href: "/o-nas", label: "O nas" },
  { href: "/faq", label: "FAQ" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

const legalLinks = [
  { href: "/regulamin", label: "Regulamin sklepu" },
  { href: "/polityka-prywatnosci", label: "Polityka prywatności" },
] as const;

const socialLinks = [
  { href: "https://www.instagram.com/monomolds/", label: "Instagram" },
] as const;

type FooterLinkListProps = {
  items: readonly { href: string; label: string }[];
};

function FooterLinkList({ items }: FooterLinkListProps) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="footer-link">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="site-container py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <FooterLogo />
            <p className="mt-5 max-w-md text-sm leading-6 text-[var(--muted)]">
              Ręcznie wykonywane formy silikonowe do powtarzalnych,
              dopracowanych wypieków.
            </p>
            <Link href="/kontakt" className="footer-contact-link">
              Napisz do nas
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className="lg:col-span-2">
            <h2 className="footer-heading">Formy</h2>
            <FooterLinkList items={shopLinks} />
          </div>

          <div className="lg:col-span-2">
            <h2 className="footer-heading">Informacje</h2>
            <FooterLinkList items={informationLinks} />
          </div>

          <div className="lg:col-span-2">
            <h2 className="footer-heading">Dokumenty</h2>
            <FooterLinkList items={legalLinks} />
          </div>

          <div className="lg:col-span-2">
            <h2 className="footer-heading">Social</h2>
            <ul className="mt-4 space-y-2.5">
              {socialLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="footer-link social-link">
                    {item.label}<span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--border)] pt-6 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Mono Molds. Wszelkie prawa zastrzeżone.</p>
          <p>Projektowane i wykonywane w Polsce.</p>
        </div>
      </div>
    </footer>
  );
}
