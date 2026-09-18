<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses Next.js 16. APIs, conventions, and file structure may differ from
training data. Read the relevant guide in `node_modules/next/dist/docs/` before
writing or changing framework code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MonoMolds project instructions

## Read this first

This file is the working contract for contributors and coding agents. It describes
the product, the decisions already made, the code that exists today, and the next
MVP work. Do not treat old planning documents as a more current source.

Source-of-truth order:

1. The currently accepted Jira issue and its acceptance criteria.
2. Current code, migrations, generated database types, and tests on `main`.
3. This file.
4. Historical documents in `docs/` and old commit or PR descriptions.

If Jira and the code disagree, do not silently choose one. Call out the mismatch
before changing a public contract, database schema, pricing rule, or checkout flow.

The Next.js application lives in `monomolds/` inside the repository. Run application
commands from that directory.

## Limited-agent operating mode

This file is intentionally self-contained for contributors using a basic ChatGPT
agent in VS Code. Do not assume that external skills, MCP servers, subagents,
browser automation, Jira, Supabase Dashboard, or GitHub CLI are available.

- Work only on the task the user supplied. Do not start broad architecture audits,
  speculative refactors, or unrelated cleanup.
- Inspect the relevant local code, tests, migrations, and documentation before
  editing. Never claim to have checked a service or document that was unavailable.
- If Jira is unavailable, use the issue text provided by the user and this file.
  Ask for missing acceptance criteria only when they materially change the result.
- If current online documentation is unavailable, avoid guessing version-sensitive
  APIs. Follow the installed code and local Next.js documentation, or clearly state
  what the owner must verify.
- Prefer a small complete change over scaffolding future systems. Do not add a new
  dependency when the platform or an existing module already solves the problem.
- Never bypass a blocked database, payment, email, deployment, or secret-dependent
  step with fake production behavior. Fixtures are allowed only behind the existing
  development contract and must be labelled as such.

## Language and naming - mandatory

- All customer-facing copy, validation messages, metadata, accessibility labels,
  and transactional emails are natural Polish.
- Use plain hyphens (`-`) in customer-facing copy. Do not use em or en dashes.
- **All new file names and directory names must be English and ASCII-only. Never
  create a Polish-named file or folder.** Translate the concept to English first.
- Use English for code identifiers, test names, comments, branch descriptions,
  technical documentation, database objects, and environment-variable names.
- Prefer lowercase kebab-case for ordinary files and directories. Keep framework
  conventions such as `page.tsx`, `layout.tsx`, and `loading.tsx`.
- Polish storefront URLs such as `/sklep`, `/koszyk`, `/zestawy`, and
  `/zamowienie` are legacy public boundaries backed by English source directories
  through `next.config.ts` rewrites. Keep new internal paths English and preserve
  the Polish URLs as canonical customer-facing routes.
- A new Polish public URL that would require a Polish source directory needs an
  explicit routing decision first. The default remains an English source path.
- Keep UI strings ready for a future English locale, but do not implement an
  English storefront during the MVP.

## Product and MVP boundary

MonoMolds is a small Polish e-commerce store for handmade silicone dessert and
cake moulds. The experience should feel premium, tactile, product-first, and
trustworthy without resembling a large marketplace.

MVP rules:

- Poland only, Polish storefront, `PLN` only.
- Guest checkout only. Do not add registration, login, profiles, saved addresses,
  wishlists, reviews, loyalty, subscriptions, or a marketplace.
- Sell individual moulds, their variants, and bundles.
- Use the Supabase dashboard for catalogue and order administration. Do not build
  a custom CMS or admin panel unless Jira explicitly adds it to scope.
- Do not introduce Shopify or replace an approved service without a team decision.
- Do not invent final legal text. Keep legal content clearly marked as draft until
  it has been reviewed by the owners.

## Current implementation snapshot - 15 September 2026

The following is already present on `main`. Extend it instead of rebuilding it:

- Shared responsive layout, dark design tokens, header, mobile navigation, footer,
  reusable UI primitives, loading/error states, and an internal `/ui-kit` review
  route (`MON-14`).
- Polish homepage with real brand imagery and a GLB hero model (`MON-13`).
- Supabase schema, migrations, seed data, RLS, private catalogue image/model
  buckets, and generated TypeScript database types (`MON-16`).
- Live Supabase catalogue repository with signed image URLs (`MON-18`, `MON-22`).
- Catalogue pages for moulds and bundles, search/filter/sort presentation, empty
  and retry states, and catalogue loading animation (`MON-15`).
- Product and bundle detail pages with variants, bundle contents, pricing,
  availability, care/material/capacity data, images, and optional 3D media
  (`MON-17`, currently awaiting Jira verification).
- Browser-persisted guest cart with quantity validation, badge, delivery choice,
  discount code, gift selection, and server-backed quote refresh (`MON-23`,
  `MON-21`, `MON-40`).
- Polish guest checkout for Paczkomat or courier, optional invoice details, terms
  acceptance, NIP validation, idempotency, and server-side order creation
  (`MON-19`, `MON-20`).
- Authoritative Supabase pricing and order snapshots, including bundle discounts,
  percentage discount codes, free shipping, threshold gifts, rate limiting, and
  quote revalidation (`MON-21`, `MON-40`).
- Token-protected guest order status with an additional phone check and a recovery
  form (`MON-42`, still in progress in Jira).

Jira status matters: code merged to `main` is not automatically production-ready.
As of this snapshot, `MON-17`, `MON-20`, `MON-21`, and `MON-40` are awaiting
verification, while `MON-42` is in progress.

Known unfinished or temporary behavior:

- No real payment initialization, hosted payment redirect, verified payment
  webhook, or end-to-end payment flow exists yet.
- The domain contract currently names Przelewy24, but provider selection is still
  tracked by `MON-28`. Confirm that decision before implementing payments; do not
  build both PayU and Przelewy24.
- No Brevo integration or transactional email delivery exists. The order-link
  recovery UI currently exposes a generated link for development; production must
  send it securely by email and must not reveal it in the browser response.
- Contact handling, final informational/legal copy, SEO completion, monitoring,
  backup verification, and production launch work remain.
- Parcel S/M/L capacity thresholds are placeholders until physical packing tests.
- Catalogue fields marked for `MON-41` (featured rank, themes, capacities) are not
  yet populated from structured data.
- `/ui-kit` and its navigation shortcuts are temporary review tooling and must not
  ship in customer navigation.

## Next Jira scope

Do not skip directly to launch work. The immediate backlog is:

1. Finish and verify the guest order status flow (`MON-42`).
2. Confirm the payment provider and payment contract (`MON-28`).
3. Initialize sandbox payments (`MON-26`).
4. Implement a verified, idempotent payment webhook (`MON-25`).
5. Build payment pending/success/cancellation/failure states and complete the
   customer order-status experience (`MON-29`).
6. Test order and payment end to end in the provider sandbox (`MON-24`).
7. Add Brevo transactional emails (`MON-27`), the contact page/form (`MON-30`),
   and its server-side Brevo handling (`MON-31`).
8. Complete trust/legal pages, SEO, accessibility, performance, monitoring,
   backups, preview acceptance, and production launch checks.

When starting work, use the actual Jira status and acceptance criteria rather than
assuming this dated snapshot is still current.

## Agreed commerce rules

- Represent money as integer grosze. Never use floating-point złoty values.
- Prices stored in the catalogue are net; customer presentation and authoritative
  totals must use the existing VAT helpers and show gross values correctly.
- The server is authoritative for product identity, availability, price, bundle
  composition, discounts, gifts, delivery, and totals. The browser sends IDs and
  quantities, never trusted monetary values.
- Published moulds remain orderable at zero stock because they are made to order.
- A bundle costs the sum of its components less a 10% bundle discount. Bundle
  prices are derived by database logic; do not maintain an independent manual
  total in UI code.
- Optional percentage discount codes support active dates, minimum subtotal,
  usage limits, and deterministic server validation. Do not add arbitrary
  promotion stacking without an explicit rule.
- Free shipping starts at 6 physical moulds. Count items inside bundles, not just
  cart rows.
- Gifts: 12 physical moulds earn 1 free mould; 24 earn 3 total free moulds. Gifts
  do not reduce the payable total and must be validated by the server.
- Standard fulfilment is up to 7 days for up to 26 physical moulds. Larger orders
  may proceed only after the customer explicitly accepts the versioned lead-time
  notice.
- Supported delivery methods are InPost locker and courier. Current configured
  prices are centralized in `lib/commerce/config.ts`; do not duplicate them.
- Quotes expire and are revalidated at checkout. A price, availability, discount,
  gift, or delivery change must return a structured conflict and require the UI to
  show the refreshed summary.
- Checkout requires acceptance of the versioned terms. A retry with the same
  idempotency key and payload reuses the order; a conflicting payload is rejected.
- Orders use public numbers such as `MON-000001`, but access is never authorized by
  a sequential number. Guest status requires a high-entropy token plus the phone
  number used at checkout.
- Store timestamps in UTC and format them for Polish users at the presentation
  boundary.

Order states:

```text
pending_payment -> paid | cancelled | expired
expired         -> pending_payment
paid            -> processing | cancelled
processing      -> shipped | cancelled
shipped         -> completed
```

Only a verified provider webhook may transition an order to `paid`. A browser
redirect is never proof of payment. Webhook processing must be signed, idempotent,
and safe for duplicate or out-of-order events.

## Routes and experience

Customer routes already implemented:

- `/` - homepage
- `/sklep` and `/sklep/[slug]` - mould catalogue and detail
- `/zestawy` and `/zestawy/[slug]` - bundle catalogue and detail
- `/koszyk` - cart
- `/zamowienie` - guest checkout
- `/zamowienie/status` - protected guest order status

Required content or transaction routes/states still need completion where noted in
Jira: About, FAQ, Contact, delivery and returns, store terms, privacy policy,
payment pending/success/cancel/failure, not-found, and general errors. Cookie
consent is required only if selected analytics or marketing tools require it.

Keep primary navigation focused. Product media is the main interface. Product
details must make dimensions, capacity, material, care, handmade variation,
availability, fulfilment, delivery, price, and bundle contents easy to scan.

## Approved stack and design direction

- Next.js 16 App Router, React 19, TypeScript.
- Tailwind CSS 4 plus the existing global CSS and design tokens.
- Supabase Postgres and Storage.
- Vercel for the application and server runtime.
- One payment provider after `MON-28` is confirmed.
- Brevo for transactional email and contact delivery.

Preserve the established dark editorial direction: warm charcoal surfaces,
off-white text, cobalt as the primary accent, strong product photography,
disciplined asymmetry, generous spacing, and restrained motion. Avoid decorative
gradients, glassmorphism, excessive cards, carousels, scroll hijacking, and
unnecessary popups. Use semantic HTML, visible focus, useful alternative text,
associated labels, reduced-motion support, and comfortable touch targets.

## React and Next.js implementation rules

Apply these rules whenever writing or reviewing React or Next.js code:

- Keep components as Server Components unless they require browser APIs, local
  interaction, or React client state. Make client boundaries as small as practical.
- Start independent server work together and await it with `Promise.all`; avoid
  sequential data-fetching waterfalls. Defer an `await` until the branch that needs
  its result.
- Use `React.cache` only for request-level deduplication of server reads. Never keep
  mutable request or customer state in a module-level variable.
- Pass the minimum serializable data into Client Components. Do not send entire
  database rows or duplicate the same payload through several component levels.
- Import directly from implementation modules. Do not create broad barrel files
  that pull unrelated client code into a bundle.
- Dynamically load only genuinely heavy, optional browser components such as the 3D
  viewer. Do not add dynamic imports to small components without evidence.
- Use `next/image` with known dimensions or `fill`, correct responsive `sizes`,
  meaningful Polish alt text, and no layout shift.
- Derive render state during render instead of synchronizing it with an effect.
  Put interaction logic in event handlers and use functional state updates when the
  next value depends on the previous value.
- Do not add `useMemo`, `useCallback`, or `memo` to simple code without a measured
  render cost or a stable-reference requirement.
- Version and validate browser storage data. Keep it minimal, tolerate malformed or
  old values, and avoid repeated `localStorage` reads during render.
- Deduplicate global event listeners and clean them up. Use passive listeners for
  scroll or touch observation when cancellation is not needed.
- Prefer streaming/loading boundaries for slow independent sections, but keep
  commerce totals and primary actions visually stable.

## Architecture and data boundaries

- Use Server Components by default. Add `"use client"` only for real browser
  interaction such as cart state, forms, or local UI behavior.
- Keep Supabase secret/service-role access, payment signing, authoritative pricing,
  discount redemption, rate limiting, and Brevo calls server-only.
- Browser code may use only explicitly public environment variables.
- Presentation components must use repositories/services and public domain types;
  they must not depend on raw Supabase rows or provider payloads.
- Keep payment and email providers behind small server-side adapters.
- Validate all external input at server boundaries and return stable structured
  error codes with safe Polish messages. Never expose raw Supabase/provider errors,
  stack traces, secrets, or personal data.
- Keep generated Supabase types in `types/database.ts` synchronized with committed
  migrations. Do not hand-copy database row shapes.
- The current catalogue is modeled primarily through the polymorphic `products`
  table and its relations. Do not replace it with the old proposed
  `product_variants`/`bundles` schema from planning notes.
- Current commerce persistence includes `checkout_quotes`, `orders`, `order_items`,
  `order_deliveries`, `discounts`, `discount_redemptions`, `payment_events`,
  `commerce_settings`, and rate-limit data. Change database behavior through a
  versioned migration and update tests/types in the same task.
- Minimize personal data. Never commit, log, or place real customer data in
  fixtures. Logs may contain safe operation names, codes, and request IDs only.
- Keep local secrets in ignored environment files. Document placeholder names in
  `.env.example`; production secrets belong in Vercel, Supabase, or provider
  settings.

### Supabase safety rules

- Check the installed Supabase CLI/package versions and current official docs before
  relying on version-sensitive commands or behavior. If online docs are unavailable,
  do not invent a command; use `supabase --help` or ask the owner to verify it.
- This repository uses committed imperative migrations. Every schema or RPC change
  needs a new English-named migration, matching SQL tests, regenerated
  `types/database.ts`, and verification against a local database. Use
  `supabase migration new <english-name>` when the CLI is available; do not guess a
  timestamped filename.
- Enable RLS on every table in an exposed schema. RLS and Data API grants are
  separate: grant only the roles and operations the application actually needs.
- A policy for `UPDATE` normally needs a matching `SELECT` policy plus both `USING`
  and `WITH CHECK`. A role grant alone is not row-level authorization.
- Never use user-editable metadata for authorization. If authentication is added
  later, authorization data belongs in trusted app metadata or database ownership
  relations.
- Prefer `SECURITY INVOKER`. Never add `SECURITY DEFINER` just to make an RLS error
  disappear. Keep internal elevated helpers in a non-exposed schema. A public
  `SECURITY DEFINER` RPC is allowed only as a deliberate application boundary with
  a safe `search_path`, strict input validation and rate limiting where relevant,
  revoked default `PUBLIC` execution, explicit grants to intended roles, and tests
  proving that unauthorized data cannot be read or changed.
- Views exposed through the Data API must respect caller permissions; use
  `security_invoker` where supported or keep/revoke them outside public access.
- Storage policies must cover the exact operation. An upsert requires the relevant
  `INSERT`, `SELECT`, and `UPDATE` permissions; private assets should continue to use
  short-lived signed URLs.
- Never expose `SUPABASE_SECRET_KEY` or a service-role key to browser code. A
  `NEXT_PUBLIC_` variable is public by definition.
- Do not log SQL payloads, tokens, headers, guest-order credentials, addresses,
  e-mails, phone numbers, or raw Supabase errors. Return stable application error
  codes and safe Polish messages.
- After two or three failed attempts at the same Supabase operation, stop retrying.
  Re-read the error, inspect the relevant migration/policy/log, and change approach.

Useful boundaries:

```text
app/                  routes, layouts, metadata, loading and error boundaries
components/           reusable presentation components
features/cart/        browser cart state and cart UI
features/checkout/    checkout UI and form contracts
features/order-status guest order status UI and helpers
lib/catalogue/        catalogue types, mapping, and Supabase repository
lib/commerce/         domain contracts, pricing/order repositories, configuration
supabase/migrations/  versioned database changes
supabase/tests/       database and RPC tests
tests/                Node integration and unit tests
types/database.ts     generated Supabase database types
```

Create directories only when needed. Reuse established modules and primitives;
do not scaffold speculative layers.

## Two-person workflow

Before a feature starts, agree on its TypeScript contract, request/response shape,
error states, acceptance criteria, and any migration. Frontend may use a typed
fixture only when it implements the same public contract as the server adapter.
Integrate by swapping the adapter, not rewriting the UI.

- Keep PRs small and tied to a Jira issue.
- Use English branch names after the Jira key, for example
  `orfin/MON-42-order-status`.
- Do not perform broad formatting or refactoring in files owned by another active
  task.
- Flag schema and public API contract changes before merge because they can block
  the other workstream.
- Do not commit generated build output, local Supabase state, secrets, or customer
  data.

## Verification and definition of done

Before handing off a change:

1. Read the relevant local Next.js 16 guide before using or changing framework
   APIs.
2. Run the narrowest relevant test while developing.
3. Run `npm test` for domain, repository, pricing, or checkout changes.
4. Run the relevant SQL tests for migrations/RPC changes.
5. Run `npm run lint`.
6. Run `npm run build` for routes, configuration, server logic, or integration
   changes.
7. Manually verify affected UI at representative phone and desktop widths,
   including keyboard and reduced-motion behavior.

A task is done only when its Jira acceptance criteria work in the real UI or server
flow; relevant loading, empty, validation, error, and success states exist; security
decisions remain server-side; tests/lint/build pass; migrations, environment names,
and operational effects are documented; and Jira is moved only after verification.

Never silence lint/type errors, weaken validation, remove tests, or replace real
integration behavior with a fixture merely to make a check pass. Report unrelated
existing failures clearly.
