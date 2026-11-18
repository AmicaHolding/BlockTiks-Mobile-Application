# Sahra mobile, implementation progress

Flutter fan app + door mode, aligned to `designs/` (mobile prototype, LogicMap
`platform="mobile"`, Screen Inventory, handoff contracts 01-05, brand tokens).

## Entry & auth

- **Splash** (`splash/`): Sahra lockup on Night, ~1s, routes via
  `ApiService.goToDashboard()` → last-mode landing (fan For You / creator door).
- **Get started** (`get_started/`): Sahra mark, "The night is yours." copy,
  Continue-with-email → sign-up, "I have an account" → sign-in, browse-first
  ghost pill → guest feed, host entry + EN/AR pill.
- **Sign in / Sign up** (`sign_in/`, `sign_up/`): tabbed auth scaffold,
  Sahra fields, forgot-password link, sign-up fan/host intent (host →
  `HOST_ORG` with `fromSignup`).
- **Forgot / OTP / reset** (`forget_password/`, `otp_verification_screen/`,
  `reset_password_screen/`): wired to `auth/forgot|verify|reset` endpoints.
- **Personalize** (`personalize/`): city chips + exactly-3-interests gate
  ("N of 3"), Skip bypasses, hosting card → Studio handoff.
- **Host flow** (`host_intro/`, `host_org/`): intro → org form (name, city,
  type) → `POST /orgs` (TODO api-gap) → door mode.
- **Last mode**: `AppPreferences.prefLastMode` + optimistic `PUT /me/mode`.

## Fan

- **For You** (`for_you/`): logo + city pill (bottom-sheet picker, persisted)
  + bell w/ unread dot → inbox; hero card "Selling fast"; list; empty-city
  state with "Back to Dubai". City filtering is client-side (api-gap).
- **Search** (`search/`): Events | Venues | Artists segments (no Users),
  recent searches + trending chips, venue/artist rows focus the events tab.
- **Event detail** (`event_detail/`): GA tier steppers capped at 6 per account
  (rule R10/T5), resale rows cheapest-first, "Set your price" on sold-out
  tiers, "Get on the list" + "Remind me", held-ticket banner blocking
  repurchase (R10), seated sections + seat picking, venue-time display.
- **Checkout** (`payment_page/`): Sand surface, promo code field (applied
  server-side, api-gap: no validate endpoint for preview), 5% service-fee
  estimate, Stripe PaymentSheet (merchant "Sahra"), test-mode banner,
  error/retry states.
- **Tickets** (`wallet/`): Holding / Selling / Waiting (set-price orders)
  / Past-inactive groups; Send + Sell actions; "Stop selling" cancels a
  listing; "Cancel" cancels an offer.
- **Ticket pass** (`purchased_ticket/`): QR, Send / Sell / options sheet.
- **Send tickets** (`transfer/` at `SEND_TICKETS`): email-or-phone recipient,
  self-transfer block, confirm sheet, "new QR" copy.
- **Sell tickets** (`ask_bid/`): pick tickets, set price ≤ face×1.10 (Rumman
  error over cap), "You'll receive X (95%)" net preview, manage listings.
- **Set your price** (`place_bid/`): max-price watch ≤ face×1.10, qty ≤ 6,
  `POST /offers`.

## Profile & settings

- **Profile tab** (`profile_tab/`): photo/name/Sahra fan + edit, Sahras/
  Upcoming/Following stats (following = api-gap), earnings card (ready +
  pending), Money & rewards rows, Hosting row (fan → host intro; creator →
  door mode), Settings, Support & FAQ, sign out.
- **Settings** (`profile_settings/`): Sand screen · Personal (edit profile,
  notifications, language & numbers, sign-in & security) / Money (payment
  methods, earnings & withdrawals, transactions, promos, referrals) /
  Hosting / Support.
- **Notification settings** (`notification_settings/`): 4 per-entity groups ×
  push/email, "Quiet, then instant" default (decision-6), saved locally +
  optimistic PATCH (api-gap).
- **Language & numbers** (`language_settings/`): EN/AR + Latin/Arabic numerals
  with live preview; AR noted as untranslated (decision-1).
- **Sign-in & security** (`security_settings/`): change password, sign out
  other devices, guarded delete, checks tickets/listings/watches/balance
  client-side (rule A6), `DELETE /auth/me` (api-gap: sole-admin pre-check).

## Door mode (creator)

- **Tabs**: Events · Scan (action) · Guests · Account. Gate staff get no
  Events tab (flow M5, role from memberships; api-gap fallback = full tabs).
- **Events** (`creator_home_tab/`): tonight card, door actions, upcoming +
  drafts/past; fresh org → "Get ready to sell" checklist (org created /
  draft event / verify ID+trade licence / bank account) + handoff CTA +
  dashed note, prototype copy verbatim.
- **Event snapshot** (`creator_event/`): sales/check-in/revenue, tiers,
  scan/guest/broadcast actions, Studio handoff for edits.
- **Scanner** (`my_scanner/`): states OK / ALREADY_USED / WRONG_EVENT /
  NOT_FOUND / FORBIDDEN / QUEUED / OFFLINE_BLOCKED / ERROR; partial-admit
  display (admitted X of Y); offline queue persisted (`prefDoorQueue`),
  auto-flush on next online scan; "Last synced X min ago · N queued"
  header; manual code entry; decision-18 tolerance (warn at 5 min, block
  at 30 min, admin override).
- **Guests** (`all_guests/`): event picker, stats, filters, search, manual
  check-in + undo (`DELETE /tickets/:id/check-in`).
- **Broadcast** (`broadcast_message/`): Everyone / Not checked in / Checked
  in / per-tier audiences, channels, recipient count, last-sent, send via
  `POST /events/:id/broadcasts`.
- **Account** (`creator_account_tab/`): org card (name, type·city, role),
  "Switch profile" sheet (personal + orgs + create org), settings, sign out.

## Contracts & rules

- Money is integer cents (`*_Cents`); idempotency keys on money/inventory
  POSTs via `_idemOptions`.
- Remaining `TODO(api-gap: …)` markers: `/feed?city=`, `/search?type=`,
  promo validate/preview, notifications PATCH, orgs/memberships, sole-admin
  delete check, payout-account field, persisted recent searches, `intent`
  field on signup, last-mode server contract, faceCents on tickets.
- `TODO(decision-N)` markers: decision-1 (AR copy untranslated),
  decision-7 (95% seller net on resale), decision-8 (cap = face×1.10),
  decision-14 (unclaimed transfers return after 48h), decision-16
  (10-min checkout hold countdown, needs `holdExpiresAt` from intent),
  decision-17 (phone recipients allowed), decision-18 (offline scan
  tolerance, implemented).
- `flutter analyze`: 0 errors, 0 warnings, 12 info-level SDK deprecations.
