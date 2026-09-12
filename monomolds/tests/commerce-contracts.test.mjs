import assert from "node:assert/strict";
import test from "node:test";

import {
  commerceFixtureRepository,
  createCommerceFixtureRepository,
} from "../lib/commerce/fixture-repository.ts";
import { commerceErrorHttpStatus } from "../lib/commerce/http-status.ts";
import {
  canTransitionOrder,
  canTransitionPaymentAttempt,
  canTransitionRefund,
} from "../lib/commerce/state-transitions.ts";

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
  assert.deepEqual(Object.keys(commerceFixtureRepository).sort(), ["checkout", "quote", "retryPayment"]);

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
    assert.equal(checkoutResult.data.paymentProvider, "przelewy24");
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
  assert.equal(bundle.discountGrosze, 1700);
  assert.equal(bundle.components.reduce((sum, component) => sum + component.paidAmountGrosze, 0), bundle.lineTotalGrosze);
  assert.deepEqual(
    quote.adjustments.map((adjustment) => adjustment.type),
    ["bundle_discount", "free_shipping"],
  );
  assert.equal("expiresAt" in quote, false);
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
    "customer.email",
    "customer.firstName",
    "customer.lastName",
    "customer.phone",
    "delivery.pointId",
    "acceptedTerms",
  ]);
});

test("re-prices and creates a new payment attempt after 15 minutes", async () => {
  let currentTime = new Date("2026-09-10T12:00:00.000Z");
  const repository = createCommerceFixtureRepository({ now: () => new Date(currentTime) });
  const quoteResult = await repository.quote({
    items: [{ merchandiseId: "variant-heart", quantity: 1 }],
    deliveryMethod: "inpost_locker",
  });
  assert.equal(quoteResult.ok, true);
  if (!quoteResult.ok) return;

  const checkout = await repository.checkout({
    quoteId: quoteResult.data.quote.id,
    customer: { email: "anna@example.test", firstName: "Anna", lastName: "Nowak", phone: "+48123123123" },
    delivery: { method: "inpost_locker", pointId: "POZ01A" },
    acceptedTerms: true,
  });
  assert.equal(checkout.ok, true);
  if (!checkout.ok) return;

  currentTime = new Date("2026-09-10T12:16:00.000Z");
  const retry = await repository.retryPayment({
    orderId: checkout.data.orderId,
    guestOrderToken: checkout.data.guestOrderToken,
  });
  assert.equal(retry.ok, true);
  if (!retry.ok) return;
  assert.equal(retry.data.orderDisposition, "reused");
  assert.equal(retry.data.orderId, checkout.data.orderId);
  assert.notEqual(retry.data.paymentAttemptId, checkout.data.paymentAttemptId);
});

test("maps stable commerce errors to the agreed HTTP statuses", () => {
  assert.equal(commerceErrorHttpStatus("INVALID_INPUT"), 400);
  assert.equal(commerceErrorHttpStatus("QUOTE_NOT_FOUND"), 404);
  assert.equal(commerceErrorHttpStatus("QUOTE_CHANGED"), 409);
  assert.equal(commerceErrorHttpStatus("LEAD_TIME_NOTICE_REQUIRED"), 422);
  assert.equal(commerceErrorHttpStatus("PAYMENT_INITIALIZATION_FAILED"), 502);
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
