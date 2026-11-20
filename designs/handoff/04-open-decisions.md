# Open decisions

Agents: **do not choose for the business.** Implement the recommended default behind a config flag, tag the code `TODO(decision-N)`, and surface it in the PR description.

Each entry gives the question, the options, the recommended default, who decides, and what it blocks.

### 1 · QR rotation
How do we stop screenshot fraud after a resale?
Options: (a) a static QR per ticket, (b) a new version on every change of holder, (c) also a time-based rotating QR in-app (every 30s).
Default: **b now, c before launch at large venues.** · Owner: Eng + Product · Blocks: resale, transfer, door manifest

### 2 · Cancellation and postponement
Who gets refunded what, and who absorbs fees?
Options: refund the buyer the face value only, or face + fees. Resale buyers get what they paid, or face only. Postponed: tickets roll over automatically, with a refund window of N days.
Default: **cancel = full refund incl. fees to every current holder at what they paid; pending seller payouts are voided; the platform absorbs the gap. Postpone = auto-rollover with a 14-day refund window.** · Owner: Finance + Legal · Blocks: cancel/postpone screens, ledger

### 3 · Chargebacks and reserves
Options: hold X% of org revenue until event end + N days; allow negative balances; or block payouts until the event has ended.
Default: **10% reserve released 14 days after the event; negative balance is netted against future payouts.** · Owner: Finance · Blocks: Payouts screen, ledger

### 4 · Payout timing for orgs
Options: pay out before the event (rolling) or only after it.
Default: **verified orgs get rolling weekly payouts minus the reserve; new orgs (< 3 events) get paid after the event.** · Owner: Finance · Blocks: Y1

### 5 · Co-host split changes
Options: splits lock at publish; or editable with both parties' approval; or editable by the owner.
Default: **lock at the first sale; after that, changes need both admins and apply only to future sales.** · Owner: Product · Blocks: Team/co-host screens

### 6 · Who refunds in a co-hosted event?
When a refund comes out of a co-hosted event: deduct from each org by split %, or from the owner only.
Default: **by split %.** · Owner: Finance

### 7 · Seller fee vs organiser royalty
On a resale, the seller fee is 5% and the royalty is 5%. Is the royalty paid out of the seller fee (platform keeps 0%) or on top of it (seller loses 10%)?
Default: **the royalty is taken from the 5% seller fee (seller nets 95%; split organiser 5% / platform 0%), and Sahra earns from the 5% buyer fee.** · Owner: Finance + Product

### 8 · Resale cap basis
Options: face × 1.10, or face + fees × 1.10, or set per event by the organiser.
Default: **face × 1.10; the organiser can lower it but not raise it.** · Owner: Product + Legal

### 9 · Payment failure on Set your price
Options: retry, pause the watch, or cancel it.
Default: **one retry after 10 minutes, then pause and notify.** · Owner: Product

### 10 · Verification rejected after sales
Options: keep selling with payouts held, pause sales after N days, or cancel the event.
Default: **payouts are held; sales pause automatically after 7 days if still unresolved.** · Owner: Ops + Legal

### 11 · Last admin leaves
Options: block until they hand over admin, or let Sahra support reassign.
Default: **block (rule T3); support can override.** · Owner: Product

### 12 · Invites to non-users
Options: expiry length, reminder cadence, and whether an invite can be accepted with a different email.
Default: **7-day expiry, one reminder at day 5, the email must match.** · Owner: Product

### 13 · Currency and tax by country
Options: price in the venue country's currency, or always AED. VAT shown inclusive or added at checkout (UAE 5%, KSA 15%).
Default: **venue currency; all-in price shown upfront (inclusive of fee and VAT) to meet Gulf consumer rules.** · Owner: Finance + Legal · Note: this changes the P1 display order.

### 14 · Unclaimed transfers
Options: never expire, or return to the sender after N hours; also whether to cut off transfers close to the event.
Default: **return after 48h, or at doors-open if sooner.** · Owner: Product

### 15 · Age-restricted events
Options: self-declared DOB at checkout, ID check at the door only, or ID verification on the account.
Default: **DOB on the account + confirmation at checkout + an "ID required" badge on the pass and at scan.** · Owner: Legal (per country)

### 16 · Checkout holds
Options: no hold (check at pay), or hold inventory for N minutes.
Default: **10-minute hold with a visible countdown; seats are shown as "held" to others.** · Owner: Product + Eng

### 17 · Phone vs email identity · **DECIDED in v2**
Phone or email + one-time code is the only login (plus Sign in with Apple). No passwords. Remaining sub-question: SMS vs WhatsApp delivery for codes in each country. · Owner: Eng

### 19 · Paid personal invites
Can a person (no organisation) charge for an invite, e.g. a supper club?
Options: never; allow with a low cap (e.g. ≤ 30 guests, ≤ AED 200); or only via "Sell tickets instead".
Default: **never. Charging always goes through an organisation (rule I7).** Public ticketed events need permits in the UAE and KSA. · Owner: Legal (per country)

### 20 · Invite abuse and spam
Invites need no verification, so they can be used for spam or disguised paid events.
Options: rate limits on invites and messages, report button, SMS caps, auto-review for invites with many guests.
Default: **max 5 new invites per day, 3 messages per invite per day, SMS only to people who replied, report button on every invite page, review queue above 150 guests.** · Owner: Trust & Safety

### 21 · Very large private events
A 300-person wedding is still invite-only. Do invites need door tools (scanner, gate staff) at that size?
Options: invites stay simple (manual check-in only); or unlock QR passes and gate staff above N guests.
Default: **manual check-in only for now; revisit after usage data.** · Owner: Product

### 18 · Offline scanning tolerance
Options: allow unlimited offline scanning, or require a sync every N minutes.
Default: **warn at 5 minutes; block new scans after 30 minutes offline unless the admin overrides.** · Owner: Ops
