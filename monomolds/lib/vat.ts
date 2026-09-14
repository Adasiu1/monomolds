export const STANDARD_VAT_PERCENT = 23;

/** Converts a net amount in grosze to the customer-facing gross amount. */
export function grossFromNetGrosze(netGrosze: number): number {
  if (!Number.isSafeInteger(netGrosze) || netGrosze < 0) {
    throw new RangeError("Net amount must be a non-negative integer number of grosze.");
  }
  return Math.round((netGrosze * (100 + STANDARD_VAT_PERCENT)) / 100);
}
