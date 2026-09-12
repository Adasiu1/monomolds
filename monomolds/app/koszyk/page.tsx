import type { Metadata } from "next";

import { CartPage } from "@/features/cart/cart-page";

import "../zamowienie/checkout.css";

export const metadata: Metadata = { title: "Koszyk", robots: { index: false, follow: false } };

export default function CartRoute() {
  return <CartPage />;
}
