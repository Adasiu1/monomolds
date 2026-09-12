import type { CartItem } from "@/lib/commerce/contracts";

export const CART_STORAGE_KEY = "monomolds-guest-cart";
export const CART_DEMO_SEEDED_KEY = "monomolds-demo-cart-seeded";
export const MAX_CART_QUANTITY = 99;
export const EMPTY_CART: CartItem[] = [];
export const DEMO_CART_ITEMS: CartItem[] = [
  { merchandiseId: "bundle-four", quantity: 1 },
  { merchandiseId: "variant-heart", quantity: 2 },
];

let cachedStorageValue: string | null | undefined;
let cachedCartSnapshot: CartItem[] = EMPTY_CART;

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

export function subscribeToCart(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("monomolds-cart-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("monomolds-cart-change", callback);
  };
}

export function seedDemoCartIfNeeded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(CART_DEMO_SEEDED_KEY) === "1") return false;

    const current = window.localStorage.getItem(CART_STORAGE_KEY);
    if (current !== null && normalizeCartItems(JSON.parse(current)).length > 0) {
      window.localStorage.setItem(CART_DEMO_SEEDED_KEY, "1");
      return false;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(DEMO_CART_ITEMS));
    window.localStorage.setItem(CART_DEMO_SEEDED_KEY, "1");
    return true;
  } catch (error) {
    console.error("Nie udało się przygotować przykładowego koszyka.", error);
    return false;
  }
}
