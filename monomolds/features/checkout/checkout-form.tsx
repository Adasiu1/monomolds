"use client";

import { useActionState, useEffect, useState } from "react";

import { submitGuestCheckout } from "@/app/zamowienie/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/feedback";
import { formatPrice } from "@/lib/format-price";
import type { DeliveryMethod, Quote } from "@/lib/commerce/contracts";

import { initialCheckoutFormState } from "./types";

type CheckoutFormProps = {
  quotes: Record<DeliveryMethod, Quote>;
};

function errorFor(errors: Record<string, string[]>, field: string) {
  return errors[field]?.[0];
}

function deliveryLabel(method: DeliveryMethod) {
  return method === "inpost_locker" ? "Paczkomat InPost" : "Kurier";
}

function validateBeforeSubmit(formData: FormData, deliveryMethod: DeliveryMethod): Record<string, string[]> {
  const value = (name: string) => {
    const raw = formData.get(name);
    return typeof raw === "string" ? raw.trim() : "";
  };
  const errors: Record<string, string[]> = {};
  if (!/^\S+@\S+\.\S+$/.test(value("email"))) errors["customer.email"] = ["Podaj prawidłowy adres e-mail."];
  if (!value("firstName")) errors["customer.firstName"] = ["Podaj imię."];
  if (!value("lastName")) errors["customer.lastName"] = ["Podaj nazwisko."];
  if (!/^\+?[0-9 ]{7,15}$/.test(value("phone"))) errors["customer.phone"] = ["Podaj prawidłowy numer telefonu."];
  if (formData.get("acceptedTerms") !== "on") errors.acceptedTerms = ["Akceptacja regulaminu jest wymagana."];
  if (deliveryMethod === "inpost_locker" && !value("pointId")) errors["delivery.pointId"] = ["Wybierz paczkomat."];
  if (deliveryMethod === "courier") {
    if (!value("addressLine1")) errors["delivery.address.line1"] = ["Podaj adres."];
    if (!/^\d{2}-\d{3}$/.test(value("postalCode"))) errors["delivery.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    if (!value("city")) errors["delivery.address.city"] = ["Podaj miejscowość."];
  }
  return errors;
}

export function CheckoutForm({ quotes }: CheckoutFormProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("inpost_locker");
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const [state, formAction, pending] = useActionState(submitGuestCheckout, initialCheckoutFormState);
  const quote = quotes[deliveryMethod];
  const errors = { ...clientErrors, ...state.fieldErrors };

  useEffect(() => {
    if (state.status === "success" && state.paymentUrl) window.location.assign(state.paymentUrl);
  }, [state.paymentUrl, state.status]);

  return <div className="checkout-layout">
    <form action={formAction} className="checkout-form" noValidate aria-describedby={state.message ? "checkout-message" : undefined} onSubmit={(event) => {
      const nextErrors = validateBeforeSubmit(new FormData(event.currentTarget), deliveryMethod);
      setClientErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) event.preventDefault();
    }}>
      <input type="hidden" name="quoteId" value={quote.id} />
      <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
      <header className="checkout-heading">
        <h1>Dane do zamówienia</h1>
        <p>Potrzebujemy ich, aby zrealizować dostawę i skontaktować się w sprawie zamówienia.</p>
      </header>

      {state.message ? <div id="checkout-message"><Notice tone={state.status === "error" ? "error" : "success"} title={state.status === "error" ? "Nie udało się złożyć zamówienia" : "Przechodzimy do płatności"}>{state.message}</Notice></div> : null}

      {state.refreshSummary ? <Button type="button" variant="secondary" onClick={() => window.location.reload()}>Odśwież podsumowanie</Button> : null}

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Dane kontaktowe</legend>
        <div className="checkout-field-grid">
          <TextField id="firstName" name="firstName" label="Imię" autoComplete="given-name" required error={errorFor(errors, "customer.firstName")} />
          <TextField id="lastName" name="lastName" label="Nazwisko" autoComplete="family-name" required error={errorFor(errors, "customer.lastName")} />
        </div>
        <TextField id="email" name="email" label="Adres e-mail" type="email" autoComplete="email" inputMode="email" required hint="Wyślemy na niego potwierdzenie zamówienia." error={errorFor(errors, "customer.email")} />
        <TextField id="phone" name="phone" label="Numer telefonu" type="tel" autoComplete="tel" inputMode="tel" required hint="Użyjemy go tylko, gdy dostawa będzie wymagała kontaktu." error={errorFor(errors, "customer.phone")} />
      </fieldset>

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Dostawa</legend>
        <div className="checkout-delivery-options" role="radiogroup" aria-describedby={errorFor(errors, "delivery.method") ? "delivery-method-error" : undefined}>
          {(["inpost_locker", "courier"] as const).map((method) => <label key={method} className="checkout-delivery-option">
            <input type="radio" name="delivery-choice" checked={deliveryMethod === method} onChange={() => { setDeliveryMethod(method); setClientErrors({}); }} />
            <span><strong>{deliveryLabel(method)}</strong><small>{formatPrice(quotes[method].delivery.priceGrosze)}</small></span>
          </label>)}
        </div>
        {errorFor(errors, "delivery.method") ? <p id="delivery-method-error" className="ui-field-error">{errorFor(errors, "delivery.method")}</p> : null}
        {deliveryMethod === "inpost_locker" ? <TextField id="pointId" name="pointId" label="Paczkomat" required hint="Wpisz kod wybranego paczkomatu, np. WAW01A." error={errorFor(errors, "delivery.pointId")} /> : <div className="checkout-field-grid">
          <TextField id="addressLine1" name="addressLine1" label="Ulica i numer" autoComplete="street-address" required error={errorFor(errors, "delivery.address.line1")} />
          <TextField id="postalCode" name="postalCode" label="Kod pocztowy" autoComplete="postal-code" inputMode="numeric" placeholder="00-000" required error={errorFor(errors, "delivery.address.postalCode")} />
          <TextField id="city" name="city" label="Miejscowość" autoComplete="address-level2" required error={errorFor(errors, "delivery.address.city")} />
        </div>}
      </fieldset>

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Potwierdzenie</legend>
        <Checkbox id="acceptedTerms" name="acceptedTerms" label="Akceptuję regulamin sklepu i potwierdzam obowiązek zapłaty." required error={errorFor(errors, "acceptedTerms")} />
        <p className="ui-field-note">Informacje o przetwarzaniu danych znajdziesz w polityce prywatności.</p>
      </fieldset>

      <Button type="submit" loading={pending} loadingLabel="Przygotowujemy płatność…">Przejdź do płatności - {formatPrice(quote.totalGrosze)}</Button>
      {state.status === "error" && state.retryable && !state.refreshSummary ? <p className="ui-field-note">Możesz bezpiecznie spróbować ponownie - nie utworzymy drugiego zamówienia dla tej samej aktywnej płatności.</p> : null}
    </form>

    <aside className="checkout-summary" aria-label="Podsumowanie zamówienia">
      <h2>Podsumowanie</h2>
      <ul className="checkout-summary-items">
        {quote.items.map((item) => <li key={item.merchandiseId}><span>{item.name} <small>× {item.quantity}</small></span><strong>{formatPrice(item.lineTotalGrosze)}</strong></li>)}
      </ul>
      <dl>
        <div><dt>Produkty</dt><dd>{formatPrice(quote.subtotalGrosze)}</dd></div>
        <div><dt>Rabat</dt><dd>{quote.discountGrosze ? `- ${formatPrice(quote.discountGrosze)}` : "0,00 zł"}</dd></div>
        <div><dt>Dostawa - {deliveryLabel(deliveryMethod)}</dt><dd>{quote.delivery.priceGrosze ? formatPrice(quote.delivery.priceGrosze) : "Bezpłatna"}</dd></div>
        <div className="checkout-total"><dt>Łącznie</dt><dd>{formatPrice(quote.totalGrosze)}</dd></div>
      </dl>
    </aside>
  </div>;
}
