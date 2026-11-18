# Studio progress

Scope: `studio/` only. Sources of truth: `designs/handoff/03-rules.md`, web
prototype Studio screens, Account & Studio frames 26-45, Product Screens
frames 07-10/44/45, LogicMap `platform="web"`.

Backend reality: Fastify on :4000 exposes auth (`/auth/login`, `/auth/signup`,
`/auth/me`), events (`/events/mine`, CRUD, `/events/:id/publish`, orders,
guests) and `/promos`. No org/membership/verification/payout/venue-entity
endpoints exist yet, so every org-scoped surface is stubbed in
`studio/src/lib/store.ts` behind `api.*` and tagged `TODO(api-gap)`.

## Per-screen status

| Screen / route | Status | Notes |
| --- | --- | --- |
| Host sign-up (`/login`, sign-up mode) | DONE | Step-1 copy verbatim; `role: 'creator'` signup; mapped `email_exists` |
| Sign in (`/login`) | DONE | `/auth/login` (backend route; spec calls it `/auth/signin`) |
| Org setup (`/setup`) | DONE | "Who's hosting?", name, city + type chips, note card; stub `POST /orgs` |
| Studio layout | DONE | Night sidebar: logo+STUDIO, org switcher + "+ New organisation", nav (Payouts/Team/Settings admin-only), org·you·role footer; gate role → door-mode message; dev role preview in header |
| Overview (`/`) | DONE | Org name + verification badge, "Get ready to sell" checklist, 4 KPIs, events list + latest orders |
| Events (`/events`) | DONE | Search, sold bars, gross (admin), status chips incl. awaiting-verification/paused/postponed/cancelled |
| Create event (`/events/new`) | DONE | 4 steps (Details → Tickets → Promotion → Publish); category chips, cover dropzone (preview only), venue select + new venue, E2 capacity block, seated→one tier per section, resale + cap chips, launch promo, review step, publish gating by verification |
| Manage event (`/events/:id`) | DONE | Breadcrumb+status chip, tiers w/ sell-through+gross (admin), venue sections, resale card, night Sold card, recent orders, pause/resume (stub), postpone/cancel dialogs (stub), co-host splits card (stub, 10000 bps) |
| Orders (`/orders`) | DONE | Cross-event list, search, All/Paid/Refunded chips, refund confirm w/ spec copy (stub endpoint) |
| Analytics (`/analytics`) | PARTIAL | 7/30/year, KPIs, daily bars, top events, sell-by-tier. Buyers-by-city + payment mix are placeholders pending `TODO(api-gap): GET /orgs/{id}/analytics` |
| Promo codes (`/promos`) | DONE | Frame 44 side panel: code/generate, % or AED, applies-to, uses, dates, `applies_to_resale`, first-order-only; spec validation (4-12 alnum, unique, 1-100%) |
| Venues (`/venues`) | PARTIAL | Venue tabs (event-derived + local), standing capacity editor, seated section list + map visual + rows/seats steppers + accessible/held, E2 over-capacity warning, saves via real `PATCH /events/:id` when mirrored. Frame-45 seat-grid tools (numbering, block seats, view photo) not built · `TODO(api-gap): PUT /venues/{id}/layout` |
| Payouts (`/payouts`) | DONE | Bank form (AE+21 IBAN, holder=legal name → `name_mismatch`), Night available card, weekly schedule copy, reserve line, negative-balance state, gating errors (no_bank/unverified/min AED 1,000), history, all stub data (`TODO(api-gap): /orgs/{id}/payouts`) |
| Team (`/team`) | DONE | Invite modal w/ role cards + gate event scope, pending/expired rows (7-day TTL), role change, remove w/ last-admin block, stub members (`TODO(api-gap): /orgs/{id}/members`); invites gated on verified org |
| Settings (`/settings`) | DONE | Tabs Organisation / Payouts / Team (TeamPanel reuse); verification card w/ resubmit; dev-only "Sandbox: approve verification" |
| Verify modal | DONE | Shared component: legal name, licence no, doc upload picker (files not persisted, no upload endpoint) |

## Cross-cutting

- Auth header `Bearer`, `X-Org-Id` on every request once org context exists,
  `Idempotency-Key` on create/publish/payout/refund calls.
- Money = integer minor units (`priceCents` on wire); `formatMoney` handles
  2/3/0-decimal currencies. New events default to org currency (`aed`).
- Dates stored UTC, displayed Asia/Dubai (`VENUE_TZ`); create flow converts
  venue-local date+time → UTC ISO.
- Role matrix enforced: Admin (all), Co-host (no Payouts/Team/Settings nav,
  no gross/money columns, no splits/bank edits), Gate (full-page door-mode
  screen). Dev-only "Preview role" selector in the header.
- Publish gating: none → draft + verify modal; submitted → draft +
  "publishes automatically" (pendingPublish chip); rejected → blocked;
  proposed co-host splits → blocked (`splits_not_accepted`).
- Verification required before: publish, invites, payout requests.
- Bank required before payouts; AE+21 IBAN + holder==legal_name (O4).
- Last-admin protection (T3); 7-day invite expiry with "Expired" state (T2).
- Tier total ≤ venue capacity blocked in create (E2) + venues warning row.

## TODO(api-gap) inventory

- `GET /me/memberships`, `POST /orgs`, orgs are local-store only.
- `POST /orgs/{id}/verification` (+ doc upload endpoint), status can never
  leave `submitted` without the ops queue; dev button simulates approval.
- `PUT /orgs/{id}/payout-account` · IBAN stored locally (last4 only).
- `GET/POST/PATCH/DELETE /orgs/{id}/members`, invites/memberships local.
- `GET /orgs/{id}/events`, today user-scoped `/events/mine`; no
  event_scope filtering for gate staff server-side.
- `PATCH /events/{id}`, only `venueLayout` supported; title/date edits need
  the full route (E3 restrictions server-side).
- `POST /events/{id}/cancel`, `/postpone`, local status overlay only;
  refunds/rollover not executed.
- `POST /events/{id}/hosts` + accept, co-host splits local.
- `POST /orders/{id}/refunds`, refunds marked locally.
- `GET/POST /orgs/{id}/payouts`, balances derived client-side from orders.
- `GET /orgs/{id}/analytics`, city/payment-mix placeholders.
- `PUT /venues/{id}/layout`, venue entities; layouts persist via
  `PATCH /events/:id` when mirrored.
- `POST /orgs/{id}/promos`, promo scope is creatorId today.
- Cover/licence doc upload endpoint, pickers store names/previews only.
- `GET /orgs/{id}/resale-policy`, resale flag/cap stored per event locally.

## TODO(decision-N) inventory

- decision-2, cancel = full refund incl. fees; postpone = rollover + 14-day
  window (copy + local flags only).
- decision-3-10% reserve / 14-day release / negative-balance netting shown
  on Payouts.
- decision-4, weekly Monday payout copy for verified orgs.
- decision-5, splits lock at first sale; future-sales-only changes flagged.
- decision-8, resale cap ceiling +10% (face ×1.10), organiser can lower.
- decision-10, rejection banner notes 7-day sales-pause grace (no timer).
- decision-12, invite expiry 7 days ("Invite pending"/"Expired").
- decision-13, org currency AED; all-in copy.

## Known divergences

- Login route is `/auth/login` (backend), not spec `/auth/signin`.
- Studio is English LTR like the prototype; Arabic/RTL frames are
  buyer-facing. Layout is RTL-ready in structure but not dir-aware.
- No real seat-grid editor (frame 45 seat numbering/blocking); sections are
  rows × seats-per-row + accessible/held counts.
- "Verify" doc upload keeps filenames only (no upload endpoint).
- The smoke-test event `Studio Smoke Test` exists in the seeded DB.

## Build

`npm run build` → `tsc --noEmit && vite build` clean (57 modules, ~278 KB).
