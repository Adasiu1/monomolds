/** Shared commerce contract used by UI fixtures and the Supabase implementation. */

export type Currency = "PLN";
export type MoneyGrosze = number;

export type ProductStatus = "draft" | "published" | "archived";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  variants: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  priceGrosze: MoneyGrosze;
  currency: Currency;
  availableToOrder: boolean;
};

export type Bundle = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceGrosze: MoneyGrosze;
  currency: Currency;
  status: ProductStatus;
  items: BundleItem[];
};

export type BundleItem = {
  merchandiseId: string;
  quantity: number;
};

export type CartItem = {
  merchandiseId: string;
  quantity: number;
};

export type GiftSelection = CartItem;

export type GiftOption = {
  merchandiseId: string;
  name: string;
};

export type PricedGiftItem = GiftSelection & {
  name: string;
  unitPriceGrosze: 0;
  lineTotalGrosze: 0;
};

export type GiftPromotion = {
  earnedQuantity: number;
  selectedItems: PricedGiftItem[];
  options: GiftOption[];
};

export type PricedComponent = {
  merchandiseId: string;
  name: string;
  quantity: number;
  baseAmountGrosze: MoneyGrosze;
  discountGrosze: MoneyGrosze;
  paidAmountGrosze: MoneyGrosze;
};

export type PricedCartItem = CartItem & {
  name: string;
  kind: "product" | "bundle";
  physicalItemCount: number;
  unitPriceGrosze: MoneyGrosze;
  unitNetPriceGrosze: MoneyGrosze;
  lineSubtotalGrosze: MoneyGrosze;
  discountGrosze: MoneyGrosze;
  lineTotalGrosze: MoneyGrosze;
  /** Exact allocation used for partial refunds, including elements of a bundle. */
  components: PricedComponent[];
};

export type PricingAdjustment = {
  type: "bundle_discount" | "code_discount" | "free_shipping";
  policyId: "bundle-10-percent" | "percentage-whole-cart-v1" | "free-shipping-from-6-moulds";
  amountGrosze: MoneyGrosze;
};

export type AppliedDiscount = {
  code: string;
  type: "percentage";
  percentage: number;
  amountGrosze: MoneyGrosze;
  ruleVersion: "percentage-whole-cart-v1";
};

export type ParcelSize = "S" | "M" | "L";
export type DeliveryMethod = "inpost_locker" | "courier";

export type DeliveryQuote = {
  method: DeliveryMethod;
  parcelSize: ParcelSize;
  priceGrosze: MoneyGrosze;
  /** Identifies the price/rule set used so a refund can reproduce the original calculation. */
  ruleVersion: string;
};

export const PAYMENT_ATTEMPT_VALIDITY_MINUTES = 15;
export const STANDARD_FULFILMENT_DAYS = 7;
export const LARGE_ORDER_NOTICE_THRESHOLD_ITEMS = 26;
export const FREE_SHIPPING_MIN_PHYSICAL_ITEMS = 6;
export const BUNDLE_DISCOUNT_PERCENT = 10;
export const PRICING_POLICY_VERSION = "mvp-general-promotions-v2";
export const GIFT_PROMOTION_POLICY_ID = "buy-12-get-1-buy-24-get-3";

/**
 * Deliberately unresolved until physical packing tests are complete.
 * Pricing code must refuse production configuration while either value is null.
 */
export const SHIPPING_CAPACITY_PLACEHOLDERS = {
  inpostLockerSMaxItems: null,
  inpostLockerMMaxItems: null,
} as const;

export type Quote = {
  id: string;
  items: PricedCartItem[];
  subtotalGrosze: MoneyGrosze;
  discountGrosze: MoneyGrosze;
  delivery: DeliveryQuote;
  totalGrosze: MoneyGrosze;
  currency: Currency;
  createdAt: string;
  expiresAt: string;
  physicalItemCount: number;
  giftPromotion: GiftPromotion;
  pricingPolicyVersion: string;
  adjustments: PricingAdjustment[];
  appliedDiscount: AppliedDiscount | null;
  requiresLeadTimeConfirmation: boolean;
  leadTimeNotice: string | null;
  leadTimeNoticeVersion: string | null;
};

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";

export type PaymentAttemptStatus =
  | "created"
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "partially_refunded"
  | "refunded";

export type RefundStatus = "requested" | "processing" | "succeeded" | "failed" | "cancelled";
export type RefundReason = "withdrawal" | "non_conformity" | "order_cancelled" | "manual_adjustment";
export type ReturnShippingPayer = "customer" | "merchant";

export type RefundItem = {
  merchandiseId: string;
  quantity: number;
  amountGrosze: MoneyGrosze;
};

export type Refund = {
  id: string;
  orderId: string;
  paymentAttemptId: string;
  status: RefundStatus;
  reason: RefundReason;
  items: RefundItem[];
  productAmountGrosze: MoneyGrosze;
  shippingAmountGrosze: MoneyGrosze;
  amountGrosze: MoneyGrosze;
  returnShippingPaidBy: ReturnShippingPayer;
  createdAt: string;
  processedAt: string | null;
};

export type PaymentAttempt = {
  id: string;
  orderId: string;
  provider: "przelewy24";
  status: PaymentAttemptStatus;
  amountGrosze: MoneyGrosze;
  currency: Currency;
  providerSessionId: string | null;
  createdAt: string;
  expiresAt: string;
};

export type Order = {
  id: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  guestOrderToken: string;
  items: PricedCartItem[];
  giftItems: PricedGiftItem[];
  subtotalGrosze: MoneyGrosze;
  discountGrosze: MoneyGrosze;
  shippingGrosze: MoneyGrosze;
  totalGrosze: MoneyGrosze;
  currency: Currency;
  createdAt: string;
};

export type ContractFieldErrors = Record<string, string[]>;

export type ItemError = {
  merchandiseId: string;
  reason: "NOT_FOUND" | "UNAVAILABLE" | "PRICE_CHANGED" | "QUANTITY_INVALID";
  requestedQuantity: number;
  currentQuantity?: number;
};

export type ContractError<Code extends string> = {
  code: Code;
  message: string;
  retryable: boolean;
  /** Safe correlation identifier; present for infrastructure/provider failures. */
  requestId?: string;
  fieldErrors?: ContractFieldErrors;
  itemErrors?: ItemError[];
};

export type ContractResult<Value, Code extends string> =
  | { ok: true; data: Value }
  | { ok: false; error: ContractError<Code> };

export type QuoteInput = {
  items: CartItem[];
  giftItems?: GiftSelection[];
  deliveryMethod: DeliveryMethod;
  discountCode?: string;
};

export type QuoteErrorCode =
  | "INVALID_CART"
  | "INVALID_GIFT_SELECTION"
  | "PRODUCT_NOT_FOUND"
  | "DISCOUNT_NOT_FOUND"
  | "DISCOUNT_INACTIVE"
  | "DISCOUNT_NOT_STARTED"
  | "DISCOUNT_EXPIRED"
  | "DISCOUNT_MIN_SUBTOTAL"
  | "RATE_LIMITED"
  | "SHIPPING_CONFIGURATION_PENDING"
  | "PRICING_UNAVAILABLE";

export type QuoteResult = ContractResult<{ quote: Quote }, QuoteErrorCode>;

export type CustomerDetails = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export type CheckoutDelivery =
  | { method: "inpost_locker"; pointId: string }
  | {
      method: "courier";
      address: {
        line1: string;
        line2?: string;
        postalCode: string;
        city: string;
        countryCode: "PL";
      };
    };

export type CheckoutInput = {
  quoteId: string;
  idempotencyKey: string;
  guestOrderToken: string;
  customer: CustomerDetails;
  delivery: CheckoutDelivery;
  invoice: InvoiceDetails | null;
  /** Required acknowledgement of the store terms immediately before order creation. */
  acceptedTerms: boolean;
  acceptedTermsVersion: string;
  acceptedLeadTimeNoticeVersion?: string;
};

export type InvoiceDetails = {
  companyName: string;
  nip: string;
  email?: string;
  address: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    countryCode: "PL";
  };
};

export type CheckoutSuccess = {
  orderId: string;
  orderNumber: string;
  orderDisposition: "created" | "reused";
  orderStatus: "pending_payment";
  guestOrderToken: string;
  statusPath: string;
};

export type CheckoutErrorCode =
  | "INVALID_INPUT"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "QUOTE_CHANGED"
  | "DISCOUNT_NOT_FOUND"
  | "DISCOUNT_INACTIVE"
  | "DISCOUNT_NOT_STARTED"
  | "DISCOUNT_EXPIRED"
  | "DISCOUNT_MIN_SUBTOTAL"
  | "IDEMPOTENCY_CONFLICT"
  | "LEAD_TIME_NOTICE_REQUIRED"
  | "DISCOUNT_USAGE_LIMIT"
  | "RATE_LIMITED"
  | "ORDER_CREATION_FAILED";

export type CheckoutResult = ContractResult<CheckoutSuccess, CheckoutErrorCode>;

export type CommerceErrorCode = QuoteErrorCode | CheckoutErrorCode;

export type PublicOrderStatus = {
  orderNumber: string;
  status: OrderStatus;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unitPriceGrosze: number; lineTotalGrosze: number; isGift: boolean }>;
  delivery: { method: DeliveryMethod; pointId: string | null; city: string | null; priceGrosze: number };
  totalGrosze: number;
  currency: Currency;
  invoiceRequested: boolean;
};

export interface CommerceRepository {
  quote(input: QuoteInput): Promise<QuoteResult>;
  checkout(input: CheckoutInput): Promise<CheckoutResult>;
}
