# CampusHustle

A campus side-hustle directory MVP for University of Pretoria (Hatfield).
Students list services (hair, nails, tutoring, ...); other students browse,
compare prices, read reviews, and contact sellers on WhatsApp.

Renaming: the product name lives in one place, `config.ts` (`APP_NAME`).

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage, RLS)
- Zod
- Hosted on Vercel

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy the env template and fill in your Supabase project's values
   (Project Settings > API in the Supabase dashboard):
   ```
   cp .env.example .env.local
   ```
3. Run the migration in `supabase/migrations/0001_init.sql` against your
   Supabase project (paste it into the SQL editor, or `supabase db push`
   if you're using the Supabase CLI locally).
4. (Optional, local dev only) Seed fake campus/category/seller data:
   ```
   npm run seed
   ```
   This requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` and creates
   fake auth users (`seed-seller-N@example.test`) plus seller profiles.
   **Never run this against a production project.**
5. Start the dev server:
   ```
   npm run dev
   ```

## Environment variables

| Variable | Where it's used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: seed script, future admin actions. Bypasses RLS — never expose to the browser. |

## Project config

All app-wide constants (name, allowed student email domains, active
categories, upload limits) live in `config.ts`.

**Before Phase 3 (auth/verification) starts:** `ALLOWED_EMAIL_DOMAINS` in
`config.ts` is a placeholder (`tuks.co.za`) pending confirmation of the
correct UP student email domain(s) — update it there before relying on
email-domain verification.

## Migrations

SQL lives in `supabase/migrations/`, applied in filename order. Each file
is a plain SQL script — apply it via the Supabase SQL editor or the
Supabase CLI.
