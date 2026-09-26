# Watchtower setup — do these by hand

Claude can't create accounts, so this is your checklist. It takes about 45 minutes once.
Free-tier limits change; check the pricing page when you sign up.

Facts checked on 2026-09-25 (read-only):
- Supabase org "Profound Productions Projects" is on the **Pro** plan (daily backups, spend cap available).
- Vercel team `profoundproductionss-8104's projects` has 7 projects (listed below).

---

## 1. Uptime monitors (UptimeRobot or Better Stack, free tier)

Pick **one** service. UptimeRobot's free tier has more monitors; Better Stack's has nicer alerts and status pages.

- [ ] Sign up with the email you actually read on your phone.
- [ ] Install the mobile app and turn on push alerts (email alone gets missed).
- [ ] Create these monitors (HTTP(S), shortest free interval):

| Priority | Monitor | URL | Type / check |
|---|---|---|---|
| RED | Coco Bliss home | https://www.cocobliss.co.za | Keyword: a word always on the home page (e.g. the brand name) |
| RED | Coco Bliss checkout | https://www.cocobliss.co.za/[CONFIRM checkout path] | Keyword present on the checkout page (not just HTTP 200: a broken page can return 200) |
| RED | Coco Bliss apex redirect | https://cocobliss.co.za | HTTP; expect a 308 redirect to www (catches DNS mistakes) |
| AMBER | Profound Productions | https://profound-productions.vercel.app | HTTP 200 |
| GREEN | CampusHustle | https://hustle-corner.vercel.app | HTTP 200 |
| Client | Creat8ves Inc | https://nos236-creat8ves-inc.vercel.app | HTTP 200 [CONFIRM it's a live client site] |
| Client | House Sookoo tracker | https://house-sookoo-data-tracker.vercel.app | HTTP 200 [CONFIRM] |
| — | Each Care Plan client site | [CONFIRM list] | HTTP 200 + keyword |

- [ ] Coco Bliss monitors: alert after **1** failure. Others: after 2 (fewer false alarms).
- [ ] SSL expiry alerts on (if offered): 14 days before expiry.
- [ ] Optional: a public status page for Coco Bliss, useful when customers ask "is the site down?".

**Don't** point a monitor at a URL that creates orders, sends emails, or needs a login.

## 2. Vercel alerts

- [ ] Vercel dashboard → your avatar → **Account Settings → Notifications**: turn on email **and** push for *Deployment failed* (at least for production).
- [ ] For `coco-bliss-project-v2`: project → **Settings → Git**: confirm production deploys only from `main`.
- [ ] If your plan offers **Observability → Alerts** (error-rate or anomaly alerts), create one for `coco-bliss-project-v2` on 5xx error rate. If it isn't on your plan, the weekly health-triage routine covers runtime errors instead; don't pay for it just for this.
- [ ] Usage: **Settings → Billing → Spend Management** (if shown): set a spend limit plus a notification threshold.

## 3. Supabase spend alert

- [ ] Supabase dashboard → **Organization "Profound Productions Projects" → Billing**:
  - [ ] **Spend cap**: decide on or off. *On* stops surprise bills but can pause services at the limit, which is bad for Coco Bliss's live payments. *Off* never pauses but can overspend. Recommended: **off**, plus the two checks below.
  - [ ] Note the billing email and make sure it reaches your phone.
- [ ] Calendar: monthly reminder, "Supabase usage page, 5 minutes". Look for compute add-ons you don't remember adding and **branches still running** (schema-keeper deletes them, but check). health-triage also flags branches older than 7 days.

## 4. Monthly backup check (Coco Bliss and network-growth first)

Pro includes **daily backups** (currently 7 days retention; check the docs for your plan). A backup you've never checked isn't a backup.

Monthly, about 15 minutes:
- [ ] Dashboard → project → **Database → Backups**: confirm a backup from the last 24 hours exists for `xvpdqldlqbtafcbycwxp` (Coco Bliss) and `whvmbftpbrqkygnltvvz` (network-growth).
- [ ] Every 3 months, a real restore test **into a new or throwaway project, never the production one**: restore, then compare a few counts (orders last month, products). Delete the test project afterwards (it costs money while it runs).
- [ ] Optional offline copy: `supabase db dump --db-url "<connection string>" -f cocobliss-YYYY-MM.sql` (schema) and `--data-only` (data), run on your own PC.
  - network-growth and Coco Bliss dumps contain **personal data (POPIA)**: store them encrypted (e.g. a BitLocker or VeraCrypt volume), never in git, OneDrive "shared" folders, or email. Delete dumps older than 3 months.
- [ ] Consider **PITR** (point-in-time recovery, paid add-on) for Coco Bliss if losing up to 24 hours of orders would hurt. Cost/benefit is your call.

## 5. After setup

- [ ] Test each alert once: pause a non-RED monitor for a minute or use the service's "send test alert" button; confirm your phone buzzes.
- [ ] Add the monitor list to `~/.claude/PORTFOLIO.md` under each project ("Monitored: UptimeRobot, 1-fail alert").
