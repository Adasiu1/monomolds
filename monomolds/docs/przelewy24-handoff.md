# Przelewy24 sandbox handoff

Updated: 21 October 2026. Branch: `orfin/MON-28-przelewy24-sandbox`.
This setup uses a local Next.js app, local Docker Supabase, and a public HTTPS
Cloudflare Quick Tunnel. Vercel and a hosted Supabase project are not required.

## Choose how to collaborate

- Browser testing only: the developer running the app shares the current tunnel
  URL. The tester needs no local installation or keys. All orders live in that
  developer's local database. Keep that machine, Docker, app, and tunnel running.
- Independent development: each developer follows the setup below and has their
  own local database, keys, tunnel URL, orders, and browser cookies. Git does not
  synchronize database contents. An order from another developer's database cannot
  be recovered locally just by knowing its P24 session.

## First setup on another Mac

1. Install Git, Node.js 22 LTS with npm, Docker Desktop, and Homebrew. Start Docker
   Desktop and wait until its engine is running. Install the tunnel client:

   ```bash
   brew install cloudflared
   node --version
   docker version
   ```

   Commands below use `npx supabase@2.117.0`, the CLI version checked for this
   handoff. The first invocation downloads it; no global Supabase CLI is required.

2. Obtain the repository and branch:

   ```bash
   git clone https://github.com/Adasiu1/monomolds.git
   cd monomolds
   git switch --track origin/orfin/MON-28-przelewy24-sandbox
   cd monomolds
   npm ci
   ```

   The second `monomolds` directory is the application directory containing
   `package.json` and `supabase/config.toml`. Run all remaining commands there.
   For an existing clone, first check `git status`, preserve any local work, then
   fetch and switch to the branch; use `git pull --ff-only` when already on it.

3. Start the local database:

   ```bash
   npx supabase@2.117.0 start
   npx supabase@2.117.0 migration up --local
   npx supabase@2.117.0 seed buckets --local
   npx supabase@2.117.0 status
   ```

   A first start initializes the database using committed migrations and
   `supabase/seed.sql`. `migration up --local` applies pending schema changes to an
   existing local database without resetting it. Bucket seeding uploads committed
   product photos/models using the paths in `supabase/config.toml`.
   Do not run `supabase init`: this project already has its configuration.
   Do not use `db reset` on a database whose orders you want to keep.

   Open local Studio at `http://127.0.0.1:54323`. Confirm `products`,
   `payment_attempts`, and `payment_events` exist and the catalogue has seed data.
   `status` prints local credentials: do not share its full output publicly.

4. Create `.env.local` only if it does not already exist:

   ```bash
   cp -n .env.example .env.local
   ```

   Fill these values; placeholders are not working credentials:

   | Variable | Source |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Local API URL from CLI status; normally `http://127.0.0.1:54321` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local publishable key, or legacy anon key, from CLI status |
   | `SUPABASE_SECRET_KEY` | Local secret key, or legacy service_role key, from the same instance |
   | `P24_ENV` | Exactly `sandbox` |
   | `P24_MERCHANT_ID` | Sandbox panel: account ID |
   | `P24_POS_ID` | Same account ID unless P24 assigned a separate POS |
   | `P24_API_KEY` | Sandbox panel, My data / settings: report key (`Klucz do raportów`) |
   | `P24_CRC_KEY` | Sandbox panel: CRC key (`Klucz do CRC`) |
   | `APP_BASE_URL` | Public HTTPS origin from the next step, without a path |
   | `PAYMENT_RECONCILIATION_SECRET` | A separate locally generated secret |

   Generate the reconciliation secret and paste the result into `.env.local`:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Sandbox panel: https://sandbox.przelewy24.pl/panel/sprzedawca.php .
   Do not confuse the report/API key with `Klucz do zamówień`. Access to the API
   must permit the developer's outgoing public IP according to the P24 account
   configuration. Never copy production keys or another instance's Supabase keys.
   Share sandbox keys through the team's private secret channel, not Git.
   Email/contact/Turnstile placeholders are separate integrations; they are not
   required by the current P24 checkout, and should not be treated as valid keys.

5. Terminal A: start the app on an explicit port:

   ```bash
   npm run dev -- --port 3000
   ```

   If the port is occupied, stop the duplicate app or deliberately choose another
   port and use it consistently in the tunnel/recovery commands. Do not silently
   use a fallback port while the tunnel still targets 3000.

6. Terminal B: publish the app:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   Copy the generated `https://...trycloudflare.com` origin into `APP_BASE_URL`.
   Restart Terminal A with Ctrl+C and the same app command. Keep Terminal B running.
   Do not add an interactive login gate to this tunnel: P24's webhook must reach it.
   Expose only the storefront port, not local Supabase/Studio.

7. Terminal C: check credentials:

   ```bash
   npm run payments:check
   ```

   A successful check confirms API access. A complete sandbox payment is still
   needed to prove CRC signing, public callbacks, verification, and browser return.
   Check for duplicate P24/Supabase definitions in `.env.development.local` or
   shell environment if Next.js and the CLI appear to use different settings.

8. Open the HTTPS tunnel URL, add an available product, and complete guest checkout
   with synthetic test details. Use the P24 sandbox simulator. Start and finish in
   the same browser so the secure return cookie is present. After return, confirm
   access with the checkout phone. Expect a paid order, paid attempt, and verified
   event in local Studio. Never manually change an order to paid to pass a test.

## Every later session

1. Start Docker Desktop.
2. In the application directory run `npx supabase@2.117.0 start`.
3. After pulling new code run `npm ci` if dependencies changed and
   `npx supabase@2.117.0 migration up --local` if migrations changed.
4. Start `npm run dev -- --port 3000` and the tunnel in separate terminals.
5. Update `APP_BASE_URL` to this tunnel's URL and restart Next.js.
6. Run `npm run payments:check`, then test through HTTPS.

Quick Tunnels change hostname when recreated and stop working when their process
stops. Existing P24 transactions retain their original callback/return URLs;
changing `.env.local` does not rewrite those transactions. Do not ask for another
payment until an existing payment has been checked.

## Recovery and troubleshooting

| Symptom | First check |
| --- | --- |
| Bad Gateway | Does localhost:3000 load, and does cloudflared target exactly that port? |
| Tunnel hostname no longer works | Recreate tunnel, update APP_BASE_URL, restart app |
| API access check fails | Sandbox POS/account, report key, account IP permission |
| Catalogue/schema error | Same local Supabase URL/keys, applied migrations, products and buckets |
| P24 advance payment / `Do wykorzystania` | Verify payment; do not force local order state or pay again |

For a saved notification that could not finish verification/database completion:

```bash
npm run payments:reconcile
```

This calls the current `APP_BASE_URL`, so keep its tunnel reachable. An authorized
order-status read also replays its saved event. For a missing notification, use
that local database's known P24 session UUID:

```bash
npm run payments:recover -- <session-uuid>
```

Recovery calls the app at `http://127.0.0.1:3000` by default. It checks authenticated
P24 data against the stored order, saves an audit event, verifies with P24, and
atomically completes payment. Repeats are idempotent. A different local app port
can be provided as the second argument. No secret should be pasted into the command.

## What changed and why

| Code | Purpose |
| --- | --- |
| `lib/payments/przelewy24.ts` | Sandbox REST adapter, signatures, register/lookup/verify/access check; no new SDK |
| `lib/payments/service.ts` | One active attempt, safe retry/timeout handling, signed notifications and controlled recovery |
| `lib/payments/repository.ts` | Server-only persistence and atomic payment RPC calls |
| `lib/payments/guest-payment.ts` | Guest authorization and replay of durable events |
| `app/checkout/actions.ts`, `features/checkout/checkout-form.tsx` | Save order first, then redirect to P24; preserve order on provider failure |
| `app/api/payments/przelewy24/notify/route.ts` | Signed callback, verify with P24, then durable confirmation |
| `app/api/payments/przelewy24/return/route.ts` | Safe return via opaque attempt and secure cookie; never marks paid |
| `app/api/payments/przelewy24/reconcile/route.ts`, `scripts/` | Protected event replay and missing-callback recovery |
| `app/checkout/status/`, `features/order-status/` | Real payment status, bounded polling, retry and verified-phone propagation |
| `lib/commerce/contracts.ts`, `lib/commerce/supabase-repository.ts` | Add the safe payment status contract to guest order reads |
| `next.config.ts` | Permit the configured sandbox hostname for dev assets |
| `supabase/migrations/20261020193802_p24_sandbox_payments.sql` | Payment attempts/events, private access, atomic prepare/complete, updated status RPC |
| `types/database.ts`, `tests/payments.test.mjs`, `supabase/tests/p24_sandbox_payments.sql` | Generated DB types and domain/SQL coverage |
| `.env.example`, `AGENTS.md`, `docs/przelewy24-payments.md` | Environment placeholders, agreed contract and acceptance evidence |

The separate monkey/gallery change is commit `c514de8`. Payment implementation and
fixes are `0cd9d1d`, `d9f5b91`, and `f04b007`. A redirect alone never proves payment.

## Local Studio versus hosted Supabase

- `http://127.0.0.1:54323` is the local database's browser UI. Our local payment
  migration is already applied there; no additional cloud push is needed to test.
- `https://supabase.com/dashboard/project/...` controls a different, hosted project.
  A Git push ships source/migration files but does not apply them to that database.
- Moving to a hosted test database requires all pending committed migrations,
  matching environment URL/keys, and catalogue/Storage setup. Schema migration does
  not copy local orders, files, P24 keys, or `.env.local`.

We have not audited or modified the hosted project's migration history as part of
this handoff. Do not assume it is current or apply only the P24 file in isolation.
When an isolated hosted test project is chosen, the owner can review deployment:

```bash
npx supabase@2.117.0 login
npx supabase@2.117.0 link --project-ref <test-project-ref>
npx supabase@2.117.0 migration list --linked
npx supabase@2.117.0 db push --dry-run
```

After reviewing the target, pending SQL, and any existing schema drift, deploy with
`npx supabase@2.117.0 db push`. Do not use `--include-all`/history repair as a blind
workaround. This handoff does not execute a remote deployment. A fresh hosted
project additionally needs intentional catalogue seed and Storage upload; use a
separate test project rather than the live order database.

## Verification and limits

Existing setup: 60 application tests, lint and build passed; 27 P24 SQL assertions
passed before the recovery extension (no SQL changes in that extension). Real
sandbox payment/notification/return and missing-callback recovery were verified.
CLI commands above were checked against version 2.117.0 help. A clean bootstrap on
another developer's machine has not been executed. Full real-provider edge-case
acceptance remains open in MON-24; production payments are disabled.

References: [Supabase local development](https://supabase.com/docs/guides/local-development),
[seeding](https://supabase.com/docs/guides/local-development/seeding-your-database),
[migrations](https://supabase.com/docs/guides/local-development/database-migrations),
[Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/),
[P24 REST](https://developers.przelewy24.pl/).
