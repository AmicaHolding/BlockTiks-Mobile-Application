# Sahra screen inventory

This maps the 59 routes from the codebase to the Sahra designs. **Designed** = drawn in `Sahra Product Screens.dc.html` (01–25) or `Sahra Account & Studio Screens.dc.html` (26–45).

## Platform split (decision)

| Surface | Who | Scope |
|---|---|---|
| Fan app (mobile) | Fans | Everything: discover, buy, Tickets (holding, selling, waiting), profile |
| Creator app (mobile, "door mode") | Creators + gate staff | Event list, live snapshot, **scanner**, **guest list**, broadcast message. Everything else links out to web. |
| Sahra Studio (web) | Creators | Create/edit events, tiers ("drops"), venue layout, promo codes, teams/co-hosts, analytics, payouts, settings |

Rule: mobile creator screens never *build* anything. Any build or edit action opens the web hand-off sheet (19).

---

## Entry & auth
| Route | Status | Design call |
|---|---|---|
| /splash | Designed (26) | Night background, ticket logo scales in. Under 1.5s, not 3s. |
| /get-started | Designed (27) | 3-card value prop, Arabic/English toggle up top |
| /sign-in, /sign-up | Designed (28, 29) | One screen with tabs. Hosts get their own entry: Get started › "I’m hosting events" → sign up → organisation setup. Fans can add an organisation later (Settings › Host events). One account either way. |
| /personalize | Designed (30) | Pick city + 3 interests. This feeds For You. |
| /otp-verification-screen | Designed (32), reset only for now | Becomes phone OTP once the backend supports it (expected in the Gulf) |
| /forget-password, /reset-password-screen | Designed (31, 33) | Blocked on backend |
| /loader | **Cut** | Replace with skeleton loaders per screen |

## Fan: discovery & commerce
| Route | Status | Design call |
|---|---|---|
| /user-dashboard | Designed (tab bar) | For You · Search · Tickets · Profile (no Resale tab) |
| /for-you | Designed (01) | |
| /search | Designed (06b, W2) | Events + venues + artists. Hide the Users tab until social is real. |
| /event-detail | Designed (02, 11) | 11 = variant shown when the event has a venue layout |
| (tier/seat pick) | Designed (03, 12, 13) | GA → steppers (03). Seated → map → section → seats (12, 13). |
| /upcoming-event | **Merge into /event-detail** | Countdown becomes a module on details when within 7 days |
| /remind-me | **Merge** | Becomes a "Remind me" button on details for not-yet-on-sale events |
| /payment-page | Designed (04) | Stripe PaymentSheet launches from "Pay". Keep the test-mode banner (Rumman, top). |
| /purchased-ticket | Designed (05) | |
| /send-tickets + /transfer | **Consolidate → /send-tickets** | One flow: pick ticket → recipient (phone/email/contact) → confirm |

## Fan: selling & buying resale
**Model:** there's no separate resale marketplace. Resale listings appear inside each tier on the normal event page, cheapest first, tagged "Resale". Open bidding is replaced by **Set your price**, a standing auto-buy.

| Route | Status | Design call |
|---|---|---|
| (event tier picker) | Designed (03, W3) | Official + resale in one list per tier |
| /place-bid + /place-bid-detail | **Replace → Set your price** (24, W8) | Launched from a sold-out tier on the event page |
| /resell-tab | **Cut** | There's no Resale tab. Selling lives on the ticket in **Tickets**; auto-buy orders appear there under "Waiting for tickets". |
| /ask-bid | **Becomes Sell tickets** (21 → 22 → 23, W7) | Pick tickets → price & split rule → manage sale ticket by ticket |
| /wallet | **Becomes Tickets** (06a, W6) | One home for holding, selling and waiting, grouped by event |
| /withdraw | Designed (25) | |

## Profile & settings
| Route | Status | Design call |
|---|---|---|
| /profile-tab | Designed (06, in Account file) | You + money. Identity card → Edit profile. Earnings card (after first resale). Money · Rewards. Gear (top right) → Settings. No social counts. |
| /profile-settings, /settings-tab | **Consolidate → Settings** (06c) | Opened from the gear on Profile. Preferences · Support · Sign out. |
| /notifications-page (inbox) | Bell on For You header (01) | Activity, not a setting. Notification toggles live in Settings › Notifications. |
| /edit-profile, /change-password | Designed (34, 35) | Standard forms on Sand (light) |
| /other-user-profile, /follow-following | **Park** | Social is out of scope for v1 |
| /faqs, /notifications-page, /transactions, /referrals | Designed (42, 36, 37, 41) | |
| /promo-codes | Designed (40) | Valid / Used sections |
| /analytic (fan earnings) | Designed as Earnings (38) | Only shown once a user has resold a ticket |
| /payment-options | Designed (39) | Merge with the checkout method selector |
| /media-preview | Keep | Generic |

## Creator: mobile (door mode)
| Route | Status | Design call |
|---|---|---|
| /creator-dashboard | Designed (tab bar) | Events · **Scan** · Guests · Account |
| /creator-home-tab | Designed (14) | A live event pins to the top |
| /creator-event | Designed (15) | Snapshot + web links |
| /my-scanner | Designed (16, 17) | Valid / already used. Still to do: wrong event, refunded, offline-queued. |
| /all-guests | Designed (18) | Manual check-in is the scanner fallback |
| /broadcast-message | Designed (43, 43b) | Audience presets match guest list filters |
| /creator-search | Merge into the Guests search | |

## Creator: web (Studio)
| Route | Status | Design call |
|---|---|---|
| /create-event + /add-drop + /set-date | Designed (07) | One stepped flow: Details → Tickets → Promotion → Publish. Add the cover upload and category picker the code is missing. |
| /event-tickets-drop | **Merge** into step 2 of Create | |
| /event-settings | Web | Publish, fees, resale cap/royalty |
| (manage) | Designed (08) | |
| (analytics) | Designed (09) | |
| (settings) | Designed (10) | |
| /creator-promo-code | Designed (44) | |
| /venue-layout | Designed (45) | Upload a seat map or pick a template; assign tiers to sections. Powers screens 11–13. |
| /manage-teams, /add-team, /add-individual, /team-detail, /add-co-host | **Consolidate → Settings › Team** | One list + an invite modal with role (Admin, Co-host, Gate staff) |

## Prototypes & logic maps
- `Sahra Mobile Prototype.dc.html`: fan app + door mode, stateful, includes host sign-up, fan→host, profile switcher.
- `Sahra Web Prototype.dc.html`: fan web + Studio on shared data, includes Studio sign-up, verification before publish, bank before payout.
- `Sahra Mobile Logic Map.dc.html` / `Sahra Web Logic Map.dc.html`: flows, conditions, errors, backend events, roles (rendered by `LogicMap.dc.html`).

## Token migration
The code's current tokens (`#0A0A0B` canvas, `#7C5CFF` accent, Manrope/Inter, white pill CTA) are replaced by the Sahra palette in `brand/DESIGN.md`: Night canvas, Gold primary CTA, Bricolage Grotesque + IBM Plex Sans Arabic.
