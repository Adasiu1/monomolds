"use client";

import { useEffect, useState } from "react";

import { CART_STORAGE_KEY, cartItemCount, normalizeCartItems } from "./cart";

export function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const read = () => {
      try {
        setCount(cartItemCount(normalizeCartItems(JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "[]"))));
      } catch {
        setCount(0);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("monomolds-cart-change", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("monomolds-cart-change", read);
    };
  }, []);

  return <span className="cart-count" aria-hidden="true">{count}</span>;
}
