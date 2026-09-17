import type { OrderStatus, PublicOrderStatus } from "@/lib/commerce/contracts";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending_payment: "Oczekuje na płatność",
  paid: "Opłacone",
  processing: "W realizacji",
  shipped: "Wysłane",
  completed: "Zakończone",
  cancelled: "Anulowane",
  expired: "Wygasłe",
};

export const orderStatusDescriptions: Record<OrderStatus, string> = {
  pending_payment: "Zamówienie zostało utworzone i oczekuje na płatność.",
  paid: "Płatność za zamówienie została potwierdzona.",
  processing: "Zamówienie jest przygotowywane do wysyłki.",
  shipped: "Zamówienie zostało przekazane do wysyłki.",
  completed: "Zamówienie zostało zrealizowane.",
  cancelled: "Zamówienie zostało anulowane.",
  expired: "Termin płatności zamówienia upłynął.",
};

export type OrderStatusFormState =
  | { status: "idle" | "error"; message: string | null; order: null }
  | { status: "success"; message: null; order: PublicOrderStatus };

export type ResendGuestOrderLinkState = {
  status: "idle" | "error" | "success";
  message: string | null;
  link: string | null;
  order: PublicOrderStatus | null;
};

export const initialOrderStatusFormState: OrderStatusFormState = {
  status: "idle",
  message: null,
  order: null,
};

export const initialResendGuestOrderLinkState: ResendGuestOrderLinkState = {
  status: "idle",
  message: null,
  link: null,
  order: null,
};

export function isGuestOrderToken(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function isGuestPhone(value: string): boolean {
  if (!/^[+()\-\s0-9]+$/.test(value)) return false;
  return /^\d{9,15}$/.test(normalizeGuestPhone(value));
}

export function normalizeGuestPhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatOrderMoney(amountGrosze: number, currency: string): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(amountGrosze / 100);
}

export function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function deliveryMethodLabel(method: PublicOrderStatus["delivery"]["method"]): string {
  return method === "inpost_locker" ? "Paczkomat InPost" : "Kurier";
}
