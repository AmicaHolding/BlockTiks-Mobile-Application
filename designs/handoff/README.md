# Sahra build handoff

Read in this order:

1. `01-data-model.md`: what the backend stores and how records relate
2. `02-api.md`: what each screen calls and gets back
3. `03-rules.md`: business rules as testable statements (the source of truth; prototype code is not)
4. `04-open-decisions.md`: policy not yet decided. **Do not invent answers.** Build behind a config flag or stub, and mark it `TODO(decision-N)`.

Reference (behaviour and visuals, not code to port):
- `Sahra Mobile Prototype.dc.html`: fan app + door mode
- `Sahra Web Prototype.dc.html`: fan web + Studio
- `Sahra Mobile Logic Map.dc.html`, `Sahra Web Logic Map.dc.html`: flows, branches, errors, roles
- `Screen Inventory.md`: route list and platform split
- `brand/DESIGN.md`: tokens and type

## Core principles
- **One account per person.** Hosting means joining or creating an Organisation. There is never a second login.
- **Roles live on the membership, not the user.** One person can be Admin at org A and Gate staff at org B.
- **Mobile creator screens never build.** Create/edit happens in Studio (web). Mobile is door mode: events, scan, guests, broadcast.
- **Money is integer minor units** (fils for AED). There are no floats anywhere.
- **Every money-moving call is idempotent** (`Idempotency-Key` header).
- **Event times are stored in UTC with the venue's IANA timezone** and always displayed in venue time.
