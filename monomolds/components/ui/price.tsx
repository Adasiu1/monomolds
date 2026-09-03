import { formatPrice } from "@/lib/format-price";

// Amounts arrive in grosze: 12900 means 129 zł. This only displays supplied prices.
// It does not decide discounts or calculate price history.
export type PriceProps = { amountGrosze: number; originalAmountGrosze?: number; lowest30DaysGrosze?: number };

/** Displays server-supplied integer grosze; it never calculates discounts. */
export function Price({ amountGrosze, originalAmountGrosze, lowest30DaysGrosze }: PriceProps) {
  const current = formatPrice(amountGrosze);
  const original = originalAmountGrosze === undefined ? undefined : formatPrice(originalAmountGrosze);
  const sale = originalAmountGrosze !== undefined && originalAmountGrosze > amountGrosze;
  return <div className="ui-price">
    <span><span className="sr-only">{sale ? "Cena promocyjna: " : "Cena: "}</span>{current}</span>
    {sale ? <><span className="ui-badge">Promocja</span><del><span className="sr-only">Cena regularna: </span>{original}</del></> : null}
    {sale && lowest30DaysGrosze !== undefined ? <small>Najniższa cena z 30 dni przed obniżką: {formatPrice(lowest30DaysGrosze)}</small> : null}
  </div>;
}
