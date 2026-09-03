# KAN-14 shared UI

Open `/ui-kit` on the development server (normally http://localhost:3000/ui-kit).
Use the temporary desktop header shortcut or the mobile-menu `UI Kit` link.
This public, `noindex` showcase uses fictional product data and local form
simulation only. It is not an admin page or an access-controlled environment.
Do not add secrets, customer information or real ordering behaviour to it.

## Components

Import directly from `components/ui/<file>`; no barrel or service dependencies.

- `button.tsx`: `Button`, `LinkButton`, `IconButton`. Primary, secondary, ghost,
  danger; native disabled/loading states. Buttons default to `type="button"`.
  Icon buttons require a label. Use links for navigation, buttons for actions.
- `fields.tsx`: `TextField`, `TextArea`, `SelectField`, `Checkbox`. Supply a unique
  `id` and visible `label`; optional `hint` and `error` are connected automatically.
  Native props/ref pass through. The caller owns validation, submission and focus.
- `price.tsx`: `Price`. All values are integer grosze in PLN. Optional original
  and lowest-30-day prices are supplied data, never calculated by the UI. Supply
  approved pricing history before displaying a real promotion.
- `product-card.tsx`: `ProductCard` accepts `ProductCardData` and an optional action.
  The caller supplies the actual detail URL and disables purchasing when unavailable.
  Missing/broken images have a fallback. Remote image hosts need a narrow Next image
  allowlist when real assets are connected. No cart or database is wired here.
- `feedback.tsx`: `Notice`, `EmptyState`, `LoadingState`, `ProductCardSkeleton`.
  Notices announce by default; set `announce={false}` for static examples or when
  inside an existing live region. Keep dynamic live-region containers mounted.

Default server-compatible primitives become client code only when imported into
an interactive client boundary. Product image error handling is a small isolated
client component. No new dependencies were added.

## Motion and styles

`app/ui.css` contains reusable styles using existing charcoal/coral tokens.
Press feedback is a 160ms scale to .97 using `--ease-out`; image hover is 200ms
scale to 1.025, and CTA arrows move 3px. Hover motion requires a fine pointer;
keyboard focus is immediate; reduced motion removes movement. Loading skeletons
are intentionally static. Essential information never depends on animation.

The homepage CTA and shop return link already use `LinkButton`. Existing bespoke
header/menu styles remain intact to avoid changing established navigation behaviour.

## Temporary routes

`app/[section]/page.tsx` whitelists unfinished navigation destinations with honest
Polish preparation notices, `noindex`, and a home link. Unknown paths remain 404.
Replace entries with dedicated pages as their stories are implemented, then remove
the empty whitelist route. These are shells, not completed catalogue, cart or legal pages.

## Verification

With Node 24+ on PATH, from the nested app directory:

```sh
node --experimental-strip-types --test tests/format-price.test.mjs
npm run lint
npm run build
node tests/ui-kit.browser.mjs
```

Browser smoke tests use installed Chrome (override `CHROME_PATH` if necessary),
ports 3104/9335, an isolated temporary profile and the production build. They do
not stop the development server. Screenshot paths are printed in test output.
The profile/screenshots remain in the OS temporary directory for inspection.

Also review `/ui-kit` in Safari on desktop and a phone: tab/shift-tab order,
Enter/Space, form errors, retained values after failure, contrast, wrapping,
200% zoom, reduced motion, touch and the existing menu's Escape/focus behaviour.

## Removing the showcase later

Remove `app/ui-kit/`, its header/mobile navigation shortcuts, the `.ui-kit-shortcut`
style and its dedicated browser test when it is no longer
needed. Keep `components/ui/`, `app/ui.css`, the layout CSS import, formatter and
its unit test. Storefront components do not import the demo. No database cleanup
or migration is required.

## KAN-14 review scope

- Shared Polish responsive layout and navigation: existing header, footer and mobile
  drawer retained; all named destinations resolve to a page or an explicit preparation shell.
- Basic buttons, fields, product cards, messages and prices: implemented above.
- Keyboard, focus and contrast: native controls, labelled fields with linked errors,
  explicit status text, minimum 44px controls, and visible coral focus outlines.
- Presentation is independent of Supabase; fixture data is confined to the showcase.
- Real catalogue data, filters/pagination, bundles, cart, contact delivery and final
  legal content remain separate stories. KAN-13 homepage placeholders are unchanged.

Final acceptance is the owner's review of `/ui-kit` and the storefront. This change
does not transition Jira, create a PR, commit or deploy automatically.
