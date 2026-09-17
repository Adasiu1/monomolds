import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

import type {
  CheckoutErrorCode,
  CheckoutInput,
  CheckoutResult,
  CheckoutSuccess,
  CommerceRepository,
  ItemError,
  PublicOrderStatus,
  Quote,
  QuoteErrorCode,
  QuoteInput,
  QuoteResult,
} from "./contracts";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_CONFIGURATION_MISSING");
  return createClient<Database>(url.replace(/\/rest\/v1\/?$/, ""), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function rpcCode(message: string) {
  return message.match(/(INVALID_CART|INVALID_GIFT_SELECTION|PRODUCT_NOT_FOUND|DISCOUNT_NOT_FOUND|DISCOUNT_INACTIVE|DISCOUNT_NOT_STARTED|DISCOUNT_EXPIRED|DISCOUNT_MIN_SUBTOTAL|DISCOUNT_USAGE_LIMIT|INVALID_INPUT|QUOTE_NOT_FOUND|QUOTE_EXPIRED|QUOTE_CHANGED|IDEMPOTENCY_CONFLICT|LEAD_TIME_NOTICE_REQUIRED|RATE_LIMITED|ORDER_NOT_FOUND)/)?.[1];
}

const quoteMessages: Record<QuoteErrorCode, string> = {
  INVALID_CART: "Koszyk zawiera nieprawidłowe pozycje.",
  INVALID_GIFT_SELECTION: "Wybrane gratisy nie pasują do aktualnej promocji.",
  PRODUCT_NOT_FOUND: "Produkt jest niedostępny lub nie istnieje.",
  DISCOUNT_NOT_FOUND: "Nie znaleziono podanego kodu rabatowego.",
  DISCOUNT_INACTIVE: "Ten kod rabatowy jest nieaktywny.",
  DISCOUNT_NOT_STARTED: "Ten kod rabatowy nie jest jeszcze aktywny.",
  DISCOUNT_EXPIRED: "Ten kod rabatowy wygasł.",
  DISCOUNT_MIN_SUBTOTAL: "Wartość produktów jest zbyt niska dla tego kodu rabatowego.",
  RATE_LIMITED: "Wysłano zbyt wiele prób. Odczekaj kilka minut i spróbuj ponownie.",
  SHIPPING_CONFIGURATION_PENDING: "Dostawa nie jest jeszcze dostępna dla tego zamówienia.",
  PRICING_UNAVAILABLE: "Nie udało się przygotować aktualnej wyceny.",
};

const checkoutMessages: Record<CheckoutErrorCode, string> = {
  INVALID_INPUT: "Popraw zaznaczone pola.",
  QUOTE_NOT_FOUND: "Nie znaleziono aktualnej wyceny. Odśwież podsumowanie.",
  QUOTE_EXPIRED: "Wycena wygasła. Odśwież podsumowanie i zaakceptuj aktualną kwotę.",
  QUOTE_CHANGED: "Cena, dostępność lub dostawa uległa zmianie. Sprawdź nowe podsumowanie.",
  DISCOUNT_NOT_FOUND: quoteMessages.DISCOUNT_NOT_FOUND,
  DISCOUNT_INACTIVE: quoteMessages.DISCOUNT_INACTIVE,
  DISCOUNT_NOT_STARTED: quoteMessages.DISCOUNT_NOT_STARTED,
  DISCOUNT_EXPIRED: quoteMessages.DISCOUNT_EXPIRED,
  DISCOUNT_MIN_SUBTOTAL: quoteMessages.DISCOUNT_MIN_SUBTOTAL,
  IDEMPOTENCY_CONFLICT: "Ta próba zamówienia zawiera inne dane. Odśwież podsumowanie i spróbuj ponownie.",
  LEAD_TIME_NOTICE_REQUIRED: "Potwierdź informację o wydłużonym terminie realizacji.",
  DISCOUNT_USAGE_LIMIT: "Ten kod rabatowy został już wykorzystany dla podanego adresu e-mail.",
  RATE_LIMITED: "Wysłano zbyt wiele prób. Odczekaj kilka minut i spróbuj ponownie.",
  ORDER_CREATION_FAILED: "Nie udało się bezpiecznie zapisać zamówienia. Spróbuj ponownie.",
};

export function createSupabaseCommerceRepository(requestFingerprint: string): CommerceRepository {
  return {
    async quote(input: QuoteInput): Promise<QuoteResult> {
      let response;
      try {
        response = await client().rpc("create_checkout_quote", {
          p_items: input.items as unknown as Json,
          p_gifts: (input.giftItems ?? []) as unknown as Json,
          p_delivery_method: input.deliveryMethod,
          p_discount_code: input.discountCode?.trim().toUpperCase() ?? "",
          p_request_fingerprint: requestFingerprint,
        });
      } catch {
        return { ok: false, error: { code: "PRICING_UNAVAILABLE", message: quoteMessages.PRICING_UNAVAILABLE, retryable: true } };
      }
      const { data, error } = response;
      if (error || !data) {
        const code = rpcCode(error?.message ?? "") as QuoteErrorCode | undefined;
        return { ok: false, error: { code: code && code in quoteMessages ? code : "PRICING_UNAVAILABLE", message: quoteMessages[code && code in quoteMessages ? code : "PRICING_UNAVAILABLE"], retryable: !code } };
      }
      return { ok: true, data: { quote: data as Quote } };
    },

    async checkout(input: CheckoutInput): Promise<CheckoutResult> {
      const payloadHash = digest(stableJson({
        quoteId: input.quoteId,
        customer: input.customer,
        delivery: input.delivery,
        invoice: input.invoice,
        acceptedTermsVersion: input.acceptedTermsVersion,
        acceptedLeadTimeNoticeVersion: input.acceptedLeadTimeNoticeVersion ?? null,
      }));
      let response;
      try {
        response = await client().rpc("finalize_guest_order", {
          p_quote_id: input.quoteId,
          p_customer: input.customer as unknown as Json,
          p_delivery: input.delivery as unknown as Json,
          p_invoice: input.invoice as unknown as Json,
          p_accepted_terms_version: input.acceptedTermsVersion,
          p_accepted_lead_time_notice_version: (input.acceptedLeadTimeNoticeVersion ?? null) as unknown as string,
          p_idempotency_key: input.idempotencyKey,
          p_payload_hash: payloadHash,
          p_guest_token_hash: digest(input.guestOrderToken),
          p_request_fingerprint: requestFingerprint,
        });
      } catch {
        return { ok: false, error: { code: "ORDER_CREATION_FAILED", message: checkoutMessages.ORDER_CREATION_FAILED, retryable: true } };
      }
      const { data, error } = response;
      if (error || !data) {
        const found = rpcCode(error?.message ?? "") as CheckoutErrorCode | undefined;
        const code = found && found in checkoutMessages ? found : "ORDER_CREATION_FAILED";
        console.error("Checkout RPC failed.", { code: error?.code ?? "unknown", checkoutCode: code });
        let itemErrors: ItemError[] | undefined;
        try {
          const detail = error?.details ? JSON.parse(error.details) as { itemErrors?: ItemError[] } : null;
          if (Array.isArray(detail?.itemErrors)) itemErrors = detail.itemErrors;
        } catch {
          // Malformed database diagnostics are intentionally not exposed to the client.
        }
        return { ok: false, error: {
          code,
          message: checkoutMessages[code],
          retryable: code === "RATE_LIMITED" || code === "ORDER_CREATION_FAILED",
          ...(itemErrors ? { itemErrors } : {}),
        } };
      }
      const result = data as Omit<CheckoutSuccess, "guestOrderToken" | "statusPath">;
      return { ok: true, data: {
        ...result,
        guestOrderToken: input.guestOrderToken,
        statusPath: `/zamowienie/status?token=${encodeURIComponent(input.guestOrderToken)}`,
      } };
    },
  };
}

export async function getGuestOrderStatus(token: string, phone: string, requestFingerprint: string) {
  try {
    const { data, error } = await client().rpc("get_guest_order_status", {
      p_guest_token_hash: digest(token),
      p_phone: phone,
      p_request_fingerprint: requestFingerprint,
    });
    if (error || !data) {
      console.error("Guest order status RPC failed.", {
        code: error?.code ?? "NO_DATA",
        message: error?.message ?? "RPC returned no data",
      });
      return null;
    }
    return data as PublicOrderStatus;
  } catch (error) {
    console.error("Guest order status request failed.", error);
    return null;
  }
}

export async function resendGuestOrderStatusLink(
    orderNumber: number,
    email: string,
    phone: string,
    requestFingerprint: string,
  ): Promise<{ orderNumber: string; token: string } | null> {
    try {
      const { data, error } = await client().rpc("resend_guest_order_status_link", {
        p_order_number: orderNumber,
        p_email: email,
        p_phone: phone,
        p_request_fingerprint: requestFingerprint,
      });
      if (error || !data || typeof data !== "object" || Array.isArray(data)) {
        console.error("Guest order status link RPC failed.", {
          code: error?.code ?? "NO_DATA",
          message: error?.message ?? "RPC returned no data",
        });
        return null;
      }
      const result = data as { orderNumber?: unknown; token?: unknown };
      return typeof result.orderNumber === "string" && typeof result.token === "string"
        ? { orderNumber: result.orderNumber, token: result.token }
        : null;
    } catch {
      return null;
  }
}
