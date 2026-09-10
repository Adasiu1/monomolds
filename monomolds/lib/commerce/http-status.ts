import type { CommerceErrorCode } from "./contracts";

export type CommerceHttpStatus = 400 | 404 | 409 | 422 | 502 | 503;

const COMMERCE_ERROR_HTTP_STATUS = {
  INVALID_CART: 400,
  INVALID_INPUT: 400,
  PRODUCT_NOT_FOUND: 404,
  QUOTE_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  QUOTE_CHANGED: 409,
  PAYMENT_ATTEMPT_EXPIRED: 409,
  ORDER_NOT_PAYABLE: 409,
  PAYMENT_ALREADY_CONFIRMED: 409,
  LEAD_TIME_NOTICE_REQUIRED: 422,
  PAYMENT_INITIALIZATION_FAILED: 502,
  SHIPPING_CONFIGURATION_PENDING: 503,
  PRICING_UNAVAILABLE: 503,
} as const satisfies Record<CommerceErrorCode, CommerceHttpStatus>;

export function commerceErrorHttpStatus(code: CommerceErrorCode): CommerceHttpStatus {
  return COMMERCE_ERROR_HTTP_STATUS[code];
}
