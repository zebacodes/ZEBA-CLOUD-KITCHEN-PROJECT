# CloudEats — Multi-Brand Cloud Kitchen Ordering Platform (Prototype)

A working, click-through prototype of a Swiggy/Zomato-style cloud kitchen
marketplace: **one shared kitchen, seven distinct virtual restaurant
brands**, one cart, one checkout.

This build is intentionally a **static HTML/CSS/JS single-page app** (no
build step, no framework, no backend) so it opens directly in a browser and
is trivial to demo. It mirrors the information architecture, data model, and
user flows of the original React/Next.js spec — see [Migrating to the full
stack](#migrating-to-the-full-stack-nextjs--real-backend) for how to port it.

## Run it

No install, no build. Just open `index.html` in a browser, **or** serve it
locally (recommended, avoids any `file://` CORS quirks):

```bash
cd cloudeats
python3 -m http.server 8080
# then visit http://localhost:8080
```

**Demo login:** `demo@cloudeats.in` / `password123` — or just sign up fresh
(the OTP screen accepts any 6 digits).

## What's implemented

- **Home** — animated hero (the "one kitchen → many brands" diagram is the
  page's signature visual), cuisine chips, kitchen grid, trending section,
  testimonials.
- **`/kitchens`** — full listing with live filters (cuisine, rating, price
  for two, delivery time, veg-only) and sorting.
- **`/kitchen/:slug`** — storefront per brand: category-grouped menu, veg
  filter, item customization (variant + quantity) via a slide-in sheet,
  sticky "view cart" bar on mobile.
- **Cart** — single-kitchen-per-order (see [design decision](#design-decision-single-kitchen-per-order)
  below), quantity editing, coupon codes (`WELCOME50`, `FLAT100`,
  `CLOUD20`), delivery tip, full ₹ bill breakdown with 5% GST.
- **Auth** — routed `/login`, `/signup`, `/otp-verify` (not modals, per the
  spec's default), mock Google/Apple buttons, protected-route redirect that
  returns you to what you were doing (e.g. hit "Checkout" while logged out →
  land back on `/checkout` right after logging in).
- **Checkout** — saved addresses (add new via a form, no map integration),
  ASAP vs. scheduled delivery, 5 mock payment methods, order placement.
- **Order success** — confirmation screen with a live-updating tracker
  (Placed → Preparing → Out for delivery → Delivered) that progresses on a
  timer, simulating real-time status.
- **Order history** — past orders, reorder, rate order.
- **Profile** — edit info, manage addresses, view mock payment methods.
- **Search** — matches across kitchen names/cuisines and individual dishes.
- Light/dark theme toggle, toasts, skeleton-friendly empty states, keyboard
  focus states, `aria-label`s on icon-only controls, a skip-link, and
  `prefers-reduced-motion` support.

## Folder structure

```
cloudeats/
├── index.html      # App shell: fonts, icon lib, mounts #app, loads scripts
├── styles.css       # Full design system (tokens, components, layout)
├── data.js          # Mock data layer: kitchens, menu items, coupons, formatINR()
├── app.js           # Router + state + all page renderers + event handling
├── manifest.json     # PWA manifest (installable)
└── README.md
```

There's no bundler, so load order matters: `data.js` before `app.js`.

### Inside `app.js`

It's one file, but organized in the same shape the real app would split
into:

| Section in `app.js`          | Would become…                              |
|---|---|
| `state`, `LS`, `load/save`   | `store/` (Zustand slices) + `services/`     |
| `isLoggedIn`, `requireAuth`  | `middleware.ts` / `useAuth()` hook           |
| `render*` functions           | `app/**/page.tsx` route components          |
| `addToCart`, `computeBill`    | `lib/cart.ts`, `lib/pricing.ts`             |
| event delegation block        | React `onClick`/`onSubmit` handlers per component |

## Data model

Defined and populated in `data.js`:

- **Kitchen** — `id, slug, name, cuisines[], rating, ratingCount, deliveryTimeMins, priceForTwo, isVeg, accent, fssai, address, offer`
- **MenuItem** — `id, kitchenId(implicit via MENU map), category, name, description, priceINR, isVeg, customizations[]`
- **CartItem** (in `state.cart`) — `kitchenId, itemId, variant, qty, priceEach`
- **Order** — `id, userId, kitchenId, items[], status, totals{subtotal, deliveryFee, packaging, gst, discount, tip, grandTotal}, placedAt, eta, address, paymentMethod`
- **Address** — `id, tag, line1, line2, city, pincode, isDefault`
- **Coupon** — `code, description, type('flat'|'percent'), value, cap?, minOrder`

7 kitchens are seeded, each with 9 menu items across 4–5 categories.

## Design decision: single-kitchen-per-order

The cart is restricted to **one kitchen at a time** — adding an item from a
different brand prompts "Start a new cart?" before clearing the existing
one. This matches how Swiggy/Zomato/most food-delivery apps actually work:
one kitchen ⇒ one prep queue ⇒ one delivery trip, which keeps ETAs honest
and avoids a rider waiting on three different prep stations. A true
multi-kitchen cart would need per-brand sub-orders, staggered ETAs, and
(likely) split delivery fees — out of scope for this prototype but the data
model (`Order.kitchenId` is singular) would need to become
`Order.subOrders[]` to support it later.

## Pricing rules (`computeBill()` in `app.js`)

- **Delivery fee**: ₹0 if item subtotal ≥ ₹499, else ₹40 flat.
- **Packaging charge**: ₹15 flat (once cart is non-empty).
- **GST**: 5% of `(subtotal − discount)`.
- **Coupon discount**: flat ₹ or % (with a cap), gated by `minOrder`.
- **Tip**: optional, added post-GST, goes straight to the total.
- All currency renders through `formatINR()` (`Intl.NumberFormat('en-IN', …)`)
  for correct Indian digit grouping (₹1,24,999 style).

## Accessibility notes

- Skip-to-content link, visible focus rings (`:focus-visible`).
- Icon-only buttons (theme toggle, cart, avatar, close buttons) carry
  `aria-label`.
- Toggle switches use `role="switch"` + `aria-checked`.
- Tracker/stepper conveys status via both color and text label, not color
  alone.
- Respects `prefers-reduced-motion`.
- Known gap for a production build: full keyboard trap + `Escape`-to-close
  on the sheet/modal, and route-level `aria-live` announcements — worth
  adding before a real accessibility audit.

## Known simplifications (prototype scope)

- No real backend — everything lives in `localStorage`/`sessionStorage`
  (see keys below) and resets only if you clear site data.
- OTP accepts any 6 digits; "Continue with Google/Apple" are UI-only toasts.
- No real map — address entry is a plain form.
- Payment is simulated; nothing is actually charged.
- Order status auto-progresses on a `setTimeout` chain purely for demo
  effect (Preparing at +5s, Out for delivery at +10s, Delivered at +15s from
  order placement, while you're on the confirmation page).

**LocalStorage keys used:** `ce_theme`, `ce_user`, `ce_users`, `ce_cart`,
`ce_addresses`, `ce_orders`, `ce_last_payment`.
**SessionStorage keys used:** `ce_pending_route` (post-login redirect),
`ce_pending_signup` (holds signup form data between `/signup` and
`/otp-verify`).

## Migrating to the full stack (Next.js + real backend)

1. **Scaffold** a Next.js 14 App Router project with TypeScript + Tailwind +
   shadcn/ui, matching `package.json`/tooling from the original spec.
2. **Move `data.js` types into `types/*.ts`**, and split `KITCHENS`/`MENU`
   into `services/kitchens.ts` + `services/menu.ts` — replace the plain
   arrays with `fetch()`/ORM calls against your real API.
3. **Replace `state` + `load/save`** with a Zustand store (`store/cart.ts`,
   `store/auth.ts`), persisted via `zustand/middleware`'s `persist` (same
   `localStorage` keys can be reused for a soft migration).
4. **Replace routing**: each `render*()` function becomes a route folder —
   e.g. `renderStorefront(slug)` → `app/kitchen/[slug]/page.tsx`. The
   `parseRoute()`/`switch` in `render()` maps almost 1:1 onto the App
   Router's file-based routes.
5. **Auth**: swap the mock `state.users` array + OTP-accepts-anything logic
   for a real provider (NextAuth, Clerk, Supabase Auth, or a custom
   phone-OTP service like MSG91/Twilio Verify). Keep the same
   `requireAuth()` / redirect-and-return UX — it maps onto Next.js
   `middleware.ts` checking a session cookie.
6. **Forms**: swap the vanilla `FormData` handling for React Hook Form + Zod
   schemas (`schemas/checkout.ts`, `schemas/auth.ts`) — the field names in
   this prototype's forms (`name`, `identifier`, `password`, `line1`,
   `line2`, `city`, `pincode`, `tag`, …) were chosen to map directly.
7. **Payments**: wire the "Payment method" step to Razorpay/Stripe (India)
   in test mode; `state.paymentMethod` already models the five UI options.
8. **Images**: current build uses accent-colored gradients + emoji instead
   of photos (keeps the prototype dependency-free and fast). Swap
   `kitchen-cover`/`menu-item-img` backgrounds for `next/image` once real
   food photography is available.

## Tech notes

- Fonts: **Fraunces** (display) + **Plus Jakarta Sans** (UI), via Google
  Fonts.
- Icons: **lucide** (UMD build from unpkg), matching the spec's
  `lucide-react` choice.
- No external JS framework — vanilla JS with a small hash-router and
  event-delegation pattern, so the whole thing is dependency-free besides
  fonts/icons.
