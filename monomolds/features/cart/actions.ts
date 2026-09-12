"use server";

import type { CartItem, DeliveryMethod, QuoteResult } from "@/lib/commerce/contracts";
import { commerceFixtureRepository } from "@/lib/commerce/fixture-repository";

export async function repriceCart(items: CartItem[], deliveryMethod: DeliveryMethod): Promise<QuoteResult> {
  return commerceFixtureRepository.quote({ items, deliveryMethod });
}
