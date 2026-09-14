import { formatPrice } from "@/lib/format-price";

// Amounts arrive in grosze: 12900 means 129 zł. This only displays supplied prices.
// It does not decide discounts or calculate price history.
export type PriceProps = {
  amountGrosze: number;
  netAmountGrosze?: number;
  originalAmountGrosze?: number;
  lowest30DaysGrosze?: number;
  prefix?: string;
};

/** Displays server-supplied integer grosze; it never calculates discounts. */
export function Price({ amountGrosze, netAmountGrosze, originalAmountGrosze, lowest30DaysGrosze, prefix }: PriceProps) {
  const current = formatPrice(amountGrosze);
  const original = originalAmountGrosze === undefined ? undefined : formatPrice(originalAmountGrosze);
  const sale = originalAmountGrosze !== undefined && originalAmountGrosze > amountGrosze;
  return <div className="ui-price">
    <span><span className="sr-only">{sale ? "Cena promocyjna brutto: " : "Cena brutto: "}</span>{prefix ? `${prefix} ` : null}{current} <small className="ui-price-tax-label">brutto</small></span>
    {sale ? <><span className="ui-badge">Promocja</span><del><span className="sr-only">Cena regularna: </span>{original}</del></> : null}
    {sale && lowest30DaysGrosze !== undefined ? <small>Najniższa cena z 30 dni przed obniżką: {formatPrice(lowest30DaysGrosze)}</small> : null}
    {netAmountGrosze !== undefined ? <small>{formatPrice(netAmountGrosze)} netto + 23% VAT</small> : null}
  </div>;
}
