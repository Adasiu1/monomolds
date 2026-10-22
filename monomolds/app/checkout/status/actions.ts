"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { beginGuestPayment, reconcilePaymentEvents } from "@/lib/payments/guest-payment";
import { paymentDatabase } from "@/lib/payments/repository";
import { hashGuestToken } from "@/lib/payments/service";
import type { PublicOrderStatus } from "@/lib/commerce/contracts";
import {
  isGuestPhone,
  isGuestOrderToken,
  normalizeGuestPhone,
} from "@/features/order-status/order-status";
import { requestFingerprint } from "@/lib/commerce/request-fingerprint";
import { getGuestOrderStatus } from "@/lib/commerce/supabase-repository";
import { resendGuestOrderStatusLink } from "@/lib/commerce/supabase-repository";
import { normalizeCheckoutPhone } from "@/features/checkout/phone";

export type GuestOrderStatusResult =
  | { ok: true; order: PublicOrderStatus }
  | { ok: false; message: string };

const safeErrorMessage = "Nie udało się potwierdzić danych zamówienia.";
const paymentReturnCookie = "p24_order_return";

async function getPaymentReturnIdentity(attemptId: string, token: string): Promise<{ phone: string } | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(attemptId) || !isGuestOrderToken(token)) return null;

  const cookieValue = (await cookies()).get(paymentReturnCookie)?.value;
  if (cookieValue !== `${attemptId}.${token}`) return null;

  try {
    const db = paymentDatabase();
    const attempt = await db.from("payment_attempts").select("order_id").eq("id", attemptId).maybeSingle();
    if (attempt.error || !attempt.data) return null;

    const order = await db.from("orders").select("phone").eq("id", attempt.data.order_id)
      .eq("guest_token_hash", hashGuestToken(token)).maybeSingle();
    const phone = order.data?.phone;
    if (order.error || !phone || !isGuestPhone(phone)) return null;
    return { phone };
  } catch {
    console.error("Payment return order lookup failed.");
    return null;
  }
}

export async function readGuestOrderStatus(token: string, phone: string): Promise<GuestOrderStatusResult> {
  if (!isGuestOrderToken(token) || !isGuestPhone(phone)) {
    return { ok: false, message: safeErrorMessage };
  }
  const fingerprint = await requestFingerprint();
  let order = await getGuestOrderStatus(token, normalizeGuestPhone(phone), fingerprint);
  if (order && process.env.P24_ENV === "sandbox") {
    try {
      const identity = await paymentDatabase().from("orders").select("id").eq("guest_token_hash", hashGuestToken(token))
        .eq("phone", normalizeGuestPhone(phone)).single();
      if (identity.data && (await reconcilePaymentEvents(identity.data.id)).completed > 0) {
        order = await getGuestOrderStatus(token, normalizeGuestPhone(phone), fingerprint);
      }
    } catch { /* Status remains readable during a provider outage. */ }
  }
  return order
    ? { ok: true, order }
    : { ok: false, message: safeErrorMessage };
}

export async function readGuestOrderStatusFromPaymentReturn(
  attemptId: string,
  token: string,
): Promise<GuestOrderStatusResult> {
  const identity = await getPaymentReturnIdentity(attemptId, token);
  if (!identity) return { ok: false, message: safeErrorMessage };
  return readGuestOrderStatus(token, identity.phone);
}

export async function startGuestPaymentFromPaymentReturn(
  attemptId: string,
  token: string,
): Promise<Extract<import("@/lib/payments/service").StartPaymentResult, { ok: false }>> {
  const identity = await getPaymentReturnIdentity(attemptId, token);
  if (!identity) return { ok: false, code: "PAYMENT_NOT_ALLOWED", message: safeErrorMessage };
  const result = await beginGuestPayment(token, identity.phone, await requestFingerprint(), { returnedFromProvider: true });
  if (result.ok) redirect(result.redirectUrl);
  return result;
}

export async function readGuestOrderStatusAction(
  _previousState: import("@/features/order-status/order-status").OrderStatusFormState,
  formData: FormData,
): Promise<import("@/features/order-status/order-status").OrderStatusFormState> {
  const token = formData.get("token");
  const phoneCountryCode = formData.get("phoneCountryCode");
  const phoneNational = formData.get("phoneNational");
  const phone = normalizeCheckoutPhone(
    typeof phoneCountryCode === "string" ? phoneCountryCode : "",
    typeof phoneNational === "string" ? phoneNational.trim() : "",
  );
  const result = await readGuestOrderStatus(
    typeof token === "string" ? token.trim().toLowerCase() : "",
    phone ?? "",
  );
  return result.ok
    ? { status: "success", message: null, order: result.order, phone: normalizeGuestPhone(phone ?? "") }
    : { status: "error", message: result.message, order: null };
}

export async function resendGuestOrderStatusLinkAction(
  _previousState: import("@/features/order-status/order-status").ResendGuestOrderLinkState,
  formData: FormData,
): Promise<import("@/features/order-status/order-status").ResendGuestOrderLinkState> {
  const orderNumber = formData.get("orderNumber");
  const email = formData.get("email");
  const phoneCountryCode = formData.get("phoneCountryCode");
  const phoneNational = formData.get("phoneNational");
  const parsedOrderNumber = typeof orderNumber === "string" ? Number(orderNumber.replace(/^MON-/i, "")) : NaN;
  const emailValue = typeof email === "string" ? email.trim().toLowerCase() : "";
  const phoneValue = normalizeCheckoutPhone(
    typeof phoneCountryCode === "string" ? phoneCountryCode : "",
    typeof phoneNational === "string" ? phoneNational.trim() : "",
  ) ?? "";

  if (!Number.isInteger(parsedOrderNumber) || parsedOrderNumber < 1 || !/^\S+@\S+\.\S+$/.test(emailValue) || !isGuestPhone(phoneValue)) {
    console.error("Guest order status link validation failed.", {
      validOrderNumber: Number.isInteger(parsedOrderNumber) && parsedOrderNumber > 0,
      validEmail: /^\S+@\S+\.\S+$/.test(emailValue),
      validPhone: isGuestPhone(phoneValue),
    });
    return { status: "error", message: safeErrorMessage, link: null, order: null };
  }

  const fingerprint = await requestFingerprint();
  const result = await resendGuestOrderStatusLink(
    parsedOrderNumber,
    emailValue,
    normalizeGuestPhone(phoneValue),
    fingerprint,
  );

  if (!result) return { status: "error", message: safeErrorMessage, link: null, order: null };

  const order = await getGuestOrderStatus(result.token, normalizeGuestPhone(phoneValue), fingerprint);
  if (!order) return { status: "error", message: safeErrorMessage, link: null, order: null };

  const origin = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    status: "success",
    message: "Wygenerowano nowy link do statusu zamówienia.",
    phone: normalizeGuestPhone(phoneValue),
    link: `${origin.replace(/\/$/, "")}/zamowienie/status?token=${encodeURIComponent(result.token)}`,
    order,
  };
}

export async function startGuestPaymentAction(token: string, phone: string) {
  const result = await beginGuestPayment(token, phone, await requestFingerprint());
  if (result.ok) redirect(result.redirectUrl);
  return result;
}
