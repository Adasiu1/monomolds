"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { repriceCart } from "./actions";
import {
  EMPTY_CART,
  removeCartItem,
  readCartSnapshot,
  readDiscountSnapshot,
  readGiftSnapshot,
  subscribeToCart,
  updateCartItem,
  writeCartSnapshot,
  writeDiscountSnapshot,
  writeGiftSnapshot,
} from "./cart";
import { GiftPicker } from "@/components/gift-picker";
import { Button, IconButton, LinkButton } from "@/components/ui/button";
import { Notice } from "@/components/ui/feedback";
import { OrderBenefits, paidItemsSummary } from "@/components/order-benefits";
import { formatPrice } from "@/lib/format-price";
import type { CartItem, Quote } from "@/lib/commerce/contracts";

export function CartPage() {
  const storedItems = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => EMPTY_CART);
  const items = storedItems;
  const giftItems = useSyncExternalStore(subscribeToCart, readGiftSnapshot, () => EMPTY_CART);
  const discountCode = useSyncExternalStore(subscribeToCart, readDiscountSnapshot, () => "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const discountCodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (items.length === 0) {
      return;
    }
    let cancelled = false;
    repriceCart(items, "inpost_locker", giftItems, discountCode).then((result) => {
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
  }, [discountCode, giftItems, items]);

  const applyDiscount = async () => {
    setApplyingDiscount(true);
    try {
      const result = await repriceCart(items, "inpost_locker", giftItems, discountCodeRef.current?.value);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setQuote(result.data.quote);
      setMessage("");
      writeDiscountSnapshot(result.data.quote.appliedDiscount?.code ?? "");
    } catch {
      setMessage("Nie udało się sprawdzić kodu rabatowego. Spróbuj ponownie.");
    } finally {
      setApplyingDiscount(false);
    }
  };

  const commit = (next: CartItem[]) => {
    writeCartSnapshot(next);
  };
  const update = (merchandiseId: string, quantity: number) => {
    writeGiftSnapshot([]);
    commit(updateCartItem(items, merchandiseId, quantity));
  };
  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const quoteMatchesCart = quote?.items.length === items.length && quote?.items.every((item) =>
    items.some((cartItem) => cartItem.merchandiseId === item.merchandiseId && cartItem.quantity === item.quantity),
  ) && quote.giftPromotion.selectedItems.reduce((sum, item) => sum + item.quantity, 0) === giftItems.reduce((sum, item) => sum + item.quantity, 0)
    && quote.giftPromotion.selectedItems.every((item) => giftItems.some((gift) => gift.merchandiseId === item.merchandiseId && gift.quantity === item.quantity))
    && (quote.appliedDiscount?.code ?? "") === discountCode;
  const displayItems = items.map((cartItem) => {
    const pricedItem = quote?.items.find((item) => item.merchandiseId === cartItem.merchandiseId);
    return {
      ...cartItem,
      name: pricedItem?.name ?? "Produkt w koszyku",
      kind: pricedItem?.kind ?? null,
      physicalItemCount: pricedItem?.physicalItemCount ?? null,
      unitNetPriceGrosze: pricedItem?.unitNetPriceGrosze ?? null,
      lineSubtotalGrosze: pricedItem?.lineSubtotalGrosze ?? null,
      lineTotalGrosze: pricedItem?.lineTotalGrosze ?? null,
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
            <div><h3>{item.name}</h3>{item.kind === "bundle" && item.physicalItemCount !== null ? <p className="cart-item-meta">{item.physicalItemCount / item.quantity} foremek w zestawie</p> : null}</div>
            <div className="cart-quantity">
              <span>{item.kind === "bundle" ? "Liczba zestawów" : "Płatne sztuki"}</span>
              <div className="cart-quantity-stepper">
                <IconButton label={`Zmniejsz liczbę sztuk: ${item.name}`} variant="secondary" disabled={item.quantity === 1} onClick={() => update(item.merchandiseId, item.quantity - 1)}><span aria-hidden="true">−</span></IconButton>
                <output aria-label={`Liczba sztuk: ${item.name}`} aria-live="polite">{item.quantity}</output>
                <IconButton label={`Zwiększ liczbę sztuk: ${item.name}`} variant="secondary" disabled={item.quantity === 99} onClick={() => update(item.merchandiseId, item.quantity + 1)}><span aria-hidden="true">+</span></IconButton>
              </div>
            </div>
            <strong className="cart-item-price">{item.lineTotalGrosze === null ? "…" : <>{item.kind === "bundle" && item.lineSubtotalGrosze !== null && item.lineSubtotalGrosze > item.lineTotalGrosze ? <del>{formatPrice(item.lineSubtotalGrosze)}</del> : null}<span>{formatPrice(item.lineTotalGrosze)} <small>brutto</small></span>{item.unitNetPriceGrosze === null ? null : <small>{formatPrice(item.unitNetPriceGrosze * item.quantity)} netto</small>}</>}</strong>
            <Button className="cart-remove" variant="ghost" onClick={() => { writeGiftSnapshot([]); commit(removeCartItem(items, item.merchandiseId)); }}>Usuń</Button>
          </li>)}
        </ul>
        {quoteMatchesCart ? <GiftPicker earnedQuantity={quote.giftPromotion.earnedQuantity} options={quote.giftPromotion.options} selections={giftItems} onChange={writeGiftSnapshot} /> : null}
      </section>
      {quote ? <aside className={`cart-summary${quoteMatchesCart ? "" : " cart-summary--updating"}`} aria-label="Podsumowanie koszyka" aria-busy={!quoteMatchesCart}><h2>Podsumowanie</h2><p>{paidItemsSummary(quoteMatchesCart ? quote.physicalItemCount : totalItems, quote.giftPromotion.earnedQuantity)}</p><OrderBenefits physicalItemCount={quoteMatchesCart ? quote.physicalItemCount : undefined} />
        <form className="cart-discount" onSubmit={(event) => { event.preventDefault(); void applyDiscount(); }}>
          <label htmlFor="discountCode">Kod rabatowy</label>
          <div><input ref={discountCodeRef} key={discountCode} className="ui-input" id="discountCode" name="discountCode" defaultValue={discountCode} autoComplete="off" spellCheck={false} maxLength={64} />
            <Button type="submit" variant="secondary" loading={applyingDiscount} loadingLabel="Sprawdzamy…">Zastosuj</Button></div>
          {quote.appliedDiscount ? <p className="ui-field-note">Kod {quote.appliedDiscount.code}: - {formatPrice(quote.appliedDiscount.amountGrosze)}</p> : null}
          {discountCode ? <Button type="button" variant="ghost" onClick={() => writeDiscountSnapshot("")}>Usuń kod</Button> : null}
        </form>
        <strong>{quoteMatchesCart ? <>{formatPrice(quote.totalGrosze)} <small>brutto</small></> : "…"}</strong>{quote.giftPromotion.selectedItems.reduce((sum, item) => sum + item.quantity, 0) < quote.giftPromotion.earnedQuantity ? <><Button disabled>Najpierw wybierz gratis</Button><p className="cart-summary-hint">Wybierz wszystkie należne gratisy poniżej produktów.</p></> : <LinkButton href="/zamowienie">Przejdź do wysyłki</LinkButton>}</aside> : <aside className="cart-summary cart-summary--updating" aria-label="Podsumowanie koszyka" aria-busy="true"><h2>Podsumowanie</h2><p>{paidItemsSummary(totalItems, 0)}</p><strong>…</strong></aside>}
    </div>}
  </div>;
}
