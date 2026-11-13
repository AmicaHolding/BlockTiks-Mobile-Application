# BlockTiks — Full Screen Inventory & UX Map

> **Audience:** Product designer
> **App:** BlockTiks mobile app (Flutter / GetX) — dark, premium event-ticketing marketplace
> **Stack context:** Fan app + Creator app in one binary; role chosen at signup (`Constants.isUserCreator` → different dashboard)
> **Design language:** Migrating to **Sahra** — Night `#16263B`/`#0F1C2D` canvas, Sand `#F7F1E6` light surfaces, Dune `#ECE4D6`, Gold `#F2D9A0` accent + CTAs, Rumman `#B8323A` for alerts, Ink `#241C14` text on light. Bricolage Grotesque display, IBM Plex Sans Arabic body, Aref Ruqaa for Arabic display. 12px card radius, pill buttons, RTL-first. The old Luma violet system has been replaced in the shared token layer (`color_constant.dart`, `app_style.dart`).

**Sahra reskin progress (latest pass)**
- ✅ Design tokens + fonts swapped app-wide (Night/Sand/Gold, Bricolage/IBM Plex Arabic)
- ✅ Shared widgets: pill buttons, night tab bars, Sahra logo assets under `assets/images/brand/`
- ✅ Fan tabs: For You · Search · Tickets · Profile (Wallet route now = Tickets)
- ✅ Event details: hero image, gold eyebrow, expanded date/location rows, clickable venue row, Sahra tier cards, "From $X / Get tickets" bottom bar
- ✅ Purchased ticket: gold `SahraTicketCard` pass w/ notches + QR panel (`sahra_ticket_card.dart`)
- ✅ Creator door mode: bottom bar = Events · Scan (centre gold action) · Guests · Account; Analytics tab removed from mobile (web-only)
- 🟡 Event details seated-venue variant (map preview → "Choose seats"), venue/directions screen, ticket selection w/ official+resale, light-mode checkout, resale flows 21–25, scanner valid/used result states — **need backend endpoints** (check-in, listings, venue layouts, guest list)

**Status legend**
- ✅ **Live** — wired to the new MVP backend (`localhost:4000`, Fastify + DynamoDB + Stripe test mode)
- 🟡 **Partial** — some real data, some mock/hardcoded content remains
- ❌ **UI-only** — visual shell exists, no backend endpoint yet
- 🔀 **Orphaned/Duplicate** — route exists but flow bypasses it or overlaps another screen

---

## 1. User journeys (workflow view)

### Journey A — Fan: discover → buy → attend
```
Splash → Get Started → Sign Up/In → User Dashboard
  └─ For You (feed) → Search → Event Detail → Upcoming Event → Payment Page
       → Stripe PaymentSheet → Purchased Ticket → Wallet (QR tickets)
  └─ Remind Me (pre-event reminder opt-in)
```

### Journey B — Fan: resell / trade tickets
```
Wallet / Purchased Ticket → Resell Tab (Bids · Asks · History)
  ├─ Place Bid → Place Bid Detail → Payment Page (bid checkout)
  ├─ Ask Bid (create listing) → Payment Page
  └─ Send Tickets / Transfer (peer-to-peer ticket gifting)
```

### Journey C — Creator: publish → manage → scan door
```
Sign Up (creator toggle) → Creator Dashboard
  └─ Creator Home (my events) → Create Event → Add Drop (tiers) → Set Date
       → Event Settings (Publish) → Creator Event (analytics) → All Guests
       → My Scanner (QR check-in) → Broadcast Message / Teams / Co-hosts
       → Venue Layout / Promo Codes
```

### Journey D — Account & settings (shared)
```
Profile Tab → Profile Settings → Edit Profile / Change Password / Payment Options
Settings → Notifications / FAQs / Referrals / Transactions / Withdraw
```

---

## 2. Entry & Authentication (8 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 1 | Splash | `/splash` | All | Brand moment; restores session | ✅ | SharedPreferences (token, role) | Logo scale animation ~3s |
| 2 | Get Started | `/get-started` | All | Value prop + entry to auth | ✅ | Static | First-run only |
| 3 | Sign In | `/sign-in` | Fan/Creator | Returning user logs in | ✅ | `POST /auth/login` | Email + password, social buttons (Apple/Google are stubs → dashboard bypass ⚠️) |
| 4 | Sign Up | `/sign-up` | Fan/Creator | New account; creator toggle | ✅ | `POST /auth/signup` | firstName/email/password/confirm + "I'm a creator" switch; no lastName field (backend defaults '') |
| 5 | Personalize | `/personalize` | Fan | Post-signup preference pick | 🔀 | — | **Orphaned** — new auth flow goes straight to dashboard; candidate for deletion or repurpose as onboarding |
| 6 | OTP Verification | `/otp-verification-screen` | All | Verify email/phone OTP | 🔀 | — | **Bypassed** — backend has no OTP; still used by forget-password chain |
| 7 | Forget Password | `/forget-password` | All | Start password reset | ❌ | — | Dead end: no backend endpoint |
| 8 | Reset Password | `/reset-password-screen` | All | Set new password after OTP | ❌ | — | Reached only via OTP screen; no backend |
| 9 | Loader | `/loader` | All | Full-screen loading | ✅ | — | Generic |

## 3. Fan — Discovery & Commerce (10 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 10 | User Dashboard | `/user-dashboard` | Fan | Tab shell: For You · Wallet · Resale · Profile | ✅ | — | `PageController` + bottom nav; `arguments['index']` deep-links a tab |
| 11 | For You (feed) | `/for-you` | Fan | Discover events | ✅ | `GET /events` | Hero carousel (one slide/event, autoplay), category-grouped horizontal card rails, search field → `/search`, notification bell w/ unread badge |
| 12 | Search | `/search` | Fan | Find events | 🟡 | `GET /events?q=` | Debounced; "Recent Search" = real events; **Users tab still mock** |
| 13 | Event Detail | `/event-detail` | Fan | View event, pick ticket tiers | ✅ | `GET /events/:id` | Poster hero, date/location/description, dynamic tier steppers (cap 10), subtotal bar → payment. **No image upload yet → placeholders** |
| 14 | Upcoming Event | `/upcoming-event` | Fan | Pre-event preview + live countdown | ✅ | `GET /events/:id` | Countdown timer from `startsAt`; "Event Details" CTA |
| 15 | Remind Me | `/remind-me` | Fan | Opt into event reminder | ❌ | — | "We will remind you once the event is live" — no backend |
| 16 | Payment Page | `/payment-page` | Fan | Checkout | ✅ | `POST /orders/intent` + Stripe PaymentSheet | Order summary, promo field, payment-method selector (manual card only for simulated path), **test-mode banner** |
| 17 | Purchased Ticket | `/purchased-ticket` | Fan | Confirmation + QR ticket(s) | ✅ | `GET /orders/:id` | Real ticket codes/status; "preview"/"simulated" banners for non-paid flows |
| 18 | Wallet | `/wallet` | Fan | All my tickets | ✅ | `GET /tickets` | "My Tickets" (VALID) + "Other Tickets" sections; balance card is decorative |
| 19 | Send Tickets | `/send-tickets` | Fan | Gift/transfer tickets to someone | ❌ | — | Recipient + ticket picker UI; no backend |
| 20 | Transfer | `/transfer` | Fan | Alternate transfer flow | 🔀 | — | **Duplicate** of Send Tickets — consolidate |

## 4. Fan — Resale Market (5 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 21 | Resell Tab | `/resell-tab` | Fan | Marketplace hub: Bids · Asks · History | ❌ | — | Three tabs; all mock listings |
| 22 | Place Bid | `/place-bid` | Fan | Bid on a resale listing | ❌ | — | Event context partially threaded |
| 23 | Place Bid Detail | `/place-bid-detail` | Fan | Bid type + quantity + subtotal | ❌ | — | "Select type / Select quantity / Subtotal" |
| 24 | Ask Bid | `/ask-bid` | Fan | Create a resale listing (sell) | ❌ | — | "Pricing Options" + transaction history links |
| 25 | Withdraw | `/withdraw` | Fan | Cash out resale earnings | ❌ | — | "Max" amount field; no balance source |

## 5. Profile, Settings & Account (15 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 26 | Profile Tab | `/profile-tab` | Fan/Creator | My profile header + menu | ✅ | prefs + `GET /auth/me` | Avatar, name, role badge, follower counts **hardcoded** (no fields) |
| 27 | Profile Settings | `/profile-settings` | All | Account actions menu | ✅ | — | Sign out works (clears session) |
| 28 | Edit Profile | `/edit-profile` | All | Edit name/photo/etc | 🟡 | `PATCH /auth/me` | Inputs bound; **avatar upload has no endpoint** |
| 29 | Other User Profile | `/other-user-profile` | Fan | View another user | ❌ | — | Shows hardcoded event cards ("Cyberpunk" etc.) |
| 30 | Follow/Following | `/follow-following` | Fan | Social graph lists | ❌ | — | "No users found" empty state only |
| 31 | Settings | `/settings-tab` | All | App preferences | ✅ | — | Search filters menu; language/currency pickers are display-only |
| 32 | Change Password | `/change-password` | All | Update credentials | ✅ | `POST /auth/change-password` | current/new/confirm validated |
| 33 | FAQs | `/faqs` | All | Help center | 🟡 | Local list | Search/filter works; content static |
| 34 | Notifications | `/notifications-page` | All | Notification inbox | ❌ | — | "Today / Mark all as read" chrome; `GET notification/` endpoint doesn't exist on new backend |
| 35 | Transactions | `/transactions` | Fan | Order history | ✅ | `GET /orders` | Real orders w/ status + totals; all three tabs show orders |
| 36 | Promo Codes | `/promo-codes` | Fan | View/apply my codes | ❌ | — | "Valid / Used-Expired" sections, mock codes ("Tix 50%") |
| 37 | Referrals | `/referrals` | Fan | Invite friends, earn credit | 🟡 | Local | Copy/share actually work; **no tracking backend** |
| 38 | Analytic | `/analytic` | Fan | Earnings dashboard | ❌ | — | $2000 balance, weekly bar chart — all mock |
| 39 | Payment Options | `/payment-options` | Fan | Saved cards / wallet | ❌ | — | Apple Pay/Google Pay/Chase mock; manual card form validates locally only |
| 40 | Media Preview | `/media-preview` | All | Image/media viewer | ✅ | — | Generic viewer |

## 6. Creator — Dashboard & Publishing (10 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 41 | Creator Dashboard | `/creator-dashboard` | Creator | Tab shell | ✅ | — | Same shell pattern as fan |
| 42 | Creator Home | `/creator-home-tab` | Creator | My events list | ✅ | `GET /events/mine` | Upcoming (PUBLISHED) + Past sections, status badges, pull-to-refresh, "Create your first event" empty state |
| 43 | Create Event | `/create-event` | Creator | Publish a new event | ✅ | `POST /events` + `POST /events/:id/publish` | Title/desc/date/location + tier rows; "Publish now" toggle; **no cover-image upload, no category picker** |
| 44 | Add Drop | `/add-drop` | Creator | Add a ticket tier | ✅ | → `CreateEventController.tiers` | Name/price/qty → `priceCents`; feeds create-event payload |
| 45 | Event Tickets Drop | `/event-tickets-drop` | Creator | View/manage tiers post-create | 🟡 | Local `TicketModel`s | Separate flow — doesn't feed create_event |
| 46 | Set Date | `/set-date` | Creator | Date+time picker | ✅ | Returns ISO strings | Shared picker; returns `selectedIso`/`selectedEndIso` |
| 47 | Event Settings | `/event-settings` | Creator | Manage event options | 🟡 | `POST /events/:id/publish` | Publish button works; fee/resale/royalty toggles **UI-only, honestly captioned** |
| 48 | Creator Event | `/creator-event` | Creator | Per-event stats | ✅ | `GET /events/:id` | Real tickets sold / revenue / going; Capacity shows "—"; guest avatars + broadcast + teams still mock |
| 49 | Creator Search | `/creator-search` | Creator | Find events | ✅ | `GET /events?q=` | Debounced; suggestions = published events |
| 50 | Creator Promo Code | `/creator-promo-code` | Creator | Create promo code | ❌ | — | Backend has `PROMO#` entity but **no CRUD routes** |

## 7. Creator — Guests, Teams & Door Ops (8 screens)

| # | Screen | Route | Persona | Purpose / user story | Status | Data source | Designer notes |
|---|--------|-------|---------|----------------------|--------|-------------|----------------|
| 51 | All Guests | `/all-guests` | Creator | Guest list per event | ❌ | — | Order cards ("Order # 2353") mock |
| 52 | My Scanner | `/my-scanner` | Creator | QR ticket check-in at door | ❌ | — | Camera scanner UI exists; **no check-in endpoint** — ticket `status: USED` flow unimplemented |
| 53 | Broadcast Message | `/broadcast-message` | Creator | Message all attendees | ❌ | — | Compose UI only |
| 54 | Manage Teams | `/manage-teams` | Creator | Organize staff/team | ❌ | — | List UI only |
| 55 | Add Team | `/add-team` | Creator | Create a team | ❌ | — | Form only |
| 56 | Add Individual | `/add-individual` | Creator | Add staff member | ❌ | — | "AddIndividualView is working" placeholder text |
| 57 | Team Detail | `/team-detail` | Creator | Team roster | ❌ | — | Placeholder view |
| 58 | Add Co-Host | `/add-co-host` | Creator | Invite co-host w/ role | ❌ | — | Role picker UI only |
| 59 | Venue Layout | `/venue-layout` | Creator | Seat-map / section editor | ❌ | — | Canvas/editor shell only |

---

## 8. Design-system notes for the designer

**Global tokens** (`lib/app/data/utils/color_constant.dart`, `app_style.dart`)
- Canvas `#0A0A0B` · Surface `#141416` / elevated `#1C1C1F` · Accent `#7C5CFF` · Hairline `rgba(255,255,255,0.08)`
- Manrope: display/headings · Inter: body/UI · Pill buttons: white fill + `#0A0A0B` text · Radius: cards 12–16, controls 999
- Semantic: success/warning/error colors exist (`warningOrange` used for test-mode banners)

**Recurring patterns to standardize**
- Poster-first event cards: image + bottom gradient scrim + price/type/title overlay + date chip
- White pill primary CTA pinned in `bottomNavigationBar`
- Loading spinner / empty state ("Create your first event", "No events yet") / error + Retry — now consistent on all API screens
- Status chips: DRAFT/PUBLISHED on creator cards; VALID/USED/TRANSFERRED on tickets
- Honest labeling pattern: amber "test mode" banner on payment; "preview/simulated" banners on non-paid ticket views

**Known design-debt items**
- Several screens still show hardcoded people/events (profile follower counts, other-user-profile, guest avatars, team lists)
- Duplicate flows to consolidate: `/transfer` vs `/send-tickets`; `/place-bid` vs `/ask-bid` (buy vs sell conflation); two payment-method screens
- Orphaned routes: `/personalize`, `/otp-verification-screen` (except reset chain), `/loader` usage unclear
- Missing states: no skeleton loaders, pull-to-refresh inconsistent, no offline banner
- No empty-state illustrations — text-only empties
- Light-theme calendar picker was fixed to dark; audit remaining dialogs/sheets for stray light surfaces

**Backend contract for design** (what data each screen *can* show)
- Events: title, description, category, startsAt/endsAt, location, address, imageUrl, status, tiers[{name, priceCents, quantity, sold, remaining}]
- Tickets: code, eventTitle/StartsAt/Location, tierName, status, checkedInAt
- Orders: status (PENDING/PAID/FAILED/REFUNDED/CANCELLED), subtotal/discount/fees/totalCents, items, ticketCodes
- Users: id, email, firstName, lastName, phone, avatarUrl, role (fan/creator)
- **Not yet available:** images upload, followers, notifications, resale listings/bids, transfers, promo CRUD, guests, teams, check-in, venue maps, analytics aggregates, saved cards, password reset
