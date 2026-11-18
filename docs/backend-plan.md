# Sahra Backend · Build Plan (gap-closure)

> **Status: all packages A–J implemented.** Per-package results, curl
> evidence and deferred items live in `docs/progress-backend.md`.

Contract with the lead agent. Work order: `docs/backend-gap-analysis.md`.
Spec of record: `designs/handoff/01–05`. Open decisions implement the
recommended default and are tagged `// TODO(decision-N)`.

**Compat contract:** every existing endpoint keeps working with its current
shape (`{message}` errors, `*Cents` field names, current paths). New endpoints
return the spec error shape `{code,message,field?}` and spec field names where
spec'd; where a response can be extended non-breakingly the new fields are
added alongside the old (e.g. `faceMinor` next to `priceCents`).

**Shared infra added up front (package 0):**
- `src/errors.ts` — `specError(reply, status, code, message, field?)`.
- `src/env.ts` — `platformFeePercent` default `12 → 5` (P1), new knobs:
  `holdTtlMinutes` (10, decision-16), `transferTtlHours` (48, decision-14),
  `resaleCapPct` default 110 (face × 1.10, decision-8), `royaltyPct` 5,
  `sellerFeePct` 5, `orgReservePct` 10 + `orgReserveDays` 14 (decision-3),
  `smsCostFils` 12 (M2), `orgVerifyAutoApprove` dev=true, `priceWatchAutoCharge` false.
- Key space (single-table, pk/sk + gsi1/gsi2), all additive:
  | entity | pk / sk | GSI |
  |---|---|---|
  | TicketCredential | `TICKET#<code>` / `CRED#<version>` | — |
  | Hold | `HOLD#<id>` / `METADATA` | gsi2 `USER#<u>#HOLDS`; expiry via `HEXPIRE#<id>` item on gsi1 `EXPIRE` |
  | Idempotency | `IDEMP#<user>#<key>` / `METADATA` | — |
  | Transfer | `TRANSFER#<id>` / `METADATA` | gsi2 `USER#<u>#TRANSFERS`; expiry via gsi1 `EXPIRE` |
  | Org | `ORG#<id>` / `METADATA` | — |
  | Membership | `ORG#<id>` / `MEMBER#<id>` | gsi2 `USER#<u>#MEMBERSHIPS`; gsi1 `ORGINVITE#<email>` while invited |
  | Org→Event pointer | `ORG#<id>` / `EVENT#<eventId>` | — |
  | EventHost | `EVENT#<id>` / `HOST#<orgId>` | — |
  | LedgerEntry | `LEDGER#<account>` / `<iso>#<id>` | gsi2 `LEDGERREF#<orderId>` for lookups |
  | Refund | `ORDER#<id>` / `REFUND#<id>` | — |
  | Payout | `PAYOUT#<id>` / `METADATA` | gsi2 `ORG#<id>#PAYOUTS` / `USER#<u>#PAYOUTS` |
  | PaymentMethod | `USER#<id>` / `PM#<id>` | — |
  | Device | `DEVICE#<id>` / `METADATA` | gsi2 `ORG#<id>#DEVICES` |
  | ScanEvent | `EVENT#<id>` / `SCAN#<iso>#<id>` | — |
  | Reminder | `USER#<id>` / `REMINDER#<eventId>` | — |
  | Platform promo grant | `USER#<id>` / `PROMO#<code>` | — |
- Ticket gains `faceCents` (face value at issuance), `seatId` passthrough is
  out of scope; `checkedInDeviceId`/`checkedInScannedAt` added for D4.
- Event gains `ownerOrgId?`, `doorsAt?`, `onSaleAt?`, `resaleEnabled`,
  `resaleCapPct`, `royaltyPct`, `minAge?`, `venueTimezone?`, `POSTPONED`
  status; computed `state` (draft/scheduled/on_sale/sold_out/live/ended/
  settled/cancelled/postponed per E1) is derived on read — `status` enum is
  NOT migrated (clients read it).
- Sweeper gains jobs: hold.expire, transfer.expire, event.ended
  (release resale payouts + reserve-release eligibility flag),
  credential.rotate is inline in transfer/resale/refund paths (no cron needed).

---

## Package A — quick correctness wins
- `orders.ts:53` quantity max 8→6, seats maxItems→6 (B1); `db.ts:1311` offer
  qty cap 8→6; `offers.ts` schema max 8→6.
- `env.ts:54` fee default 12→5 (P1).
- Fee on full subtotal (P2): GA path in `orders.ts:338` computes fee on
  `subtotalCents` not `subtotalCents−discountCents`.
- P5 double-increment: remove `incrementPromoUsage` call in webhook
  (`orders.ts:422-425`), the txn in `fulfillOrder` already counts it.
- `checkInTicket` (`db.ts:1506`): `USED` → `ALREADY_USED`; any other
  non-VALID status (REFUNDED/TRANSFERRED/TRANSFER_PENDING/void) → `VOID`.
- M1: broadcast limit 3 per event total (`door.ts:137-141`).
- A6: `DELETE /me` guards `has_tickets`/`has_listings`/`has_price_watches`/
  `has_balance` (+`sole_admin` stub until package G) — returns `{message,code}`.
- A1: change-password requires a digit; A7: optional `refreshToken` in body
  keeps that session, else all revoked.
- A3: `interests` minItems 3 when provided on PATCH (spec `interests_min_3`),
  and WELCOME10 granted per-user on onboarding (platform promo grant row),
  not only as creator promo.
- Promo per-user check counts PAID orders only — already true; keep.

## Package B — TicketCredential + rotation (R1 / decision-1 default b)
- Entity: versioned credentials per ticket; payload format
  `sahra1.<ticketCode>.<version>.<secret>`; manifest hash = sha256(payload).
- `issueCredential(ticketCode)` v1 on every ticket-issuance path (fulfill
  primary/seated; backfill lazily on first access for legacy tickets).
- `GET /tickets/{id}/credential` → `{qr_payload,version,rotates_at:null}`;
  `{id}` accepts ticket code; errors `not_holder`, `void`.
  `// TODO(decision-1)`: option (c) time-rotation deferred, `rotates_at` null.
- `rotateCredential(ticketCode, reason)` — revoke current, issue v+1; called
  on resale fulfillment, transfer claim, refund/void.
- Scan layer learns payloads: `/scans` (package I) and legacy `/checkin`
  accept both bare codes and payloads; superseded version → `superseded`.
- Seed: credentials for seeded tickets.

## Package C — checkout contract (decision-16, P4)
- `Hold` entity: `{id,userId,eventId,lines:[{tierId?|sectionId?|listingCode?,
  qty,seatLabels?,unitPriceCents}],expiresAt,status:active|converted|expired}`.
- `POST /holds {event_id,lines[]}` (+accept camelCase aliases) — validates
  event on sale, B1 total ≤6, sale windows, reserves inventory (tier /
  section / seats / listing CHECKOUT claim), returns `{hold_id,expires_at,
  quote}`; spec errors `max_per_order, insufficient_inventory, seat_taken,
  listing_gone, not_on_sale, age_restricted` (`min_age` enforced when set,
  DOB on account — `// TODO(decision-15)` self-declared confirm field
  `age_confirmed` accepted as pass-through).
- `GET /holds/{id}/quote?promo=` — subtotal/fee(5% of subtotal)/discount/
  tax/total + `{promo:{ok,message}}`; spec errors `promo_invalid, promo_used,
  promo_wrong_event, promo_not_resale` (R8 `validOnResale` honoured).
- `POST /orders {hold_id,payment_method_id?,promo?}` + `Idempotency-Key`:
  validates hold (owner, active, unexpired), re-validates promo, creates
  PENDING order + Stripe PI, marks hold `converted`. Retry with same key →
  `{order, duplicate:true}` (P4). Errors `hold_expired, duplicate,
  payment_declined`. Expired hold → `hold_expired` + lazy release.
- `POST /orders/intent` stays untouched (legacy clients); also gains optional
  Idempotency-Key dedupe (additive).
- Sweeper: `HEXPIRE#` index → release holds (credit inventory back,
  unclaim listings).
- Tax: `taxMinor` computed via env table (`TAX_RATES` JSON, default
  `{AE:5,SA:15}` → derived from event country hint/`venueCountry`, else 0)
  `// TODO(decision-13)`; `taxCents` stored on order (0 when unmapped).
- Order gains `code` `SA-#####` (display code; `id` stays the key).

## Package D — grouped tickets + resale surface
- `GET /me/tickets` → `{upcoming:[{event,tickets[]}],past:[...],
  waiting:[watch],selling:[listing]}` (waiting = active offers; selling =
  ACTIVE/CHECKOUT listings). Legacy `GET /tickets` unchanged.
- Event detail adds `tiers[].resale:{from_price,count}` (new `tierId` on
  listings; legacy rows matched by `tierName`), `my:{tickets,reminder,watch}`
  when authed (optional-auth decorator).
- `GET /events/{id}/tiers/{tier}/listings` — cheapest-first, excludes the
  caller's own (R7), `{listing_id,price_each,qty,split_rule,…}`.
- `POST /listings {ticket_ids[],price_each,split_rule}` — new endpoint
  (multi-ticket capable; single-ticket legacy path stays). Enforces
  `resale_disabled`, `transfer_pending`, `above_cap{cap}` (face×cap),
  R2 cap from `faceCents` (fallback tier price). `split_rule` validated
  `any|all|pairs`, stored (enforced at hold time for `all`/`pairs`).
- `DELETE /listings/{id}` — new by-listing-id endpoint; `already_sold`
  error; legacy `DELETE /listings/:code` stays.

## Package E — feed/search/reminders
- `GET /feed?city=` → `{sections:[{key,title,events[]}]}`:
  `this_week`, `for_you` (user interests when authed), per-category
  sections, `in_city` when city matches location text.
- `GET /search?q=&type=events|venues|artists` → events (title+location),
  venues (distinct location/address pairs), artists (orgs type Artist +
  creator names). TODO(api-gap): no real Venue/Artist entities.
- `PUT/DELETE /events/{id}/reminder` → 204; reminder reflected in
  event `my.reminder` (E4 client uses it for "Remind me").

## Package F — transfers (X1–X4, decision-14)
- `Transfer` entity `{id,ticketIds,fromUserId,toContact,toUserId?,status:
  pending|claimed|returned|cancelled,expiresAt=min(48h,doorsAt)}`.
- `POST /transfers {ticket_ids[],to}` — `to` = email or E.164 phone
  (`// TODO(decision-17)` no OTP; phone transfer attaches on claim).
  Errors `self_transfer`, `listed`, `event_started` (doors open / event
  started). Tickets → `TRANSFER_PENDING`; sender credential stays but scan
  layer treats pending as void.
- `POST /transfers/{id}/claim` — recipient authed, contact matches
  email/phone → tickets reassigned, credentials rotated (X2), status
  claimed. Errors `expired`, `already_claimed`.
- `GET /transfers` — mine (sent + receivable).
- `POST /transfers/{id}/cancel` — sender cancels pending.
- Sweeper `transfer.expire` → status `returned`, tickets back to VALID.
- Legacy `POST /tickets/:code/transfer` (instant, registered users) kept.

## Package G — Organisation + Membership + EventHost (O1–O4,T1–T4,S1,E2,E3)
- Org CRUD: `POST /orgs` (`name_exists_for_you`), `GET /orgs/{id}`,
  `PATCH /orgs/{id}`.
- `GET /me/memberships` → `[{org,role,event_scope,verification_status}]`;
  `PUT /me/mode {mode,org_id?}` sets `last_mode`, clears active holds (A5);
  sign-in response gains `memberships[]` + `landing{}` (A4) alongside
  existing fields; signup gains `intent` + `next` (additive).
- Members/invites: `GET/POST /orgs/{id}/members`, `PATCH`, `DELETE`,
  `POST /orgs/{id}/members/{id}/accept`? No — accept is implicit: invitee
  calls `POST /me/memberships/{id}/accept`. 7-day expiry + `reminderSentAt`
  day-5 marker (sweeper stamps it; `// TODO(decision-12)` actual email nudge
  is a stub note). T3 last-admin guard, T4 revoke stamps `revokedAt`.
- `X-Org-Id` resolution: `app.requireOrg(['admin'|'cohost'|'gate'])`
  preHandler; membership checked per request. Legacy `User.role` unchanged —
  org role now comes from Membership (`// TODO(api-gap)`: User.role kept for
  legacy gates).
- Events under org: `POST /events` honours `X-Org-Id` → `ownerOrgId` +
  pointer row; `GET /orgs/{id}/events` (gate sees `event_scope` only).
- Verification: `POST /orgs/{id}/verification` → `submitted` → auto-approve
  in dev (`orgVerifyAutoApprove`), admin decision endpoint for prod.
  O3 gates: publish / member invites / payouts require `approved`.
- Payout account: `PUT /orgs/{id}/payout-account {iban,holder}` —
  `iban_invalid` (`/^AE\d{21}$/`), `name_mismatch` vs `legal_name`.
- EventHost: `POST /events/{id}/hosts {org_id,split_bps}`,
  `POST /events/{id}/hosts/{orgId}/accept`; sum=10000 incl. implicit owner;
  `splits_must_total_100`, `org_unverified`; `locked` once event has_sales
  (`// TODO(decision-5)` lock at first sale).
- `PATCH /events/{id}` extended: title/description/startsAt/endsAt/location/
  address/imageUrl/doorsAt/onSaleAt/minAge/resaleEnabled/resaleCapPct/
  royaltyPct — `has_sales` blocks date/venue changes (E3). Tier CRUD
  `POST/PATCH/DELETE /events/{id}/tiers` — `tier_has_sales`,
  `capacity_exceeds_venue` (E2 when layout exists).
- `POST /events/{id}/cancel` — full refund to current holders
  (`// TODO(decision-2)` default: what-they-paid incl. fees), void tickets +
  revoke credentials, pending seller payout entries voided, status
  CANCELLED. `POST /events/{id}/postpone {new_starts_at}` — status POSTPONED
  (buy flows treat as on sale), `postponedAt` + `refundWindowEndsAt`=+14d.
- `GET /events/{id}/orders?q=&status=` — add params.
- `GET /events/{id}/analytics` — counts/sums from tiers+orders+scans.
- `GET/POST /orgs/{id}/promos` — org-scoped wrapper over existing promo CRUD
  (`creatorId` gains `orgId`; legacy `/promos` untouched).

## Package H — money layer
- `LedgerEntry` append-only: `account`, `amountCents` (+/−), `orderId`,
  `refundId`, `payoutId`, `kind`, `note`, `releaseAt?`.
- Writes on `payment.succeeded` (inside/near fulfillOrder):
  - primary: `sale` +(subtotal−discount) to `org:{ownerOrgId}` else
    `user:{creatorId}` (legacy events), `fee` +fee to `platform:fees`,
    `tax` +taxMinor to `tax`; co-host splits → per-org `split` share (Y3);
    `reserve_hold` −10% on org + +10% `platform:reserve` (decision-3).
  - resale: `sale` +95% price to `user:{seller}` with `releaseAt`=event end
    (R3+R6), `royalty` +5% to org (decision-7: royalty comes out of the
    seller fee — platform keeps only the buyer fee), `fee` buyer fee →
    `platform:fees`.
- `Payment`/`Refund` records under `ORDER#<id>`.
- `POST /orders/{id}/refunds {amount?,reason}` (admin/cohost or event
  creator): Stripe refund (wrapped — local Stripe may lack the PI; failure
  → `payment_declined`? no: refund-create failures surface as `refund_failed`
  502), tickets → REFUNDED + credentials revoked, order →
  refunded/partially_refunded, `refund` ledger entries (decision-6:
  deduct per split %). `already_refunded`, `insufficient_balance`.
- `charge.dispute.created` webhook → `chargeback` entry −total on org
  account (negative balances allowed, decision-3).
- `GET /me/earnings` → spec shape `{ready,pending,lifetime,sales[]}` from
  ledger (falls back to listing-derived for legacy rows without ledger);
  legacy `/account/earnings` kept, now applies the 5% seller fee (R3).
- `GET /me/transactions?cursor=` → ledger view for the user account.
- `GET/POST /orgs/{id}/payouts` — balance=sum(entries) minus reserve-locked;
  POST → `Payout` record + `payout` ledger entry; errors `no_bank`,
  `unverified`, `negative_balance`. Bank transfer is a stub
  (`// TODO(api-gap)` no local bank rail; status `scheduled`).
- `POST /me/payouts` + Idempotency-Key → fan resale payout; errors
  `no_bank`, `nothing_ready`; implemented over existing Connect transfer
  (`// TODO(api-gap)` spec says saved bank account).

## Package I — door mode
- `Device` (upsert on scan with `last_sync_at`), `ScanEvent` audit rows.
- `GET /me/door-events` → org events where membership role ∈ A/C/G (gate
  scoped) + legacy creator events; `{event,org,role,live,sold,checked_in}`.
- `GET /events/{id}/door-manifest` → current credential hashes
  `{credentials:[{ticket_id,version,hash,tier,holder,qty_group}],issued_at}`.
- `POST /events/{id}/scans {payload,device_id,scanned_at}` → results
  `admitted|already_used{at,device}|wrong_event|void|superseded|unknown`;
  ScanEvent recorded; D4 conflict: earlier `scanned_at` wins, loser flagged
  `conflict_with`.
- `POST /events/{id}/scans/batch [..]` → `{accepted[],conflicts[]}`;
  revoked-member scans rejected+flagged (T4, `// TODO(decision-18)`
  offline-tolerance window not enforced server-side beyond flagging).
- `POST /tickets/{id}/check-in` manual + `DELETE` undo (D3).
- `GET /events/{id}/guests?q=&filter=` — add search + arrived/not_arrived.
- Broadcast: `sms_cost_minor` = sms-recipients × 12 fils (M2, aed),
  ledger `fee` charge to org when org context; `limit_reached`/`empty_audience`
  spec errors on the new-shape response (legacy fields kept).

## Package J — PriceWatch on Offer
- Offer gains `tierId`, `paymentMethodId`, status `PAUSED`, `failedChargeAt`,
  `promptCancel` (W5 derived: user holds tickets for event).
- `POST /price-watches {event_id,tier_id,qty,max_each,payment_method_id}` —
  W3 cap `above_cap`; W4 card verify via Stripe retrieve (skipped when
  Stripe unconfigured → `// TODO(api-gap)`); W1 existing listing ≤max same
  tier → `{match:{listing_id}}` instead of a watch. `card_invalid`,
  `above_cap`, `duplicate_watch`.
- `DELETE /price-watches/{id}` — alias of offer cancel.
- W2 auto-charge: `matchOffersForListing` → if `priceWatchAutoCharge` and
  watch has `paymentMethodId`: attempt off-session PI; on success create
  paid resale order inline (reusing `fulfillResaleOrder`); failure → one
  retry marker then `PAUSED` + notification row (`// TODO(decision-9)`).
  Flag default off locally → auto-buy path runs with a clearly-marked stub
  charge step (creates the order without a real charge, tagged).

## Deferred / out of scope (reported to lead)
- Real bank payouts (Y2 rails), Stripe Connect retained for fan withdrawals.
- Phone OTP login (decision-17) — phone transfers attach on claim only.
- Venue/Artist as first-class entities — search derives them.
- Notification entity — derived feed persists (POST /me/promos claim code
  will be added; read-all stays a stub unless time allows).
- Time-rotating QR (decision-1 option c).
- Seat `resale` state on seat map + `qty_group` partial admission (D6) —
  manifest exposes `qty_group`; partial check-in not implemented.
- EventBridge sweeper doesn't run locally; hold/transfer expiry also lazy
  on read so curl demos work without cron.
