"use server";

import type { CartItem, DeliveryMethod, GiftSelection, QuoteResult } from "@/lib/commerce/contracts";
import { commerceFixtureRepository } from "@/lib/commerce/fixture-repository";

export async function repriceCart(items: CartItem[], deliveryMethod: DeliveryMethod, giftItems: GiftSelection[] = []): Promise<QuoteResult> {
  return commerceFixtureRepository.quote({ items, giftItems, deliveryMethod });
}
