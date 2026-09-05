import Link from "next/link";

import { BrandLogo } from "./brand-logo";

export function FooterLogo() {
  return (
    <Link href="/" className="inline-flex" aria-label="Mono Molds - strona główna">
      <BrandLogo footer />
    </Link>
  );
}
