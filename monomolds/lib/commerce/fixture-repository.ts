import { randomUUID } from "node:crypto";

import type {
  CheckoutInput,
  CheckoutResult,
  CheckoutSuccess,
  CommerceRepository,
  ContractFieldErrors,
  PricedCartItem,
  PricedComponent,
  Quote,
  QuoteErrorCode,
  QuoteInput,
  QuoteResult,
} from "./contracts";
import {
  BUNDLE_DISCOUNT_PERCENT,
  FREE_SHIPPING_MIN_PHYSICAL_ITEMS,
  LARGE_ORDER_NOTICE_THRESHOLD_ITEMS,
  PRICING_POLICY_VERSION,
} from "./contracts";
import { grossFromNetGrosze } from "@/lib/vat";

export type FixtureComponent = {
  merchandiseId: string;
  name: string;
  priceGrosze: number;
  quantity: number;
};

export type FixtureMerchandise = {
  name: string;
  kind: "product" | "bundle";
  priceGrosze?: number;
  status?: "draft" | "published" | "archived";
  components: FixtureComponent[];
};

export type FixtureDiscount = {
  code: string;
  percentage: number;
  active?: boolean;
  validFrom?: string;
  validUntil?: string;
  minSubtotalGrosze?: number;
  maxUsesPerEmail?: number | null;
};

type FixtureOrder = {
  quote: Quote;
  success: CheckoutSuccess;
  email: string;
};

const SHIPPING_GROSZE = { inpost_locker: 1649, courier: 1949 } as const;

export const FIXTURE_CATALOGUE: Record<string, FixtureMerchandise> = {
  "00000000-0000-0000-0000-000000000020": {
    name: "Halloween Zestaw",
    kind: "bundle",
    // Deliberately ignored for bundles: their current price is derived from components.
    priceGrosze: 1,
    components: [
      {
        merchandiseId: "00000000-0000-0000-0000-000000000001",
        name: "Forma Małpka 100 ml",
        priceGrosze: 5000,
        quantity: 6,
      },
      {
        merchandiseId: "00000000-0000-0000-0000-000000000006",
        name: "Forma Serce 100 ml",
        priceGrosze: 4000,
        quantity: 1,
      },
    ],
  },
  "00000000-0000-0000-0000-000000000005": {
    name: "Forma Kokos 100 ml",
    kind: "product",
    components: [{
      merchandiseId: "00000000-0000-0000-0000-000000000005",
      name: "Forma Kokos 100 ml",
      priceGrosze: 5000,
      quantity: 1,
    }],
  },
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
    priceGrosze: 17000,
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
    priceGrosze: 24000,
    components: Array.from({ length: 6 }, (_, index) => ({
      merchandiseId: `variant-monkey-${index + 1}`,
      name: `Monkey ${index + 1}`,
      priceGrosze: 4000,
      quantity: 1,
    })),
  },
};

const GIFT_OPTIONS = Object.entries(FIXTURE_CATALOGUE)
  .filter(([, merchandise]) => merchandise.kind === "product" && merchandise.components.length === 1)
  .map(([merchandiseId, merchandise]) => ({ merchandiseId, name: merchandise.name }));

function earnedGiftQuantity(physicalItemCount: number) {
  if (physicalItemCount >= 24) return 3;
  if (physicalItemCount >= 12) return 1;
  return 0;
}

function addMinutes(date: Date, minutes: number): string {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

/** Allocates a line-level discount exactly, with deterministic one-grosz remainders. */
function allocateDiscount<T extends Omit<PricedComponent, "discountGrosze" | "paidAmountGrosze">>(components: T[], discount: number) {
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

  return components.map((component, index) => ({
    ...component,
    discountGrosze: allocations[index].floor,
    paidAmountGrosze: component.baseAmountGrosze - allocations[index].floor,
  }));
}

type PriceItemsResult =
  | { ok: true; items: PricedCartItem[] }
  | { ok: false; code: "INVALID_CART" | "PRODUCT_NOT_FOUND" };

function priceItems(input: QuoteInput, catalogue: Record<string, FixtureMerchandise>): PriceItemsResult {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!item.merchandiseId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, code: "INVALID_CART" };
    }
    quantities.set(item.merchandiseId, (quantities.get(item.merchandiseId) ?? 0) + item.quantity);
  }
  if (quantities.size === 0 || quantities.size > 50 || [...quantities.values()].some((quantity) => quantity > 99)) {
    return { ok: false, code: "INVALID_CART" };
  }
  const items: PricedCartItem[] = [];

  for (const [merchandiseId, quantity] of quantities) {
    const item = { merchandiseId, quantity };
    const merchandise = catalogue[item.merchandiseId];
    if (!merchandise || (merchandise.status ?? "published") !== "published") {
      return { ok: false, code: "PRODUCT_NOT_FOUND" };
    }

    const rawComponents = merchandise.components.map((component) => ({
      merchandiseId: component.merchandiseId,
      name: component.name,
      quantity: component.quantity * item.quantity,
      baseAmountGrosze: grossFromNetGrosze(component.priceGrosze) * component.quantity * item.quantity,
    }));
    const unitNetSubtotalGrosze = merchandise.kind === "bundle"
      ? merchandise.components.reduce((sum, component) => sum + component.priceGrosze * component.quantity, 0)
      : merchandise.priceGrosze ?? merchandise.components.reduce((sum, component) => sum + component.priceGrosze * component.quantity, 0);
    const lineNetSubtotalGrosze = unitNetSubtotalGrosze * item.quantity;
    const lineSubtotalGrosze = grossFromNetGrosze(unitNetSubtotalGrosze) * item.quantity;
    const discountGrosze =
      merchandise.kind === "bundle" ? Math.round((lineSubtotalGrosze * BUNDLE_DISCOUNT_PERCENT) / 100) : 0;
    const netDiscountGrosze =
      merchandise.kind === "bundle" ? Math.round((lineNetSubtotalGrosze * BUNDLE_DISCOUNT_PERCENT) / 100) : 0;
    const allocatedBase = allocateDiscount(
      rawComponents.map((component) => ({ ...component, baseAmountGrosze: component.baseAmountGrosze })),
      rawComponents.reduce((sum, component) => sum + component.baseAmountGrosze, 0) - lineSubtotalGrosze,
    ).map((component) => ({
      ...component,
      baseAmountGrosze: component.paidAmountGrosze,
      discountGrosze: 0,
      paidAmountGrosze: component.paidAmountGrosze,
    }));
    const components = allocateDiscount(allocatedBase, discountGrosze);

    items.push({
      ...item,
      name: merchandise.name,
      kind: merchandise.kind,
      physicalItemCount: rawComponents.reduce((sum, component) => sum + component.quantity, 0),
      unitPriceGrosze: grossFromNetGrosze(unitNetSubtotalGrosze),
      unitNetPriceGrosze: Math.round((lineNetSubtotalGrosze - netDiscountGrosze) / item.quantity),
      lineSubtotalGrosze,
      discountGrosze,
      lineTotalGrosze: lineSubtotalGrosze - discountGrosze,
      components,
    });
  }

  return { ok: true, items };
}

type BuildQuoteResult = { ok: true; quote: Quote } | { ok: false; code: Exclude<QuoteErrorCode, "RATE_LIMITED" | "SHIPPING_CONFIGURATION_PENDING" | "PRICING_UNAVAILABLE"> };

function applyCodeDiscount(items: PricedCartItem[], amountGrosze: number): PricedCartItem[] {
  if (!amountGrosze) return items;
  const flat = items.flatMap((item, itemIndex) => item.components.map((component, componentIndex) => ({
    itemIndex,
    componentIndex,
    merchandiseId: component.merchandiseId,
    name: component.name,
    quantity: component.quantity,
    baseAmountGrosze: component.paidAmountGrosze,
  })));
  const allocations = allocateDiscount(flat, amountGrosze);
  return items.map((item, itemIndex) => {
    const components = item.components.map((component, componentIndex) => {
      const allocation = allocations.find((candidate) => candidate.itemIndex === itemIndex && candidate.componentIndex === componentIndex)!;
      return {
        ...component,
        discountGrosze: component.discountGrosze + allocation.discountGrosze,
        paidAmountGrosze: allocation.paidAmountGrosze,
      };
    });
    const codeDiscount = components.reduce((sum, component, index) => sum + component.discountGrosze - item.components[index].discountGrosze, 0);
    return { ...item, components, discountGrosze: item.discountGrosze + codeDiscount, lineTotalGrosze: item.lineTotalGrosze - codeDiscount };
  });
}

function buildQuote(input: QuoteInput, now: Date, discounts: FixtureDiscount[], catalogue: Record<string, FixtureMerchandise>): BuildQuoteResult {
  const priced = priceItems(input, catalogue);
  if (!priced.ok) return priced;
  let { items } = priced;

  const physicalItemCount = items.reduce((sum, item) => sum + item.physicalItemCount, 0);
  const earnedQuantity = earnedGiftQuantity(physicalItemCount);
  const giftItems = input.giftItems ?? [];
  const selectedGiftQuantity = giftItems.reduce((sum, item) => sum + item.quantity, 0);
  if (
    selectedGiftQuantity > earnedQuantity ||
    giftItems.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1 || !GIFT_OPTIONS.some((option) => option.merchandiseId === item.merchandiseId))
  ) {
    return { ok: false, code: "INVALID_GIFT_SELECTION" };
  }
  const selectedGiftItems = giftItems.map((item) => ({
    ...item,
    name: GIFT_OPTIONS.find((option) => option.merchandiseId === item.merchandiseId)!.name,
    unitPriceGrosze: 0 as const,
    lineTotalGrosze: 0 as const,
  }));
  const subtotalGrosze = items.reduce((sum, item) => sum + item.lineSubtotalGrosze, 0);
  const bundleDiscountGrosze = items.reduce((sum, item) => sum + item.discountGrosze, 0);
  const normalizedCode = input.discountCode?.trim().toUpperCase() ?? "";
  const discount = normalizedCode ? discounts.find((candidate) => candidate.code.trim().toUpperCase() === normalizedCode) : undefined;
  if (normalizedCode && !discount) return { ok: false, code: "DISCOUNT_NOT_FOUND" };
  if (discount && discount.active === false) return { ok: false, code: "DISCOUNT_INACTIVE" };
  if (discount?.validFrom && now < new Date(discount.validFrom)) return { ok: false, code: "DISCOUNT_NOT_STARTED" };
  if (discount?.validUntil && now >= new Date(discount.validUntil)) return { ok: false, code: "DISCOUNT_EXPIRED" };
  if (discount && subtotalGrosze < (discount.minSubtotalGrosze ?? 0)) return { ok: false, code: "DISCOUNT_MIN_SUBTOTAL" };
  if (discount && (!Number.isSafeInteger(discount.percentage) || discount.percentage < 1 || discount.percentage > 99)) {
    return { ok: false, code: "DISCOUNT_INACTIVE" };
  }
  const codeDiscountGrosze = discount
    ? Math.round(((subtotalGrosze - bundleDiscountGrosze) * discount.percentage) / 100)
    : 0;
  items = applyCodeDiscount(items, codeDiscountGrosze);
  const discountGrosze = bundleDiscountGrosze + codeDiscountGrosze;
  const hasFreeShipping = physicalItemCount >= FREE_SHIPPING_MIN_PHYSICAL_ITEMS;
  const shippingGrosze = hasFreeShipping ? 0 : SHIPPING_GROSZE[input.deliveryMethod];
  const requiresLeadTimeConfirmation = physicalItemCount > LARGE_ORDER_NOTICE_THRESHOLD_ITEMS;

  return { ok: true, quote: {
    id: randomUUID(),
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
    expiresAt: addMinutes(now, 15),
    physicalItemCount,
    giftPromotion: {
      earnedQuantity,
      selectedItems: selectedGiftItems,
      options: GIFT_OPTIONS,
    },
    pricingPolicyVersion: PRICING_POLICY_VERSION,
    adjustments: [
      ...(bundleDiscountGrosze > 0
        ? [{ type: "bundle_discount", policyId: "bundle-10-percent", amountGrosze: bundleDiscountGrosze } as const]
        : []),
      ...(codeDiscountGrosze > 0
        ? [{ type: "code_discount", policyId: "percentage-whole-cart-v1", amountGrosze: codeDiscountGrosze } as const]
        : []),
      ...(hasFreeShipping
        ? [{ type: "free_shipping", policyId: "free-shipping-from-6-moulds", amountGrosze: SHIPPING_GROSZE[input.deliveryMethod] } as const]
        : []),
    ],
    appliedDiscount: discount ? {
      code: normalizedCode,
      type: "percentage",
      percentage: discount.percentage,
      amountGrosze: codeDiscountGrosze,
      ruleVersion: "percentage-whole-cart-v1",
    } : null,
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

export function createCommerceFixtureRepository(options: {
  now?: () => Date;
  discounts?: FixtureDiscount[];
  catalogue?: Record<string, FixtureMerchandise>;
} = {}): CommerceRepository {
  const now = options.now ?? (() => new Date());
  const discounts = options.discounts ?? [];
  const catalogue = options.catalogue ?? FIXTURE_CATALOGUE;
  const quotes = new Map<string, Quote>();
  const ordersByQuoteId = new Map<string, FixtureOrder>();

  function checkoutSuccess(guestOrderToken: string): CheckoutSuccess {
    const orderId = randomUUID();
    return {
      orderId,
      orderNumber: "MON-000001",
      orderDisposition: "created",
      orderStatus: "pending_payment",
      guestOrderToken,
      statusPath: `/zamowienie/status?token=${encodeURIComponent(guestOrderToken)}`,
    };
  }

  const repository = {
    async quote(input: QuoteInput): Promise<QuoteResult> {
      const result = buildQuote(input, now(), discounts, catalogue);
      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: result.code,
            message: result.code === "PRODUCT_NOT_FOUND" ? "Nie znaleziono produktu."
              : result.code === "INVALID_GIFT_SELECTION" ? "Wybrane gratisy nie pasują do aktualnej promocji."
              : result.code === "DISCOUNT_NOT_FOUND" ? "Nie znaleziono podanego kodu rabatowego."
              : result.code === "DISCOUNT_INACTIVE" ? "Ten kod rabatowy jest nieaktywny."
              : result.code === "DISCOUNT_NOT_STARTED" ? "Ten kod rabatowy nie jest jeszcze aktywny."
              : result.code === "DISCOUNT_EXPIRED" ? "Ten kod rabatowy wygasł."
              : result.code === "DISCOUNT_MIN_SUBTOTAL" ? "Wartość produktów jest zbyt niska dla tego kodu rabatowego."
              : "Koszyk zawiera nieprawidłowe produkty.",
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

      if (Date.parse(quote.expiresAt) <= now().getTime()) {
        return { ok: false, error: { code: "QUOTE_EXPIRED", message: "Wycena wygasła. Odśwież podsumowanie.", retryable: true } };
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
        return { ok: true, data: { ...existingOrder.success, orderDisposition: "reused" } };
      }

      const repricedResult = buildQuote(
        {
          items: quote.items.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })),
          giftItems: quote.giftPromotion.selectedItems.map(({ merchandiseId, quantity }) => ({ merchandiseId, quantity })),
          deliveryMethod: quote.delivery.method,
          discountCode: quote.appliedDiscount?.code,
        },
        now(), discounts, catalogue,
      );
      if (!repricedResult.ok || repricedResult.quote.totalGrosze !== quote.totalGrosze || repricedResult.quote.pricingPolicyVersion !== quote.pricingPolicyVersion) {
        const reason = !repricedResult.ok
          ? repricedResult.code === "PRODUCT_NOT_FOUND" ? "UNAVAILABLE" as const : "QUANTITY_INVALID" as const
          : "PRICE_CHANGED" as const;
        return {
          ok: false,
          error: {
            code: "QUOTE_CHANGED",
            message: "Cena lub promocja uległa zmianie. Sprawdź nowe podsumowanie.",
            retryable: true,
            itemErrors: quote.items.map((item) => ({
              merchandiseId: item.merchandiseId,
              reason,
              requestedQuantity: item.quantity,
            })),
          },
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

      if (quote.appliedDiscount) {
        const campaign = discounts.find((candidate) => candidate.code.trim().toUpperCase() === quote.appliedDiscount!.code)!;
        const email = input.customer.email.trim().toLowerCase();
        const used = [...ordersByQuoteId.values()].filter((order) =>
          order.quote.appliedDiscount?.code === quote.appliedDiscount!.code
          && order.success
          && order.quote.id !== quote.id
          && order.email === email,
        ).length;
        if (campaign.maxUsesPerEmail !== null && used >= (campaign.maxUsesPerEmail ?? 1)) {
          return { ok: false, error: { code: "DISCOUNT_USAGE_LIMIT", message: "Ten kod rabatowy został już wykorzystany dla podanego adresu e-mail.", retryable: false } };
        }
      }

      const success = checkoutSuccess(input.guestOrderToken);
      const order = { quote, success, email: input.customer.email.trim().toLowerCase() };
      ordersByQuoteId.set(quote.id, order);
      return { ok: true, data: success };
    },
  } satisfies CommerceRepository;

  return repository;
}

export const commerceFixtureRepository = createCommerceFixtureRepository();
