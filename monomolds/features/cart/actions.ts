"use server";

import type { CartItem, DeliveryMethod, GiftSelection, QuoteResult } from "@/lib/commerce/contracts";
import { requestFingerprint } from "@/lib/commerce/request-fingerprint";
import { createSupabaseCommerceRepository } from "@/lib/commerce/supabase-repository";

export async function repriceCart(items: CartItem[], deliveryMethod: DeliveryMethod, giftItems: GiftSelection[] = []): Promise<QuoteResult> {
  return createSupabaseCommerceRepository(await requestFingerprint()).quote({ items, giftItems, deliveryMethod });
}
