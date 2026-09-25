# NOS 236 Creat8ves Inc. — Project Catch-Up for Claude Code

> Purpose: bring a fresh Claude Code session fully up to speed on the NOS 236 landing-page
> project — context, decisions, design system, full change history, open issues, and working
> conventions. Read this before touching any file.

---

## 1. Project context

- **Who:** Benji, working under **Profound Productions**, building deliverables for the end
  client **NOS 236 Creat8ves Inc.** — a corporate creative consultancy (strategic marketing,
  branding, communications, events) in Limpopo, South Africa. 100% female-owned, Level 2
  B-BBEE contributor, ~20 years' experience.
- **Brand name:** "NOS 236 Creat8ves Inc." (the **8** is styled in accent colour wherever the
  name appears). Confirmed over two alternatives ("NOS 236 Creatives", "NOS236 Events
  Creations" — the latter is the *old* identity; its tagline "Occasion of a lifetime" has been
  retired from the site).
- **Deliverables:** a single-file landing page, a Brand Ambassador application page, a branded
  PDF user manual, and a branded PDF change log. Footer credit "Made by Profound Productions"
  is required on pages and PDFs.

## 2. File inventory

| File | What it is |
|---|---|
| `nos236-landing-page.html` | Main single-file landing page (logo embedded as base64; ~380 KB). Rename to `index.html` at deploy. |
| `ambassadors.html` | Standalone Brand Ambassador application page (same design system, self-contained). Links assume the main page is `index.html`. |
| `NOS236 Website User Manual.pdf` | 9-page branded manual (reportlab; generator: `make_manual.py`). |
| `NOS236 Website Change Log.pdf` | 2-page branded change log covering changes 1–13 (generator: `make_changelog.py`). **Outdated — see §7.** |
| Backups (working dir) | `index-white-backup.html` (pre-red scheme), `index-pre-doc-backup.html` (pre content-revision doc). |

## 3. Design system (current)

- **Background:** "red & black radiant" — near-black-red base `linear-gradient(160deg,#3d0d12,#5c0f18 48%,#320a0e)` with two crimson radial glows (top-right `rgba(206,30,45,.75)`, bottom-left `rgba(170,20,32,.65)`), `background-attachment:fixed` (iOS ignores fixed — accepted).
- **Palette tokens:** `--ink:#17130f`, `--crimson:#c11a28`, `--deepred:#7a0d18`,
  `--muted:#f2dedc` (light on red), `--line:rgba(255,255,255,.22)`. Accent for text/icons on
  red: **blush `#ffd3d6`** (replaces crimson as accent everywhere on the red canvas).
- **Type:** display = **Cormorant Garamond** (swapped from Bodoni Moda for a gentler feel);
  brand wordmark in nav stays **Bodoni Moda** (matches the logo lettering); body/UI = **Archivo**. Google Fonts.
- **Nav:** sticky, black-ruby glass — `rgba(24,6,8,.68→.45)` + `backdrop-filter:blur(20px)
  saturate(1.5)`; shadow appears after scroll (`header.scrolled`, JS).
- **Section rhythm:** red canvas → dark translucent credentials strip `rgba(0,0,0,.22)` →
  About (open) → **black Services band** (`--ink`, hairline top/bottom borders
  `rgba(255,255,255,.09)` so it reads on the dark canvas) → How-we-work (open) → Why Us
  `rgba(0,0,0,.18)` with frosted cards `rgba(255,255,255,.07)` → **black Ambassador band**
  (hairline borders) → Contact (open, glass form fields `rgba(255,255,255,.08)`) → ink footer.
- **Buttons:** `.btn-solid` = white bg / deep-red text, blush hover; `.btn-ghost` = white
  outline. Both lift on hover.
- **Logo:** transparent PNG (verified alpha), trimmed + downscaled to 860px, embedded base64
  in the hero with `filter:drop-shadow(0 22px 34px rgba(0,0,0,.35))`. No white panel.
- **Signature motif:** the "spark" burst SVG (defined once in hidden `<defs>` as `#spark`,
  referenced via `<use>`) in eyebrows / strip / Why-Us cards. Icon set also in defs:
  `#i-user #i-brief #i-bulb #i-award #i-mail #i-phone #i-ig #i-chev #i-wa #i-target #i-shield
  #i-cal #i-mega #i-chat`.
- **Motion:** hero entrance stagger; IntersectionObserver scroll-reveals (`.reveal` → `.in`,
  reveal classes added *by JS only* so content is never hidden without JS); hover
  micro-interactions; ALL motion gated behind `prefers-reduced-motion: no-preference`.
- **Mobile (≤900px):** burger (`☰`→`✕`) opens a full-height panel anchored to the header
  (`position:absolute; top:100%` — **NOT fixed**, see §6 gotcha), dark red gradient, icon
  rows with chevrons, staggered entrance, full-width Let's-talk CTA, quick-contact circles
  (WhatsApp / email / Instagram), body scroll locked via `body.menu-open`.

## 4. Contact architecture (current)

- **WhatsApp Business: 081 567 1840** → all `wa.me/27815671840`. Primary channel.
- **Email: info@nos236creatives.co.za** — form secondary button, contact-list row, mobile-menu
  icon. (History: WhatsApp-only was originally a hard client rule; email was later re-added at
  the client's direction. The address evolved info@nos236creations.co.za →
  events@nos236creatives.co.za → **info@nos236creatives.co.za** per the client's content doc.)
- **No phone number on the site** (removed per client doc; zero `tel:` links).
- **Contact form:** one set of fields feeds both buttons — "Send on WhatsApp" (primary; opens
  chat with message pre-filled) and "Send by email" (opens mail app pre-filled;
  `reportValidity()` before firing). Static site ⇒ visitor always presses send themselves;
  the form's small print says so honestly.
- **"Let's talk" buttons** (nav, hero, mobile menu) → `mailto:info@nos236creatives.co.za`
  with subject `Website Enquiry` and template body ("Hello, I would like to enquire about… /
  Name: / Contact Number:") — per client brief.
- **Ambassador funnel:** homepage nav "Ambassadors" link + black band "Apply Now" →
  `ambassadors.html`: full application form (name, email, phone, age, city, province dropdown,
  optional occupation w/ student hint, social handles, shirt+pants size, motivation,
  experience Yes/No + details, comments). Submit builds an organised plain-text application
  and opens the mail app via mailto, then hides the form and shows the confirmation block.
  **The recipient is a single constant `PROMOTERS_EMAIL` at the top of the page's script**
  — `promoters@nos236creatives.co.za` (client-confirmed; distinct from the main business
  address `info@nos236creatives.co.za` used everywhere else on the site).

## 5. Content (current copy, post client revision doc)

- Hero: eyebrow "Corporate creative consultancy · Limpopo, South Africa"; headline
  `Bold Ideas . Strategic Impact` — red dot centred between the phrases, each phrase wrapped
  in `.nowrap`; lede = "A strategic marketing, branding, communications, and events
  consultancy… help organisations build powerful brands…"; buttons "Let's talk" (mailto) +
  "Explore Our Services" (#services).
- Nav brand: "NOS 236 Creat8ves Inc." — **no tagline beneath** (removed on request).
- Credentials strip: Nearly 20 years' experience · 100% female-owned · Level 2 B-BBEE
  contributor · **Limpopo based, serving clients nationwide**.
- About: "Where Strategy Meets *Creative Excellence*" + three paragraphs (single-column,
  `max-width:860px`). The former right-column "Our Expertise" list was removed when the
  Services section took that title (deliberate de-duplication — reversible).
- How we work: "From Insight to *Impact*", italic intro, steps 01 Strategic Insight /
  02 Strategy & Alignment / 03 Concept to Execution.
- Services (black band): "Our *Expertise*" — Marketing Strategy / Brand Management / Events &
  Experiences / Brand Activations & Promotions / Communications & Stakeholder Engagement,
  each with its own icon (target/shield/calendar/megaphone/chat), plus tile "Ready to grow
  your brand? / Get in Touch →" (#contact).
- Why: "The NOS *Difference*" — Transformation-Focused / Integrated Solutions / Strategic
  Expertise / Limpopo Market Expertise.
- Ambassador band: "Become a Promoter — Become a Brand Ambassador" → Apply Now → ambassadors page.
- Contact: "Let's Create Meaningful *Impact* Together", italic intro, WhatsApp row
  (081 567 1840), Email row, Instagram @nos.236creatives, Location Limpopo.
- Footer: © year (JS) · "Made by Profound Productions".
- Grammar repairs applied to client copy (all disclosed to Benji): "support organisations
  build/enter" → "help organisations build/enter"; "Curate and execute" → "Curating and
  executing". Unresolved query: "consistent brand **dominance**" in Brand Management reads
  oddly (possibly "governance"/"presence") — left verbatim.

## 6. Engineering gotchas learned the hard way (do not regress these)

1. **`backdrop-filter` on an ancestor creates a containing block for `position:fixed`
   descendants.** This once trapped the "full-screen" mobile menu inside the 72px header.
   Current solution: the menu is `position:absolute; top:100%` under the header — safe with
   glass. If you ever make the menu `fixed` again, it WILL break.
2. **Always `height:auto` with responsive images** — a CSS width override plus HTML `height`
   attribute squashed the logo once. A global `img{max-width:100%;height:auto}` guard exists.
3. **Class-specificity on the services CTA tile:** `.svc:hover` once overpowered `.svc-cta`,
   turning the tile muddy on hover. Keep a higher-specificity `.svc.svc-cta:hover`.
4. **Inline hover underlines can clip descenders** — nav links need `display:inline-block`,
   extra bottom padding, underline offset below baseline.
5. **Nav link items are a single `<ul>`** shared by desktop and mobile; the icon/chevron SVGs
   inside are hidden ≥901px. Add new nav items to that one list.
6. **Reveal animations must never hide content**: `.reveal` initial-hidden styles live inside
   `@media (prefers-reduced-motion:no-preference)` and the class is added only by JS.
7. **Curly vs straight apostrophes:** the HTML contains a mix; failed string replacements are
   usually a `'` vs `’` mismatch. Always grep the exact bytes before search/replace, and use
   assert-style replacement (fail loudly, never silently).
8. Base64 logo swaps: replace only the data between `src="data:image/png;base64,` and the
   closing quote; update the `width`/`height` attributes to the new intrinsic size.

## 7. Full change history (Benji tracks changes by number — continue the numbering)

| # | Change | Status |
|---|---|---|
| 1 | Removed two floating hero sparks + their CSS | LIVE |
| 2 | About right column → "Our Expertise" list from replacement.docx (2 disclosed grammar fixes) | superseded by 20 |
| 3 | Marketing Strategy Development wording ("drive sustainable growth") | superseded by 20 |
| 4 | Brand Strategy wording ("innovative") + list reorder | superseded by 20 |
| 5 | Corporate Events wording ("Curating…") | superseded by 20 |
| 6 | About paragraph 2 replaced | superseded by 20 |
| 7 | Template-style backgrounds (glassy white, S watermarks, satin band) | REVERTED by 8 |
| 8 | Revert of 7; **glassy nav retained** | LIVE (nav since restyled) |
| 9 | Services → glossy gradient red (system-wide contrast pass) | superseded |
| 10 | Satin red per template, gloss removed | superseded |
| 11 | Ambassador band matched satin red | superseded |
| 12 | Flat red Services + cream CTA tile | superseded |
| 13 | CTA tile hover fix (specificity) | superseded (principle kept) |
| 14 | **Services reverted to original black design** (explicit client wish) | LIVE |
| 15 | Full red colour scheme (white → red canvas, blush accents, white buttons) | LIVE (canvas since 16/17/19/22) |
| 16 | Black-red radiant background | superseded by 17 |
| 17 | "Reduce the black a bit" — red-shifted radiant | LIVE (via 22) |
| 18 | Email restored: events@… → then **info@nos236creatives.co.za**; auto-filled mailto (an unrequested intermediate add was reverted after Benji clarified he'd only asked a question — lesson: questions ≠ instructions) | LIVE |
| 19 | Pure red background (no black) | superseded by 22 |
| 20 | Full client content-revision doc applied (copy, Cormorant Garamond, dot-centred headline, phone removed, About single-column, section renames) | LIVE |
| 21 | Transparent logo swapped in; white panel removed; drop-shadow | LIVE |
| 22 | Red & black radiant restored on updated build (+ hairline borders on ink bands, black-ruby nav) | LIVE |
| 23 | Header tagline removed (brand name only) | LIVE |
| 24 | Strip item → "Limpopo based, serving clients nationwide" | LIVE |
| 25 | Ambassador page created + integrated (nav link w/ megaphone icon, Apply Now button); "Let's talk" → Website-Enquiry mailto | LIVE |
| 26 | `PROMOTERS_EMAIL` set to client-confirmed `promoters@nos236creatives.co.za` (was a stand-in on `info@`) | LIVE |
| 27 | Mailto CTA buttons (nav, hero, mobile menu) renamed **"Let's talk" → "Contact Us"** per written dev-requirements doc; ambassador-page confirmation copy tightened to match the doc's exact wording, with the "press send" mailto caveat kept as a smaller secondary note | LIVE |

## 8. Open items / risks to surface at the right moment

- **Confirm `info@nos236creatives.co.za` mailbox exists** (test email). mailto fails silently
  from the sender's perspective if it doesn't.
- **Confirm 081 567 1840 is WhatsApp-registered** (ideally WhatsApp Business) with a live test.
- "Automatic" email sending (both forms) is mailto-based: the visitor presses send in their
  mail app. True silent submission needs a form backend (Formspree / Web3Forms / Netlify Forms)
  — explained to Benji; not commissioned.
- `ambassadors.html` links back to `index.html` — correct **after** deploy rename; in local
  preview the back link 404s unless the main file is renamed locally too.
- **Both PDFs are now outdated**: the manual describes a white site with dark Services and
  WhatsApp-only contact; the change log stops at 13. Regenerate via `make_manual.py` /
  `make_changelog.py` (update content first) before final handover.
- Query for client: "consistent brand dominance" wording (§5).

## 9. Working conventions with Benji (match these)

- **Change numbering:** every revision gets the next number; reverts and supersessions are
  tracked explicitly. Recite the running changelog at the end of each change.
- **Revert precision:** when Benji quotes his own earlier instruction text to define a revert,
  match that scope *exactly* — don't over- or under-revert (e.g. Change 8 kept the glassy nav
  because it wasn't in the quoted scope).
- **Questions are not instructions.** "Can it work?" means explain — don't implement.
  (Learned at Change 18.)
- **Screenshot-driven QA:** Benji flags issues with phone screenshots; some show stale cached
  pages — check whether the "bug" exists in the current file before changing anything, and
  remind about hard-refresh when relevant.
- **Cascade responsibility:** any change includes fixing its knock-on effects (contrast, hover
  states, specificity) without being asked.
- **Copy integrity:** client copy goes in verbatim except outright grammar breaks; every
  repair is disclosed in the reply, never silent.
- Single-file architecture is a feature (hostable anywhere, one-file backup) — keep pages
  self-contained; assert-and-fail-loudly on all scripted edits; verify with grep after writing.

## 10. Deploy notes

Rename `nos236-landing-page.html` → `index.html`; upload it and `ambassadors.html` to
`public_html` (or drag both into Netlify/Vercel). Fonts load from Google Fonts (needs
internet). Update = overwrite the file(s); advise hard-refresh.
