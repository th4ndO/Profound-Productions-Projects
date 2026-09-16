# Student Budget Planner

## What this is

Students don't get paid like employees. Money arrives as irregular lump
sums — a loan or bursary disbursement, an allowance transfer, a sporadic
part-time paycheck — and has to stretch across a semester with no weekly
salary rhythm to anchor a budget against. Generic budgeting apps assume
steady salaried income and miss this pattern entirely, so it's easy to only
discover you're in trouble once you're already short before the next
payout.

Student Budget Planner is a small, self-contained web app built around that
pattern instead of around a paycheck:

- **Budget periods** (a semester, a term) rather than calendar months —
  income and spend are tracked against the period a disbursement is meant
  to cover.
- **Transactions** enter manually or via a CSV import of a bank statement
  export — never a live bank connection.
- **Category rules** (keyword matching) auto-categorize spend, but nothing
  that doesn't match a rule is ever hidden — it shows up as
  `uncategorized`, still counted in every total.
- **A burn-rate forecast** ("N days until your balance runs out") computed
  transparently from a stated trailing-window average, recalculated every
  time you look at it.
- **Closed periods are frozen.** Once you close a period, its recorded
  totals never move again, no matter what you do to your transactions or
  categories afterward — so you can always trust what the app said
  happened last semester.
- **Savings goals** with an append-only contribution log and a required
  weekly pace toward a target date.

It runs entirely offline: no cloud database, no bank API, no hosted auth
provider, no ML categorization. `npm install` is the only step in this
whole README that needs an internet connection.

---

## Prerequisites

- **Node.js 20 or later** (`node --version`).
- That's it. No database server, no Docker, no cloud account. The database
  is a single SQLite file created on your disk the first time you migrate.

---

## Installation

```bash
git clone https://github.com/th4ndO/project-.git
cd project-
npm install                      # the only step that needs internet
cp .env.example .env             # sets DATABASE_URL and SESSION_SECRET
npx prisma migrate deploy        # creates prisma/dev.db and applies the schema
npm run seed                     # loads the demo user + sample data
```

`npm install` is the slow step — expect somewhere around one to a few
minutes depending on your connection, since it's pulling Next.js, React,
Prisma and friends. Everything after that (migrating, seeding, running,
testing) works fully offline.

`.env.example` already has sensible local defaults; for anything beyond
your own machine, generate a real secret instead of the placeholder:

```bash
# put the output in .env as SESSION_SECRET
openssl rand -hex 32
```

---

## Running the app

```bash
npm run dev
# -> http://localhost:3000
```

Or a production-style run:

```bash
npm run build
npm start
```

You'll land on `/login`. Use the seeded credentials below, or read
"Guided walkthrough" for what to look at once you're in.

---

## Seeded login

`npm run seed` creates one demo user:

| Email                  | Password      |
|-------------------------|----------------|
| `demo@student.co.za`    | `password123`  |

Re-running `npm run seed` is safe — it's idempotent. It wipes and
recreates this one user's data every time rather than piling up
duplicates, so you always get back to the same known state.

---

## Running tests

```bash
npm test              # everything: unit, then integration
npm run test:unit      # src/budgeting/__tests__ only (pure logic, no DB)
npm run test:integration  # src/__tests__/integration only (real SQLite)
npm run test:coverage  # coverage report for src/budgeting/
```

Expect **31 passing tests**: 26 unit tests covering categorization,
forecasting, period closing, and savings pace (`UT-01`–`UT-14`, with a few
extras alongside them), plus 5 integration tests (`IT-01`–`IT-05`) that
exercise the Prisma-backed app layer against a real, disposable SQLite
database (`prisma/test.db`, created and torn down automatically — it never
touches `prisma/dev.db`).

`npm run test:integration` needs the project's migrations to be in
`prisma/migrations/` (they're committed, so a fresh clone already has
them) — it runs `prisma migrate deploy` against the throwaway test
database itself, so you don't need to migrate anything by hand first.

---

## Guided walkthrough: verifying the invariants by hand

These all use the exact records `npm run seed` creates, so the numbers
below should match what you see (dates are seeded relative to "today" so
they stay meaningful no matter when you seed; amounts are fixed).

### INV-1 — nothing spent disappears

Look at **This Semester (open)** — go to `/transactions` or `/dashboard`.
Among the seeded transactions is:

> **CAMPUS PRINTING KIOSK — R40,00** (2 days before seeding)

No category rule contains "printing", so no rule matches it. Instead of
being dropped, it shows up with an **"uncategorized"** badge, and its
R40,00 is included in "Spend so far" on the dashboard — check the total:
it's the sum of *all five* open-period transactions (R150,00 + R65,00 +
R99,00 + R40,00 + R220,00 = R574,00), not just the four categorized ones.

The same pattern exists in the *closed* period, **Last Semester (closed)**:
its own uncategorized `CAMPUS PRINTING KIOSK — R85,00` transaction is
included in the frozen spend total below (INV-3's freezing doesn't mean
"drop the awkward one" — it means "freeze the honest one").

### INV-2 — forecasts are honest about being forecasts

Open `/dashboard` (or `/periods/<id>` for **This Semester (open)**). The
"Forecast" card doesn't just say a number of days — it states its method:

> Method: trailing 14-day average burn rate of R _X_/day, computed live as
> of _(current timestamp)_.

To prove it's live, not cached:

1. Note the current burn rate and "days until exhausted" figure.
2. Go to `/transactions` and add a manual transaction dated today for, say,
   R500,00.
3. Reload `/dashboard`. Both the burn rate and the days-remaining figure
   change immediately, and the "as of" timestamp advances — it was
   recomputed from current data, not read back from a stored value.

### INV-3 — closed periods are frozen

Go to `/periods` and open **Last Semester (closed)**. It shows:

> Frozen income **R8 000,00** · Frozen spend **R1 164,00** · Frozen ending
> balance **R6 836,00**

(Hand-check: R450,00 + R120,00 + R310,00 + R199,00 + R85,00 = R1 164,00 —
this matches the closed-period transactions in `prisma/seed.ts` exactly,
including the uncategorized R85,00 line per INV-1.)

Now try to move it:

1. Go to `/transactions` and recategorize any transaction that belongs to
   this closed period (e.g. `WOOLWORTHS FOOD`) to a different category.
   Reload the period page — the three frozen figures above are unchanged.
2. Add a new manual transaction dated inside the closed period's own date
   range (a "backdated" entry — the period detail page shows its exact
   start/end dates). Reload the period page again — still R8 000,00 /
   R1 164,00 / R6 836,00, even though a real new expense now exists for
   that date range in the database.

This is exactly what `src/__tests__/integration/budgeting-flows.test.ts`
asserts under `IT-01` and `IT-03` — IT-03 in particular is the most
load-bearing test in the project: a closed period's stored figures must
never move.

### Bonus: the savings goal

**Laptop fund** targets R12 000,00. Two contributions were logged
(R2 000,00 and R1 500,00 — an append-only log; go check `/savings`, and
note there is no "edit" or "delete" on a logged contribution, by design).
The required weekly pace and on-pace/behind-pace badge are computed live
from `target date`, `created date`, and the sum of that contribution log —
see the formulas below to check the pace number by hand.

---

## Project structure

```
prisma/
  schema.prisma        Data model (see BUILD SPEC §5) — SQLite, integer-cents money
  migrations/           Committed migration SQL (npx prisma migrate deploy applies these)
  seed.ts               Idempotent demo data (see "Guided walkthrough" above)

src/
  budgeting/            Pure TypeScript core — NO Prisma import, NO React import, NO fetch.
    types.ts             Plain data shapes mirroring the Prisma models
    errors.ts             BudgetingError and its three subclasses
    categorize.ts          categorizeTransaction() — keyword matching (INV-1)
    forecast.ts            burnRateCentsPerDay(), daysUntilExhausted() (INV-2)
    period.ts               isWithinPeriod(), closePeriod() (INV-3)
    savings.ts               requiredPaceCentsPerWeek(), isOnPace()
    index.ts                  Public re-exports
    __tests__/                 UT-01..UT-14 (Vitest, no DB, no framework)

  lib/                  The only place that imports both Prisma and src/budgeting/.
    prisma.ts             PrismaClient singleton
    auth.ts                 bcrypt hashing + signed httpOnly session cookie
    session-guard.ts         requireUser() — redirects to /login if not authenticated
    format.ts                 formatRand() — the ONE place currency is formatted
    categories.ts             Category/CategoryRule CRUD + rule-table loading
    transactions.ts            Create/recategorize transactions, CSV parse + import
    periods.ts                  Create periods, live vs. frozen dashboards, closePeriodById()
    savingsGoals.ts              Create goals, append-only contributions, status

  app/                  Next.js App Router — pages, layouts, and Server Actions.
    login/, dashboard/, transactions/, categories/, periods/, savings/

  __tests__/integration/  IT-01..IT-05 against a real, disposable SQLite database
```

**Why `src/budgeting/` has zero framework or database imports:** it's the
part of the system carrying the actual rules the build spec is graded
against (the three invariants and 14 unit tests), so it needs to be
testable and trustworthy in complete isolation — a bug in a forecast
formula should be catchable with a plain function call and an assertion,
not by standing up a database and a running server first. `src/lib/`
exists specifically to bridge that pure core to Prisma; nothing under
`src/budgeting/` ever needs to change if the persistence layer, or even
the framework, changes.

---

## The budgeting calculations

All amounts are integer cents internally; `formatRand()` in
`src/lib/format.ts` is the only place a cents value becomes the
`R1 234,56` string you see on screen.

### Burn rate (trailing-window average)

```
burnRateCentsPerDay = (sum of transaction amounts in the last windowDays days) / windowDays
```

The app always uses a **14-day trailing window**, and the dashboard always
states this window and the "as of" timestamp it was computed at — see
INV-2 above. An empty window is a real value of 0, not an error: no spend
in 14 days is legitimate.

### Days until exhausted

```
daysUntilExhausted = floor(currentBalanceCents / burnRateCentsPerDay)
```

If the burn rate is zero (or negative, which shouldn't happen but is
guarded anyway), this is `null` — "you'll never run out" isn't a day count,
so the app shows a message instead of dividing by zero.

### Required savings pace

```
requiredPaceCentsPerWeek = max(0, (targetCents - currentSavedCents) / weeksRemaining)
```

where `weeksRemaining = (targetDate - asOf) / 7 days`. A goal already met
returns exactly 0 (never negative). A goal whose target date has already
passed while still unmet has no valid pace to compute — the app surfaces
that as its own state ("this goal is overdue") rather than showing a
number.

### Worked example (you can check this by hand)

Take a trailing 14-day window with **R1 400,00** of spend in it:

```
burnRateCentsPerDay = 140 000 cents / 14 = 10 000 cents/day  (= R100,00/day)
```

With a current balance of **R950,00** (95 000 cents):

```
daysUntilExhausted = floor(95 000 / 10 000) = floor(9.5) = 9 days
```

And a savings goal with a **R4 000,00** target, R0 saved so far, and a
target date exactly 4 weeks away:

```
requiredPaceCentsPerWeek = max(0, (400 000 - 0) / 4) = 100 000 cents/week (= R1 000,00/week)
```

These three numbers (`UT-04`, `UT-06`, `UT-10` respectively) are asserted
directly in `src/budgeting/__tests__/`.

---

## Troubleshooting

**"This project requires Node.js 20+"** — check `node --version`. If
you're on an older Node via `nvm`, run `nvm install 20 && nvm use 20`.

**Port 3000 already in use** — either stop whatever's using it
(`lsof -ti:3000 | xargs kill` on macOS/Linux) or run on another port:
`npm run dev -- -p 3001`.

**Migration failed / database looks broken** — delete the local database
and start over; this is safe in development since it's just a local file:

```bash
rm -f prisma/dev.db prisma/dev.db-journal
npx prisma migrate deploy
npm run seed
```

**Ran `npm run seed` twice and worried about duplicates** — don't worry;
it's idempotent. It deletes the demo user's existing data first, every
time, then recreates the same fixed seed from scratch.

**Tests fail with a Prisma/database error** — the integration tests need
the committed migrations to apply cleanly. Make sure `prisma/migrations/`
exists (it's checked into the repo) and that you haven't manually deleted
`prisma/test.db` mid-run; if in doubt, delete it and re-run
`npm run test:integration` — it recreates that file itself.

---

## Known limitations

- **CSV format is fixed and simple.** The importer expects
  `date,description,amount` columns (amount as a decimal Rand value, e.g.
  `125.00`) and does not handle quoted fields containing commas. It's a
  deliberately minimal, local, in-process parser — see BUILD SPEC §3.
- **No bank integration of any kind.** Transactions only ever enter via
  manual entry or a CSV file you export yourself, by design (see BUILD
  SPEC §1 and §11) — this is a constraint, not a gap to be filled later.
- **No ML categorization.** Category matching is case-insensitive keyword
  substring matching only, with longest-match-wins on conflicts. This is
  intentional — it's auditable and predictable in a way a model wouldn't
  be for a system this small.
- **Single currency.** Amounts are always South African Rand; there's no
  multi-currency support or conversion.
- **Single role.** There's one kind of user (a logged-in student) — no
  admin views, no sharing a budget between multiple accounts.
- **No email/notifications.** Nothing is ever emailed or pushed; you have
  to open the app to see your forecast or your savings pace.
