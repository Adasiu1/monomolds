"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import type { PublicOrderStatus } from "@/lib/commerce/contracts";
import {
  readGuestOrderStatusAction,
  readGuestOrderStatus,
  startGuestPaymentAction,
  resendGuestOrderStatusLinkAction,
} from "@/app/checkout/status/actions";
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

  const [phone, setPhone] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");

  return (
    <div className="site-container order-status-page">
      <div className="order-status-layout">
        <header className="order-status-heading">
          <p className="checkout-confirmation-eyebrow">Moje zamówienie</p>
          <h1>Sprawdź status zamówienia</h1>
          <p>
          Potwierdź swoje dane użyte podczas składania zamówienia, aby zobaczyć jego aktualny status.
          </p>
        </header>

        {isGuestOrderToken(initialToken) ? (
          <form action={formAction} className="order-status-form" noValidate onSubmit={(event) => setPhone(String(new FormData(event.currentTarget).get("phone") ?? ""))}>
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
        ) : initialToken ? (
          <p className="ui-notice ui-notice--error" role="alert">
            <span className="ui-notice-icon" aria-hidden="true">!</span>
            <span>Ten link do zamówienia jest nieprawidłowy lub wygasł.</span>
          </p>
        ) : null}

        {state.status === "success" && <VerifiedOrder key={`${initialToken}:${phone}`} initialOrder={state.order} token={initialToken} phone={phone} />}
        {resendState.status === "success" && resendState.order && (
          <>
            <p className="ui-notice ui-notice--success" role="status">
              <span>{resendState.message}</span>
            </p>
            {resendState.link && (
              <p className="order-status-generated-link">
                <span>Link do sprawdzania zamówienia:</span>
                <a href={resendState.link}>{resendState.link}</a>
              </p>
            )}
            <VerifiedOrder key={resendState.link} initialOrder={resendState.order} token={resendState.link ? new URL(resendState.link).searchParams.get("token") ?? "" : ""} phone={recoveryPhone} />
          </>
        )}
        {state.status !== "success" && resendState.status !== "success" && (
          <ResendLinkForm
            state={resendState}
            action={resendAction}
            pending={resendPending}
            open={!initialToken}
            onPhone={setRecoveryPhone}
          />
        )}
      </div>
    </div>
  );
}

function ResendLinkForm({
  state,
  action,
  pending,
  open,
  onPhone,
}: {
  state: typeof initialResendGuestOrderLinkState;
  action: (payload: FormData) => void;
  pending: boolean;
  open: boolean;
  onPhone: (phone: string) => void;
}) {
  return (
    <details className="order-status-resend" open={open || undefined}>
      <summary>Nie masz linku do zamówienia?</summary>
      <p className="ui-field-note">
        Podaj numer zamówienia, e-mail i telefon użyte przy zakupie. W środowisku
        produkcyjnym ten link powinien zostać wysłany e-mailem.
      </p>
      <form action={action} className="order-status-resend-form" onSubmit={(event) => onPhone(String(new FormData(event.currentTarget).get("phone") ?? ""))}>
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
            {state.link && (
              <a href={state.link} className="order-status-resend-link">
                {state.link}
              </a>
            )}
          </div>
        )}
        <button className="ui-button ui-button--secondary" type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Generowanie..." : "Wygeneruj link"}
        </button>
      </form>
    </details>
  );
}

function VerifiedOrder({ initialOrder, token, phone }: { initialOrder: PublicOrderStatus; token: string; phone: string }) {
  const [order, setOrder] = useState(initialOrder);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [polling, setPolling] = useState(initialOrder.status === "pending_payment");

  useEffect(() => {
    if (initialOrder.status !== "pending_payment") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let reads = 0;
    const deadlineTimer = setTimeout(() => { stopped = true; setPolling(false); }, 60000);
    const poll = async () => {
      let result;
      try { result = await readGuestOrderStatus(token, phone); }
      catch {
        if (!stopped) { setPolling(false); setMessage("Nie udało się odświeżyć statusu. Spróbuj ponownie."); }
        return;
      }
      if (stopped) return;
      reads++;
      if (result.ok) setOrder(result.order);
      if (result.ok && result.order.status === "pending_payment" && reads < 20) {
        timer = setTimeout(poll, 3000);
      } else {
        setPolling(false);
        if (!result.ok) setMessage(result.message);
      }
    };
    timer = setTimeout(poll, 3000);
    return () => { stopped = true; clearTimeout(timer); clearTimeout(deadlineTimer); };
  }, [initialOrder.status, token, phone]);

  const payment = order.payment;
  const descriptions = {
    unpaid: "Zamówienie oczekuje na płatność.",
    created: "Przygotowujemy płatność. Potwierdzenie może pojawić się za chwilę.",
    pending: "Oczekujemy na potwierdzenie płatności. Sam powrót ze strony płatności nie potwierdza wpłaty.",
    paid: "Płatność została potwierdzona.",
    failed: "Nie udało się rozpocząć płatności. Możesz spróbować ponownie.",
    cancelled: "Ta próba płatności została anulowana.",
    expired: "Ta próba płatności wygasła. Możesz spróbować ponownie.",
  };
  return <>
    <OrderSummary order={order} />
    <section className="order-status-result" aria-label="Płatność">
      <h2>Płatność</h2>
      <p role="status">{payment?.reviewRequired
        ? "Wpłata wymaga wyjaśnienia. Skontaktuj się z nami i podaj numer zamówienia. Nie ponawiaj płatności."
        : payment ? descriptions[payment.status] : orderStatusDescriptions[order.status]}</p>
      {polling && <p className="ui-field-note">Sprawdzamy status automatycznie przez minutę.</p>}
      {message && <p role="status">{message}</p>}
      <div className="order-payment-actions">
        {payment?.canRetry && <button className="ui-button ui-button--primary" disabled={pending} onClick={() => startTransition(async () => {
          setMessage(null);
          const result = await startGuestPaymentAction(token, phone);
          setMessage(result.message);
        })}>{pending ? "Sprawdzanie..." : payment.status === "unpaid" ? "Przejdź do płatności" : "Kontynuuj lub ponów płatność"}</button>}
        <button className="ui-button ui-button--secondary" disabled={pending} onClick={() => startTransition(async () => {
          const result = await readGuestOrderStatus(token, phone);
          if (result.ok) { setOrder(result.order); setMessage(null); }
          else setMessage(result.message);
        })}>Odśwież status</button>
      </div>
    </section>
  </>;
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
