import type { Metadata } from "next";

import { CheckoutForm } from "@/features/checkout/checkout-form";
import { commerceFixtureRepository } from "@/lib/commerce/fixture-repository";
import type { DeliveryMethod, Quote } from "@/lib/commerce/contracts";

import "./checkout.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zamówienie",
  robots: { index: false, follow: false },
};

const checkoutItems = [
  { merchandiseId: "bundle-four", quantity: 1 },
  { merchandiseId: "variant-heart", quantity: 2 },
];

async function quoteFor(method: DeliveryMethod): Promise<Quote> {
  const result = await commerceFixtureRepository.quote({ items: checkoutItems, deliveryMethod: method });
  if (!result.ok) throw new Error("Nie udało się przygotować podsumowania zamówienia.");
  return result.data.quote;
}

export default async function CheckoutPage() {
  const [inpostLocker, courier] = await Promise.all([quoteFor("inpost_locker"), quoteFor("courier")]);
  return <div className="site-container checkout-page"><CheckoutForm quotes={{ inpost_locker: inpostLocker, courier }} /></div>;
}
