# Profound Productions

A two-page site: a dynamic, filterable portfolio and a WhatsApp-only contact page.
Portfolio projects are managed through a password-protected `/admin` panel backed by Supabase — add, edit, or remove work without touching code.

## Stack

- **Next.js 16** (App Router) — deployed on Vercel
- **Supabase** — Postgres database (`projects` table) + Storage (project images) + Auth (admin login)
- Tailwind CSS v4

## Project structure

```
app/
  page.tsx              Homepage: hero + portfolio gallery
  contact/page.tsx       Contact page (WhatsApp deep link form)
  admin/
    page.tsx             Admin dashboard (protected)
    login/page.tsx       Admin login
    actions.ts           Server actions: create/update/delete project, upload image, sign out
components/
  portfolio-gallery.tsx  Public filterable gallery
  contact-form.tsx       WhatsApp contact form
  admin/project-manager.tsx  Admin CRUD UI
lib/
  supabase/client.ts      Browser Supabase client
  supabase/server.ts      Server Supabase client (Server Components/Actions)
  types.ts                Shared types + category labels
proxy.ts                  Auth gate for /admin routes (Next.js 16 middleware convention)
supabase/schema.sql        Full DB schema, RLS policies, storage bucket setup (already applied)
```

## One thing you must change before going live

Open `components/contact-form.tsx` and replace the placeholder WhatsApp number:

```ts
const WHATSAPP_NUMBER = "27000000000"; // TODO: replace with real number
```

Use international format, digits only, no `+` or leading `0` — e.g. South African number
`082 123 4567` becomes `27821234567`.

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase URL + anon key
npm run dev
```

## Create your admin login

This was deliberately left for you to do directly, since it involves your password:

1. Go to your Supabase project → **Authentication** → **Users** → **Add user** → **Create new user**
2. Enter your email + a password, check **"Auto Confirm User"**
3. Use those credentials at `/admin/login`

## Deploy to Vercel

```bash
npm install -g vercel   # if you don't have it
vercel login
vercel link             # link to your "profoundproductionss-8104's projects" team
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel --prod
```

When prompted for env values, use the same ones from your `.env.local`.

## Managing the portfolio

Go to `yoursite.com/admin`, sign in, and you can:
- Add a project (title, description, category, client name, image, display order, published toggle)
- Edit or delete any existing project
- Toggle "Published" to hide a project from the public site without deleting it (handy for drafts)

Categories map to your existing portfolio verticals: Local Business, Food & Snack Branding,
Event Flyers, Personal Branding, Music & Entertainment.
