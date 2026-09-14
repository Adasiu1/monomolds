import assert from "node:assert/strict";
import test from "node:test";

import { giftSelectionsToSlots, giftSlotsToSelections } from "../components/gift-picker.tsx";

test("round-trips repeated gift choices through visible slots", () => {
  const selections = giftSlotsToSelections(["heart", "star", "heart"]);
  assert.deepEqual(selections, [
    { merchandiseId: "heart", quantity: 2 },
    { merchandiseId: "star", quantity: 1 },
  ]);
  assert.deepEqual(giftSelectionsToSlots(selections, 3), ["heart", "heart", "star"]);
});
