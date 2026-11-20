# v3: trust and money (agreed 18 Nov 2026)

Prototype: `Sahra Mobile Prototype v3.dc.html`. Where this disagrees with 03-rules.md, this file wins.

## Agreed decisions
| Topic | Decision |
|---|---|
| Prices | **All-in.** The price shown is the price paid. |
| Who carries the fee | **Buyer**, inside the price. Sellers and organisers get their full price. |
| Fee | Flat **7%** of face value, included in the price. |
| Fee refund | **Exact per transaction, calculated after paying.** Credit = 7% fee − actual processing cost − 2% margin. Never negative. |
| Credits expire | **12 months** after they're earned. |
| Withdrawing cash | **One free withdrawal a week** (1–3 working days). **Instant** costs 1%, min AED 3. |
| High-demand releases | **Random waiting room**, with a **registration draw** as fallback. |
| QR | **Unlocks 24h before doors.** Changes every 15s; works offline. |
| Out of scope for v3 | Instant refunds, instalments, event change alerts, seat view, privacy, help & disputes. |

## Wallet (W)
- **W1** Two balances: **Cash** (resale earnings, withdrawable) and **Credits** (fee refunds and promos, in-app only, can't be withdrawn or transferred).
- **W2** Resale proceeds are **Pending** until the event happens, then become Cash.
- **W3** At checkout, wallet is on by default: **credits first (oldest first), then cash, then card** for the rest.
- **W4** Credits expire 12 months after they're earned. Remind 30 days and 7 days before.
- **W5** Withdrawals only take Cash. One free standard withdrawal per calendar week (resets Monday 00:00 local). Instant costs 1%, min AED 3.
- **W6** Holding withdrawable cash is regulated (CBUAE stored-value rules in the UAE, SAMA in KSA). **Legal must confirm** whether we need a licence or a licensed partner before launch.

## Fees and credits (F)
- **F1** Shown price = round(face × 1.07). Promo codes apply to the shown price.
- **F2** Fee in an order = due − due / 1.07. Base = due − fee.
- **F3** Processing cost = the sum, across every way the order was paid, of amount × actual cost rate (from the payment provider's settlement data, not a guess). Credits used cost 0; wallet cash ~0.3%.
- **F4** Credit back = max(0, fee − processing cost − 2% × base), rounded to 0.01. Paid as credit after the payment settles.
- **F5** The confirmation screen shows the breakdown: fee in price, processing, Sahra keeps, credit back.
- **F6** Refunds reverse the credit that order earned. If the credit is already spent, take it from the refund amount.
- **F7** Resale: buyer pays round(listing × 1.07); seller gets the full listing price. (This replaces the 5% seller fee.) The cap stays at face value +10%.

## Fair access (B)
- **B1** One account per verified phone number. Virtual and disposable numbers are blocked.
- **B2** Device check before joining a queue or checking out (Apple App Attest / Google Play Integrity). On the web: risk score, plus a challenge only when something looks suspicious.
- **B3** Limits for high-demand events: max 4 per person, card and device combined. Normal events: 6 per order.
- **B4** Waiting room opens 30 min before sales. **Everyone in the room when sales open gets a random place in line.** People who join after that go to the back.
- **B5** Each place in line is tied to the account and the device. Leaving keeps your place for 5 minutes.
- **B6** On your turn, tickets are held for 10 minutes. If the time runs out, you rejoin at the back.
- **B7** Accounts flagged during the sale are removed from the line; nobody is told why.
- **B8** Fallback: if flagged traffic passes a threshold (e.g. 30% of the room), the organiser can switch the release to a **registration draw**: one entry per verified account, winners picked at random and given 30 minutes to buy. Consider this as the default for the biggest releases.

## Live QR (Q)
- **Q1** Each ticket has a secret seed. The code on screen = a signature of (ticket id, 15-second time window, seed), checked by the gate without internet.
- **Q2** The seed is delivered to the phone when the QR unlocks (24h before doors) and kept on the device, so the app shows working codes with no signal.
- **Q3** Gate devices download the event's verification keys and the list of cancelled tickets before doors. They accept codes from the current time window ±1, to allow for clock drift.
- **Q4** Sending or reselling a ticket gives it a **new seed**. The old phone's codes stop working once the gate device next syncs.
- **Q5** Duplicate scans across offline devices are spotted when the devices sync (see the earlier logic issue #7). Gate devices share recent scans over the venue's local network.
- **Q6** Apple Wallet and Google Wallet: tap-to-enter (NFC) passes only, since they can't show a changing code. The in-app QR is the main ticket.

## Pay as a group (G)
- **G1** Available on orders of 2+ tickets. The buyer chooses friends; each friend pays one ticket's share.
- **G2** The buyer pays their own share now. Friends get a payment request; their seats are held for **30 minutes**.
- **G3** When the time runs out, the buyer can cover the unpaid shares, or those seats are released. Nobody is charged for released seats.
- **G4** Each payer earns fee credit on their own payment.
- **G5** Friends' tickets are sent to them automatically once they pay.

## Open questions
1. The credit formula needs per-transaction processing cost from the payment provider. Check that the provider exposes it soon after payment.
2. Legal check on the wallet: licence or partner (W6).
3. The flagged-traffic threshold for switching to a draw (B8), and who decides: the organiser or Sahra.
