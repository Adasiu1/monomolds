import type {
  CheckoutInput,
  CheckoutResult,
  CheckoutSuccess,
  CommerceRepository,
  ContractFieldErrors,
  PricedCartItem,
  PricedComponent,
  Quote,
  QuoteInput,
  QuoteResult,
  RetryPaymentInput,
  RetryPaymentResult,
} from "./contracts";
import {
  BUNDLE_DISCOUNT_PERCENT,
  FREE_SHIPPING_MIN_PHYSICAL_ITEMS,
  LARGE_ORDER_NOTICE_THRESHOLD_ITEMS,
  PAYMENT_ATTEMPT_VALIDITY_MINUTES,
  PRICING_POLICY_VERSION,
} from "./contracts";

type FixtureComponent = {
  merchandiseId: string;
  name: string;
  priceGrosze: number;
  quantity: number;
};

type FixtureMerchandise = {
  name: string;
  kind: "product" | "bundle";
  components: FixtureComponent[];
};

type FixtureOrder = {
  quote: Quote;
  success: CheckoutSuccess;
};

const STANDARD_SHIPPING_GROSZE = 1599;

const FIXTURE_CATALOGUE: Record<string, FixtureMerchandise> = {
  "variant-heart": {
    name: "Serce",
    kind: "product",
    components: [{ merchandiseId: "variant-heart", name: "Serce", priceGrosze: 4500, quantity: 1 }],
  },
  "variant-star": {
    name: "Gwiazda",
    kind: "product",
    components: [{ merchandiseId: "variant-star", name: "Gwiazda", priceGrosze: 4000, quantity: 1 }],
  },
  "bundle-four": {
    name: "Zestaw 4 foremek",
    kind: "bundle",
    components: [
      { merchandiseId: "variant-heart", name: "Serce", priceGrosze: 4500, quantity: 1 },
      { merchandiseId: "variant-star", name: "Gwiazda", priceGrosze: 4000, quantity: 1 },
      { merchandiseId: "variant-moon", name: "Księżyc", priceGrosze: 4200, quantity: 1 },
      { merchandiseId: "variant-flower", name: "Kwiat", priceGrosze: 4300, quantity: 1 },
    ],
  },
  "variant-monkey-6": {
    name: "Monkey - zestaw 6 foremek",
    kind: "bundle",
    components: Array.from({ length: 6 }, (_, index) => ({
      merchandiseId: `variant-monkey-${index + 1}`,
      name: `Monkey ${index + 1}`,
      priceGrosze: 4000,
      quantity: 1,
    })),
  },
};

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

/** Allocates a line-level discount exactly, with deterministic one-grosz remainders. */
function allocateDiscount(components: Omit<PricedComponent, "discountGrosze" | "paidAmountGrosze">[], discount: number) {
  const subtotal = components.reduce((sum, component) => sum + component.baseAmountGrosze, 0);
  const allocations = components.map((component, index) => ({
    index,
    floor: Math.floor((discount * component.baseAmountGrosze) / subtotal),
    remainder: (discount * component.baseAmountGrosze) % subtotal,
    merchandiseId: component.merchandiseId,
  }));
  let penniesLeft = discount - allocations.reduce((sum, allocation) => sum + allocation.floor, 0);

  allocations.sort((left, right) =>
    right.remainder - left.remainder || left.merchandiseId.localeCompare(right.merchandiseId) || left.index - right.index,
  );
  for (const allocation of allocations) {
    if (penniesLeft === 0) break;
    allocation.floor += 1;
    penniesLeft -= 1;
  }
  allocations.sort((left, right) => left.index - right.index);

  return components.map((component, index): PricedComponent => ({
    ...component,
    discountGrosze: allocations[index].floor,
    paidAmountGrosze: component.baseAmountGrosze - allocations[index].floor,
  }));
}

type PriceItemsResult =
  | { ok: true; items: PricedCartItem[] }
  | { ok: false; code: "INVALID_CART" | "PRODUCT_NOT_FOUND" };

function priceItems(input: QuoteInput): PriceItemsResult {
  if (input.items.length === 0) return { ok: false, code: "INVALID_CART" };
  const items: PricedCartItem[] = [];

  for (const item of input.items) {
    const merchandise = FIXTURE_CATALOGUE[item.merchandiseId];
    if (!merchandise) return { ok: false, code: "PRODUCT_NOT_FOUND" };
    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) return { ok: false, code: "INVALID_CART" };

    const rawComponents = merchandise.components.map((component) => ({
      merchandiseId: component.merchandiseId,
      name: component.name,
      quantity: component.quantity * item.quantity,
      baseAmountGrosze: component.priceGrosze * component.quantity * item.quantity,
    }));
    const lineSubtotalGrosze = rawComponents.reduce((sum, component) => sum + component.baseAmountGrosze, 0);
    const discountGrosze =
      merchandise.kind === "bundle" ? Math.round((lineSubtotalGrosze * BUNDLE_DISCOUNT_PERCENT) / 100) : 0;
    const components = allocateDiscount(rawComponents, discountGrosze);

    items.push({
      ...item,
      name: merchandise.name,
      kind: merchandise.kind,
      physicalItemCount: rawComponents.reduce((sum, component) => sum + component.quantity, 0),
      unitPriceGrosze: Math.round(lineSubtotalGrosze / item.quantity),
      lineSubtotalGrosze,
      discountGrosze,
      lineTotalGrosze: lineSubtotalGrosze - discountGrosze,
      components,
    });
  }

  return { ok: true, items };
}

type BuildQuoteResult = { ok: true; quote: Quote } | { ok: false; code: "INVALID_CART" | "PRODUCT_NOT_FOUND" };

function buildQuote(input: QuoteInput, now: Date): BuildQuoteResult {
  const priced = priceItems(input);
  if (!priced.ok) return priced;
  const { items } = priced;

  const physicalItemCount = items.reduce((sum, item) => sum + item.physicalItemCount, 0);
  const subtotalGrosze = items.reduce((sum, item) => sum + item.lineSubtotalGrosze, 0);
  const discountGrosze = items.reduce((sum, item) => sum + item.discountGrosze, 0);
  const hasFreeShipping = physicalItemCount >= FREE_SHIPPING_MIN_PHYSICAL_ITEMS;
  const shippingGrosze = hasFreeShipping ? 0 : STANDARD_SHIPPING_GROSZE;
  const requiresLeadTimeConfirmation = physicalItemCount > LARGE_ORDER_NOTICE_THRESHOLD_ITEMS;

  return { ok: true, quote: {
    id: crypto.randomUUID(),
    items,
    subtotalGrosze,
    discountGrosze,
    delivery: {
      method: input.deliveryMethod,
      parcelSize: "S",
      priceGrosze: shippingGrosze,
      ruleVersion: "fixture-capacity-placeholder-v1",
    },
    totalGrosze: subtotalGrosze - discountGrosze + shippingGrosze,
    currency: "PLN",
    createdAt: now.toISOString(),
    physicalItemCount,
    pricingPolicyVersion: PRICING_POLICY_VERSION,
    adjustments: [
      ...(discountGrosze > 0
        ? [{ type: "bundle_discount", policyId: "bundle-10-percent", amountGrosze: discountGrosze } as const]
        : []),
      ...(hasFreeShipping
        ? [{ type: "free_shipping", policyId: "free-shipping-from-6-moulds", amountGrosze: STANDARD_SHIPPING_GROSZE } as const]
        : []),
    ],
    requiresLeadTimeConfirmation,
    leadTimeNotice: requiresLeadTimeConfirmation
      ? "To duże zamówienie. Termin realizacji może przekroczyć 7 dni i potwierdzimy go mailowo lub telefonicznie."
      : null,
    leadTimeNoticeVersion: requiresLeadTimeConfirmation ? "large-order-v1" : null,
  } };
}

function checkoutFieldErrors(input: CheckoutInput): ContractFieldErrors {
  const errors: ContractFieldErrors = {};
  if (!/^\S+@\S+\.\S+$/.test(input.customer.email)) errors["customer.email"] = ["Podaj prawidłowy adres e-mail."];
  if (!input.customer.firstName.trim()) errors["customer.firstName"] = ["Podaj imię."];
  if (!input.customer.lastName.trim()) errors["customer.lastName"] = ["Podaj nazwisko."];
  if (!/^\+?[0-9 ]{7,15}$/.test(input.customer.phone)) errors["customer.phone"] = ["Podaj prawidłowy numer telefonu."];
  if (!input.acceptedTerms) errors.acceptedTerms = ["Akceptacja regulaminu jest wymagana."];
  if (input.delivery.method === "inpost_locker" && !input.delivery.pointId.trim()) {
    errors["delivery.pointId"] = ["Wybierz paczkomat."];
  }
  if (input.delivery.method === "courier") {
    if (!input.delivery.address.line1.trim()) errors["delivery.address.line1"] = ["Podaj adres."];
    if (!/^\d{2}-\d{3}$/.test(input.delivery.address.postalCode)) {
      errors["delivery.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    }
    if (!input.delivery.address.city.trim()) errors["delivery.address.city"] = ["Podaj miejscowość."];
  }
  return errors;
}

export function createCommerceFixtureRepository(options: { now?: () => Date } = {}): CommerceRepository {
  const now = options.now ?? (() => new Date());
  const quotes = new Map<string, Quote>();
  const ordersByQuoteId = new Map<string, FixtureOrder>();
  const ordersById = new Map<string, FixtureOrder>();

  function paymentSuccess(): CheckoutSuccess {
    const createdAt = now();
    return {
      orderId: crypto.randomUUID(),
      orderDisposition: "created",
      orderStatus: "pending_payment",
      guestOrderToken: crypto.randomUUID(),
      paymentAttemptId: crypto.randomUUID(),
      paymentProvider: "przelewy24",
      paymentUrl: "https://sandbox.przelewy24.pl/fixture-payment",
      paymentExpiresAt: addMinutes(createdAt, PAYMENT_ATTEMPT_VALIDITY_MINUTES),
    };
  }

  const repository = {
    async quote(input: QuoteInput): Promise<QuoteResult> {
      const result = buildQuote(input, now());
      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.code,
            message: result.code === "PRODUCT_NOT_FOUND" ? "Nie znaleziono produktu." : "Koszyk zawiera nieprawidłowe produkty.",
            retryable: false,
          },
        };
      }
      const { quote } = result;
      quotes.set(quote.id, quote);
      return { ok: true, data: { quote } };
    },

    async checkout(input: CheckoutInput): Promise<CheckoutResult> {
      const fieldErrors = checkoutFieldErrors(input);
      if (Object.keys(fieldErrors).length > 0) {
        return {
          ok: false,
          error: { code: "INVALID_INPUT", message: "Popraw zaznaczone pola.", retryable: false, fieldErrors },
        };
      }

      const quote = quotes.get(input.quoteId);
      if (!quote) {
        return { ok: false, error: { code: "QUOTE_NOT_FOUND", message: "Nie znaleziono wyceny.", retryable: false } };
      }

      if (input.delivery.method !== quote.delivery.method) {
        return {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Wybrana metoda dostawy nie zgadza się z wyceną.",
            retryable: false,
            fieldErrors: { "delivery.method": ["Ponownie przelicz dostawę."] },
          },
        };
      }

      const existingOrder = ordersByQuoteId.get(quote.id);
      if (existingOrder) {
        if (Date.parse(existingOrder.success.paymentExpiresAt) <= now().getTime()) {
          return {
            ok: false,
            error: {
              code: "PAYMENT_ATTEMPT_EXPIRED",
              message: "Czas na płatność minął. Ponów płatność, aby ponownie przeliczyć zamówienie.",
              retryable: true,
            },
          };
        }
        return { ok: true, data: { ...existingOrder.success, orderDisposition: "reused" } };
      }

      const repricedResult = buildQuote(
        { items: quote.items.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })), deliveryMethod: quote.delivery.method },
        now(),
      );
      if (!repricedResult.ok || repricedResult.quote.totalGrosze !== quote.totalGrosze || repricedResult.quote.pricingPolicyVersion !== quote.pricingPolicyVersion) {
        return {
          ok: false,
          error: { code: "QUOTE_CHANGED", message: "Cena lub promocja uległa zmianie. Sprawdź nowe podsumowanie.", retryable: true },
        };
      }
      if (quote.leadTimeNoticeVersion && input.acceptedLeadTimeNoticeVersion !== quote.leadTimeNoticeVersion) {
        return {
          ok: false,
          error: {
            code: "LEAD_TIME_NOTICE_REQUIRED",
            message: "Potwierdź informację o wydłużonym terminie realizacji.",
            retryable: true,
            fieldErrors: { acceptedLeadTimeNoticeVersion: ["Potwierdzenie jest wymagane."] },
          },
        };
      }

      const success = paymentSuccess();
      const order = { quote, success };
      ordersByQuoteId.set(quote.id, order);
      ordersById.set(success.orderId, order);
      return { ok: true, data: success };
    },

    async retryPayment(input: RetryPaymentInput): Promise<RetryPaymentResult> {
      if (!input.orderId || !input.guestOrderToken) {
        return {
          ok: false,
          error: { code: "INVALID_INPUT", message: "Brakuje danych potrzebnych do ponowienia płatności.", retryable: false },
        };
      }
      const order = ordersById.get(input.orderId);
      if (!order || order.success.guestOrderToken !== input.guestOrderToken) {
        return { ok: false, error: { code: "ORDER_NOT_FOUND", message: "Nie znaleziono zamówienia.", retryable: false } };
      }
      if (Date.parse(order.success.paymentExpiresAt) > now().getTime()) {
        return { ok: true, data: { ...order.success, orderDisposition: "reused" } };
      }

      const repricedResult = buildQuote(
        {
          items: order.quote.items.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })),
          deliveryMethod: order.quote.delivery.method,
        },
        now(),
      );
      if (!repricedResult.ok) {
        return {
          ok: false,
          error: { code: "PRICING_UNAVAILABLE", message: "Nie udało się ponownie wycenić zamówienia.", retryable: true },
        };
      }
      const { quote: repriced } = repricedResult;

      if (repriced.totalGrosze === order.quote.totalGrosze) {
        const success = {
          ...paymentSuccess(),
          orderId: order.success.orderId,
          guestOrderToken: order.success.guestOrderToken,
        };
        const replacement = { quote: repriced, success };
        ordersById.set(success.orderId, replacement);
        ordersByQuoteId.set(order.quote.id, replacement);
        return { ok: true, data: { ...success, orderDisposition: "reused" } };
      }

      const success = paymentSuccess();
      const replacement = { quote: repriced, success };
      ordersById.set(success.orderId, replacement);
      ordersByQuoteId.set(repriced.id, replacement);
      return {
        ok: true,
        data: { ...success, orderDisposition: "replaced", previousOrderId: order.success.orderId },
      };
    },
  } satisfies CommerceRepository;

  return repository;
}

export const commerceFixtureRepository = createCommerceFixtureRepository();
