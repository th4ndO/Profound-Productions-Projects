# Recipe Costing & Batch Production Planner

## 1. What this is

A small food producer's costing is usually done once, by hand, in a
spreadsheet — and then never revisited when an ingredient's price moves.
Nobody notices that a product quietly stopped making its target margin
until the accounts look wrong months later. Sub-recipes (a filling, a
sponge base, a sauce) get re-costed by guesswork because tracing their
cost through every recipe that uses them by hand is tedious and easy to
get wrong, and nobody keeps a record of what a batch actually cost to
produce once the ingredients that went into it have changed price.

This system replaces that spreadsheet. Every ingredient's price history is
recorded (never overwritten), every recipe's cost — including recipes
built from other recipes, nested to any depth — is computed live from
current prices, every product's margin and food-cost percentage is
derived from that live cost, and a planned production batch gets a scaled
ingredient list, an aggregated purchase list in whole packs, and a
snapshot of what it actually cost that is frozen permanently once the
batch is complete. A missing price or a circular recipe reference is
never allowed to silently produce a cost of zero — the system throws a
specific, named error instead, because in a costing system a silent zero
is a far worse defect than a visible crash.

## 2. Prerequisites

- **Node.js 20 or later** (developed and tested on Node 22).
- **npm 10 or later** (ships with modern Node installs).
- **~1 GB free disk space** — `node_modules` alone is roughly 500 MB;
  the SQLite database file and build output add a few more MB.
- **No database server, no Docker, and no cloud account are required.**
  The database is a single SQLite file on disk (`prisma/dev.db`), and
  authentication is local (bcrypt-hashed passwords, a signed cookie) —
  there is no external auth provider to configure.

## 3. Installation

```bash
git clone <repo-url>
cd project-
npm install
cp .env.example .env
npx prisma migrate deploy
npm run seed
```

`npm install` is the **only step that needs internet access** — it
downloads packages from the npm registry. On a normal connection it
typically finishes in well under two minutes; everything after that
(migrating the database, seeding it, running the dev/build server,
running the tests) works fully offline.

`.env.example` is copied to `.env` because `.env` itself is gitignored
(it's local configuration, never committed). The defaults in
`.env.example` — a local SQLite file and a placeholder session secret —
work as-is for local/assessment use; there is nothing else to configure.

## 4. Running the application

```bash
npm run dev     # http://localhost:3000, with hot reload
```

```bash
npm run build && npm start   # production mode, same URL
```

Both commands read `prisma/dev.db`, the file created by the installation
steps above. If you haven't run `npm run seed` yet, the app will start
but every list will be empty and there will be no accounts to log in
with.

## 5. Login credentials

The seed script creates one account per role. These are **seed
credentials for local assessment, not production defaults** — the
password is the same across all three purely so a marker doesn't have to
juggle three different passwords while reviewing the app.

| Email                        | Role       | Password       |
|-------------------------------|------------|----------------|
| `admin@bakery.local`          | ADMIN      | `Password123!` |
| `production@bakery.local`     | PRODUCTION | `Password123!` |
| `buyer@bakery.local`          | BUYER      | `Password123!` |

ADMIN can do everything. BUYER manages ingredients, prices and units and
can see product margins (needed for purchasing decisions) but cannot edit
recipes. PRODUCTION can run batches through their lifecycle and view
recipes' costing sheets, but is **deliberately refused margin and
selling-price data** — both on the Products pages and on the
`GET /api/products/:id/margin` endpoint, which returns a 403 rather than
the figures (see IT-06 in §6, and the walkthrough in §7 for how to see
this yourself).

## 6. Running the tests

```bash
npm test              # full suite: 62 tests across 9 files
npm run test:unit     # costing module only: 40 tests, src/costing/__tests__
npm run test:coverage # full suite with a coverage report (text + HTML)
```

The full suite finishes in about two seconds — the integration tests
(§8.2 of the build spec, `src/__tests__/integration/`) each spin up a
throwaway SQLite database file, migrated fresh with the project's real
migration files, and delete it again afterwards, which is the slowest
part and still only adds a second or so per file.

`npm run test:unit` runs only `src/costing/__tests__/` — the pure
TypeScript costing module, covering the 22 numbered assertions (UT-01
through UT-22) from the build spec plus additional edge-case coverage
(a 500-node cycle that would overflow naive recursion, diamond re-use of
a sub-recipe, etc). Nothing in that directory touches Prisma, so these
tests need no database at all.

## 7. Verifying the core invariants

Three behavioural rules are the technical substance of this project. Here
is how to see each one for yourself in under five minutes, using records
already in the seed data — no setup required beyond `npm run seed` and
signing in as `admin@bakery.local`.

### INV-1 — a missing price never produces a zero cost

Open **Recipes → Demo: Missing Price**. Its one ingredient, *Specialty
Cocoa Nibs*, was seeded with no price row at all, on purpose. The costing
sheet shows a red error banner —
`MissingPriceError: no price recorded for ingredient "Specialty Cocoa
Nibs"` — instead of a total of R0,00. Every other page that costs a
recipe touching an unpriced ingredient (the recipe list, the product
margin panel, a batch's scaled-quantity sheet) shows the same explicit
error rather than a silent zero.

### INV-2 — a circular recipe is rejected, never traversed

Open **Recipes → Classic Vanilla Cake**. In the "Add a line" panel,
choose **Sub-recipe**, select **Classic Vanilla Cake** itself from the
dropdown (any quantity/unit), and click **Add line**. The form refuses
the write and shows the cycle path:
`circular recipe reference detected: Classic Vanilla Cake -> Classic
Vanilla Cake`. Nothing is written to the database — reload the page and
the recipe is unchanged. The same check runs for an indirect cycle (A's
sub-recipe is B, and you try to add A as a sub-recipe of B) — it is
checked on every write, not just self-reference, and independently again
whenever the recipe is costed.

### INV-3 — a COSTED batch's cost is frozen forever

1. Open **Batches**. There is already one batch for *Classic Vanilla
   Cake* (target yield 12) with status **COSTED** — seeded that way so
   this walkthrough needs no lifecycle clicking. Open it and note its
   **Cost per unit** in the "Frozen cost" panel (currently R3,09).
2. Open **Ingredients → Cake Flour** and record a new price much higher
   than the current one (its price is currently R200,00 per 12,5 kg bag —
   try recording R900,00 for the same pack).
3. Open **Recipes → Classic Vanilla Cake** — its live cost per unit has
   gone up, reflecting the new flour price immediately.
4. Go back to the same COSTED batch from step 1. Its **Cost per unit** is
   still R3,09, byte-for-byte unchanged, because `BatchLine.unitCostCents`
   and `Batch.costedTotalCents`/`costedUnitCents` were written once, at
   the moment the batch was costed, and nothing in the app ever
   recomputes them afterwards.

This exact scenario — freeze, change a price, assert the frozen figures
didn't move while a live recalculation did — is also `IT-03` in the
automated test suite (`src/__tests__/integration/pricing-and-batches.test.ts`),
described there as "the most important test in the project."

## 8. Project structure

```
prisma/                Prisma schema, SQL migrations, and the seed script
  schema.prisma           the data model (§5 of the build spec)
  migrations/              generated SQL, including a hand-written migration
                            adding SQLite triggers for the RecipeLine XOR
                            constraint (Prisma can't express a cross-column
                            CHECK natively — see that migration's own comment)
  seed.ts                  idempotent seed data, safe to run more than once

src/costing/            THE pure costing engine — no Prisma import, no React
                          import, no fetch, anywhere in this directory. Data
                          goes in as plain objects/Maps, results come back the
                          same way. That isolation is deliberate: it is what
                          makes the unit tests meaningful, and it means this
                          module would port unchanged to a different stack.
  errors.ts                 the typed error hierarchy (INV-1, INV-2)
  types.ts                  shared type contracts + the roundHalfUpCents helper
  units.ts                  unit conversion (with inverse resolution)
  ingredient.ts              the AP -> EP ingredient cost chain
  recipe.ts                  cycle detection + recursive recipe costing
  margin.ts                  margin %, food-cost %, suggested price
  batch.ts                   batch scaling + aggregated purchase list
  index.ts                   the module's public barrel export
  __tests__/                 UT-01..UT-22 and extra edge-case coverage

src/lib/                Everything that bridges the pure costing module to
                          Prisma/Next.js — the one place both are imported
                          together.
  db.ts                      the Prisma client singleton
  auth.ts / session.ts       password hashing, signed session cookies,
                              role checks (session.ts has no Next/Prisma
                              dependency, so src/middleware.ts — which runs
                              on the Edge runtime — can import it directly)
  costing-db.ts               loads Prisma rows into the shapes src/costing/
                              expects, and back; recordIngredientPrice
                              (append-only pricing + margin alerts, Phase 7)
                              and freezeBatchCosting (INV-3) live here
  money.ts                    formatRand()/formatPercent() — the only place
                              currency/percentages are formatted for display

src/app/                 Next.js App Router pages, layouts and API routes.
  login/                     the sign-in page and its server action
  (app)/                     everything behind auth: dashboard, ingredients,
                              units, recipes, products, batches, alerts —
                              one folder per feature, each with its own
                              actions.ts (server actions) alongside its pages
  api/products/[id]/margin/   the one plain API route in the app (rather
                              than a server action), because IT-06 needs an
                              HTTP-shaped endpoint to assert a 403 against

src/middleware.ts        Edge-runtime auth gate: redirects to /login (or
                          401s an /api/ request) when there's no valid
                          session cookie. Per-role authorisation (403s) is
                          enforced in the specific route/action instead,
                          since only it knows the exact reason.

src/__tests__/integration/  IT-01..IT-06, against a real temporary SQLite
                          database (see §6).
```

## 9. The costing calculations

All monetary values are stored and displayed as **integer cents**;
intermediate per-unit costs are kept as full-precision fractional cents
and rounded **half-up** only at the point a total is persisted or shown.
Percentages (yield, incidentals, margin, food cost) are numbers in the
range **0–100**, never 0–1.

**Edible-portion (EP) unit cost** — corrects a purchased ingredient's
cost for unavoidable waste (trim, peel, evaporation):

```
AP unit cost      = price paid for the pack / (purchase quantity in the pack)
AP cost, recipe unit = AP unit cost / (conversion factor, purchase unit -> recipe unit)
EP unit cost      = AP cost (recipe unit) / (yield% / 100)
```

**Recipe cost** — every ingredient line resolves through the chain above;
every sub-recipe line first costs the child recipe, then charges
`(line quantity, converted into the child's yield unit) / (child's
standard yield quantity) × (child's total cost)`:

```
line cost (ingredient) = EP unit cost × quantity (converted into the ingredient's recipe unit)
line cost (sub-recipe) = (quantity ÷ child standard yield) × child's total cost
subtotal               = sum of every line's cost
cost per unit           = (subtotal ÷ standard yield quantity) × (1 + incidentals% / 100)
```

**Margin and food cost** (complements of each other by construction):

```
margin %     = (selling price − unit cost) / selling price × 100
food cost %  = unit cost / selling price × 100
suggested price = unit cost / (target food cost% / 100)
```

**Batch scaling** — a batch's ingredient requirements, and its purchase
list, scale by a single factor derived from the desired yield:

```
scaling factor = desired yield ÷ recipe's standard yield quantity
required AP    = (scaled, edible-portion quantity) / (yield% / 100)
packs to buy   = ceil(required AP, in purchase units ÷ purchase quantity per pack)
```

### Worked example (from the seed data)

*Vanilla Sponge Base* is a 1 kg sub-recipe with no incidentals:

| Ingredient | Price | AP unit cost | Recipe-unit cost | Line qty | Line cost |
|---|---|---|---|---|---|
| Cake Flour | R200,00 / 12,5 kg | R16,00/kg | 1,60c/g | 500 g | R8,00 |
| White Sugar | R150,00 / 10 kg | R15,00/kg | 1,50c/g | 400 g | R6,00 |
| Unsalted Butter | R425,00 / 5 kg | R85,00/kg | 8,50c/g | 100 g | R8,50 |
| Free-range Eggs | R114,00 / 30 units | R3,80/unit | R3,80/unit | 2 units | R7,60 |

Subtotal = R8,00 + R6,00 + R8,50 + R7,60 = **R30,10** — and since the
standard yield is 1 kg with 0% incidentals, cost per unit is also
**R30,10/kg**. This is exactly the figure `costRecipeById` returns for
this recipe (`totalCents: 3010, unitCents: 3010`).

*Classic Vanilla Cake* consumes the whole 1 kg sponge base (ratio 1÷1 =
R30,10) plus 200 mL Whole Milk (R19,00/L → 1,90c/mL → R3,80) plus 10 g
Baking Powder (R28,00/200 g → 14c/g → R1,40). Subtotal = R30,10 + R3,80 +
R1,40 = **R35,30**, over a standard yield of 12 units with 5% incidentals:

```
cost per unit = (3530 ÷ 12) × 1.05 = 294.1666... × 1.05 = 308.875 → R3,09 (rounded half-up)
```

At its seeded selling price of R15,00: margin = (1500 − 309) ÷ 1500 ×
100 = **79,4%**, food cost = 309 ÷ 1500 × 100 = **20,6%** (they sum to
100%, as they must). A target food cost of 35% would suggest a price of
309 ÷ 0.35 = 882,857... → **R8,83**.

## 10. Optional deployment

Local SQLite is the supported path for this project — deployment is
optional and not required for assessment. To deploy to Vercel with a
hosted Postgres database instead:

1. Change the Prisma datasource provider in `prisma/schema.prisma` from
   `sqlite` to `postgresql`.
2. Point `DATABASE_URL` at the hosted Postgres instance (set it as an
   environment variable in the Vercel project, not in a committed file).
3. Run `npx prisma migrate deploy` against that `DATABASE_URL` as part of
   the deploy step, and `npm run seed` once if you want the same demo
   data.
4. Set a real, random `SESSION_SECRET` in the Vercel project's
   environment variables — never reuse the placeholder from
   `.env.example`.

`src/costing/` needs no changes either way — it has no database
dependency to swap.

## 11. Troubleshooting

- **Node version mismatch** — `npm install` or `npm run dev` fails with a
  cryptic native-module or syntax error: check `node --version` is 20 or
  later.
- **Port 3000 already in use** — `npm run dev -- -p 3001` (or `npm start
  -- -p 3001`) runs on a different port.
- **Migration failure / "database is out of sync"** — delete the local
  database and its journal (`rm prisma/dev.db prisma/dev.db-journal`) and
  re-run `npx prisma migrate deploy` followed by `npm run seed`. This is
  a local SQLite file; deleting it loses no shared data.
- **Seed run twice** — safe by design. Units, ingredients, recipes,
  products and users are upserted on their unique field; recipe lines and
  price history rows are only inserted the first time (checked by
  presence), so re-running never duplicates anything.
- **Tests failing because the database wasn't migrated** — the unit
  tests (`src/costing/`, `src/lib/`) need no database at all and are
  unaffected. If an *integration* test fails immediately with a Prisma
  connection/migration error, it means `npx prisma migrate deploy` itself
  is failing in your environment — each integration test creates its own
  throwaway database and migrates it fresh, so this is unrelated to
  `prisma/dev.db`; check that `npx prisma migrate deploy` (see §3) runs
  cleanly on its own first.
- **"SESSION_SECRET is not set"** — you skipped `cp .env.example .env`,
  or edited `.env` and removed the variable.

## 12. Known limitations

- Ingredient names and recipe names are unique across the whole system —
  there's no per-category or per-location namespacing.
- Unit conversion only resolves a direct or inverse pair (kg↔g); it will
  not chain through a third unit (kg→g→mg in one hop) if only kg→g and
  g→mg conversions exist separately. Add the direct conversion instead.
- `MarginAlert`s are generated on a price change but there's no
  notification channel beyond the in-app Alerts list — nobody is emailed
  or paged.
- A batch's purchase list rounds each ingredient up to whole packs
  independently; it doesn't attempt to suggest buying fewer, larger packs
  as a cost optimisation.
- There's no soft-delete or audit trail for edits to ingredients, units or
  recipes themselves (only `IngredientPrice` is append-only by design) —
  editing an ingredient's purchase quantity, for instance, has no history.
- Role permissions are coarse (three fixed roles) rather than a granular
  permission system.
