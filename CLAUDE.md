# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Hosting & Deployment

This is a **static site hosted on GitHub Pages** at `bbabza.github.io`. There is no build step, no bundler, and no package manager. Changes pushed to the `main` branch deploy automatically. Do not suggest local server commands (`python3 -m http.server`, etc.) — opening HTML files directly in a browser (`file://`) is the local development method.

## Architecture

The site is a **multi-page static site** using vanilla HTML, CSS, and JS only. Each section lives in its own folder with an `index.html`:

```
index.html                  ← Home page (data-root="")
about/index.html
office-bearers/index.html
members/index.html          ← loads from Supabase; static rows are fallback
news/index.html             ← also reads news/news.json
gallery/index.html
tournament/index.html       ← 4-step registration flow; saves to Supabase
contact/index.html
blog/index.html
```

### Key Patterns

**Clean URLs:** Every `<head>` contains:
```html
<script>try{if(location.pathname.endsWith("index.html"))history.replaceState(null,"",location.pathname.slice(0,-10)||"./")}catch(e){}</script>
```

**Root-relative paths via `data-root`:** The `<body>` tag carries `data-root=""` on the home page and `data-root="../"` on all subfolder pages. `js/script.js` reads this at runtime (`const ROOT = document.body.getAttribute('data-root') || ''`) and prepends it to all dynamic fetch paths. HTML asset paths (`src`, `href`) must use the correct relative prefix — no leading slash.

**Self-hosted fonts:** Google Fonts CDN is intentionally not used (fails in Incognito). Fonts are in `/fonts/*.woff2` and declared in `css/fonts.css`. Every HTML page links to both `css/styles.css` and `css/fonts.css`. Never add `<link href="https://fonts.googleapis.com/...">` back.

**Right-click disabled site-wide:** `document.addEventListener('contextmenu', e => e.preventDefault())` runs at the top of `js/script.js`.

## JavaScript Files

- **`js/script.js`** — single shared script loaded by every page. Contains: admin auth system, right-click disable, news ticker, home news preview, mobile nav, member search/filter, gallery filter, contact form, scroll-reveal, counter animation.
- **`js/supabase-client.js`** — initialises `window._supabase` using the Supabase UMD CDN. Must be loaded *after* the Supabase CDN `<script>` and *before* `js/script.js`.
- **`js/qrcode.min.js`** — third-party QR code generator, used only on the tournament page.

**Script load order** (required on pages that use Supabase):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="../js/supabase-client.js"></script>
<script src="../js/script.js"></script>
```
Currently only `members/index.html` and `tournament/index.html` load the Supabase scripts. Add the same three tags to any new page that needs DB access.

## Supabase Integration

**Project:** `https://tiwazbntxvyvwfjzcwrv.supabase.co` — anon key stored in `js/supabase-client.js`. The client is exposed as `window._supabase` globally.

### Tables

**`members`**
| Column | Type | Notes |
|---|---|---|
| `enrollment_no` | text | unique, not null |
| `name` | text | not null |
| `practice_area` | text | nullable |
| `enrolled_year` | integer | |
| `status` | text | default `'Active'` |

RLS: public SELECT, public INSERT (anon key). No UPDATE/DELETE via anon key.

**`tournament_registrations`**
| Column | Type | Notes |
|---|---|---|
| `ref` | text | unique (e.g. `BBA-TRN-2026-XXXXX`) |
| `name` | text | |
| `enrollment_no` | text | |
| `bar_association` | text | |
| `mobile` | text | |
| `email` | text | nullable |
| `events` | jsonb | array of `{id, label, fee}` |
| `partners` | jsonb | keyed by event id |
| `total_amount` | integer | |
| `utr_number` | text | nullable; filled at Step 3 |
| `payment_status` | text | `pending` → `utr_submitted` |

RLS: public SELECT, INSERT, UPDATE (anon key).

### Data flow
- **Members page:** On load, fetches all rows ordered by `enrollment_no`. If the query returns data it replaces the static `<tbody>` rows; if the query fails or returns nothing, the static HTML rows remain as fallback.
- **Tournament page (Step 2 → 3):** `saveRegistrationToDB()` inserts a new row with `payment_status: 'pending'`.
- **Tournament page (Step 3 → 4):** `updateUTRInDB()` updates the row with the UTR number and sets `payment_status: 'utr_submitted'`.

## Admin System

**All admin logic lives inside `initAdmin()` in `js/script.js`** — no separate admin page or HTML changes are needed for new admin features.

**Authentication:** Client-side only. Password is verified by SHA-256 hashing the input via `SubtleCrypto` and comparing to a hardcoded hash. Login state is stored in `localStorage` under key `bba_admin`.

**How the admin accesses the system:** An "Admin Login" link is injected as the last item in the Quick Links footer list on every page. When logged in it reads "Admin Panel".

**On login:** `injectAdminNav()` inserts a gold `🔒 Admin` nav item before the Contact button. `injectAddMemberBtn()` injects an `+ Add Member` button above the members table (members page only).

**On logout:** Both injected elements are removed; `localStorage` flag is cleared.

**Add Member flow:** The button opens a modal form (enrollment no., name, practice area, enrolled year, status). On success, the row is inserted into Supabase and prepended live to the table without a page reload. Duplicate enrollment numbers surface a user-facing error.

**Adding new admin-only features:**
1. Add a function inside `initAdmin()`.
2. Call it from the three places that activate admin state: `if (isLoggedIn())` init block, `handleLogin()` success branch, and wire removal into `handleLogout()`.
3. Use `window._supabase` for any DB operations (available on pages that load the Supabase scripts).

## Content Data

**News ticker & home preview:** `news/news.json` — flat array of `{ "date": "DD Mon YYYY", "text": "..." }`. Prepend new items. Keep `loadFallback()` in `js/script.js` roughly in sync for offline/Incognito.

**Gallery:** Items use `data-category` on `.gallery-item` elements; filter buttons use `data-filter`. Add a category by adding a `.gfilter-btn[data-filter="<name>"]` button and tagging relevant items.

**Members:** The static `<tbody>` rows in `members/index.html` act as a fallback. The live source of truth is the Supabase `members` table. Add members via the Admin panel on the site, or directly in the Supabase dashboard.

## Styles

All styles in `css/styles.css`. CSS custom properties in `:root`:

| Variable | Value | Use |
|---|---|---|
| `--navy` | `#2a9d8f` | Primary teal |
| `--navy2` | `#1e7a6e` | Dark teal (headers, dark sections) |
| `--navy3` | `#0f5c54` | Darkest teal (topbar, footer) |
| `--gold` | `#c9a227` | Accent — CTAs, active nav, highlights |
| `--gold2` | `#a07d1a` | Darker gold (hover states) |
| `--cream` | `#f9f5ec` | Warm background tint |
| `--light` | `#f0faf8` | Light teal background tint |
| `--text` | `#2d2d2d` | Body text |
| `--muted` | `#667` | Secondary/muted text |
| `--ff-serif` | `'Libre Baskerville', Georgia, serif` | Headings |
| `--ff-sans` | `'Inter', 'Segoe UI', sans-serif` | Body text |

Sections at the bottom of `styles.css`: `/* ─── TOURNAMENT PAGE ───── */`, `/* ─── ADMIN MODAL & AUTH ───── */`.

## Adding a New Page

1. Create `<section-name>/index.html` — copy header/footer/nav from any existing subfolder page.
2. Set `data-root="../"` on `<body>`.
3. Use `../` prefix for all asset paths.
4. Add `aria-current="page"` to the correct nav `<a>`.
5. Add a nav `<li>` to **all** existing HTML files (9 files currently).
6. Add a `.page-hero` div after the ticker, before the first `<section>`.

## Forms

- **Contact form** (`contact/index.html`): fully client-side; shows a confirmation after 1.2 s timeout, transmits nothing.
- **Tournament registration** (`tournament/index.html`): 4-step flow (Select Events → Details → Payment → Confirmation). Registration data is persisted to Supabase. Payment is UPI-based; a coordinator verifies in person.
