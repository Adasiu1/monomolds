import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";
import "./ui.css";

export const metadata: Metadata = {
  title: {
    default: "Mono Molds - ręcznie wykonywane formy silikonowe",
    template: "%s | Mono Molds",
  },
  description:
    "Ręcznie wykonywane formy silikonowe dla cukierników i domowych pasjonatów deserów.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Przejdź do treści
        </a>
        {/* Every page shares this header and footer. Only the main content changes. */}
        {/* Header and footer are shared by every route. The page content sits between them. */}
        <SiteHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
