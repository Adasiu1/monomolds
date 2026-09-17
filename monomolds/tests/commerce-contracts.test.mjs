import assert from "node:assert/strict";
import test from "node:test";

import {
  commerceFixtureRepository,
  createCommerceFixtureRepository,
  FIXTURE_CATALOGUE,
} from "../lib/commerce/fixture-repository.ts";
import { commerceErrorHttpStatus } from "../lib/commerce/http-status.ts";
import {
  canTransitionOrder,
  canTransitionPaymentAttempt,
  canTransitionRefund,
} from "../lib/commerce/state-transitions.ts";
import {
  deliveryMethodLabel,
  formatOrderMoney,
  isGuestOrderToken,
  isGuestPhone,
  normalizeGuestPhone,
  orderStatusLabels,
} from "../features/order-status/order-status.ts";

test("validates the guest order token and phone before lookup", () => {
  assert.equal(isGuestOrderToken("a".repeat(64)), true);
  assert.equal(isGuestOrderToken("a".repeat(63)), false);
  assert.equal(isGuestOrderToken("not-a-token"), false);
  assert.equal(isGuestPhone("+48 123 123 123"), true);
  assert.equal(isGuestPhone("+48 (123) 123-123"), true);
  assert.equal(isGuestPhone("123"), false);
  assert.equal(normalizeGuestPhone("+48 (123) 123-123"), "48123123123");
});

test("provides guest order labels for every supported status", () => {
  assert.deepEqual(Object.keys(orderStatusLabels).sort(), [
    "cancelled",
    "completed",
    "expired",
    "paid",
    "pending_payment",
    "processing",
    "shipped",
  ]);
  assert.equal(orderStatusLabels.pending_payment, "Oczekuje na płatność");
  assert.equal(orderStatusLabels.shipped, "Wysłane");
});

test("formats order summary values for Polish guests", () => {
  assert.equal(formatOrderMoney(7799, "PLN"), "77,99 zł");
  assert.equal(deliveryMethodLabel("inpost_locker"), "Paczkomat InPost");
  assert.equal(deliveryMethodLabel("courier"), "Kurier");
});

test("allows only agreed order transitions", () => {
  assert.equal(canTransitionOrder("pending_payment", "paid"), true);
  assert.equal(canTransitionOrder("paid", "processing"), true);
  assert.equal(canTransitionOrder("processing", "shipped"), true);
  assert.equal(canTransitionOrder("shipped", "completed"), true);
  assert.equal(canTransitionOrder("pending_payment", "processing"), false);
  assert.equal(canTransitionOrder("shipped", "cancelled"), false);
  assert.equal(canTransitionOrder("completed", "cancelled"), false);
  assert.equal(canTransitionOrder("completed", "processing"), false);
});

test("keeps each payment attempt terminal and requires a new attempt for retry", () => {
  assert.equal(canTransitionPaymentAttempt("created", "pending"), true);
  assert.equal(canTransitionPaymentAttempt("pending", "paid"), true);
  assert.equal(canTransitionPaymentAttempt("failed", "pending"), false);
  assert.equal(canTransitionPaymentAttempt("paid", "failed"), false);
});

test("supports manual refund processing and retry", () => {
  assert.equal(canTransitionRefund("requested", "processing"), true);
  assert.equal(canTransitionRefund("processing", "succeeded"), true);
  assert.equal(canTransitionRefund("failed", "processing"), true);
  assert.equal(canTransitionRefund("succeeded", "processing"), false);
});

test("fixture implements quote and checkout success contracts", async () => {
  assert.deepEqual(Object.keys(commerceFixtureRepository).sort(), ["checkout", "quote"]);

  const quoteResult = await commerceFixtureRepository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });

  assert.equal(quoteResult.ok, true);
  if (!quoteResult.ok) return;

  const checkoutResult = await commerceFixtureRepository.checkout({
    quoteId: quoteResult.data.quote.id,
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    acceptedTerms: true,
  });

  assert.equal(checkoutResult.ok, true);
  if (checkoutResult.ok) {
    assert.equal(checkoutResult.data.orderStatus, "pending_payment");
    assert.equal(checkoutResult.data.orderDisposition, "created");
    assert.equal(checkoutResult.data.orderNumber, "MON-000001");
  }
});

test("uses the contract error for a missing product", async () => {
  const result = await createCommerceFixtureRepository().quote({
    items: [{ merchandiseId: "missing-product", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });

  assert.deepEqual(result, {
    ok: false,
    error: { code: "PRODUCT_NOT_FOUND", message: "Nie znaleziono produktu.", retryable: false },
  });
});

test("prices the catalogue merchandise id without a client-provided price", async () => {
  const result = await createCommerceFixtureRepository().quote({
    items: [{ merchandiseId: "00000000-0000-0000-0000-000000000005", quantity: 2 }],
    deliveryMethod: "inpost_locker",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.quote.items[0].name, "Forma Kokos 100 ml");
  assert.equal(result.data.quote.items[0].unitNetPriceGrosze, 5000);
  assert.equal(result.data.quote.items[0].unitPriceGrosze, 6150);
  assert.equal(result.data.quote.items[0].lineTotalGrosze, 12300);
});

test("derives a bundle price from its components and preserves its physical quantity", async () => {
  const result = await createCommerceFixtureRepository().quote({
    items: [{ merchandiseId: "00000000-0000-0000-0000-000000000020", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.quote.items[0].name, "Halloween Zestaw");
  assert.equal(result.data.quote.items[0].physicalItemCount, 7);
  assert.equal(result.data.quote.items[0].lineSubtotalGrosze, 41820);
  assert.equal(result.data.quote.items[0].discountGrosze, 4182);
  assert.equal(result.data.quote.items[0].lineTotalGrosze, 37638);
});

test("merges duplicate merchandise, caps the merged quantity and ignores client prices", async () => {
  const repository = createCommerceFixtureRepository();
  const result = await repository.quote({
    items: [
      { merchandiseId: "variant-heart", quantity: 2, price: 1, amount: 1 },
      { merchandiseId: "variant-heart", quantity: 3, price: 1, amount: 1 },
    ],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.quote.items.length, 1);
    assert.equal(result.data.quote.items[0].quantity, 5);
    assert.equal(result.data.quote.items[0].lineTotalGrosze, 27675);
    assert.equal("price" in result.data.quote.items[0], false);
  }

  const tooMany = await repository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 60 }, { merchandiseId: "variant-heart", quantity: 40 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(tooMany.ok, false);
  if (!tooMany.ok) assert.equal(tooMany.error.code, "INVALID_CART");
});

test("normalizes and applies an active percentage code after the bundle discount", async () => {
  const repository = createCommerceFixtureRepository({ discounts: [{ code: "JESIEN10", percentage: 10 }] });
  const result = await repository.quote({
    items: [{ merchandiseId: "bundle-four", quantity: 1 }],
    deliveryMethod: "inpost_locker",
    discountCode: "  jesien10 ",
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data.quote.appliedDiscount, {
    code: "JESIEN10",
    type: "percentage",
    percentage: 10,
    amountGrosze: 1882,
    ruleVersion: "percentage-whole-cart-v1",
  });
  assert.equal(result.data.quote.discountGrosze, 3973);
  assert.equal(result.data.quote.items[0].components.reduce((sum, component) => sum + component.paidAmountGrosze, 0), result.data.quote.items[0].lineTotalGrosze);
});

test("validates discount dates and minimum subtotal", async () => {
  const now = new Date("2026-09-15T12:00:00.000Z");
  const base = { now: () => now };
  const notStarted = await createCommerceFixtureRepository({ ...base, discounts: [{ code: "LATER", percentage: 10, validFrom: "2026-09-16T00:00:00.000Z" }] }).quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }], deliveryMethod: "inpost_locker", discountCode: "LATER",
  });
  assert.equal(notStarted.ok, false);
  if (!notStarted.ok) assert.equal(notStarted.error.code, "DISCOUNT_NOT_STARTED");

  const expired = await createCommerceFixtureRepository({ ...base, discounts: [{ code: "OLD", percentage: 10, validUntil: now.toISOString() }] }).quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }], deliveryMethod: "inpost_locker", discountCode: "OLD",
  });
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.error.code, "DISCOUNT_EXPIRED");

  const belowMinimum = await createCommerceFixtureRepository({ ...base, discounts: [{ code: "BIG", percentage: 10, minSubtotalGrosze: 10000 }] }).quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }], deliveryMethod: "inpost_locker", discountCode: "BIG",
  });
  assert.equal(belowMinimum.ok, false);
  if (!belowMinimum.ok) assert.equal(belowMinimum.error.code, "DISCOUNT_MIN_SUBTOTAL");
});

test("returns a concrete item error when catalogue pricing changes after quote", async () => {
  const catalogue = structuredClone(FIXTURE_CATALOGUE);
  const repository = createCommerceFixtureRepository({ catalogue });
  const quoted = await repository.quote({ items: [{ merchandiseId: "variant-heart", quantity: 1 }], deliveryMethod: "inpost_locker" });
  assert.equal(quoted.ok, true);
  if (!quoted.ok) return;
  catalogue["variant-heart"].components[0].priceGrosze = 5000;
  const result = await repository.checkout({
    quoteId: quoted.data.quote.id,
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    acceptedTerms: true,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.deepEqual(result.error.itemErrors, [{
    merchandiseId: "variant-heart", reason: "PRICE_CHANGED", requestedQuantity: 1,
  }]);
});

test("rejects delivery details that do not match the quote", async () => {
  const repository = createCommerceFixtureRepository();
  const quoteResult = await repository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(quoteResult.ok, true);
  if (!quoteResult.ok) return;

  const result = await repository.checkout({
    quoteId: quoteResult.data.quote.id,
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: {
      method: "courier",
      address: { line1: "Prosta 1", postalCode: "00-001", city: "Warszawa", countryCode: "PL" },
    },
    acceptedTerms: true,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "INVALID_INPUT");
  assert.deepEqual(result.error.fieldErrors, { "delivery.method": ["Ponownie przelicz dostawę."] });
});

test("counts physical moulds, stacks bundle discount with free shipping and allocates the paid bundle price", async () => {
  const result = await commerceFixtureRepository.quote({
    items: [
      { merchandiseId: "bundle-four", quantity: 1 },
      { merchandiseId: "variant-heart", quantity: 2 },
    ],
    deliveryMethod: "inpost_locker",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const quote = result.data.quote;
  const bundle = quote.items[0];
  assert.equal(quote.physicalItemCount, 6);
  assert.equal(quote.delivery.priceGrosze, 0);
  assert.equal(bundle.discountGrosze, 2091);
  assert.equal(bundle.components.reduce((sum, component) => sum + component.paidAmountGrosze, 0), bundle.lineTotalGrosze);
  assert.deepEqual(
    quote.adjustments.map((adjustment) => adjustment.type),
    ["bundle_discount", "free_shipping"],
  );
  assert.equal(Date.parse(quote.expiresAt) - Date.parse(quote.createdAt), 15 * 60_000);
});

test("adds customer-selected gifts without charging for them", async () => {
  const result = await createCommerceFixtureRepository().quote({
    items: [{ merchandiseId: "00000000-0000-0000-0000-000000000005", quantity: 12 }],
    giftItems: [{ merchandiseId: "variant-star", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.quote.giftPromotion.earnedQuantity, 1);
  assert.deepEqual(result.data.quote.giftPromotion.selectedItems, [{
    merchandiseId: "variant-star",
    name: "Gwiazda",
    quantity: 1,
    unitPriceGrosze: 0,
    lineTotalGrosze: 0,
  }]);
  assert.equal(result.data.quote.totalGrosze, 73800);
});

test("earns three gifts from 24 paid moulds and rejects too many selections", async () => {
  const repository = createCommerceFixtureRepository();
  const eligible = await repository.quote({
    items: [{ merchandiseId: "00000000-0000-0000-0000-000000000005", quantity: 24 }],
    giftItems: [{ merchandiseId: "variant-heart", quantity: 2 }, { merchandiseId: "variant-star", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(eligible.ok, true);
  if (eligible.ok) assert.equal(eligible.data.quote.giftPromotion.earnedQuantity, 3);

  const invalid = await repository.quote({
    items: [{ merchandiseId: "00000000-0000-0000-0000-000000000005", quantity: 12 }],
    giftItems: [{ merchandiseId: "variant-heart", quantity: 2 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.error.code, "INVALID_GIFT_SELECTION");
});

test("makes checkout idempotent while its payment attempt is active", async () => {
  const repository = createCommerceFixtureRepository();
  const quoteResult = await repository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(quoteResult.ok, true);
  if (!quoteResult.ok) return;

  const input = {
    quoteId: quoteResult.data.quote.id,
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    acceptedTerms: true,
  };
  const first = await repository.checkout(input);
  const second = await repository.checkout(input);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.data.orderDisposition, "created");
  assert.equal(second.data.orderDisposition, "reused");
  assert.equal(second.data.orderId, first.data.orderId);
  assert.equal(second.data.paymentAttemptId, first.data.paymentAttemptId);
});

test("collects all checkout field errors", async () => {
  const repository = createCommerceFixtureRepository();
  const result = await repository.checkout({
    quoteId: "missing",
    customer: { email: "bad", firstName: "", lastName: "", phone: "1" },
    delivery: { method: "inpost_locker", pointId: "" },
    acceptedTerms: false,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "INVALID_INPUT");
  assert.deepEqual(Object.keys(result.error.fieldErrors ?? {}).sort(), [
    "acceptedTerms",
    "customer.email",
    "customer.firstName",
    "customer.lastName",
    "customer.phone",
    "delivery.pointId",
  ]);
});

test("expires a quote after exactly 15 minutes", async () => {
  let currentTime = new Date("2026-09-10T12:00:00.000Z");
  const repository = createCommerceFixtureRepository({ now: () => new Date(currentTime) });
  const quoteResult = await repository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(quoteResult.ok, true);
  if (!quoteResult.ok) return;

  currentTime = new Date("2026-09-10T12:15:00.000Z");
  const checkout = await repository.checkout({
    quoteId: quoteResult.data.quote.id,
    idempotencyKey: "00000000-0000-4000-8000-000000000001",
    guestOrderToken: "a".repeat(64),
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    invoice: null,
    acceptedTerms: true,
    acceptedTermsVersion: "mvp-2026-09-14",
  });
  assert.equal(checkout.ok, false);
  if (!checkout.ok) assert.equal(checkout.error.code, "QUOTE_EXPIRED");
});

test("maps stable commerce errors to the agreed HTTP statuses", () => {
  assert.equal(commerceErrorHttpStatus("INVALID_INPUT"), 400);
  assert.equal(commerceErrorHttpStatus("QUOTE_NOT_FOUND"), 404);
  assert.equal(commerceErrorHttpStatus("QUOTE_CHANGED"), 409);
  assert.equal(commerceErrorHttpStatus("LEAD_TIME_NOTICE_REQUIRED"), 422);
  assert.equal(commerceErrorHttpStatus("RATE_LIMITED"), 429);
  assert.equal(commerceErrorHttpStatus("PRICING_UNAVAILABLE"), 503);
});

test("fixture returns the agreed checkout error shape", async () => {
  const result = await commerceFixtureRepository.checkout({
    quoteId: "missing",
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    acceptedTerms: true,
  });

  assert.deepEqual(result, {
    ok: false,
    error: { code: "QUOTE_NOT_FOUND", message: "Nie znaleziono wyceny.", retryable: false },
  });
});
