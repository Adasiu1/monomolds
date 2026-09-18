import type { CartItem, GiftSelection } from "@/lib/commerce/contracts";

export const CART_STORAGE_KEY = "monomolds-guest-cart";
export const CART_GIFTS_STORAGE_KEY = "monomolds-guest-cart-gifts";
export const CART_DISCOUNT_STORAGE_KEY = "monomolds-guest-cart-discount";
export const MAX_CART_QUANTITY = 99;
export const EMPTY_CART: CartItem[] = [];

let cachedStorageValue: string | null | undefined;
let cachedCartSnapshot: CartItem[] = EMPTY_CART;
let cachedGiftStorageValue: string | null | undefined;
let cachedGiftSnapshot: GiftSelection[] = EMPTY_CART;
let cachedDiscountStorageValue: string | null | undefined;
let cachedDiscountSnapshot = "";

export function normalizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const items = new Map<string, number>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const merchandiseId = "merchandiseId" in candidate && typeof candidate.merchandiseId === "string"
      ? candidate.merchandiseId.trim()
      : "";
    const quantity = "quantity" in candidate && typeof candidate.quantity === "number"
      ? Math.floor(candidate.quantity)
      : 0;
    if (!merchandiseId || !Number.isFinite(quantity) || quantity < 1) continue;
    items.set(merchandiseId, Math.min(MAX_CART_QUANTITY, (items.get(merchandiseId) ?? 0) + quantity));
  }

  return [...items.entries()].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

export function addCartItem(items: CartItem[], merchandiseId: string, quantity = 1): CartItem[] {
  return normalizeCartItems([...items, { merchandiseId, quantity }]);
}

export function updateCartItem(items: CartItem[], merchandiseId: string, quantity: number): CartItem[] {
  return normalizeCartItems(items.map((item) => item.merchandiseId === merchandiseId ? { ...item, quantity } : item));
}

export function removeCartItem(items: CartItem[], merchandiseId: string): CartItem[] {
  return items.filter((item) => item.merchandiseId !== merchandiseId);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function readGiftSnapshot(): GiftSelection[] {
  if (typeof window === "undefined") return EMPTY_CART;

  const storageValue = window.localStorage.getItem(CART_GIFTS_STORAGE_KEY);
  if (storageValue === cachedGiftStorageValue) return cachedGiftSnapshot;

  cachedGiftStorageValue = storageValue;
  try {
    cachedGiftSnapshot = normalizeCartItems(storageValue ? JSON.parse(storageValue) : []);
  } catch {
    cachedGiftSnapshot = EMPTY_CART;
  }
  return cachedGiftSnapshot;
}

export function readCartSnapshot(): CartItem[] {
  if (typeof window === "undefined") return EMPTY_CART;

  const storageValue = window.localStorage.getItem(CART_STORAGE_KEY);
  if (storageValue === cachedStorageValue) return cachedCartSnapshot;

  cachedStorageValue = storageValue;
  try {
    cachedCartSnapshot = normalizeCartItems(storageValue ? JSON.parse(storageValue) : []);
  } catch {
    cachedCartSnapshot = EMPTY_CART;
  }
  return cachedCartSnapshot;
}

export function readDiscountSnapshot(): string {
  if (typeof window === "undefined") return "";

  const storageValue = window.localStorage.getItem(CART_DISCOUNT_STORAGE_KEY);
  if (storageValue === cachedDiscountStorageValue) return cachedDiscountSnapshot;

  cachedDiscountStorageValue = storageValue;
  cachedDiscountSnapshot = storageValue?.trim().toUpperCase() ?? "";
  return cachedDiscountSnapshot;
}

export function writeCartSnapshot(items: CartItem[]): CartItem[] {
  const normalized = normalizeCartItems(items);
  if (typeof window === "undefined") return normalized;

  const serialized = JSON.stringify(normalized);
  window.localStorage.setItem(CART_STORAGE_KEY, serialized);
  cachedStorageValue = serialized;
  cachedCartSnapshot = normalized;
  window.dispatchEvent(new Event("monomolds-cart-change"));
  return normalized;
}

export function writeGiftSnapshot(items: GiftSelection[]): GiftSelection[] {
  const normalized = normalizeCartItems(items);
  if (typeof window === "undefined") return normalized;

  const serialized = JSON.stringify(normalized);
  window.localStorage.setItem(CART_GIFTS_STORAGE_KEY, serialized);
  cachedGiftStorageValue = serialized;
  cachedGiftSnapshot = normalized;
  window.dispatchEvent(new Event("monomolds-cart-change"));
  return normalized;
}

export function writeDiscountSnapshot(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (typeof window === "undefined") return normalized;

  if (normalized) window.localStorage.setItem(CART_DISCOUNT_STORAGE_KEY, normalized);
  else window.localStorage.removeItem(CART_DISCOUNT_STORAGE_KEY);
  cachedDiscountStorageValue = normalized || null;
  cachedDiscountSnapshot = normalized;
  window.dispatchEvent(new Event("monomolds-cart-change"));
  return normalized;
}

export function addMerchandiseToCart(merchandiseId: string, quantity = 1): CartItem[] {
  return writeCartSnapshot(addCartItem(readCartSnapshot(), merchandiseId, quantity));
}

export function subscribeToCart(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("monomolds-cart-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("monomolds-cart-change", callback);
  };
}
