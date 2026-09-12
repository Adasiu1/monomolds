"use client";

import { useEffect, useSyncExternalStore, useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import type { DeliveryMethod, Quote } from "@/lib/commerce/contracts";
import { repriceCart } from "@/features/cart/actions";
import { EMPTY_CART, readCartSnapshot, subscribeToCart } from "@/features/cart/cart";

import { CheckoutForm } from "./checkout-form";

export function CheckoutFromCart() {
  const items = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => EMPTY_CART);
  const [quotes, setQuotes] = useState<Record<DeliveryMethod, Quote> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) return () => { cancelled = true; };
    Promise.all([repriceCart(items, "inpost_locker"), repriceCart(items, "courier")]).then(([inpost, courier]) => {
      if (cancelled) return;
      if (!inpost.ok || !courier.ok) {
        setError(!inpost.ok ? inpost.error.message : "Nie udało się przygotować wyceny dostawy.");
        return;
      }
      setQuotes({ inpost_locker: inpost.data.quote, courier: courier.data.quote });
    }).catch(() => {
      if (!cancelled) setError("Nie udało się przygotować wyceny zamówienia. Spróbuj ponownie.");
    });
    return () => { cancelled = true; };
  }, [items]);

  if (items.length === 0) return <div className="cart-checkout-error"><Notice tone="error" title="Nie można przejść do checkoutu">Koszyk jest pusty. Wróć do katalogu, aby przygotować zamówienie.</Notice><LinkButton href="/koszyk" variant="secondary">Wróć do koszyka</LinkButton></div>;
  if (error) return <div className="cart-checkout-error"><Notice tone="error" title="Nie można przejść do checkoutu">{error}</Notice><LinkButton href="/koszyk" variant="secondary">Wróć do koszyka</LinkButton></div>;
  if (!quotes) return <p role="status" className="ui-field-note">Przygotowujemy aktualne podsumowanie...</p>;
  return <CheckoutForm quotes={quotes} />;
}
