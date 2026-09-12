import type { Metadata } from "next";

import { CheckoutFromCart } from "@/features/checkout/checkout-from-cart";

import "./checkout.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zamówienie",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  return <div className="site-container checkout-page"><CheckoutFromCart /></div>;
}
