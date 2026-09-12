"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { repriceCart } from "./actions";
import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  removeCartItem,
  readCartSnapshot,
  seedDemoCartIfNeeded,
  subscribeToCart,
  updateCartItem,
} from "./cart";
import { Button, LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { formatPrice } from "@/lib/format-price";
import type { CartItem, Quote } from "@/lib/commerce/contracts";

export function CartPage() {
  const storedItems = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => EMPTY_CART);
  const items = storedItems;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (seedDemoCartIfNeeded()) window.dispatchEvent(new Event("monomolds-cart-change"));
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    let cancelled = false;
    repriceCart(items, "inpost_locker").then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setQuote(result.data.quote);
        setMessage("");
      } else {
        setQuote(null);
        setMessage(result.error.message);
      }
    }).catch(() => {
      if (!cancelled) {
        setMessage("Nie udało się ponownie wycenić koszyka. Spróbuj ponownie.");
      }
    });
    return () => { cancelled = true; };
  }, [items]);

  const commit = (next: CartItem[]) => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("monomolds-cart-change"));
  };
  const update = (merchandiseId: string, quantity: number) => {
    commit(updateCartItem(items, merchandiseId, quantity));
  };
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const quoteMatchesCart = quote?.items.length === items.length && quote?.items.every((item) =>
    items.some((cartItem) => cartItem.merchandiseId === item.merchandiseId && cartItem.quantity === item.quantity),
  );
  const displayItems = items.map((cartItem) => {
    const pricedItem = quote?.items.find((item) => item.merchandiseId === cartItem.merchandiseId);
    return {
      ...cartItem,
      name: pricedItem?.name ?? cartItem.merchandiseId,
      lineTotalGrosze: pricedItem?.unitPriceGrosze ? pricedItem.unitPriceGrosze * cartItem.quantity : null,
    };
  });

  return <div className="site-container cart-page">
    <h1>Koszyk</h1>
    <p className="cart-intro">Ceny i dostępność sprawdzamy automatycznie przed zamówieniem.</p>
    {message ? <Notice tone="error" title="Nie udało się przygotować koszyka">{message}</Notice> : null}
    {items.length === 0 ? <div className="cart-empty"><h2>Koszyk jest pusty</h2><p>Wybierz produkty do zamówienia.</p><LinkButton href="/sklep">Przejdź do form</LinkButton></div> : <div className="cart-layout">
      <section aria-labelledby="cart-items-heading">
        <h2 id="cart-items-heading" className="sr-only">Pozycje w koszyku</h2>
        <ul className="cart-items">
          {displayItems.map((item) => <li key={item.merchandiseId} className="cart-item">
            <div><h3>{item.name}</h3><p className="ui-muted">Identyfikator: {item.merchandiseId}</p></div>
            <label> Sztuki <input type="number" min="1" max="99" value={item.quantity} onChange={(event) => update(item.merchandiseId, Number(event.target.value))} /></label>
            <strong className="cart-item-price">{item.lineTotalGrosze === null ? "..." : formatPrice(item.lineTotalGrosze)}</strong>
            <Button variant="ghost" onClick={() => commit(removeCartItem(items, item.merchandiseId))}>Usuń</Button>
          </li>)}
        </ul>
      </section>
      {quote ? <aside className={`cart-summary${quoteMatchesCart ? "" : " cart-summary--updating"}`} aria-label="Podsumowanie koszyka" aria-busy={!quoteMatchesCart}><h2>Podsumowanie</h2><p>{totalItems} {totalItems === 1 ? "sztuka" : "sztuk"}</p><strong>{quoteMatchesCart ? formatPrice(quote.totalGrosze) : "..."}</strong><LinkButton href="/zamowienie">Przejdź do wysyłki</LinkButton></aside> : <aside className="cart-summary cart-summary--updating" aria-label="Podsumowanie koszyka" aria-busy="true"><h2>Podsumowanie</h2><p>{totalItems} {totalItems === 1 ? "sztuka" : "sztuk"}</p><strong>...</strong></aside>}
    </div>}
  </div>;
}
