# Sahra Backend · Progress Report

Owner: backend agent. Scope: `backend/` + `docs/backend-plan.md` only.
Spec: `designs/handoff/01–05`. Plan: `docs/backend-plan.md`.
Status of typecheck: `npm run typecheck` ✅ green at every package boundary.
Local smoke target: `http://localhost:4000` against DynamoDB Local :8000.

New endpoints use spec errors `{code,message,field?}`; legacy endpoints keep
`{message}`. Every new money/inventory POST requires `Idempotency-Key`.
Money is integer minor units; `*_minor` fields ride alongside legacy `*Cents`.

---

## Package A — quick correctness wins · DONE

- Max 6 tickets/order (B1) — schema + offer cap + hold lines.
- Platform fee default 12% → **5%** (P1) in `env.ts`, `.env`, `dev.sh`;
  fee computed on the **full subtotal** (P2), not the discounted amount.
- P5: removed the webhook's duplicate `incrementPromoUsage` — fulfillment's
  transaction is the single counter.
- D1: voided/refunded tickets scan `VOID` (410), not `ALREADY_USED`.
- M1: broadcasts capped at **3 per event** (was per event-day).
- A6: `DELETE /auth/me` blocked by upcoming tickets, active listings, active
  price watches, non-zero balance, sole-org-admin — returns `{code,blocks[]}`.
- A1: new password must contain a number → `weak_password`.
- A3: ≥3 interests → `interests_min_3`; signup accepts `intent:"fan"|"host"`
  and returns `next:"personalize"|"create_org"`.
- A7: change-password revokes other sessions, keeps the presented refresh token.

Verified:
```
DELETE /auth/me     → {"code":"has_tickets","blocks":["has_tickets","has_listings"]}
change-password     → {"code":"weak_password","field":"newPassword"}
PATCH interests ×2  → {"code":"interests_min_3","field":"interests"}
```

## Package B — TicketCredential · DONE

- `TICKET#<code>/CRED#<v>` entity; v1 issued at fulfillment in the same txn.
- Rotation (revoke + reissue v+1) on transfer claim, resale purchase, and
  refund/void — stale QRs scan `superseded`.
- `GET /tickets/{code}/credential` → `{qr_payload:"sahra1.<code>.<v>.<secret>",version,issued_at}` (holder only → `not_holder`).

Verified: claim returned a fresh credential; ex-holder gets `not_holder`;
door manifest exposes only the secret **hash**.

## Package C — holds/quote/orders · DONE

- `POST /holds {event_id,lines[{tier_id|listing_id|section,qty,seat_ids?}]}`
  → `{hold_id,expires_at,quote}`; 10-min TTL (`HOLD_TTL_MINUTES`, decision-16);
  expiry via `HEXPIRE#` rows on the `EXPIRE` gsi1 feed, swept by sweeper.
- `GET /holds/{id}/quote?promo=` → subtotal/fee/discount/tax/total/currency +
  promo result. Errors: `promo_invalid`, `promo_used`, `promo_wrong_event`,
  `promo_not_resale`.
- `POST /orders {hold_id}` + `Idempotency-Key` → order + `client_secret`;
  replay returns the original order with `duplicate:true`; consumed hold →
  `hold_expired` (410). Errors: `max_per_order`, `insufficient_inventory`,
  `seat_taken`, `listing_gone`, `not_on_sale`, `age_restricted`,
  `payment_declined` (402, hold+inventory released).
- Legacy `/orders/intent` untouched (verified ≤6 schema cap).

Verified: hold→quote→order→(same idem key)→same order+`retry/duplicate`;
qty 7 → `max_per_order`; WELCOME10 → 600 off 6000.

## Package D — grouped tickets + resale surface · DONE

- `GET /me/tickets` → `{upcoming,past,waiting,selling}` (waiting = pending
  transfers/matched offers; selling = active listings).
- `GET /events/{id}` tiers carry `resale:{from_price,count}` + `my:{tickets,
  reminder,watch}` when authed (`authenticateOptional`).
- `GET /events/{id}/tiers/{tier}/listings` — cheapest-first, excludes the
  caller's own listing; spec snake_case fields alongside legacy.
- `POST /listings` accepts `ticket_ids[]`, `price_each`, `split_rule`;
  enforces `above_cap {cap}` (face×110% default, decision-8),
  `resale_disabled`, `transfer_pending`.
- Tickets carry `faceCents` at issuance; reminder store +
  `PUT/DELETE /events/{id}/reminder` (204).

Verified: seller's own listing excluded → `[]` for fan, row for noor;
15000 on 12000 face → `{"code":"above_cap","cap":13200}`.

## Package E — feed/search/reminders · DONE

- `GET /feed?city=` → `{sections[]}`: this_week / in_city / for_you
  (interest-matched, authed) / per-category sections.
- `GET /search?q=&type=` → `{events,venues,artists}`; venues derived from
  event location/address (TODO(api-gap): venues aren't entities yet);
  artists empty until org type=Artist is used (TODO(api-gap)).
- Reminders verified: PUT 204 → `my.reminder:true`; DELETE 204.

## Package F — transfers pending→claim · DONE

- `Transfer` entity + contact index (`TCONTACT#<email|phone>`) + `TEXPIRE#`
  expiry rows; TTL = min(48h, doors-open) — decision-14 / X4.
- `POST /transfers {ticket_ids[],to}` — errors `self_transfer`, `listed`,
  `event_started`, `transfer_pending`, `bad_contact`.
- `GET /transfers` → `{sent,incoming,transfers}`; incoming resolved by the
  caller's email/phone.
- `POST /transfers/{id}/claim` — contact must match claimant; ownership +
  credential rotation atomic; `expired`, `already_claimed`, `not_recipient`.
- `POST /transfers/{id}/cancel` (sender); sweeper `transfer.expire` returns
  tickets to senders (`transfersReturned` stat).

Verified end-to-end: create→pending→`TRANSFER_PENDING`→claim→credential
v-fresh; wrong-recipient → `not_recipient`.

## Package G — organisations · DONE

- Entities: `Organisation`, `Membership` (role on membership, not user),
  `EventHost` (owner/cohost `split_bps`), org→event pointers, invite index.
- `X-Org-Id` middleware `requireOrgRole([...])` → `org_required`/`not_member`/
  `forbidden`; attaches `request.org`.
- `POST /orgs` (`name_exists_for_you`), `GET /orgs/{id}`,
  `POST /orgs/{id}/verification` (dev auto-approve flag; prod waits for
  `verification.decided`), `PUT /orgs/{id}/payout-account` — IBAN **mod-97**
  + holder-matches-legal-name → `iban_invalid`, `name_mismatch`.
- Members: `GET/POST/PATCH/DELETE /orgs/{id}/members` — invite 7-day expiry
  (T2), `already_member`, `last_admin` guards; accept/decline via
  `POST /me/memberships/{id}/accept|decline`.
- `GET /me/memberships`, `PUT /me/mode` (stores `lastMode`), signin returns
  `memberships[]` + `landing` (A4); `/auth/signin` alias added.
- Events: `POST /events` honors `X-Org-Id` (ownerOrgId + org pointer + owner
  host row 10000bps); publish gates `org_unverified`/`no_tiers`/
  `splits_not_accepted`; `PATCH /events/{id}` merged field edits with E3
  `has_sales` guard; `POST/PATCH/DELETE /events/{id}/tiers` with
  `tier_has_sales`; `POST /events/{id}/cancel` (voids tickets, returns
  transfers, cancels listings); `POST /events/{id}/postpone` (+14d refund
  window, decision-2); co-hosts `POST /events/{id}/hosts` (+`locked` after
  first sale, decision-11) + `POST /events/{id}/hosts/accept`.
- All event permission checks (`publish`, `setVenueLayout`, door ops) now go
  through `canManageEvent` — creator fallback preserved for legacy events.

Verified: org create→verify(approved)→IBAN ok/bad/mismatch→org event→
publish→invite→accept→signin shows membership+landing.

## Package H — ledger/refunds/payouts · DONE

- `LedgerEntry` append-only rows + `LEDGERTX#` pointers; balances are
  **derived** (`ledgerBalance`), never stored.
- `recordSaleLedger` fires once per fulfilled order (all 4 fulfill paths):
  primary → `org:{id}|user:{id}` net of 10% reserve (`platform:reserve`
  `reserve_hold` w/ beneficiary) + `platform:fees`; accepted co-host splits
  split the net (decision-11); resale → `user:{seller}` net of 5% seller fee,
  royalty carved from the fee (decision-7 default), buyer fee → platform.
- `POST /orders/{id}/refund` + Idempotency-Key — Stripe refund first, then
  order→REFUNDED + ticket void + mirrored ledger; buyer needs cancel/postpone
  window (`refund_window_closed`), managers anytime.
- `charge.dispute.created` webhook → `recordChargebackLedger` (pro-rata debit
  of credited accounts).
- `Payout` entity (`scheduled→in_transit→paid/failed`) debiting the account
  at schedule time; `POST /me/payouts` (`no_bank`,`nothing_ready`),
  `POST /orgs/{id}/payouts` (`no_bank`,`unverified`,`negative_balance`),
  `GET` lists + `GET /me/earnings`, `GET /orgs/{id}/ledger`.
- Sweeper `releaseReservesForEndedEvents` — event end + 14d →
  `reserve_release` to beneficiary (decision-3).

Verified: order 3150 → seller +2700, reserve +300, fees +150; refund mirrored
balance to 0; idempotent replay → `duplicate:true`.
TODO(api-gap): actual bank transfer execution is scheduled-only (no real
rail locally).

## Package I — door mode · DONE

- `Device` (register via `POST /me/devices`, `lastSyncAt`),
  `ScanEvent` per scan (client `scan_id` dedupe for batch replay).
- `GET /me/door-events` — creator events + org memberships (gate-scoped),
  `{live,sold,checked_in}`.
- `GET /events/{id}/door-manifest` → `{credentials:[{ticket_id,version,hash,
  tier,holder,qty_group}],issued_at}` — secrets hashed, never exposed.
- `POST /events/{id}/scans` → `{result,ticket,holder,group_size}`; results
  `admitted/already_used{at,device}/wrong_event/void/superseded`.
- `POST /events/{id}/scans/batch` → `{accepted,conflicts}`, idempotent replay.
- `POST /tickets/{code}/check-in` + `DELETE` undo (env `DOOR_UNDO_SECONDS`,
  default 300 — TODO(decision)); permission via `canManageEvent` incl. `gate`.
- Broadcasts: `empty_audience`, `limit_reached` (3/event), SMS cost charged
  as `broadcast_cost` ledger debit (`SMS_COST_FILS`, M2) + `sms_cost` in
  response; guests endpoint gains `?q=&filter=` (A C G).

Verified: admitted→already_used{device:dev-door-1}→batch replay deduped→
undo 204→non-member 403 `forbidden`.

## Package J — PriceWatch · DONE

- Offer model extended: `tierId`, `paymentMethodId`, `autoBuy`,
  `PAUSED`/`pausedReason` (W4) — legacy name-keyed watches keep matching.
- `POST /price-watches {event_id,tier_id,qty,max_each,payment_method_id}` —
  `above_cap` vs tier face (W1), `card_invalid` when Stripe validation fails,
  immediate `match:{listing_id}` when a live listing ≤ max exists.
- `DELETE /price-watches/{id}` (204), `GET /price-watches`,
  `POST /price-watches/{id}/resume` (paused→active).
- `price_watch.match` fires on listing creation (already wired; tierId-aware).
- TODO(api-gap): auto-charge on match is gated by `PRICE_WATCH_AUTO_CHARGE`
  (off locally — off-session billing needs saved-method setup intent);
  `pauseOffer` exists for the failure path.

Verified: max_each 6000 on 4500 face → `above_cap {cap:4950}`; under-ask
watch created; seeded 6000 listing above watch → no match (correct).

## Seed extensions · DONE

Additive (fresh seeds only): org "Noor Events" (creator admin, layla cohost,
approved verification, payout IBAN) + org-owned "Desert Sessions" event with
the 100% owner EventHost row. `db:seed` remains skip-if-seeded; no reset.

## Deferred / open items

- TODO(decision-2): postpone/cancel auto-refund policy (refund window is
  implemented; mass-refund on cancel not automatic).
- TODO(decision-7): royalty carve-out defaults (5% of resale price, capped
  at seller fee).
- TODO(decision-11): post-first-sale split changes require dual-admin
  re-accept — currently hard-locked.
- TODO(decision-12): 7-day invite expiry implemented; day-5 reminder email
  not wired (no SES in dev).
- TODO(api-gap): venue/artist search entities, bank payout execution,
  off-session auto-buy charge, co-host door-event indexing edge case,
  per-event venue capacity check on tiers.
- Legacy `/offers`, `/orders/intent`, `/tickets/:code/list`,
  `/events/{id}/checkin`, `/auth/login` all preserved unchanged.
