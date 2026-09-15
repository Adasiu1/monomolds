"use client";

import { useActionState } from "react";
import type { PublicOrderStatus } from "@/lib/commerce/contracts";
import {
  readGuestOrderStatusAction,
  resendGuestOrderStatusLinkAction,
} from "@/app/zamowienie/status/actions";
import {
  deliveryMethodLabel,
  formatOrderDate,
  formatOrderMoney,
  initialOrderStatusFormState,
  initialResendGuestOrderLinkState,
  isGuestOrderToken,
  orderStatusDescriptions,
  orderStatusLabels,
} from "./order-status";

type OrderStatusPageProps = { initialToken?: string };

export function OrderStatusPage({ initialToken = "" }: OrderStatusPageProps) {
  const [state, formAction, pending] = useActionState(
    readGuestOrderStatusAction,
    initialOrderStatusFormState,
  );
  const [resendState, resendAction, resendPending] = useActionState(
    resendGuestOrderStatusLinkAction,
    initialResendGuestOrderLinkState,
  );

  return (
    <div className="site-container order-status-page">
      <div className="order-status-layout">
        <header className="order-status-heading">
          <p className="checkout-confirmation-eyebrow">Moje zamówienie</p>
          <h1>Sprawdź status zamówienia</h1>
          <p>
            Otworzyłeś bezpośredni link do zamówienia. Potwierdź numer telefonu
            użyty podczas zakupu, aby zobaczyć jego aktualny status.
          </p>
        </header>

        {isGuestOrderToken(initialToken) ? (
          <form action={formAction} className="order-status-form" noValidate>
            <input type="hidden" name="token" value={initialToken} />
            <div className="ui-field">
              <label htmlFor="guest-order-phone">Numer telefonu</label>
              <input
                id="guest-order-phone"
                name="phone"
                className="ui-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+48 123 123 123"
                required
              />
              <p className="ui-field-note">
                Podaj numer użyty podczas składania zamówienia.
              </p>
            </div>
            {state.status === "error" && (
              <p className="ui-notice ui-notice--error" role="alert">
                <span className="ui-notice-icon" aria-hidden="true">!</span>
                <span>{state.message}</span>
              </p>
            )}
            <button className="ui-button ui-button--primary" type="submit" disabled={pending} aria-busy={pending}>
              {pending ? "Sprawdzanie..." : "Sprawdź status"}
            </button>
          </form>
        ) : (
          <p className="ui-notice ui-notice--error" role="alert">
            <span className="ui-notice-icon" aria-hidden="true">!</span>
            <span>Ten link do zamówienia jest nieprawidłowy lub wygasł.</span>
          </p>
        )}

        {state.status === "success" && <OrderSummary order={state.order} />}
        <ResendLinkForm
          state={resendState}
          action={resendAction}
          pending={resendPending}
        />
      </div>
    </div>
  );
}

function ResendLinkForm({
  state,
  action,
  pending,
}: {
  state: typeof initialResendGuestOrderLinkState;
  action: (payload: FormData) => void;
  pending: boolean;
}) {
  return (
    <details className="order-status-resend">
      <summary>Nie masz już linku do zamówienia?</summary>
      <p className="ui-field-note">
        Podaj numer zamówienia, e-mail i telefon użyte przy zakupie. W środowisku
        produkcyjnym ten link powinien zostać wysłany e-mailem.
      </p>
      <form action={action} className="order-status-resend-form">
        <div className="ui-field">
          <label htmlFor="resend-order-number">Numer zamówienia</label>
          <input id="resend-order-number" name="orderNumber" className="ui-input" placeholder="MON-000001" required />
        </div>
        <div className="ui-field">
          <label htmlFor="resend-email">E-mail</label>
          <input id="resend-email" name="email" className="ui-input" type="email" autoComplete="email" required />
        </div>
        <div className="ui-field">
          <label htmlFor="resend-phone">Numer telefonu</label>
          <input id="resend-phone" name="phone" className="ui-input" type="tel" inputMode="tel" autoComplete="tel" required />
        </div>
        {state.status !== "idle" && (
          <div className={state.status === "error" ? "ui-notice ui-notice--error" : "ui-notice ui-notice--success"} role={state.status === "error" ? "alert" : "status"}>
            <span>{state.message}</span>
            {state.link && <a href={state.link}>{state.link}</a>}
          </div>
        )}
        <button className="ui-button ui-button--secondary" type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Generowanie..." : "Wygeneruj link"}
        </button>
      </form>
    </details>
  );
}

function OrderSummary({ order }: { order: PublicOrderStatus }) {
  const status = orderStatusLabels[order.status];
  const deliveryDetails = order.delivery.method === "inpost_locker"
    ? order.delivery.pointId ?? "Wybrany paczkomat"
    : order.delivery.city ?? "Adres dostawy";

  return (
    <section className="order-status-result" aria-labelledby="order-status-result-heading">
      <div className="order-status-result-header">
        <div>
          <p className="checkout-confirmation-eyebrow">Zamówienie {order.orderNumber}</p>
          <h2 id="order-status-result-heading">{status}</h2>
        </div>
        <span className="order-status-badge" data-status={order.status}>{status}</span>
      </div>
      <p className="order-status-description">{orderStatusDescriptions[order.status]}</p>

      <dl className="order-status-meta">
        <div><dt>Utworzono</dt><dd>{formatOrderDate(order.createdAt)}</dd></div>
        <div><dt>Dostawa</dt><dd>{deliveryMethodLabel(order.delivery.method)} · {deliveryDetails}</dd></div>
      </dl>

      <h3>Pozycje zamówienia</h3>
      <ul className="order-status-items">
        {order.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className={item.isGift ? "order-status-item order-status-item--gift" : "order-status-item"}>
            <span>
              {item.name}
              {item.isGift && <small>Gratis</small>}
            </span>
            <span>{item.quantity} × {formatOrderMoney(item.unitPriceGrosze, order.currency)}</span>
          </li>
        ))}
      </ul>

      <dl className="order-status-total">
        <div><dt>Dostawa</dt><dd>{formatOrderMoney(order.delivery.priceGrosze, order.currency)}</dd></div>
        <div><dt>Razem</dt><dd>{formatOrderMoney(order.totalGrosze, order.currency)}</dd></div>
      </dl>
    </section>
  );
}
