# Data model

Conventions: `id` is a UUID, `*_at` is a UTC timestamp, money is `*_minor` (integer fils) plus `currency` (ISO 4217). Soft-delete via `deleted_at` where noted.

## Relationships at a glance

```
User 1─* Membership *─1 Organisation
Organisation 1─* Event *─1 Venue
Event 1─* Tier            Event 1─* EventHost (co-host splits) *─1 Organisation
Event 1─* PromoCode       Venue 1─* Section 1─* Seat
User 1─* Order 1─* OrderLine *─1 Tier | Listing
OrderLine 1─* Ticket       Ticket *─1 User (holder)
Ticket 1─* TicketCredential (QR, rotates)   Ticket 1─* Transfer
Ticket 1─0..1 Listing (active)              User 1─* PriceWatch (Set your price)
Order 1─* Payment 1─* Refund                 Payment 1─* LedgerEntry
Organisation 1─* Payout   User 1─* Payout (resale sellers)
Event 1─* ScanEvent *─1 Device               Event 1─* Broadcast
```

## Identity

**User**
| field | type | notes |
|---|---|---|
| id, email (unique, lowercased), phone (E.164, unique, nullable) | | phone OTP later |
| name, city, interests[] | | interests ≥ 3 at onboarding |
| password_hash, email_verified_at | | |
| locale (`en`/`ar`), numerals (`latn`/`arab`) | | |
| dob (nullable) | | needed if age-gating is adopted (decision 15) |
| last_mode (`personal` / org_id) | | drives landing after sign-in (rule A4) |
| deleted_at | | blocked by rule A6 |

**Organisation**
| field | notes |
|---|---|
| id, name, type (`Promoter`/`Venue`/`Artist`/`Club`/…), city, country | name unique per member, not global |
| verification_status `none → submitted → approved / rejected` | rule O3 |
| legal_name, trade_licence_no, verified_at, rejection_reason | |
| payout_account_id (nullable) | IBAN; must match legal_name |
| reserve_pct | decision 3 |
| balance_minor (derived from ledger) | can go negative (decision 3) |

**Membership** (User ↔ Organisation)
| field | notes |
|---|---|
| user_id (nullable until accepted), org_id, invite_email | |
| role `admin` / `cohost` / `gate` | per org |
| event_scope (null = all events, or event_id[]) | gate staff per event |
| status `invited → active → revoked / left`, invited_by, expires_at | rule T2 |

## Events & inventory

**Venue**: id, name, address, lat/lng, timezone (IANA), kind `ga`/`seated`, capacity (GA only)
**Section**: id, venue_id, name, capacity, map_shape · **Seat**: id, section_id, row, number, status_override (blocked/accessible)

**Event**
| field | notes |
|---|---|
| id, owner_org_id, venue_id, title, category, cover_url, about | |
| starts_at, doors_at, ends_at (UTC) + venue tz | |
| status `draft → scheduled (on-sale later) → on_sale → sold_out → live → ended → settled` / `cancelled` / `postponed` | rule E1 |
| on_sale_at, resale_enabled, resale_cap_pct (default 10), royalty_pct (default 5) | |
| min_age (nullable) | decision 15 |

**EventHost** (co-host splits)
| field | notes |
|---|---|
| event_id, org_id, role `owner`/`cohost`, split_bps (sum = 10000) | |
| status `proposed → accepted → locked`, locked_at | rule S1, decision 5 |

**Tier**: id, event_id, name, price_minor, capacity, sold_count, held_count, section_id (seated), sale_start/end, sort
**PromoCode**: id, org_id or `platform`, code (unique per scope), pct_off or amount_off, event_id (nullable = all org events), applies_to_resale, max_uses, uses, per_user_limit (default 1), first_order_only, expires_at

## Commerce

**Hold** (checkout reservation): id, user_id, event_id, lines (tier/seat/listing + qty), expires_at, status `active/converted/expired` (decision 16)

**Order**
| field | notes |
|---|---|
| id, code (`SA-#####`), buyer_id, event_id, kind `primary`/`resale`/`auto_buy` | |
| subtotal_minor, fee_minor, discount_minor, tax_minor, total_minor, currency | rule P1 |
| promo_code_id, status `pending → paid / failed → partially_refunded / refunded` | |
| idempotency_key (unique per buyer) | rule P4 |

**OrderLine**: order_id, tier_id or listing_id, seat_ids[], qty, unit_price_minor, face_minor

**Ticket** (one row per admission; a "4× East Stand" card is 4 tickets grouped by order)
| field | notes |
|---|---|
| id, order_line_id, event_id, tier_id, seat_id, holder_id, face_minor, paid_minor | |
| status `valid → listed / transfer_pending → used` · `void` (refunded/cancelled/resold-away) | |
| checked_in_at, checked_in_device_id | |

**TicketCredential**: ticket_id, secret, version, issued_at, revoked_at. Only the latest unrevoked version scans (rule R1).

**Transfer**: id, ticket_ids[], from_user, to_contact (email/phone), to_user (on claim), status `pending → claimed / returned / cancelled`, expires_at (decision 14)

**Listing**
| field | notes |
|---|---|
| id, seller_id, event_id, tier_id, ticket_ids[], price_each_minor, split_rule (`any`/`all`/`pairs`) | |
| status `active → sold / withdrawn / void` | |

**PriceWatch** (Set your price): id, user_id, event_id, tier_id, qty, max_each_minor, payment_method_id, status `active → filled / paused / cancelled / failed`

## Money

**Payment**: id, order_id, provider (`stripe`), provider_ref, method (`apple_pay`/`card`), amount_minor, status `requires_action / succeeded / failed`, failure_code
**Refund**: id, payment_id, amount_minor, reason, initiated_by, status
**LedgerEntry** (append-only double entry; balances are derived, never stored as the truth): id, account (`org:{id}`, `user:{id}`, `platform:fees`, `platform:reserve`, `tax`), amount_minor (+/−), order_id, refund_id, payout_id, kind (`sale`/`fee`/`royalty`/`split`/`refund`/`chargeback`/`payout`/`reserve_hold`/`reserve_release`)
**Payout**: id, account (org or user), amount_minor, bank_ref, status `scheduled → in_transit → paid / failed`, scheduled_for
**PaymentMethod**: id, user_id, provider_ref, brand, last4, exp, is_default

## Door

**Device**: id, org_id, membership_id, last_sync_at
**ScanEvent**: id, ticket_id, credential_version, device_id, scanned_at (device clock), received_at, result `admitted / already_used / wrong_event / void / unknown`, offline (bool), conflict_with (scan id)
**Broadcast**: id, event_id, sender_id, audience (`all`/`checked_in`/`not_arrived`/tier_id), channels[], recipient_count, sms_cost_minor, sent_at (max 3 per event)

## Activity
**Notification**: id, user_id, type, title, body, link, read_at
**Reminder**: user_id, event_id (on-sale alert)
