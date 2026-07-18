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

Each row is a (person, event/group) pairing with a `First Visit` date. In the vast
majority of cases that date is static per (person, event) pair — a roster snapshot,
not an attendance/check-in log. Verified against a real 403-row export: only 6 of
~396 distinct (person, event) pairs repeat with a different date, and every one of
those is a recurring campus/church service (e.g. a weekly varsity gathering) where
someone genuinely came back. The app treats those as a feature, not an error — it
shows a "×N" badge and lists each visit chronologically instead of collapsing or
hiding the repeat. The tool still does not compute full attendance calendars or
skip counts — the data isn't a consistent enough check-in log for that.

## Features

- Multi-file upload, search, and filter across Leader @12/144/1728, event type,
  event name, and first-visit date range
- Person detail panel with click-to-call, click-to-WhatsApp, click-to-email, and
  a Google Maps link for the address — built for leaders who need to actually
  reach someone, not just look them up
- Data health checks: invalid/malformed emails, phone number issues, missing
  contact info (no email *and* no phone), vague addresses, people with no
  Leader @12 assigned, and fuzzy duplicate name detection
- "Unique people" vs "total records" stats, since roster-line count and
  headcount aren't the same thing once repeat visits are in the mix

## Running locally

```bash
npm install
npm run dev
```

## Tech

- Next.js (App Router)
- React, `useState`/`useMemo` only — no external state management
- `xlsx` (SheetJS) for parsing `.xls`/`.xlsx` files
- No backend, no database, no analytics
