import { BrandLogo } from "./brand-logo";
import { PageTransitionLink } from "./page-transition";

export function FooterLogo() {
  return (
    <PageTransitionLink href="/" className="inline-flex" aria-label="Mono Molds - strona główna">
      <BrandLogo footer />
    </PageTransitionLink>
  );
}
