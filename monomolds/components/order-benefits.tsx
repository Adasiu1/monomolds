import { FREE_SHIPPING_MIN_PHYSICAL_ITEMS } from "@/lib/commerce/contracts";

export function freeShippingMessage(physicalItemCount: number) {
  const remaining = Math.max(0, FREE_SHIPPING_MIN_PHYSICAL_ITEMS - physicalItemCount);
  if (remaining === 0) return "Masz darmową dostawę";
  const noun = remaining === 1 ? "foremkę" : remaining < 5 ? "foremki" : "foremek";
  return `Dodaj jeszcze ${remaining} ${noun} do darmowej dostawy`;
}

export function paidItemsSummary(paidQuantity: number, giftQuantity: number) {
  const paidLabel = paidQuantity === 1
    ? "1 płatna sztuka"
    : `${paidQuantity} płatnych sztuk`;
  if (giftQuantity === 0) return paidLabel;
  const giftLabel = giftQuantity === 1 ? "1 gratis" : `${giftQuantity} gratisy`;
  return `${paidLabel} + ${giftLabel}`;
}

export function OrderBenefits({ physicalItemCount }: { physicalItemCount?: number }) {
  return (
    <div className="order-benefits">
      <p className="order-benefits-title" aria-live={physicalItemCount === undefined ? undefined : "polite"}>
        {physicalItemCount === undefined ? "Darmowa dostawa od 6 foremek" : freeShippingMessage(physicalItemCount)}
      </p>
      <p>12 płatnych szt. + 1 gratis. 24 płatne szt. + kolejne 2 gratisy (łącznie 3). Liczymy też formy w zestawach.</p>
    </div>
  );
}
