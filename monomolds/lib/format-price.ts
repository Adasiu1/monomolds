const pln = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/** Presentation only. Authoritative prices and discounts must come from the server. */
export function formatPrice(amountGrosze: number): string {
  if (!Number.isSafeInteger(amountGrosze) || amountGrosze < 0) {
    throw new RangeError("Price must be a non-negative safe integer in grosze.");
  }
  return pln.format(amountGrosze / 100);
}
