"use client";

import { useState } from "react";

import { LinkButton, Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { OrderBenefits } from "@/components/order-benefits";
import { addMerchandiseToCart } from "@/features/cart/cart";
import type { CatalogueOffer } from "@/lib/catalogue/types";

export function PurchasePanel({ offers, defaultMerchandiseId }: { offers: CatalogueOffer[]; defaultMerchandiseId: string }) {
  const [selectedId, setSelectedId] = useState(defaultMerchandiseId);
  const [message, setMessage] = useState<"added" | "error" | null>(null);
  const offer = offers.find((item) => item.merchandiseId === selectedId) ?? offers[0];

  if (!offer) return null;

  const addToCart = () => {
    try {
      addMerchandiseToCart(offer.merchandiseId);
      setMessage("added");
    } catch {
      setMessage("error");
    }
  };

  return (
    <div className="purchase-panel">
      {offers.length > 1 ? (
        <fieldset className="purchase-variants">
          <legend>Wariant</legend>
          <div className="purchase-variant-options">
            {offers.map((item) => (
              <label key={item.merchandiseId}>
                <input
                  type="radio"
                  name="product-variant"
                  value={item.merchandiseId}
                  checked={item.merchandiseId === offer.merchandiseId}
                  disabled={item.availability.status === "unavailable"}
                  onChange={() => {
                    setSelectedId(item.merchandiseId);
                    setMessage(null);
                  }}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Price
        amountGrosze={offer.priceGrosze}
        netAmountGrosze={offer.netPriceGrosze}
        originalAmountGrosze={offer.originalPriceGrosze ?? undefined}
      />
      <p className="purchase-availability">
        {offer.availability.status === "in-stock"
          ? "Dostępna od ręki"
          : offer.availability.status === "made-to-order"
            ? `Wykonywana na zamówienie - realizacja do ${offer.availability.fulfilmentDays} dni`
            : "Chwilowo niedostępna"}
      </p>
      <OrderBenefits />
      <Button
        className="purchase-add-button"
        disabled={offer.availability.status === "unavailable"}
        onClick={addToCart}
      >
        Dodaj do koszyka
      </Button>

      <div className="purchase-feedback" role="status" aria-live="polite">
        {message === "added" ? (
          <><span>Dodano do koszyka.</span><LinkButton href="/koszyk" variant="secondary">Zobacz koszyk</LinkButton></>
        ) : message === "error" ? (
          <span>Nie udało się zapisać koszyka w tej przeglądarce.</span>
        ) : null}
      </div>
    </div>
  );
}
