# House Sookoo Data Tracker

A client-side data explorer for network/roster exports (G12 cell structure: Leader at
12 / 144 / 1728). Upload Excel roster exports, search and filter across the whole
network, and review a data-quality report — all in the browser.

## Why client-side only

The source files contain real names, phone numbers, emails, and home addresses.
Nothing is uploaded anywhere: parsing happens entirely in the browser with
[SheetJS](https://sheetjs.com/), and no data is persisted (no database, no
`localStorage`). Closing the tab clears everything.

## Data assumption

Each row is a (person, event/group) pairing with a static `First Visit` date — a
roster snapshot, not an attendance/check-in log. The tool does not compute
attendance counts, skip counts, or attendance calendars, because the source data
doesn't support that (see the original project handoff notes for how this was
verified).

## Running locally

```bash
npm install
npm run dev
```

## Access control

This app is protected by HTTP Basic Auth (`middleware.js`) since it processes
real people's PII once files are uploaded. Set `AUTH_USER` and `AUTH_PASSWORD`
as environment variables (locally in `.env.local`, and in the Vercel project
settings for the deployed site). If either variable is unset, the auth gate is
skipped.

## Tech

- Next.js (App Router)
- React, `useState`/`useMemo` only — no external state management
- `xlsx` (SheetJS) for parsing `.xls`/`.xlsx` files
- No backend, no database, no analytics
