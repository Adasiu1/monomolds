import assert from "node:assert/strict";
import test from "node:test";

import { freeShippingMessage, paidItemsSummary } from "../components/order-benefits.tsx";

test("shows progress until free shipping and confirms it from 6 physical moulds", () => {
  assert.equal(freeShippingMessage(1), "Dodaj jeszcze 5 foremek do darmowej dostawy");
  assert.equal(freeShippingMessage(2), "Dodaj jeszcze 4 foremki do darmowej dostawy");
  assert.equal(freeShippingMessage(5), "Dodaj jeszcze 1 foremkę do darmowej dostawy");
  assert.equal(freeShippingMessage(6), "Masz darmową dostawę");
  assert.equal(freeShippingMessage(24), "Masz darmową dostawę");
});

test("distinguishes paid items from earned gifts", () => {
  assert.equal(paidItemsSummary(1, 0), "1 płatna sztuka");
  assert.equal(paidItemsSummary(12, 1), "12 płatnych sztuk + 1 gratis");
  assert.equal(paidItemsSummary(24, 3), "24 płatnych sztuk + 3 gratisy");
});
