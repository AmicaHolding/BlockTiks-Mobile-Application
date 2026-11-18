# Simulator workflow smoke test — 2026-11-18

Automated UI testing of the Sahra iOS app on the iPhone 17 Pro simulator
(iOS 26.5) using **Maestro 2.12.1** + `xcrun simctl`. Backend: DynamoDB Local +
Fastify on `localhost:4000` (`./dev.sh --local --seed`). Signed-in accounts:
`fan@test.com` (Sam Rivera) and `creator@test.com`, password `password123`.

## Test setup

- Maestro installed via `curl -fsSL https://get.maestro.mobile.dev | bash` → `~/.maestro/bin`
- Temurin JRE 21 (arm64) extracted to `~/.local/jre/jdk-21.0.13+9-jre` — Maestro
  needs Java; set `JAVA_HOME` and add both to `PATH`
- Flows live in `maestro/` (01–09). Run: `maestro test maestro/01-feed.yaml`
- `rocketsim://` URL scheme is **not registered** on this Mac despite
  RocketSim.app running — RocketSim automation is unusable here; `simctl`
  covers push/location/privacy/appearance anyway.

### Maestro + Flutter gotchas (for future flows)

- Flutter merges widget trees into single a11y nodes with `\n`-joined text
  (e.g. `For You\nTab 1 of 4`). Text selectors do **full-string regex match**
  → use contains-patterns: `'[\s\S]*Desert Sessions[\s\S]*'`.
- `tapOn` taps node *centre* — misses when only part of the row is tappable
  (e.g. "Sign out" is a `GestureDetector` on the text; use `point: '11%,82%'`).
- Tapping a field's label text does not focus the input; tap the field box
  (`point:`) or its placeholder text.
- `inputText` on the password field can trigger the keyboard's submit action
  → login may complete before an explicit `tapOn: 'Sign in'` (use `optional: true`).
- `swipe` supports `direction` only in this version (no start/end coords);
  `scroll` command does not exist — use `swipe`/`scrollUntilVisible`.
- `assertVisible` has no `timeout:` — use `extendedWaitUntil: {visible: ..., timeout: ms}`.
- `env:` defaults in the flow appear to win over `-e` overrides — hardcode
  variants when account switching matters.
- `launchApp` cold-starts → persisted auth token means "signed out" state does
  not survive across flows.

## Workflow results

| # | Workflow | Result |
|---|----------|--------|
| W1 | Cold launch → For You feed, hero carousel swipe, city chip, list scroll | PASS |
| W2 | Event detail (Desert Sessions): title, date, venue, About, tiers | PASS (with bug 1 below) |
| W3 | Search "desert" → results → open event | PASS |
| W4 | Tickets tab → wallet contents | FAIL — shows 0 tickets, API has 3 (bug 5) |
| W5 | Profile → Edit profile → back chevron | PASS |
| W6 | City switcher sheet, notification bell | PASS (badge anomaly, finding 8) |
| W7 | Get tickets → qty stepper → Checkout | BLOCKED — stepper unreachable (bug 1) |
| W8 | Sign out → Welcome back → sign in | PASS w/ findings (bug 2) |
| W9 | Creator login → door-mode home (Events/Scan/Guests/Account) | FAIL — tabs dead (bug 3) |
| — | Venue "Directions" → Google Maps in Safari | PASS (hardcoded coords, finding 10) |
| — | `simctl push` (foreground + backgrounded) | Delivered; no banner observed (sim limitation, inconclusive) |
| — | `simctl openurl sahra://events` | FAIL — no URL scheme registered |
| — | `simctl location set` / `privacy grant camera` / `ui appearance light` | OK / OK / app stays dark by design |
| — | Venue-time display (UTC + venue IANA tz) | PASS — verified vs seed math |

## Findings

### 1. 🔴 Event detail does not scroll; quantity stepper is permanently under the CTA bar — purchase blocked

On `Desert Sessions` (single GA tier), the tier card's −/+ stepper sits at the
card's bottom edge, clipped behind the fixed `From $200 / Get tickets` bottom
bar. Three swipes (400ms + 2×1500ms) and `scrollUntilVisible` produced **zero
scroll** — the page is at max extent (content column has only `bottom: 32`
padding, less than the ~90pt bar). The + button's tap target is under the bar,
so `selectedCount` can never reach >0 → "Please select at least one ticket"
toast → **no path to checkout from event detail**.

`event_detail_view.dart`: the scroll column's bottom padding
(`EdgeInsets.fromLTRB(20, 8, 20, 32)`) doesn't account for the overlay bar.
Needs ~bar height + safe-area bottom padding on the scroll content.

### 2. 🔴 Sign out is cosmetic — session/token survives

`profile_tab_view.dart` `_signOut()` is `Get.offAllNamed(Routes.SIGN_IN)` with
no token/session clear. Observed: after sign-out → Welcome back, a cold
relaunch auto-logged straight into the feed; in one run the app re-entered the
signed-in feed **while the sign-in form was being filled** (before explicit
submit). Account switching and real sign-out are effectively broken.

### 3. 🔴 Creator door-mode tabs switch highlight but never switch content

After creator login the door-mode shell renders (Events / Scan FAB / Guests /
Account). Tapping Guests or Account highlights the tab but the body stays on
the events feed — same class of embedded-tab binding bug previously fixed for
the fan dashboard. **Scanner and guest list are unreachable** → door mode is
non-functional.

### 4. 🟠 "BOTTOM OVERFLOWED BY 7.5 PIXELS" on creator nav's centre Scan button

Debug-build render overflow banner on the Scan FAB label in the creator
bottom nav — visible in every door-mode screenshot.

### 5. 🟠 Wallet shows "0 active tickets" despite 3 VALID tickets via API

`GET /tickets` for fan@test.com returns 3 VALID tickets (e.g. Neon Nights VIP).
The Tickets tab renders the loaded-empty state ("No active tickets.", counts 0)
— not the error state — so `fetchTickets()` either never ran (controller not
bound in the embedded tab — same family as finding 3) or returned empty.
`/tickets`, `/listings/mine`, `/offers/mine` all return 200 for the account.

### 6. 🟠 Hero carousel "From" price is ÷10000

Feed hero card shows `From AED 0.95`, `AED 1.80`, `$0.30`, `SAR 1.20` for
events whose true minimums are AED 95 / AED 180 / $30 / SAR 120 — confirmed by
the event detail ("From AED 95.00" for the same event). List rows and detail
page format correctly; only the hero card's formatter divides by 10000.

### 7. 🟠 Hero carousel is not city-filtered

With "Dubai" selected, the hero carousel included `Bassment Riyadh: Warehouse
Night` and `Sunset Dhow Cruise Sessions` (Abu Dhabi). The "More coming up" list
appears Dubai-scoped; the carousel ignores the selected city.

### 8. 🟡 Notification badge shows "1" while notifications page is empty

Feed header bell rendered a badge dot/count of 1; the notifications page says
"No notifications yet". Stale or miscounted badge source.

### 9. 🟡 "Add to calendar" is a dead button

`event_detail_view.dart` `_InfoRow` for the date has `onTap: () {}` — empty
handler; the row looks tappable (gold chevron) but does nothing.

### 10. 🟡 "Directions" uses hardcoded coordinates

`onTap: () { Utils.openGoogleMapDirections(25.197525, 55.274288); }` — fixed
coordinates regardless of the event's venue (it happened to resolve near Al
Marmoom for this event, masking the bug).

### 11. 🟡 Search "desert" returned seemingly unrelated events

Results included Comedy Night Live, Sunset Dhow Cruise, Bassment Riyadh — none
match "desert" in title/venue/category. Either description matching or the
list is unfiltered. Verify intended behaviour.

### 12. ⚪ No deeplinks

`simctl openurl booted sahra://events` → `LSApplicationWorkspaceErrorDomain
115`. `Info.plist` registers no `CFBundleURLTypes`; deep links and any
"open in app" surfaces (emails, QR-to-event, share links) have no target.

### 13. ⚪ Push notifications inconclusive

`simctl push` was accepted ("Notification sent") both foreground and with the
app backgrounded to Safari; no banner/badge observed. Likely a sim limitation
or missing handlers/entitlements — recheck on device or with a payload the
app is known to handle.

## Observations (not bugs)

- Venue-time display verified correct: seeds store UTC; e.g. Comedy Club
  `Nov 21 21:00 UTC` → `Sun, November 22 · 1:00 AM` in Asia/Dubai. Matches the
  UTC + venue-IANA-tz invariant.
- City selection is manual (chip sheet) — `simctl location` does not affect it
  (expected; no geolocation feature yet).
- Light appearance has no visual effect — app is dark-only by design.
- Search tab, transfer/edit-profile back nav all behaved normally; no GetX
  snackbar/back regressions observed on the tested paths.

## Reproduce

```bash
export PATH="$HOME/.maestro/bin:$HOME/.local/jre/jdk-21.0.13+9-jre/Contents/Home/bin:$PATH"
export JAVA_HOME="$HOME/.local/jre/jdk-21.0.13+9-jre/Contents/Home"
maestro test maestro/07-checkout.yaml   # replays the blocked purchase path
```

Screenshots + per-step a11y hierarchies are under `~/.maestro/tests/<ts>/`.
