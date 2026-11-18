# API contracts

REST + JSON. Auth is a bearer token for a **user**. Org context is passed per request as the `X-Org-Id` header and checked against Membership. Money fields are `{ amount_minor, currency }`. Errors are `{ code, message, field? }` with the codes listed per endpoint. Every POST that moves money or inventory requires an `Idempotency-Key`.

Roles: **F** any signed-in user · **A** org admin · **C** co-host · **G** gate staff (scoped to their events)

## Auth & account
| Screen | Call | Returns | Errors |
|---|---|---|---|
| Create account | `POST /auth/signup {name,email,password,intent:"fan"|"host"}` | `{token,user,next:"personalize"|"create_org"}` | `email_taken`, `weak_password` |
| Sign in | `POST /auth/signin {email,password}` | `{token,user,memberships[],landing:{mode:"personal"}|{mode:"org",org_id,role}}` | `bad_credentials`, `locked` |
| Forgot / OTP / new pw | `POST /auth/reset/start`, `/auth/reset/verify {code}`, `/auth/reset/complete {password}` | 204 / `{reset_token}` | `code_invalid`, `code_expired` |
| Personalize | `PATCH /me {city,interests[]}` | `user` | `interests_min_3` |
| Profile switcher | `GET /me/memberships` | `[{org,role,event_scope,verification_status}]` | |
| Switch profile | `PUT /me/mode {mode,org_id?}` | `{landing}`; server clears the checkout hold | `not_member` |
| Edit profile / pw | `PATCH /me`, `POST /me/password {current,new}` | `user` / 204 (revokes other sessions) | `wrong_password` |
| Delete account | `DELETE /me` | 204 | `has_tickets`, `has_listings`, `has_price_watches`, `has_balance`, `sole_admin` (rule A6) |

## Discovery
| Screen | Call | Returns |
|---|---|---|
| For You | `GET /feed?city=` | `{sections:[{title,events[EventCard]}]}` |
| Search | `GET /search?q=&type=events|venues|artists` | results |
| Event detail | `GET /events/{id}` | `Event + venue + tiers[{id,name,price,left,status,resale:{from_price,count}}] + my:{tickets,reminder,watch}` |
| Tier picker (GA) | `GET /events/{id}/tiers/{tier}/listings` | `[{listing_id,price_each,qty,split_rule}]` cheapest first |
| Seat map | `GET /events/{id}/sections/{sec}/seats` | `[{seat_id,row,n,state:"free"|"held"|"sold"|"resale",price}]` |
| Remind me | `PUT/DELETE /events/{id}/reminder` | 204 |

## Checkout
| Step | Call | Returns | Errors |
|---|---|---|---|
| Continue from tiers/seats | `POST /holds {event_id,lines[{tier_id|listing_id,qty,seat_ids?}]}` | `{hold_id,expires_at,quote}` | `max_per_order`, `insufficient_inventory`, `seat_taken`, `listing_gone`, `not_on_sale`, `age_restricted` |
| Quote | `GET /holds/{id}/quote?promo=` | `{subtotal,fee,discount,tax,total,promo:{ok,message}}` | `promo_invalid`, `promo_used`, `promo_wrong_event`, `promo_not_resale` |
| Pay | `POST /orders {hold_id,payment_method_id,promo?}` + Idempotency-Key | `{order,client_secret?}` (3DS) → webhook → `order.paid` | `payment_declined` (nothing charged), `hold_expired`, `duplicate` (returns the original order) |
| Confirmation | `GET /orders/{id}` | `order + tickets[]` | |

## Tickets (fan)
| Screen | Call | Returns | Errors |
|---|---|---|---|
| Tickets tab | `GET /me/tickets` | `{upcoming:[grouped by event], past[], waiting:[PriceWatch], selling:[Listing]}` | |
| Pass / QR | `GET /tickets/{id}/credential` | `{qr_payload,version,rotates_at}`; cache for offline use | `not_holder`, `void` |
| Send | `POST /transfers {ticket_ids[],to}` | `transfer` | `self_transfer`, `listed`, `event_started` |
| Claim | `POST /transfers/{id}/claim` | tickets (new credentials issued) | `expired`, `already_claimed` |
| Sell | `POST /listings {ticket_ids[],price_each,split_rule}` | `listing` | `above_cap {cap}`, `resale_disabled`, `transfer_pending` |
| Stop selling | `DELETE /listings/{id}` | 204 | `already_sold` |
| Set your price | `POST /price-watches {event_id,tier_id,qty,max_each,payment_method_id}` | `{watch}` or `{match:{listing_id}}` (go to checkout) | `above_cap`, `card_invalid` |
| Cancel watch | `DELETE /price-watches/{id}` | 204 | |

## Money (fan)
| Screen | Call | Returns |
|---|---|---|
| Earnings | `GET /me/earnings` | `{ready,pending,lifetime,sales[{event,qty,amount,status}]}` |
| Withdraw | `POST /me/payouts` + Idempotency-Key | `payout` · errors `no_bank`, `nothing_ready` |
| Transactions | `GET /me/transactions?cursor=` | ledger view |
| Payment methods | `GET/POST/DELETE /me/payment-methods` | via Stripe SetupIntent |
| Promo codes | `GET /me/promos`, `POST /me/promos {code}` | `{valid[],used[]}` · `code_invalid`, `already_have` |
| Notifications | `GET /me/notifications`, `POST /me/notifications/read-all`, `PATCH /me/notification-settings` | |

## Studio (web) · header `X-Org-Id`
| Screen | Call | Role | Errors |
|---|---|---|---|
| Create org | `POST /orgs {name,type,city}` | F | `name_exists_for_you` |
| Verification | `POST /orgs/{id}/verification {legal_name,licence_no,docs[]}` | A | `licence_invalid` |
| Bank | `PUT /orgs/{id}/payout-account {iban,holder}` | A | `iban_invalid`, `name_mismatch` |
| Events list | `GET /orgs/{id}/events` | A C G | G sees scoped events only |
| Create/edit event | `POST /events`, `PATCH /events/{id}` | A C | `has_sales` when changing date, venue, or removing a sold tier (rule E3) |
| Tiers | `POST/PATCH/DELETE /events/{id}/tiers` | A C | `capacity_exceeds_venue`, `tier_has_sales` |
| Publish | `POST /events/{id}/publish` | A | `org_unverified`, `no_tiers`, `splits_not_accepted` |
| Cancel / postpone | `POST /events/{id}/cancel`, `/postpone {new_starts_at}` | A | (decision 2) |
| Orders | `GET /events/{id}/orders?q=&status=` | A C | |
| Refund | `POST /orders/{id}/refunds {amount?,reason}` | A | `already_refunded`, `insufficient_balance` |
| Co-hosts | `POST /events/{id}/hosts {org_id,split_bps}`, `POST .../accept` | A | `org_unverified`, `splits_must_total_100`, `locked` |
| Team | `GET/POST /orgs/{id}/members {email,role,event_scope}`, `PATCH`, `DELETE` | A | `org_unverified`, `last_admin`, `already_member` |
| Promo codes | `GET/POST/PATCH /orgs/{id}/promos` | A C | `code_exists` |
| Venue layout | `GET/PUT /venues/{id}/layout` | A | |
| Analytics | `GET /events/{id}/analytics` | A C | |
| Payouts | `GET /orgs/{id}/payouts`, `POST /orgs/{id}/payouts` | A | `no_bank`, `unverified`, `negative_balance` |

## Door mode (mobile)
| Screen | Call | Role | Returns / errors |
|---|---|---|---|
| Events | `GET /me/door-events` | A C G | `[{event,org,role,live,sold,checked_in}]` |
| Pre-cache | `GET /events/{id}/door-manifest` | A C G | `{credentials:[{ticket_id,version,hash,tier,holder,qty_group}],issued_at}`; refresh every 60s while online |
| Scan | `POST /events/{id}/scans {payload,device_id,scanned_at}` | A C G | `{result,ticket,holder,group_size}` · results: `admitted`, `already_used {at,device}`, `wrong_event`, `void`, `superseded` (old QR) |
| Offline sync | `POST /events/{id}/scans/batch [..]` | A C G | `{accepted[],conflicts[]}` |
| Guests | `GET /events/{id}/guests?q=&filter=` | A C G | |
| Manual check-in / undo | `POST /tickets/{id}/check-in`, `DELETE ...` | A C G | |
| Broadcast | `POST /events/{id}/broadcasts {audience,channels,body}` | A C | `{recipients,sms_cost}` · `limit_reached`, `empty_audience` |

## Webhooks & jobs (no screen; required)
`payment.succeeded/failed` → order state · `charge.dispute.created` → ledger chargeback · `hold.expire` (cron) · `event.ended` → release resale payouts and scheduled org payouts · `transfer.expire` · `price_watch.match` (on every new listing) · `verification.decided` · `credential.rotate` on transfer, resale, or refund.
