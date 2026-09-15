"use server";

import type { PublicOrderStatus } from "@/lib/commerce/contracts";
import { isGuestPhone, isGuestOrderToken } from "@/features/order-status/order-status";
import { requestFingerprint } from "@/lib/commerce/request-fingerprint";
import { getGuestOrderStatus } from "@/lib/commerce/supabase-repository";
import { resendGuestOrderStatusLink } from "@/lib/commerce/supabase-repository";

export type GuestOrderStatusResult =
  | { ok: true; order: PublicOrderStatus }
  | { ok: false; message: string };

const safeErrorMessage = "Nie udało się potwierdzić danych zamówienia.";

export async function readGuestOrderStatus(token: string, phone: string): Promise<GuestOrderStatusResult> {
  if (!isGuestOrderToken(token) || !isGuestPhone(phone)) {
    return { ok: false, message: safeErrorMessage };
  }
  const order = await getGuestOrderStatus(token, phone, await requestFingerprint());
  return order
    ? { ok: true, order }
    : { ok: false, message: safeErrorMessage };
}

export async function readGuestOrderStatusAction(
  _previousState: import("@/features/order-status/order-status").OrderStatusFormState,
  formData: FormData,
): Promise<import("@/features/order-status/order-status").OrderStatusFormState> {
  const token = formData.get("token");
  const phone = formData.get("phone");
  const result = await readGuestOrderStatus(
    typeof token === "string" ? token.trim().toLowerCase() : "",
    typeof phone === "string" ? phone.trim() : "",
  );
  return result.ok
    ? { status: "success", message: null, order: result.order }
    : { status: "error", message: result.message, order: null };
}

export async function resendGuestOrderStatusLinkAction(
  _previousState: import("@/features/order-status/order-status").ResendGuestOrderLinkState,
  formData: FormData,
): Promise<import("@/features/order-status/order-status").ResendGuestOrderLinkState> {
  const orderNumber = formData.get("orderNumber");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const parsedOrderNumber = typeof orderNumber === "string" ? Number(orderNumber.replace(/^MON-/i, "")) : NaN;
  const emailValue = typeof email === "string" ? email.trim().toLowerCase() : "";
  const phoneValue = typeof phone === "string" ? phone.trim() : "";

  if (!Number.isInteger(parsedOrderNumber) || parsedOrderNumber < 1 || !/^\S+@\S+\.\S+$/.test(emailValue) || !isGuestPhone(phoneValue)) {
    console.error("Guest order status link validation failed.", {
      validOrderNumber: Number.isInteger(parsedOrderNumber) && parsedOrderNumber > 0,
      validEmail: /^\S+@\S+\.\S+$/.test(emailValue),
      validPhone: isGuestPhone(phoneValue),
    });
    return { status: "error", message: safeErrorMessage, link: null };
  }

  const result = await resendGuestOrderStatusLink(
    parsedOrderNumber,
    emailValue,
    phoneValue,
    await requestFingerprint(),
  );

  if (!result) return { status: "error", message: safeErrorMessage, link: null };

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    status: "success",
    message: "Wygenerowano nowy link do statusu zamówienia.",
    link: `${origin.replace(/\/$/, "")}/zamowienie/status?token=${encodeURIComponent(result.token)}`,
  };
}
