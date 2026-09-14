"use server";

import type { PublicOrderStatus } from "@/lib/commerce/contracts";
import { requestFingerprint } from "@/lib/commerce/request-fingerprint";
import { getGuestOrderStatus } from "@/lib/commerce/supabase-repository";

export type GuestOrderStatusResult =
  | { ok: true; order: PublicOrderStatus }
  | { ok: false; message: string };

export async function readGuestOrderStatus(token: string, phone: string): Promise<GuestOrderStatusResult> {
  if (!/^[0-9a-f]{64}$/.test(token) || !/^\+?[0-9 ]{7,18}$/.test(phone)) {
    return { ok: false, message: "Nie udało się potwierdzić danych zamówienia." };
  }
  const order = await getGuestOrderStatus(token, phone, await requestFingerprint());
  return order
    ? { ok: true, order }
    : { ok: false, message: "Nie udało się potwierdzić danych zamówienia." };
}

