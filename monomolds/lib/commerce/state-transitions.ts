import type { OrderStatus, PaymentAttemptStatus, RefundStatus } from "./contracts";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["paid", "cancelled", "expired"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
  expired: ["pending_payment"],
};

export const PAYMENT_ATTEMPT_STATUS_TRANSITIONS: Record<PaymentAttemptStatus, readonly PaymentAttemptStatus[]> = {
  created: ["pending", "paid", "failed", "cancelled", "expired"],
  pending: ["paid", "failed", "cancelled", "expired"],
  paid: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export const REFUND_STATUS_TRANSITIONS: Record<RefundStatus, readonly RefundStatus[]> = {
  requested: ["processing", "cancelled"],
  processing: ["succeeded", "failed"],
  succeeded: [],
  failed: ["processing", "cancelled"],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionPaymentAttempt(from: PaymentAttemptStatus, to: PaymentAttemptStatus): boolean {
  return PAYMENT_ATTEMPT_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionRefund(from: RefundStatus, to: RefundStatus): boolean {
  return REFUND_STATUS_TRANSITIONS[from].includes(to);
}
