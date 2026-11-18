# Real-world scenarios (recorded 2026-11-17)

Stress-test findings run against both prototypes, ordered by blast radius.
**Status: future work.** Each maps to a rule in `03-rules.md` and/or a decision in
`04-open-decisions.md`. Where a decision is still open, implement the recommended
default behind a flag and tag `TODO(decision-N)`. Do not invent new policy.

## Money and fraud

1. **Screenshot QR resale fraud.** A seller screenshots their QR, then resells.
   Buyer and seller both hold a "valid" code.
   → New credential on every change of holder; old one revoked. Rule **R1**, decision **1**.
2. **Event cancelled after resale.** Original buyer paid the organiser, resale
   buyer paid the seller, seller payout still pending — nobody knows who refunds whom.
   → Resale buyers refunded what they paid; pending seller payout cancelled;
   platform covers the gap. Decision **2**.
3. **Chargeback after organiser payout.** Org goes negative with no screen for it.
   → Reserve holdback + negative-balance state in Earnings. Decision **3**, ledger kinds
   `chargeback`/`reserve_hold`/`reserve_release`.
4. **"Set your price" on an expired card, or after the fan already has tickets.**
   → Verify the card before the watch goes live (**W4**, decision **9**); pause the
   order once the fan holds tickets for that event (**W5** — prompt to cancel, don't
   auto-cancel).
5. **Co-host splits changed after sales start.** Anyone with admin can currently
   change the split unilaterally.
   → Lock at publish/first sale; changes need both admins, future sales only.
   Decision **5**.
6. **Verification rejected after tickets sold.** Sales continue but payouts have
   nowhere to go.
   → Payouts held, banner shown, sales auto-pause after 7 days unresolved.
   Decision **10**, rule **O3**.

## At the door

7. **Two offline gates scan the same QR; both admit.**
   → Flag the conflict at sync — earliest `scanned_at` wins (**D4**). Scanner shows
   "Last synced X min ago" and warns when offline too long (**D5**, decision **18**:
   warn at 5 min, block new scans at 30 min unless admin overrides).
8. **Cached guest list before a resale; offline device accepts the old QR.**
   Same root cause as #1 — credentials rotate, manifest carries `version`, stale
   versions scan `superseded`. Rules **R1**, door-manifest contract in `02-api.md`.
9. **One phone, 4 tickets, one late friend.** All-or-nothing entry.
   → Partial check-in "Admit 2 of 4" (**D6**), or prompt fans to send tickets
   before doors open.
10. **Gate staff revoked mid-shift while offline keeps scanning.**
    → Sessions end at event close; `revoked_at` cancels any scans that sync after
    it (**T4**).

## Team

11. **Sole admin leaves/deletes account → org orphaned.** Deletion is already
    blocked; leaving isn't.
    → Require admin hand-off first. Rule **T3**, decision **11**, `sole_admin`
    error on `DELETE /me` (rule **A6**).
12. **Co-host invite to an email with no Sahra account.**
    → Pending invite state, 7-day expiry, day-5 reminder, attach on sign-up with
    matching email. Rule **T2**, decision **12**.

## Region

13. **Riyadh event bought from Dubai.** Times an hour off; VAT 5% UAE vs 15% KSA.
    → Always display venue timezone; tax computed from the event's country
    (rules **P6**, decision **13**; venue `timezone` is IANA, stored UTC).
14. **Tickets sent to a phone with no account — never claimed.**
    → Returns to sender after 48 h (or doors-open if sooner); recipient QR stays
    invalid until claimed. Decision **14**, `Transfer.status=returned`.
15. **Age-restricted events (21+ nightlife).** No age gate, no ID prompt.
    → DOB on account + checkout confirmation + "ID required" badge on pass and at
    scan. Decision **15**; `User.dob`, `Event.min_age`, `age_restricted` error.
