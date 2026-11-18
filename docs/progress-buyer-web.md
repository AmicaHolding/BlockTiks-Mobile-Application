# buyer-web, fan alignment progress

Fan-facing React + Vite + Tailwind app aligned to the Sahra Web Prototype,
LogicMap (platform="web"), Screen Inventory, and `designs/handoff/*`.
Brand tokens come from `designs/brand/tokens.json` (mapped in
`tailwind.config.js` + `src/index.css`; no invented hex values).

## Build

`cd buyer-web && npm install && npm run build`, **passes**
(`tsc --noEmit` clean, `vite build` ok, 2026-11-18).

## Per-screen status

| Route / surface | Status | Notes |
|---|---|---|
| Home `/` (fHome, updated design) | DONE | Hero: gold eyebrow "Tickets across the Gulf", 56px "Every night out, in one place.", subcopy + pill search ("Search events in {city}" → smooth-scrolls to grid); nav search hidden on `/` (navSearch). "This weekend in {city}", up to 3 × 240px cards with bottom gradient overlay, Dubai-only + no query + All category, weekend events excluded from grid and filtered to real weekend dates (honest title vs. the demo's unfiltered slice). Dynamic grid title: Results / More events / All events. City chips (Dubai/Abu Dhabi/Riyadh/Doha, defined-but-unrendered in the proto; rendered in the all-events header with the model's gold/transparent-chip styling) + `noCityEvents` empty state ("Nothing on in {city} yet"). Gold "Hosting events?" band (rounded-22px, Night "Start hosting" → Studio). Motion: data-rise stagger (700ms, 80+i·90ms), city 520ms rise + 450ms slide on change, IntersectionObserver band reveal, card hover lift+shadow+gold outline, all killed under `prefers-reduced-motion` via the prototype's global rule; easing cubic-bezier(.2.7.2,1). |
| Explore `/explore` | DONE | Filtered browse (date/category/price/hide-sold-out/seated). Kept as a secondary surface; header nav is Events / My tickets / Host events per prototype. |
| Search `/search` | DONE | Backend `/events?q=`; recents; Artists/Venues tabs show honest "not connected yet" state (see api-gap). |
| Event `/events/:id` | DONE | Back link, cover + chip, title, `date · venue` + countdown chip, about, sticky TICKETS panel: per-tier steppers (max 6/order), resale inside matching tier cheapest-first with "Resale" tag, "Your listing" own-listing guard, seated sections → `/events/:id/seats?section=`, sold-out "Remind me" + "Sold out. Want us to tell you if seats open up?", "Set your price" watch link, Total + Checkout/Sign-in-to-buy, "Max 6 per order · resale capped at face +10%" footnote. |
| Seats `/events/:id/seats` | DONE | Section→seat flow preserved; qty clamped to 6; `?section=` honored; hold copy no longer states a fixed number (real expiry shows at checkout). |
| Checkout `/checkout` | DONE | Sand surface; hold countdown from `order.expiresAt` with expired-hold state (decision-16, flagged); promo field with "discounts tickets, not the service fee" note; "Service fee (5%)" label; all-in total shown before Pay; Stripe PaymentElement hand-off; test-mode badge on `pk_test`; spec copy · "Another fan just bought that listing", "That's your listing", "Nothing was charged" on decline, "You're in. See you there." confirmation. |
| My tickets `/tickets` | DONE | Upcoming/Past tabs, "Waiting for tickets" auto-buy watch section, per-event Selling card with cancel, ticket passes, "Nothing booked yet. Your next sahra is waiting." |
| Ticket pass | DONE | Gold pass + QR stub ("goes live 24h before doors"); QR payload via `api.ticketCredential` (gap stub → ticket code); Send accepts email-or-phone (phone = api-gap note), self-transfer rejected client-side; Sell links to /sell; "Resale" listed state. |
| Sell `/sell` | DONE | Ticket multi-select → price stepper with face × 1.10 cap shown + enforced client-side (above-cap error copy), "Max allowed" shortcut, seller fee 5% + "You keep 95%" payout line, waiting-buyers hint, resale-disabled branch (event.resaleEnabled, field is an api-gap). |
| Set your price `/offers/new` | DONE | Qty ≤ 6, currency-aware input, face + cap display, W3 above-cap block, W1 "One matches right now → Buy it now" direct-to-checkout, waiting-watch confirmation copy. |
| Auth `/login` | DONE | Canonical gold artwork + "Your night starts here"; sign in / create account; A3 personalize step (city + ≥3 interests via `PATCH /auth/me`); "Open Sahra Studio" host hand-off, no Studio built. |
| Account `/account` | DONE | Sand surface; `?section=` deep links (bell → notifications); profile (incl. city/DOB), payment methods via Stripe SetupIntent, notifications + delivery prefs, language, security + password change, transactions, help/FAQs, earnings + payouts + promo codes (+redeem field wired to gap stub), referrals; "Host events · Studio" link; A6 delete-account with client-side blockers (upcoming tickets / listings / watches / balance). |
| Header | DONE | Gold logo artwork, inline search, Events / My tickets / Host events nav, notification bell with unread count, EN/عربي direction toggle (RTL-ready). |

## Tags introduced

- `TODO(api-gap)`-`src/lib/api.ts`: feed/search contract (venues+artists), holds→orders contract (single line per intent), hold quote/promo pre-validation, event reminder (localStorage-backed stub), ticket credential/QR rotation resource, fan promo redemption `POST /me/promos`, claim-based transfers (phone + non-members), A6 server enforcement; plus `Event`/`Listing`/`Order` model gaps (on_sale_at, resale_enabled/cap, face value, SA-##### order code). `src/components/TicketPass.tsx`: phone transfers. `src/pages/AccountPage.tsx`: sole-admin blocker data, `POST /me/promos`. `src/pages/SellPage.tsx`: `resale_enabled` field.
- `TODO(decision-1)` · QR reissue-on-holder-change vs time rotation (`src/lib/config.ts`, `TicketPass.tsx`). Rotation deferred per recommendation.
- `TODO(decision-13)`, all-in pricing flag on (`src/lib/config.ts`); VAT not itemised (backend has no VAT field).
- `TODO(decision-16)`, 10-min recommended hold + visible countdown (`src/lib/config.ts`, `CheckoutPage.tsx`); real expiry read from `order.expiresAt` (backend default 15 min, surfaced truthfully).

## Divergences / notes

- Checkout uses backend `/orders/intent` (one line per order) rather than spec `holds → orders`; multi-tier carts constrained to a single line, tagged in `api.ts`.
- Money fields keep backend `*Cents` naming; values are integer minor units per spec.
- Reminder is a localStorage stub behind `api.reminder` (UI behaves correctly, honest about backend gap).
- Currency shown via `Intl` with event currency (seed data is USD; display not hardcoded to AED).
- Backend ignores `Idempotency-Key` headers (generates its own for Stripe); keys are sent on all money/inventory POSTs per spec.
- Studio surfaces intentionally not built, all host entry points link out to `VITE_STUDIO_URL` (default `http://localhost:5173`).
