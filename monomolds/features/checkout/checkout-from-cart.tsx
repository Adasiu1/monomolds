"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, useState } from "react";

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
  const quoteRequestId = useRef(0);

  const fetchQuotes = useCallback(async (): Promise<
    | { status: "ready"; quotes: Record<DeliveryMethod, Quote> }
    | { status: "error"; message: string }
    | null
  > => {
    if (items.length === 0) return null;
    const requestId = ++quoteRequestId.current;
    try {
      const [inpost, courier] = await Promise.all([repriceCart(items, "inpost_locker", giftItems, discountCode), repriceCart(items, "courier", giftItems, discountCode)]);
      if (requestId !== quoteRequestId.current) return null;
      if (!inpost.ok || !courier.ok) {
        return { status: "error", message: !inpost.ok ? inpost.error.message : "Nie udało się przygotować wyceny dostawy." };
      }
      return { status: "ready", quotes: { inpost_locker: inpost.data.quote, courier: courier.data.quote } };
    } catch {
      return requestId === quoteRequestId.current
        ? { status: "error", message: "Nie udało się przygotować wyceny zamówienia. Spróbuj ponownie." }
        : null;
    }
  }, [discountCode, giftItems, items]);

  const applyQuotes = useCallback((result: Awaited<ReturnType<typeof fetchQuotes>>) => {
    if (!result) return;
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setQuotes(result.quotes);
    setError("");
  }, []);

  const loadQuotes = useCallback(async () => {
    applyQuotes(await fetchQuotes());
  }, [applyQuotes, fetchQuotes]);

  useEffect(() => {
    void fetchQuotes().then(applyQuotes);
    return () => { quoteRequestId.current += 1; };
  }, [applyQuotes, fetchQuotes]);

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
