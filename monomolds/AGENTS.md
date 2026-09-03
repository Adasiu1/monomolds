<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MonoMolds project instructions

## Product brief

Build a small, trustworthy Polish e-commerce website for handmade silicone cake moulds. The first release is an MVP for customers in Poland.

- All customer-facing content, validation messages, metadata, checkout copy, and transactional email content must be in Polish.
- Use plain hyphens (`-`) in website copy, including metadata and accessible labels. Do not use em or en dashes.
- Keep code identifiers and technical documentation in English.
- Structure content so an English locale can be added later, but do not implement the English storefront in the MVP.
- Customers check out as guests. Do not add customer registration, login, profiles, or saved addresses.
- Products include individual moulds and bundles. Both need detailed product pages.
- Do not introduce Shopify or another hosted commerce platform.
- Prefer a focused, easy-to-navigate experience over a feature-rich marketplace.

## Required MVP pages

The primary navigation should remain small:

- `Strona główna`
- `Formy` (route `/sklep`)
- `Zestawy`
- `O nas`
- `FAQ`
- `Kontakt`
- `Koszyk`

Also provide the following routes or states without adding them to the primary navigation:

- Product and bundle detail pages
- Checkout
- Payment pending, success, cancellation, and failure states
- Order status/confirmation page using a non-guessable guest token
- `Dostawa i zwroty`
- `Regulamin sklepu`
- `Polityka prywatności`
- Cookie information/consent only when the selected analytics or marketing tools require it
- Not-found and general error states

Do not invent final legal text. Use clearly marked draft content until the owners have it reviewed.

## Approved technology

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4 and the existing global design tokens
- Vercel for the Next.js application and server runtime
- Supabase Postgres for catalogue, discounts, orders, and payment events
- Supabase Storage for product images
- PayU or Przelewy24 for payments; select one before starting the payment integration and do not build both for the MVP
- Brevo for transactional email

Do not replace these services without an explicit project decision.

## Architecture boundaries

- Use Server Components by default. Add `"use client"` only for genuine browser interaction such as the cart, form state, or local UI behavior.
- Keep secrets, privileged Supabase access, payment signing, discount calculation, and Brevo calls on the server.
- Browser code may use only explicitly public environment variables.
- Use a repository/data-access layer rather than calling Supabase throughout presentation components.
- Keep payment-provider code behind a small provider interface so the selected provider is isolated from order logic.
- Keep email-provider code behind a small service module; UI components must not call Brevo directly.
- Represent money as integer grosze, never floating-point złoty values.
- Store timestamps in UTC and format them for Polish users at the presentation boundary.
- Generate Supabase TypeScript types and avoid duplicating database row shapes manually.
- Validate all external input at server boundaries. Never trust totals, prices, stock, discounts, order status, or product names submitted by the browser.
- Prefer the Supabase dashboard for initial catalogue/order administration. Do not build a custom admin panel unless it becomes an explicit requirement.

Suggested module boundaries once those areas are introduced:

```text
app/                  routes, layouts, loading/error states
components/           reusable presentation components
features/cart/        cart state and cart UI
features/checkout/    checkout UI and request schemas
lib/supabase/         clients, generated types, repositories
lib/payments/         provider interface, PayU or Przelewy24 adapter
lib/email/            Brevo adapter and transactional event handlers
lib/pricing/          authoritative server-side pricing and discounts
supabase/migrations/  versioned database migrations
tests/                integration and end-to-end tests
```

Create directories only when they are needed; do not scaffold empty architecture.

## Core data model

The expected domain includes:

- `products`
- `product_variants`
- `bundles`
- `bundle_items`
- `discounts`
- `orders`
- `order_items`
- `addresses`
- `payment_events`

Orders are not linked to application user accounts. Store the email and checkout data needed to fulfil the order, plus a non-guessable token when a guest needs to view order status. Minimize personal data and never expose orders by sequential ID alone.

Product availability, current prices, bundle composition, delivery cost, and discounts must be recalculated on the server immediately before creating a payment.

## Payment and order rules

- A successful browser redirect is not proof of payment.
- Only a verified provider webhook may transition an order to `paid`.
- Verify signatures exactly as required by the selected provider's current documentation.
- Make webhook processing idempotent and safe for duplicate or out-of-order delivery.
- Store the provider event identifier and enough sanitized metadata for diagnosis; do not log secrets or unnecessary personal/payment information.
- Maintain explicit order/payment states rather than a single boolean.
- Never accept a client-provided amount as authoritative.
- Test success, cancellation, rejection, timeout, duplicate webhook, invalid signature, changed price, and page refresh scenarios in the provider sandbox.

## Brevo rules

- Send transactional email only from trusted server-side events.
- At minimum support order received, payment confirmed, and shipment/status-change messages, plus delivery of the contact form to the shop owner.
- Email failures must not roll back an already verified payment.
- Record or log a retryable delivery result without exposing personal data.
- Keep templates Polish-first and include a locale field or template mapping to allow English templates later.

## UX, content, and accessibility

- Design mobile-first; the full purchase path must work comfortably on a phone.
- Use semantic HTML, visible keyboard focus, useful alternative text, associated form labels, and clear Polish validation messages.
- Product detail pages should cover dimensions, capacity or size where applicable, material, care instructions, expected handmade variation, availability, fulfilment time, and delivery information.
- Show bundle contents clearly. Do not make customers infer what is included from photographs.
- Show a discount's original and final prices unambiguously.
- Optimize product images with `next/image` and provide appropriate dimensions and responsive sizes.
- Avoid unnecessary popups, carousels, animation, and marketing trackers.
- Add metadata, canonical URLs, sitemap/robots configuration, and Product structured data before launch.

## Two-person workflow

Work from a shared contract so frontend and backend can progress independently.

1. Before a feature starts, agree on its TypeScript types, request/response schema, error states, and acceptance criteria.
2. Frontend work may use typed fixtures or a local adapter matching that contract.
3. Backend work implements the same contract using Supabase or an external provider.
4. Integrate by swapping the adapter, not by rewriting the UI.
5. Keep pull requests small and feature-scoped. Avoid broad formatting or refactoring in files owned by the other active task.
6. Flag a schema or API-contract change before merging it because it can block the other workstream.

Suggested ownership, adjustable by the team:

- Person A: design system, navigation, catalogue/product pages, cart and checkout UI, content pages, accessibility, responsive behavior, and browser-level tests.
- Person B: database/migrations, Supabase repositories and RLS, authoritative pricing, payment/webhook integration, Brevo, monitoring, backup, and server integration tests.
- Shared: scope, contracts, checkout rules, delivery rules, provider choice, end-to-end testing, legal-content review, and production launch.

## Implementation order

Follow this order unless an explicit task requires otherwise:

1. Scope, sitemap, Polish terminology, repository conventions, data contract, and provider choice.
2. Shared UI foundation in parallel with Supabase schema, migrations, seed data, Storage, and RLS.
3. Catalogue, product pages, and bundles using typed fixtures in parallel with catalogue repositories.
4. Local guest cart and checkout UI in parallel with authoritative server-side pricing, stock, delivery, and discount validation.
5. Payment UI states in parallel with the selected provider integration and verified idempotent webhook.
6. Informational/legal page shells in parallel with Brevo transactional events.
7. Promotions, SEO, accessibility, performance, monitoring, backups, and end-to-end tests.
8. Preview-environment acceptance test, production configuration, a low-value real payment test, and launch monitoring.

## Testing and verification

Before handing off a change:

1. Read the relevant Next.js 16 guide in `node_modules/next/dist/docs/` before using or changing a framework API.
2. Run the narrowest relevant test while developing.
3. Run `npm run lint`.
4. Run `npm run build` for route, configuration, server, or integration changes.
5. Manually verify the affected flow at mobile and desktop widths when UI changes.
6. Add or update tests for pricing, discounts, state transitions, webhook verification/idempotency, validation, and critical checkout paths.

Do not silence lint/type errors, weaken validation, or delete tests to make verification pass. Report unrelated existing failures clearly.

## Definition of done

A task is complete only when:

- The acceptance criteria are met in the actual UI or server flow.
- Loading, empty, error, and success states are handled where relevant.
- Customer-facing text is natural Polish, not placeholder English.
- The change is responsive and keyboard accessible when it affects UI.
- Security-sensitive decisions remain server-side.
- Relevant tests, lint, and build pass.
- Required migrations, environment-variable names, setup steps, and operational effects are documented.
- No secret or real customer data is committed, logged, or included in fixtures.

## Environment and secrets

- Keep local secrets in ignored environment files and production secrets in Vercel/Supabase/provider settings.
- Provide placeholder variable names in `.env.example`; never add real values.
- Use separate sandbox/test and production credentials for payments and Brevo.
- Treat Supabase service-role keys, payment secrets, webhook secrets, and Brevo API keys as server-only secrets.
- Do not expose a secret merely by prefixing it as public or importing it into a Client Component.

## Scope control

The following are deliberately outside the MVP unless explicitly requested:

- Customer accounts and authentication
- Wishlists, reviews, loyalty points, subscriptions, or marketplace features
- Multiple currencies or English checkout
- A custom CMS/admin dashboard
- Both PayU and Przelewy24 at the same time
- Advanced promotion stacking
- Complex warehouse, invoicing, or shipping-carrier automation

When a requested change adds one of these, call out the scope expansion before implementing it.
