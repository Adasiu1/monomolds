"use server";

import type { CheckoutInput, ContractFieldErrors } from "@/lib/commerce/contracts";
import { COMMERCE_CONFIG } from "@/lib/commerce/config";
import { isValidPolishNip, normalizePolishNip } from "@/lib/commerce/nip";
import { requestFingerprint } from "@/lib/commerce/request-fingerprint";
import { createSupabaseCommerceRepository } from "@/lib/commerce/supabase-repository";
import type { CheckoutFormState } from "@/features/checkout/types";

const emailPattern = /^\S+@\S+\.\S+$/;
const phonePattern = /^\+?[0-9 ]{7,15}$/;
const postalCodePattern = /^\d{2}-\d{3}$/;

function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function invalidInput(fieldErrors: ContractFieldErrors): CheckoutFormState {
  return {
    status: "error",
    message: "Popraw zaznaczone pola.",
    fieldErrors,
    retryable: false,
    refreshSummary: false,
    orderNumber: null,
    orderStatus: null,
    statusPath: null,
  };
}

/**
 * This is the server boundary for guest checkout. Prices and delivery charges are
 * intentionally absent from the form - the repository recalculates them from the quote.
 */
export async function submitGuestCheckout(
  _previousState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const email = formValue(formData, "email");
  const firstName = formValue(formData, "firstName");
  const lastName = formValue(formData, "lastName");
  const phone = formValue(formData, "phone");
  const quoteId = formValue(formData, "quoteId");
  const deliveryMethod = formValue(formData, "deliveryMethod");
  const acceptedTerms = formData.get("acceptedTerms") === "on";
  const idempotencyKey = formValue(formData, "idempotencyKey");
  const guestOrderToken = formValue(formData, "guestOrderToken");
  const wantsInvoice = formData.get("wantsInvoice") === "on";
  const fieldErrors: ContractFieldErrors = {};

  if (!quoteId) fieldErrors.quoteId = ["Nie znaleziono aktualnego podsumowania zamówienia."];
  if (!emailPattern.test(email)) fieldErrors["customer.email"] = ["Podaj prawidłowy adres e-mail."];
  if (!firstName) fieldErrors["customer.firstName"] = ["Podaj imię."];
  if (!lastName) fieldErrors["customer.lastName"] = ["Podaj nazwisko."];
  if (!phonePattern.test(phone)) fieldErrors["customer.phone"] = ["Podaj prawidłowy numer telefonu."];
  if (!acceptedTerms) fieldErrors.acceptedTerms = ["Akceptacja regulaminu jest wymagana."];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(idempotencyKey)) fieldErrors.idempotencyKey = ["Odśwież stronę i spróbuj ponownie."];
  if (!/^[0-9a-f]{64}$/.test(guestOrderToken)) fieldErrors.guestOrderToken = ["Odśwież stronę i spróbuj ponownie."];

  let delivery: CheckoutInput["delivery"] | null = null;
  if (deliveryMethod === "inpost_locker") {
    const pointId = formValue(formData, "pointId");
    if (!pointId) fieldErrors["delivery.pointId"] = ["Wybierz paczkomat."];
    delivery = { method: "inpost_locker", pointId };
  } else if (deliveryMethod === "courier") {
    const line1 = formValue(formData, "addressLine1");
    const line2 = formValue(formData, "addressLine2");
    const postalCode = formValue(formData, "postalCode");
    const city = formValue(formData, "city");
    if (!line1) fieldErrors["delivery.address.line1"] = ["Podaj adres."];
    if (!postalCodePattern.test(postalCode)) fieldErrors["delivery.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    if (!city) fieldErrors["delivery.address.city"] = ["Podaj miejscowość."];
    delivery = { method: "courier", address: { line1, ...(line2 ? { line2 } : {}), postalCode, city, countryCode: "PL" } };
  } else {
    fieldErrors["delivery.method"] = ["Wybierz metodę dostawy."];
  }

  let invoice: CheckoutInput["invoice"] = null;
  if (wantsInvoice) {
    const companyName = formValue(formData, "invoiceCompanyName");
    const nip = normalizePolishNip(formValue(formData, "invoiceNip"));
    const invoiceEmail = formValue(formData, "invoiceEmail");
    const line1 = formValue(formData, "invoiceAddressLine1");
    const line2 = formValue(formData, "invoiceAddressLine2");
    const postalCode = formValue(formData, "invoicePostalCode");
    const city = formValue(formData, "invoiceCity");
    if (!companyName) fieldErrors["invoice.companyName"] = ["Podaj nazwę firmy."];
    if (!isValidPolishNip(nip)) fieldErrors["invoice.nip"] = ["Podaj prawidłowy polski NIP."];
    if (invoiceEmail && !emailPattern.test(invoiceEmail)) fieldErrors["invoice.email"] = ["Podaj prawidłowy adres e-mail."];
    if (!line1) fieldErrors["invoice.address.line1"] = ["Podaj adres do faktury."];
    if (!postalCodePattern.test(postalCode)) fieldErrors["invoice.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    if (!city) fieldErrors["invoice.address.city"] = ["Podaj miejscowość."];
    invoice = {
      companyName, nip, ...(invoiceEmail ? { email: invoiceEmail } : {}),
      address: { line1, ...(line2 ? { line2 } : {}), postalCode, city, countryCode: "PL" },
    };
  }

  if (Object.keys(fieldErrors).length > 0 || !delivery) return invalidInput(fieldErrors);

  const result = await createSupabaseCommerceRepository(await requestFingerprint()).checkout({
    quoteId,
    idempotencyKey,
    guestOrderToken,
    customer: { email, firstName, lastName, phone },
    delivery,
    invoice,
    acceptedTerms,
    acceptedTermsVersion: COMMERCE_CONFIG.termsVersion,
    acceptedLeadTimeNoticeVersion: formData.get("acceptedLeadTimeNotice") === "on"
      ? formValue(formData, "leadTimeNoticeVersion")
      : undefined,
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      fieldErrors: result.error.fieldErrors ?? {},
      retryable: result.error.retryable,
      refreshSummary: result.error.code === "QUOTE_CHANGED" || result.error.code === "QUOTE_NOT_FOUND" || result.error.code === "QUOTE_EXPIRED",
      orderNumber: null,
      orderStatus: null,
      statusPath: null,
    };
  }

  return {
    status: "success",
    message: "Zamówienie zostało bezpiecznie zapisane.",
    fieldErrors: {},
    retryable: false,
    refreshSummary: false,
    orderNumber: result.data.orderNumber,
    orderStatus: result.data.orderStatus,
    statusPath: result.data.statusPath,
  };
}
