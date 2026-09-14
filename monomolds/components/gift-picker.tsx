import { SelectField } from "@/components/ui/fields";
import type { GiftOption, GiftSelection } from "@/lib/commerce/contracts";

export function giftSelectionsToSlots(selections: GiftSelection[], slotCount: number) {
  return selections.flatMap((selection) => Array(selection.quantity).fill(selection.merchandiseId)).slice(0, slotCount);
}

export function giftSlotsToSelections(slots: string[]): GiftSelection[] {
  const quantities = new Map<string, number>();
  for (const merchandiseId of slots) {
    if (merchandiseId) quantities.set(merchandiseId, (quantities.get(merchandiseId) ?? 0) + 1);
  }
  return [...quantities].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

export function GiftPicker({
  earnedQuantity,
  options,
  selections,
  onChange,
}: {
  earnedQuantity: number;
  options: GiftOption[];
  selections: GiftSelection[];
  onChange: (selections: GiftSelection[]) => void;
}) {
  if (earnedQuantity === 0) return null;
  const slots = giftSelectionsToSlots(selections, earnedQuantity);
  const selectedQuantity = slots.length;

  return (
    <section className="cart-gifts" aria-labelledby="cart-gifts-title">
      <div>
        <p className="cart-gifts-eyebrow">Promocja aktywna</p>
        <h2 id="cart-gifts-title">Wybierz {earnedQuantity === 1 ? "gratisową formę" : `${earnedQuantity} gratisowe formy`}</h2>
        <p>Gratisy są dodawane osobno i nie zwiększają kwoty do zapłaty.</p>
      </div>
      <div className="cart-gift-fields">
        {Array.from({ length: earnedQuantity }, (_, index) => (
          <SelectField
            key={index}
            id={`gift-${index + 1}`}
            label={`Gratis ${index + 1} z ${earnedQuantity}`}
            value={slots[index] ?? ""}
            onChange={(event) => {
              const nextSlots = Array.from({ length: earnedQuantity }, (_, slotIndex) =>
                slotIndex === index ? event.target.value : slots[slotIndex] ?? "",
              );
              onChange(giftSlotsToSelections(nextSlots));
            }}
          >
            <option value="">Wybierz formę</option>
            {options.map((option) => <option key={option.merchandiseId} value={option.merchandiseId}>{option.name}</option>)}
          </SelectField>
        ))}
      </div>
      <p className="cart-gifts-status" role="status" aria-live="polite">
        {selectedQuantity === earnedQuantity
          ? "Wszystkie gratisy wybrane."
          : `Pozostało do wybrania: ${earnedQuantity - selectedQuantity}.`}
      </p>
    </section>
  );
}
