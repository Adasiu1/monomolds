# Przelewy24 sandbox payments

For installation, teammate handoff, daily startup, and local versus hosted database
steps, see [the sandbox handoff guide](przelewy24-handoff.md).

Owner decision: 20 October 2026. Przelewy24 is the only MVP payment provider.
Use the hosted P24 payment page. No embedded BLIK, card collection, automated
refunds, or production payment support is included.

## Local testing without Vercel

The existing Docker Supabase instance is sufficient for sandbox testing. No cloud
project is required. The primary checkout is on `orfin/MON-28-przelewy24-sandbox`; `main` remains separate.

1. Start Docker Desktop and the existing local Supabase stack. Do not reset the
   database: the payment migration is additive and has already been applied locally.
2. In the app directory, install dependencies and use Node >=20.9 (Node 22 recommended).
   Run `npm run dev` (port 3000).
3. Install Cloudflare's official client with `brew install cloudflared`, then run
   `cloudflared tunnel --url http://localhost:3000` in another terminal.
4. Put the generated `https://...trycloudflare.com` origin into `APP_BASE_URL` in
   the ignored `.env.local`. Fill the P24 fields from the sandbox panel:
   account ID -> `P24_MERCHANT_ID` and `P24_POS_ID` (unless a separate POS is assigned),
   report key -> `P24_API_KEY`, CRC key -> `P24_CRC_KEY`. Do not use the order key.
   A reconciliation secret is generated locally; keep it private.
5. Restart the application and open it using the HTTPS tunnel address, including
   when beginning checkout. This lets the secure return cookie work correctly.
6. Run `npm run payments:check` to verify API access without printing credentials.
   Run `npm run payments:reconcile` to replay saved notifications after an outage.
7. Keep the tunnel and Mac running during tests. Restarting the tunnel changes its
   address: update `APP_BASE_URL`, restart the app, and start a new payment attempt.
   Existing P24 sessions keep their original callback URLs.
8. Replay deferred notifications with the protected reconciliation endpoint when
   testing an outage; an authorized status read also retries its order's saved event.
   For a long-running shared environment, configure the scheduler described below.

The tunnel publishes the local storefront, not the Supabase port. Use synthetic
customers only. `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` is used by the
server catalogue/commerce adapters; browsing the tunnel must not require exposing
Supabase directly. The tunnel is a temporary test URL, not hosting or production.

Official instructions: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Shared test environment configuration and rollout

1. Apply committed migrations to an isolated test Supabase project before deploying
   the app. Never connect this sandbox to the production order database.
2. Configure server-only `P24_ENV=sandbox`, `P24_MERCHANT_ID`, `P24_POS_ID`,
   `P24_API_KEY` (report/API key), and `P24_CRC_KEY`. Use the sandbox account's keys.
   No P24 variable has a `NEXT_PUBLIC_` prefix.
3. Set `APP_BASE_URL` to a stable public HTTPS origin, without a path or query.
   The webhook must be accessible without preview/deployment login. Keep any
   access protection changes limited to the payment webhook, according to the
   hosting platform's supported configuration.
4. Set an independent random `PAYMENT_RECONCILIATION_SECRET` (at least 32 characters).
   Have the test environment scheduler POST every minute to
   `/api/payments/przelewy24/reconcile` with `Authorization: Bearer <secret>`.
   This endpoint replays up to 20 durable unprocessed notifications; invoke again
   if a backlog remains. Alert on repeated 503 responses or a persistent difference
   between `checked` and `completed`. Never log the authorization header.
5. Check credentials with P24 `GET /api/v1/testAccess` from the server. Basic auth
   uses `posId` as the username and the report/API key as the password.
6. Complete the sandbox acceptance matrix below before enabling checkout for users.

`P24_ENV` values other than `sandbox` are rejected. Changing an environment value
alone cannot enable production payments. The app never sends phone, guest token,
address, or invoice details to P24. Registration sends the required customer email,
order description, integer gross amount, currency, and callback URLs.

Official contract: https://developers.przelewy24.pl/

## Flow and interfaces

`submitGuestCheckout` preserves the existing authoritative pricing, terms,
idempotency, and order snapshot. Once the order is saved, `beginGuestPayment`
authorizes the guest by hashed token and normalized phone, reserves the attempt
atomically, and registers it with P24. Failure preserves the order and its status
link. A successful server action redirects to the hosted sandbox page.

`startGuestPaymentAction(token, phone)` reuses the same boundary for retries.
Its success redirects; its failure returns `PAYMENT_UNAVAILABLE`, `PAYMENT_PENDING`,
or `PAYMENT_NOT_ALLOWED` with a safe Polish message. The service success contract
contains only `attemptId`, `expiresAt`, and `redirectUrl`.

Each attempt has a unique UUID `sessionId`, immutable order amount, a 15-minute
expiry, and at most one active attempt per order. Only the request that inserted
an attempt may register it. A definitive registration rejection ends that attempt.
A timeout or malformed response leaves it unresolved. Repeated requests look up
`transaction/by/sessionId` before permitting a replacement. An unresolved attempt
can expire only after the 15-minute limit plus a two-minute grace period and a
provider response showing no payment (or no transaction). The next click creates
a new attempt. A provider outage, advance payment, confirmed payment, or returned
payment never silently permits a second payment.

P24 gets `/api/payments/przelewy24/return?attempt=<uuid>` as `urlReturn`. A secure,
HttpOnly, SameSite=Lax browser cookie maps that opaque attempt to the guest token.
The handler redirects to `/zamowienie/status`; the customer still confirms their
phone. Without the cookie the customer can use the existing recovery flow.
The return handler never updates payment or order state.

`POST /api/payments/przelewy24/notify` validates the notification schema, SHA-384
signature, merchant/POS, session, amount, original amount, and PLN currency.
It records a sanitized signed notification as `received` before calling
`PUT transaction/verify`. Only then does one database transaction mark the attempt
and eligible order paid, consume the discount reservation, and complete the event.
A duplicate notification returns success without repeating side effects.

If verification succeeded but the database commit failed, the saved event remains
replayable. An authenticated lookup confirming the same transaction as paid can
recover an already verified payment during replay. The recovery endpoint and an
authorized customer status read both replay received notifications. A browser
return or an unverified transaction lookup never sets an order paid.

Verified late payments can settle expired attempts/orders. Cancelled orders and a
second genuine payment are retained as `review_required`; they require manual
review in Supabase/P24. They never reopen a cancelled order or trigger an automatic
refund. No email side effect occurs inside payment confirmation.

The guest status contract adds optional `payment` with `status`, `expiresAt`,
`canRetry`, and `reviewRequired`. No provider token, session, or raw diagnostic
payload is exposed. Polling runs every three seconds for up to 20 reads while the
order is pending, then offers manual refresh. P24's standard notification documents
successful payments; absence of a notification or return parameters cannot prove
cancellation or rejection. Those cases remain pending until authoritatively resolved.

## Verification and acceptance evidence

Local automated checks cover signing, payloads, replay, invalid notification data,
registration timeouts, concurrent starts, expiry, late payments, duplicate events,
and guest/table privileges. SQL tests run in a transaction and roll back fixtures.
Run `npm test`, `npm run lint`, `npm run build`, and
`supabase test db supabase/tests/p24_sandbox_payments.sql` from the app directory.

For MON-24, record actual sandbox outcomes and provider transaction references
(without secrets or customer data) for:

- Successful payment, including browser return before and after notification.
- Customer cancellation, provider rejection, timeout, and a new payment attempt.
- Duplicate notification, refresh, and concurrent clicks.
- Changed catalogue price before checkout and incorrect amount/signature.
- Provider/database outage and replay after recovery.
- Delayed payment after expiry, a second genuine payment, and a cancelled order.
- Wrong token/phone and a return on a browser without the guest cookie.
- Mobile and desktop layouts and keyboard operation.

MON-29 is marked Done in Jira, but its real-provider wiring was absent before this
change. Revalidate it as part of MON-24. Mocked tests do not establish real sandbox
acceptance. Do not mark Jira stories complete until their actual criteria pass.

## Local verification log — 20 October 2026

- 56 application tests pass; lint and production build pass.
- All 27 P24 SQL assertions pass, including a fresh migration inside a rolled-back
  transaction. Existing guest-order (13), pricing (35), and model (2) SQL tests pass.
  Regression fixtures were isolated transactionally from existing local orders and
  an active local discount; no local customer data was removed.
- Browser: synthetic local checkout persists its order when credentials are absent;
  a wrong phone is rejected; the correct phone reveals status and retry/refresh.
  Checked 390 px mobile and 1440 px desktop layouts and keyboard focus.
- HTTPS tunnel responds after moving the branch into the primary checkout.
- Real sandbox API access, registration, hosted payment, signed notification,
  verification, secure browser return, and paid customer status passed for
  MON-000038, 7799 grosze, P24 transaction 4303489860.
- Replaying that signed notification twice returned HTTP 200 and retained one
  event. Modifying its signed amount returned HTTP 400.
- MON-000039 remained unpaid after a P24 internal error and the bank simulator's
  payment-error scenario. Continuing reused the existing session without creating
  another attempt. A failed provider session can return immediately to the shop;
  a new attempt is permitted only after expiry/grace and an authoritative unpaid
  lookup. Do not promise immediate creation of another payment.
- Browser testing found that early form submission can precede client hydration.
  Status actions now return the verified phone, so polling/retry do not depend on
  a client onSubmit handler. The recovery link uses APP_BASE_URL when configured.
- The configured sandbox HTTPS hostname is included in allowedDevOrigins so local
  checkout works through a tunnel without allowing all external origins.
- The full real-provider cancellation/timeout/late-payment and outage matrix is
  still pending; MON-24 remains open. This log does not establish production readiness.

## Lost notifications and controlled API recovery

A stopped local server, wrong tunnel port, or expired Quick Tunnel URL can prevent
P24 notifications from reaching the database at all. `payments:reconcile` can replay
saved events but cannot find a notification that was never received.

For a known stored session, use the authenticated maintenance boundary:

```bash
npm run payments:recover -- <session-uuid>
```

The local app must be running on port 3000. A different local port can be supplied
as a second argument, for example `http://127.0.0.1:3101`. The CLI reads its bearer
secret from the ignored environment file; it never prints keys or customer data.
It sends the session to the existing protected reconciliation endpoint. Without a
request body, that endpoint retains its normal scheduled replay behavior.

Recovery uses an authenticated P24 lookup, requires the stored session, exact
amount and PLN currency to match, and accepts only advance-payment/paid states.
It stores a distinct `payment_recovery` event before `transaction/verify`. Its
payload contains only payment identifiers, amount, currency, provider state, and
`source=authenticated_provider_api`. It never fabricates a webhook signature.
The same atomic completion RPC handles duplicate and late payments and cancelled
orders. Saved recovery events can be retried by normal reconciliation after an
outage. This is an explicit extension of the earlier webhook-only settlement rule.

On 21 October 2026, MON-000040 had no received notification, while P24 reported an
advance payment of 36900 grosze. The app was on port 3000, the old tunnel pointed
to 3101, and its public hostname no longer resolved. API recovery verified P24
transaction 4303489896 and settled the order with a durable recovery audit event.

Restart a temporary tunnel when its hostname expires, update `APP_BASE_URL`, and
restart Next.js. Existing P24 sessions retain the previous callback URLs; recover
those sessions explicitly rather than asking the customer to pay again.

Recovery verification: 60 application tests, lint, TypeScript/build, and protected
endpoint checks (401 without credentials, 400 for an invalid session) passed.
Repeating MON-000040 recovery returned `already_processed`.
