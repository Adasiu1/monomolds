"use client";

import { useSyncExternalStore } from "react";

import { cartItemCount, readCartSnapshot, readGiftSnapshot, subscribeToCart } from "./cart";

export function CartBadge() {
  const count = useSyncExternalStore(
    subscribeToCart,
    () => cartItemCount(readCartSnapshot()) + cartItemCount(readGiftSnapshot()),
    () => 0,
  );

  return <><span className="sr-only sm:hidden">Koszyk</span><span className="cart-count" aria-hidden="true">{count}</span><span className="sr-only">, liczba produktów: {count}</span></>;
}
