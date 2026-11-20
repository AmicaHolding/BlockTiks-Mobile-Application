# Business rules

Each rule is testable. **[P]** = taken from the prototype as built. **[R]** = recommended default; confirm before launch. Numbers live in config, not code.

## Accounts (A)
- **A1 [P]** There are no passwords. Entering a phone (E.164) or email sends a 6-digit code; verifying it signs in, or creates the account if none exists. Codes expire in 10 minutes; 5 wrong attempts burns the code; max 5 sends per contact per hour. Email and phone are unique, case-insensitive.
- **A2 [P]** New accounts need only a name. If sign-in was triggered by an action (buy, RSVP, host, Plans, Profile), the user returns to that screen and the action continues; intent, city and interests are skipped and asked later.
- **A3 [P]** Otherwise onboarding asks intent (Going out / Hosting friends / Running events, any), then city and ≥ 1 interest. "Running events" leads to Create organisation (skippable). WELCOME10 is granted on completion.
- **A8 [P]** Signed-out users can browse For You, Search, event pages and invite pages. Plans, Profile, checkout, RSVP and hosting trigger sign-in.
- **A4 [P]** Sign-in landing: user has no tickets/orders AND ≥ 1 membership → that org's door mode (gate role → Scan, else Events). Otherwise → personal Home. **[R]** After the first session, use `last_mode`.
- **A5 [P]** Switching profile clears any active checkout hold and resets navigation.
- **A6 [P]** Account deletion is blocked while the user has: upcoming tickets, active listings, active price watches, a non-zero earnings balance, or is the sole admin of any org.
- **A7 [P]** Changing email or phone requires a code to the new contact and signs out other sessions.

## Hosting: invites (I)
- **I1 [P]** "+ Host" always asks who it's for: *People I invite* (invite) or *Anyone, with tickets* (organisation event). The split is audience, not size.
- **I2 [P]** Invites are free, link-only, never listed, searchable or shown in Explore. Creating one needs a title and a place; nothing else (no verification, no organisation).
- **I3 [P]** With approval on, "Going" becomes "Requested" until the host approves. Declined guests aren't told why.
- **I4 [P]** With a guest cap, Going (+ plus-ones) can't exceed it; extra replies get "It's full".
- **I5 [P]** Plus-ones: 0–2 per guest, only when allowed and only while Going.
- **I6 [P]** With hide-address on, the place is only returned to the host and Going guests.
- **I7 [P]** "Sell tickets instead" moves an invite into an organisation as a draft event. Requires admin of that org (or creating one). Existing Going guests keep free spots as comp tickets. Selling still requires verification (O3).
- **I8 [P]** Messages to guests go to Going + Maybe; push to app users, SMS to others. They also show on the invite page.
- **I9 [P]** Cancelling notifies everyone who replied (except Can't go).
- **I11 [P]** Personal RSVPs can never be sold or transferred, and plus-one spots can't be passed on. Guests can only update their own RSVP. Full v3 invite rules: `06-personal-events.md`.
- **I10 [P]** Plans lists tickets, RSVPs (Going/Maybe/Requested) and hosted invites in one list sorted by start time. Unanswered invites sit above it under "Waiting on you".

## Organisations & team (O, T)
- **O1 [P]** Any user can create an org and becomes its admin. The name must be unique among that user's orgs.
- **O2 [P]** Drafting events needs no verification.
- **O3 [P]** Verification (legal name + trade licence) is required before: publishing, inviting co-hosts or team, receiving payouts. Status: none → submitted → approved/rejected (target 24h).
- **O4 [P]** A payout account must be a UAE IBAN (`AE` + 21 digits), and the holder must match the legal name. Without one, money accrues and is held.
- **T1 [P]** Roles: **Admin** (everything, incl. money and team), **Co-host** (events, orders, promos, broadcast; no payouts or team), **Gate staff** (Scan + Guests for scoped events only).
- **T2 [R]** Invites expire after 7 days. They can go to emails with no account and attach on sign-up with that email.
- **T3 [R]** An org must always have ≥ 1 active admin. Removing or demoting the last admin, or the last admin leaving, is rejected.
- **T4 [R]** Revoking a member ends their sessions for that org immediately. Offline scans made after `revoked_at` are rejected at sync and flagged.

## Events & inventory (E)
- **E1** Statuses: draft → scheduled → on_sale → (sold_out) → live (doors open) → ended → settled. Side exits: cancelled, postponed.
- **E2 [P]** The sum of tier capacities for a section/venue can't exceed the venue's capacity (Studio blocks it).
- **E3 [R]** Once any ticket has sold: date, venue, and deleting a tier with sales are blocked in-place and must go through Postpone/Cancel. Price changes apply only to future sales.
- **E4 [P]** An event not yet on sale shows "Remind me" instead of Buy.

## Buying (B)
- **B1 [P]** Max 6 tickets per order (across tiers or seats).
- **B2 [P]** You can't add more than a tier's remaining count.
- **B3 [P]** Inventory is re-checked at payment. If it's gone: fail with "sold out while you were checking out", no charge. **[R]** With holds (decision 16), inventory is reserved at the hold and this becomes a rare fallback.
- **B4 [P]** A resale listing bought by someone else mid-checkout → fail with "Another fan just bought that listing", no charge.

## Pricing & payments (P)
- **P1 [P]** `total = subtotal + fee − discount (+ tax)`. Fee = **5% of subtotal**, charged to the buyer, rounded to the nearest fils.
- **P2 [P]** A promo discount applies to the subtotal only (never to the fee). One promo per order.
- **P3 [P]** Promo validity checks run in order: exists → not used by this user → event matches (if scoped) → resale allowed (if the cart has resale lines) → not expired → under max_uses.
- **P4 [P]** Pay is idempotent per `Idempotency-Key`; a retry returns the original order. A decline creates no order and no tickets, and the user sees "Nothing was charged".
- **P5 [P]** The promo is marked used only on `payment.succeeded`.
- **P6 [R]** The order's currency = the event's currency. Tax is worked out from the event's country.

## Tickets & transfer (X)
- **X1 [P]** Send to an email or a phone with country code; sending to yourself is rejected. Partial quantities split the group.
- **X2 [P]** On claim, tickets move to the recipient and the sender's QR stops working.
- **X3 [R]** Tickets that are listed, or have a transfer pending, can't be sent, listed again, or scanned.
- **X4 [R]** Transfers are disabled once doors open.

## Resale (R)
- **R1 [R]** Every change of holder (claim, resale, refund) revokes the old credential and issues a new version. Scanners accept only the latest version.
- **R2 [P]** Resale price cap = **face × 1.10**, rounded. Face = the original face value, not the price the seller paid.
- **R3 [P]** Seller payout = `price × qty × 0.95` (5% seller fee).
- **R4 [P]** The organiser earns a **5% royalty** on resales of their events. (How this relates to R3 is decision 7.)
- **R5 [P]** The buyer of a resale ticket pays the standard 5% buyer fee (P1).
- **R6 [P]** Seller money is **pending until the event ends**, then becomes ready to withdraw.
- **R7 [P]** Listings appear inside the matching tier on the event page, cheapest first, tagged Resale. A user never sees their own listing as buyable.
- **R8 [P]** Promo codes apply to resale only if `applies_to_resale`.
- **R9 [P]** Stop selling returns the tickets to the seller's holding (the same credential stays valid).

## Set your price (W)
- **W1 [P]** If a listing already exists at or below the max price for the same quantity, skip the watch and go straight to checkout for that listing.
- **W2 [P]** Otherwise, create a standing watch. When a matching listing appears, buy it automatically at the listing price + 5% fee, charged to the saved method.
- **W3 [P]** The watch price is capped at R2.
- **W4 [R]** The payment method is verified when the watch is created. A failed charge pauses the watch and notifies the user.
- **W5 [R]** If the user acquires tickets for that event another way, prompt them to cancel the watch (don't auto-cancel).

## Door (D)
- **D1 [P]** Scan results: valid → Admit; already used → show when and which gate.
- **D2 [P]** Offline, scans validate against the cached manifest and are queued. On reconnect they sync and show a count.
- **D3 [P]** Manual check-in from Guests is the fallback; it can be undone.
- **D4 [R]** If two offline devices admit the same credential, the earliest `scanned_at` wins; the other scan is flagged as a conflict in the org's report.
- **D5 [R]** The scanner shows "Last synced X min ago" and warns after 5 minutes offline.
- **D6 [R]** Group tickets (qty > 1 on one pass) allow partial admission: "Admit 2 of 4".

## Broadcast (M)
- **M1 [P]** Max 3 broadcasts per event. Audiences: all holders, checked in, not arrived, per tier.
- **M2 [P]** SMS costs AED 0.12 per recipient, shown before sending and charged to the org's balance.
- **M3 [P]** Sends can't be undone; a confirmation step is required.

## Payouts (Y)
- **Y1 [P]** Org payouts run automatically on a schedule; the admin can also trigger "Pay out now" for the available balance.
- **Y2 [P]** Fan withdrawals go to the saved bank account and arrive in 1–2 business days.
- **Y3 [R]** Co-host splits are applied per sale at the ledger level (each org's balance is credited its share), not at payout time.
