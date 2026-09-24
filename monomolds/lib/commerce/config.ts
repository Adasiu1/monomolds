export const COMMERCE_CONFIG = {
  quoteValidityMinutes: 15,
  freeShippingMinPhysicalItems: 6,
  largeOrderThresholdItems: 26,
  standardFulfilmentDays: 7,
  termsVersion: "mvp-2026-09-14",
  pricingPolicyVersion: "mvp-general-promotions-v2",
  largeOrderNoticeVersion: "large-order-v1",
  largeOrderNotice:
    "To duże zamówienie. Termin realizacji może się wydłużyć. Napisz do nas mailowo lub na Instagramie, albo poczekaj na kontakt po złożeniu zamówienia.",
  delivery: {
    inpost_locker: { priceGrosze: 1649, ruleVersion: "inpost-locker-v1", parcelSize: "S" },
    courier: { priceGrosze: 1949, ruleVersion: "inpost-courier-v1", parcelSize: "S" },
  },
  contact: {
    email: "info@monomolds.com",
    instagramUrl: "https://www.instagram.com/monomolds/",
  },
} as const;
