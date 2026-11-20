# Sahra build handoff

Read in this order:

1. `01-data-model.md`: what the backend stores and how records relate
2. `02-api.md`: what each screen calls and gets back
3. `03-rules.md`: business rules as testable statements (the source of truth; prototype code is not)
4. `04-open-decisions.md`: policy not yet decided. **Do not invent answers.** Build behind a config flag or stub, and mark it `TODO(decision-N)`.

Reference (behaviour and visuals, not code to port):
- `Sahra Mobile Prototype v2.dc.html`: fan app, Plans, personal invites, door mode (**current**)
- `Sahra Web Prototype v2.dc.html`: new front door, invite links, code sign-in, Studio (**current**)
- `Sahra Mobile Logic Map v2.dc.html`, `Sahra Web Logic Map v2.dc.html`: flows, branches, errors, roles (**current**)
- v1 files (same names without "v2") are kept for history only. Where they disagree, v2 wins.
- `Screen Inventory.md`: route list and platform split
- `brand/DESIGN.md`: tokens and type

## Core principles
- **One account per person, no passwords.** A one-time code to a phone or email signs in or creates the account (same call). It appears only when someone acts (buy, RSVP, host), never as a gate in front of browsing.
- **Two kinds of hosting, split by audience, not size.** *Invites* (people you invite: free, link-only, owned by the person) and *Events* (anyone with tickets: owned by an Organisation, needs verification). An invite can be moved into an organisation later.
- **Organisations only exist for selling tickets.** Hosting friends never creates one.
- **Roles live on the membership, not the user.** One person can be Admin at org A and Gate staff at org B.
- **Mobile creator screens never build.** Create/edit happens in Studio (web). Mobile is door mode: events, scan, guests, broadcast.
- **Money is integer minor units** (fils for AED). There are no floats anywhere.
- **Every money-moving call is idempotent** (`Idempotency-Key` header).
- **Event times are stored in UTC with the venue's IANA timezone** and always displayed in venue time.
