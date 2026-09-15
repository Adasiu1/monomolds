"use client";

import { useCallback, useEffect, useSyncExternalStore, useState } from "react";

import { LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import type { DeliveryMethod, Quote } from "@/lib/commerce/contracts";
import { repriceCart } from "@/features/cart/actions";
import { EMPTY_CART, readCartSnapshot, readDiscountSnapshot, readGiftSnapshot, subscribeToCart } from "@/features/cart/cart";

import { CheckoutForm } from "./checkout-form";

export function CheckoutFromCart() {
  const items = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => EMPTY_CART);
  const giftItems = useSyncExternalStore(subscribeToCart, readGiftSnapshot, () => EMPTY_CART);
  const discountCode = useSyncExternalStore(subscribeToCart, readDiscountSnapshot, () => "");
  const [quotes, setQuotes] = useState<Record<DeliveryMethod, Quote> | null>(null);
  const [error, setError] = useState("");

  const loadQuotes = useCallback(async () => {
    if (items.length === 0) return;
    try {
      const [inpost, courier] = await Promise.all([repriceCart(items, "inpost_locker", giftItems, discountCode), repriceCart(items, "courier", giftItems, discountCode)]);
      if (!inpost.ok || !courier.ok) {
        setError(!inpost.ok ? inpost.error.message : "Nie udało się przygotować wyceny dostawy.");
        return;
      }
      setQuotes({ inpost_locker: inpost.data.quote, courier: courier.data.quote });
      setError("");
    } catch {
      setError("Nie udało się przygotować wyceny zamówienia. Spróbuj ponownie.");
    }
  }, [discountCode, giftItems, items]);

  useEffect(() => {
    let cancelled = false;
    if (items.length === 0) return;
    Promise.all([repriceCart(items, "inpost_locker", giftItems, discountCode), repriceCart(items, "courier", giftItems, discountCode)]).then(([inpost, courier]) => {
      if (cancelled) return;
      if (!inpost.ok || !courier.ok) {
        setError(!inpost.ok ? inpost.error.message : "Nie udało się przygotować wyceny dostawy.");
        return;
      }
      setQuotes({ inpost_locker: inpost.data.quote, courier: courier.data.quote });
      setError("");
    }).catch(() => {
      if (!cancelled) setError("Nie udało się przygotować wyceny zamówienia. Spróbuj ponownie.");
    });
    return () => { cancelled = true; };
  }, [discountCode, giftItems, items]);

  useEffect(() => {
    if (!quotes) return;
    const refreshAt = Math.min(Date.parse(quotes.inpost_locker.expiresAt), Date.parse(quotes.courier.expiresAt));
    const timeout = window.setTimeout(() => { void loadQuotes(); }, Math.max(0, refreshAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [loadQuotes, quotes]);

  if (items.length === 0) return <div className="cart-checkout-error"><Notice tone="error" title="Nie można przejść do checkoutu">Koszyk jest pusty. Wróć do katalogu, aby przygotować zamówienie.</Notice><LinkButton href="/koszyk" variant="secondary">Wróć do koszyka</LinkButton></div>;
  if (error) return <div className="cart-checkout-error"><Notice tone="error" title="Nie można przejść do checkoutu">{error}</Notice><LinkButton href="/koszyk" variant="secondary">Wróć do koszyka</LinkButton></div>;
  if (!quotes) return <p role="status" className="ui-field-note">Przygotowujemy aktualne podsumowanie...</p>;
  const selectedGiftQuantity = quotes.inpost_locker.giftPromotion.selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (selectedGiftQuantity < quotes.inpost_locker.giftPromotion.earnedQuantity) {
    return <div className="cart-checkout-error"><Notice tone="error" title="Wybierz należne gratisy">Wróć do koszyka i wybierz wszystkie gratisowe formy przed podaniem danych do wysyłki.</Notice><LinkButton href="/koszyk" variant="secondary">Wybierz gratisy</LinkButton></div>;
  }
  return <CheckoutForm quotes={quotes} onRefreshQuotes={loadQuotes} />;
}
