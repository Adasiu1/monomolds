"use server";

import type { CheckoutInput, ContractFieldErrors } from "@/lib/commerce/contracts";
import { commerceFixtureRepository } from "@/lib/commerce/fixture-repository";
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
    paymentUrl: null,
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
  const fieldErrors: ContractFieldErrors = {};

  if (!quoteId) fieldErrors.quoteId = ["Nie znaleziono aktualnego podsumowania zamówienia."];
  if (!emailPattern.test(email)) fieldErrors["customer.email"] = ["Podaj prawidłowy adres e-mail."];
  if (!firstName) fieldErrors["customer.firstName"] = ["Podaj imię."];
  if (!lastName) fieldErrors["customer.lastName"] = ["Podaj nazwisko."];
  if (!phonePattern.test(phone)) fieldErrors["customer.phone"] = ["Podaj prawidłowy numer telefonu."];
  if (!acceptedTerms) fieldErrors.acceptedTerms = ["Akceptacja regulaminu jest wymagana."];

  let delivery: CheckoutInput["delivery"] | null = null;
  if (deliveryMethod === "inpost_locker") {
    const pointId = formValue(formData, "pointId");
    if (!pointId) fieldErrors["delivery.pointId"] = ["Wybierz paczkomat."];
    delivery = { method: "inpost_locker", pointId };
  } else if (deliveryMethod === "courier") {
    const line1 = formValue(formData, "addressLine1");
    const postalCode = formValue(formData, "postalCode");
    const city = formValue(formData, "city");
    if (!line1) fieldErrors["delivery.address.line1"] = ["Podaj adres."];
    if (!postalCodePattern.test(postalCode)) fieldErrors["delivery.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    if (!city) fieldErrors["delivery.address.city"] = ["Podaj miejscowość."];
    delivery = { method: "courier", address: { line1, postalCode, city, countryCode: "PL" } };
  } else {
    fieldErrors["delivery.method"] = ["Wybierz metodę dostawy."];
  }

  if (Object.keys(fieldErrors).length > 0 || !delivery) return invalidInput(fieldErrors);

  const result = await commerceFixtureRepository.checkout({
    quoteId,
    customer: { email, firstName, lastName, phone },
    delivery,
    acceptedTerms,
  });

  if (!result.ok) {
    return {
      status: "error",
      message: result.error.message,
      fieldErrors: result.error.fieldErrors ?? {},
      retryable: result.error.retryable,
      refreshSummary: result.error.code === "QUOTE_CHANGED" || result.error.code === "QUOTE_NOT_FOUND",
      paymentUrl: null,
    };
  }

  return {
    status: "success",
    message: "Zamówienie zostało utworzone. Przekierowujemy do bezpiecznej płatności.",
    fieldErrors: {},
    retryable: false,
    refreshSummary: false,
    paymentUrl: result.data.paymentUrl,
  };
}
