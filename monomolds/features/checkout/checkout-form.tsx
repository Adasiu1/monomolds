"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { submitGuestCheckout } from "@/app/zamowienie/actions";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, TextField } from "@/components/ui/fields";
import { Notice } from "@/components/ui/feedback";
import { OrderBenefits } from "@/components/order-benefits";
import { formatPrice } from "@/lib/format-price";
import type { DeliveryMethod, Quote } from "@/lib/commerce/contracts";

import { initialCheckoutFormState } from "./types";

type CheckoutFormProps = {
  quotes: Record<DeliveryMethod, Quote>;
  onRefreshQuotes: () => Promise<void>;
};

function errorFor(errors: Record<string, string[]>, field: string) {
  return errors[field]?.[0];
}

function deliveryLabel(method: DeliveryMethod) {
  return method === "inpost_locker" ? "Paczkomat InPost" : "Kurier InPost";
}

const itemErrorLabels = {
  NOT_FOUND: "Produktu nie ma już w katalogu.",
  UNAVAILABLE: "Produkt nie jest już dostępny do zamówienia.",
  PRICE_CHANGED: "Cena lub skład produktu uległy zmianie.",
  QUANTITY_INVALID: "Wybrana ilość nie jest już prawidłowa.",
} as const;

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
  if (formData.get("wantsInvoice") === "on") {
    if (!value("invoiceCompanyName")) errors["invoice.companyName"] = ["Podaj nazwę firmy."];
    if (!value("invoiceNip")) errors["invoice.nip"] = ["Podaj NIP."];
    if (value("invoiceEmail") && !/^\S+@\S+\.\S+$/.test(value("invoiceEmail"))) errors["invoice.email"] = ["Podaj prawidłowy adres e-mail."];
    if (!value("invoiceAddressLine1")) errors["invoice.address.line1"] = ["Podaj adres do faktury."];
    if (!/^\d{2}-\d{3}$/.test(value("invoicePostalCode"))) errors["invoice.address.postalCode"] = ["Podaj kod pocztowy w formacie 00-000."];
    if (!value("invoiceCity")) errors["invoice.address.city"] = ["Podaj miejscowość."];
  }
  if (formData.get("leadTimeNoticeVersion") && formData.get("acceptedLeadTimeNotice") !== "on") {
    errors.acceptedLeadTimeNoticeVersion = ["Potwierdzenie jest wymagane."];
  }
  return errors;
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

const fieldNameForError: Record<string, string> = {
  "customer.email": "email", "customer.firstName": "firstName", "customer.lastName": "lastName",
  "customer.phone": "phone", "delivery.pointId": "pointId", "delivery.address.line1": "addressLine1",
  "delivery.address.postalCode": "postalCode", "delivery.address.city": "city",
  "invoice.companyName": "invoiceCompanyName", "invoice.nip": "invoiceNip", "invoice.email": "invoiceEmail",
  "invoice.address.line1": "invoiceAddressLine1", "invoice.address.postalCode": "invoicePostalCode",
  "invoice.address.city": "invoiceCity", acceptedLeadTimeNoticeVersion: "acceptedLeadTimeNotice",
};

export function CheckoutForm({ quotes, onRefreshQuotes }: CheckoutFormProps) {
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("inpost_locker");
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [state, formAction, pending] = useActionState(submitGuestCheckout, initialCheckoutFormState);
  const idempotencyKeyRef = useRef<HTMLInputElement>(null);
  const guestOrderTokenRef = useRef<HTMLInputElement>(null);
  const quote = quotes[deliveryMethod];
  const errors = { ...clientErrors, ...state.fieldErrors };
  const requiresRefresh = state.refreshSummary && state.rejectedQuoteId === quote.id;

  useEffect(() => {
    if (idempotencyKeyRef.current) idempotencyKeyRef.current.value = "";
    if (guestOrderTokenRef.current) guestOrderTokenRef.current.value = "";
  }, [quote.id]);

  if (state.status === "success" && state.orderNumber && state.statusPath) {
    return <section className="checkout-confirmation" aria-labelledby="checkout-confirmation-title">
      <p className="checkout-confirmation-eyebrow">Zamówienie przyjęte</p>
      <h1 id="checkout-confirmation-title">{state.orderNumber}</h1>
      <Notice tone="success" title="Zamówienie zapisane">Status płatności: oczekuje na płatność. Na tym etapie płatność nie została jeszcze uruchomiona.</Notice>
      <p>Zachowaj link do statusu. Przy sprawdzaniu poprosimy także o pełny numer telefonu podany w zamówieniu.</p>
      <LinkButton href={state.statusPath}>Sprawdź status zamówienia</LinkButton>
    </section>;
  }

  return <div className="checkout-layout">
    <form action={formAction} className="checkout-form" noValidate aria-describedby={state.message ? "checkout-message" : undefined} onSubmit={(event) => {
      if (idempotencyKeyRef.current && !idempotencyKeyRef.current.value) idempotencyKeyRef.current.value = crypto.randomUUID();
      if (guestOrderTokenRef.current && !guestOrderTokenRef.current.value) guestOrderTokenRef.current.value = randomToken();
      const nextErrors = validateBeforeSubmit(new FormData(event.currentTarget), deliveryMethod);
      setClientErrors(nextErrors);
      const firstError = Object.keys(nextErrors)[0];
      if (firstError) {
        event.preventDefault();
        const form = event.currentTarget;
        requestAnimationFrame(() => {
          const field = form.elements.namedItem(fieldNameForError[firstError] ?? firstError);
          if (field instanceof HTMLElement) field.focus();
        });
      }
    }}>
      <input type="hidden" name="quoteId" value={quote.id} />
      <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
      <input ref={idempotencyKeyRef} type="hidden" name="idempotencyKey" />
      <input ref={guestOrderTokenRef} type="hidden" name="guestOrderToken" />
      <header className="checkout-heading">
        <h1>Dane do zamówienia</h1>
        <p>Potrzebujemy ich, aby zrealizować dostawę i skontaktować się w sprawie zamówienia.</p>
      </header>

      {state.message ? <div id="checkout-message"><Notice tone={state.status === "error" ? "error" : "success"} title={state.status === "error" ? "Nie udało się złożyć zamówienia" : "Zamówienie zapisane"}>{state.message}</Notice></div> : null}

      {requiresRefresh ? <Button type="button" variant="secondary" onClick={onRefreshQuotes}>Odśwież podsumowanie bez utraty danych</Button> : null}
      {requiresRefresh && state.itemErrors.length > 0 ? <ul className="checkout-item-errors">
        {state.itemErrors.map((item) => <li key={`${item.merchandiseId}-${item.reason}`}>
          {itemErrorLabels[item.reason]} Zamówiona ilość: {item.requestedQuantity}.
        </li>)}
      </ul> : null}

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Dane kontaktowe</legend>
        <div className="checkout-field-grid">
          <TextField id="firstName" name="firstName" label="Imię" autoComplete="given-name" required error={errorFor(errors, "customer.firstName")} />
          <TextField id="lastName" name="lastName" label="Nazwisko" autoComplete="family-name" required error={errorFor(errors, "customer.lastName")} />
        </div>
        <TextField id="email" name="email" label="Adres e-mail" type="email" autoComplete="email" inputMode="email" spellCheck={false} required hint="Wyślemy na niego potwierdzenie zamówienia." error={errorFor(errors, "customer.email")} />
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
        {deliveryMethod === "inpost_locker" ? <TextField id="pointId" name="pointId" label="Paczkomat" autoComplete="off" spellCheck={false} required hint="Wpisz kod wybranego paczkomatu, np. WAW01A." error={errorFor(errors, "delivery.pointId")} /> : <div className="checkout-field-grid">
          <TextField id="addressLine1" name="addressLine1" label="Ulica i numer" autoComplete="street-address" required error={errorFor(errors, "delivery.address.line1")} />
          <TextField id="addressLine2" name="addressLine2" label="Lokal (opcjonalnie)" autoComplete="address-line2" />
          <TextField id="postalCode" name="postalCode" label="Kod pocztowy" autoComplete="postal-code" inputMode="numeric" placeholder="00-000" required error={errorFor(errors, "delivery.address.postalCode")} />
          <TextField id="city" name="city" label="Miejscowość" autoComplete="address-level2" required error={errorFor(errors, "delivery.address.city")} />
        </div>}
      </fieldset>

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Faktura</legend>
        <Checkbox id="wantsInvoice" name="wantsInvoice" label="Chcę otrzymać fakturę" checked={wantsInvoice} onChange={(event) => setWantsInvoice(event.currentTarget.checked)} />
        {wantsInvoice ? <div className="checkout-invoice-fields">
          <TextField id="invoiceCompanyName" name="invoiceCompanyName" label="Nazwa firmy" autoComplete="organization" required error={errorFor(errors, "invoice.companyName")} />
          <TextField id="invoiceNip" name="invoiceNip" label="NIP" autoComplete="off" inputMode="numeric" spellCheck={false} required hint="Możesz wpisać NIP z prefiksem PL, spacjami lub myślnikami." error={errorFor(errors, "invoice.nip")} />
          <TextField id="invoiceEmail" name="invoiceEmail" label="E-mail do faktury (opcjonalnie)" type="email" autoComplete="email" inputMode="email" spellCheck={false} hint="Jeśli pozostawisz puste, użyjemy e-maila zamówienia." error={errorFor(errors, "invoice.email")} />
          <div className="checkout-field-grid">
            <TextField id="invoiceAddressLine1" name="invoiceAddressLine1" label="Ulica i numer" autoComplete="billing address-line1" required error={errorFor(errors, "invoice.address.line1")} />
            <TextField id="invoiceAddressLine2" name="invoiceAddressLine2" label="Lokal (opcjonalnie)" autoComplete="billing address-line2" />
            <TextField id="invoicePostalCode" name="invoicePostalCode" label="Kod pocztowy" autoComplete="billing postal-code" inputMode="numeric" placeholder="00-000" required error={errorFor(errors, "invoice.address.postalCode")} />
            <TextField id="invoiceCity" name="invoiceCity" label="Miejscowość" autoComplete="billing address-level2" required error={errorFor(errors, "invoice.address.city")} />
          </div>
          <input type="hidden" name="invoiceCountryCode" value="PL" />
        </div> : null}
      </fieldset>

      <fieldset className="checkout-section" disabled={pending}>
        <legend>Potwierdzenie</legend>
        <Checkbox id="acceptedTerms" name="acceptedTerms" label="Akceptuję regulamin sklepu i potwierdzam obowiązek zapłaty." required error={errorFor(errors, "acceptedTerms")} />
        {quote.requiresLeadTimeConfirmation && quote.leadTimeNotice && quote.leadTimeNoticeVersion ? <>
          <input type="hidden" name="leadTimeNoticeVersion" value={quote.leadTimeNoticeVersion} />
          <Checkbox id="acceptedLeadTimeNotice" name="acceptedLeadTimeNotice" label={quote.leadTimeNotice} required error={errorFor(errors, "acceptedLeadTimeNoticeVersion")} />
        </> : null}
        <p className="ui-field-note">Informacje o przetwarzaniu danych znajdziesz w polityce prywatności.</p>
      </fieldset>

      <Button type="submit" disabled={requiresRefresh} loading={pending} loadingLabel="Zapisujemy zamówienie…">Złóż zamówienie - {formatPrice(quote.totalGrosze)}</Button>
      {state.status === "error" && state.retryable && !requiresRefresh ? <p className="ui-field-note">Możesz bezpiecznie spróbować ponownie - ten sam klucz próby nie utworzy drugiego zamówienia.</p> : null}
    </form>

    <aside className="checkout-summary" aria-label="Podsumowanie zamówienia">
      <h2>Podsumowanie</h2>
      <ul className="checkout-summary-items">
        {quote.items.map((item) => <li key={item.merchandiseId}><span>{item.name} <small>× {item.quantity}</small></span><strong>{formatPrice(item.lineTotalGrosze)}</strong></li>)}
        {quote.giftPromotion.selectedItems.map((item) => <li key={`gift-${item.merchandiseId}`} className="checkout-gift-item"><span>{item.name} <small>× {item.quantity} gratis</small></span><strong>0,00 zł</strong></li>)}
      </ul>
      <OrderBenefits physicalItemCount={quote.physicalItemCount} />
      <dl>
        <div><dt>Produkty brutto</dt><dd>{formatPrice(quote.subtotalGrosze)}</dd></div>
        {quote.discountGrosze - (quote.appliedDiscount?.amountGrosze ?? 0) > 0 ? <div><dt>Rabat zestawu</dt><dd>- {formatPrice(quote.discountGrosze - (quote.appliedDiscount?.amountGrosze ?? 0))}</dd></div> : null}
        {quote.appliedDiscount ? <div><dt>Kod {quote.appliedDiscount.code} ({quote.appliedDiscount.percentage}%)</dt><dd>- {formatPrice(quote.appliedDiscount.amountGrosze)}</dd></div> : null}
        {!quote.discountGrosze ? <div><dt>Rabat</dt><dd>0,00 zł</dd></div> : null}
        <div><dt>Dostawa - {deliveryLabel(deliveryMethod)}</dt><dd>{quote.delivery.priceGrosze ? formatPrice(quote.delivery.priceGrosze) : "Bezpłatna"}</dd></div>
        <div className="checkout-total"><dt>Łącznie brutto</dt><dd>{formatPrice(quote.totalGrosze)}</dd></div>
      </dl>
    </aside>
  </div>;
}
