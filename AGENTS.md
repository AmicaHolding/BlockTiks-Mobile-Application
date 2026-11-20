# Sahra (BlockTiks), agent guide

Ticketing platform for the Middle East. Fan app (Flutter) + door mode, fan web
(`buyer-web/`), organiser Studio (`studio/`), and a Fastify backend
(`backend/`) whose data layer targets **Cloudflare D1 (SQLite)**. Brand name
is **Sahra / سهرة**.

## Spec of record, read before building

Everything in `designs/` (v3 is current; unversioned v1/v2 files are history):

- `designs/handoff/01-data-model.md`, records and relationships
- `designs/handoff/02-api.md`, per-screen API contracts, roles, error codes
- `designs/handoff/03-rules.md`, testable business rules
- `designs/handoff/04-open-decisions.md`, undecided policy. Never invent answers;
  implement the recommended default behind a flag, tag `TODO(decision-N)`
- `designs/handoff/05-v3-trust-and-money.md`, wallet, all-in prices, fee
  credits, fair access, live QR, group pay (**overrides 03**)
- `designs/handoff/06-personal-events.md`, invite fields, date poll, activity,
  album, RSVP rules, no resale of invites (**overrides the I-rules in 03**)
- `designs/handoff/05-real-world-scenarios.md`, edge cases from stress tests
- `designs/Sahra Mobile Prototype v3.dc.html`, fan app + door mode (**latest**)
- `designs/Sahra Web Prototype v3.dc.html`, fan web + Studio (**latest**)
- `designs/LogicMapV3.dc.html`, flows, branches, errors, roles (`platform="mobile"|"web"`)
- v1/v2 files are history only; where they disagree, v3 wins
- `designs/Screen Inventory.md`, route list and platform split
- `designs/brand/DESIGN.md` + `designs/brand/tokens.json`, palette, type, RTL rules.
  `tokens.json` is the canonical token source, generate platform code from it.

## Invariants

- One account per person, **no passwords**: phone or email + one-time code signs in
  or creates the account (same call), plus Sign in with Apple. Sign-in appears only
  when someone acts (buy, RSVP, host), never as a gate in front of browsing.
- Org roles live on the Membership, not the User.
- Two kinds of hosting, split by audience not size: **Invites** (free, link-only,
  owned by a person) and **Events** (ticketed, owned by a verified Organisation).
- Mobile creator screens never build/edit, door mode only (events, scan, guests,
  broadcast). All create/edit happens in Studio on web.
- Money is integer minor units (`*_minor`, fils for AED). No floats.
- Prices are **all-in**: shown = paid; the 7% fee is inside the price and the
  buyer gets the unused part back as Credits (see handoff/05).
- Wallet has two balances: Cash (withdrawable) and Credits (in-app only).
- Personal invites can never be sold or transferred (PE1).
- Every money/inventory POST is idempotent (`Idempotency-Key` header).
- Event times stored UTC + venue IANA timezone; always displayed in venue time.
- Org context on web calls is the `X-Org-Id` header, checked against Membership.
- RTL-first layouts; palette per tokens.json (Night canvas, Gold CTA, Rumman alerts only).

## Local dev

```bash
./dev.sh --local --seed          # SQLite (D1 dialect) + backend :4000 + Flutter
cd backend && npm run dev        # backend only; creates backend/data/dev.db
```

The data layer speaks DynamoDB-DocumentClient-style commands; `src/db/engine.ts`
evaluates them over a relational store — `src/db/local.ts` (better-sqlite3, local
dev) or `src/db/d1.ts` (the `DB` D1 binding in a Worker; see `wrangler.toml` +
`src/worker.ts`). No Docker needed.

Seed accounts: `fan@test.com`, `noor@test.com`, `creator@test.com`,
`layla@test.com` — sign in with a code; in local dev the code is logged/fixed by
the seed (see backend/scripts/seed.ts). Stripe test keys go in `backend/.env`
(gitignored). `npm run stripe:listen` forwards webhooks.

## Verify

- Flutter: `flutter analyze`, keep it at zero errors.
- backend: `npm run typecheck`; buyer-web / studio: `npm run build` (vite+tsc).
