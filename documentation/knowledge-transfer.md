# Bezwada Bar Association Website — Knowledge Transfer Document

**Site:** [bbabza.github.io](https://bbabza.github.io)
**Organisation:** The Bezwada Bar Association, Vijayawada — Estd. 1906
**Prepared:** August 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Hosting & Deployment](#2-hosting--deployment)
3. [Technology Stack](#3-technology-stack)
4. [Site Structure](#4-site-structure)
5. [HTML Conventions](#5-html-conventions)
6. [JavaScript Architecture](#6-javascript-architecture)
7. [CSS & Design System](#7-css--design-system)
8. [Font Hosting](#8-font-hosting)
9. [Supabase Database Integration](#9-supabase-database-integration)
10. [Admin System](#10-admin-system)
11. [News Ticker & Content Management](#11-news-ticker--content-management)
12. [Tournament Registration Flow](#12-tournament-registration-flow)
13. [Members Directory](#13-members-directory)
14. [Blog](#14-blog)
15. [Gallery](#15-gallery)
16. [Contact Form](#16-contact-form)
17. [External Dependencies](#17-external-dependencies)
18. [Common Maintenance Tasks](#18-common-maintenance-tasks)
19. [Adding a New Page](#19-adding-a-new-page)
20. [Security Notes](#20-security-notes)

---

## 1. Project Overview

The Bezwada Bar Association website is the official digital presence for one of Andhra Pradesh's oldest bar associations (founded 1906), serving over 1,800 enrolled advocates practising at the Civil Courts, Vijayawada.

**What the site does:**
- Publishes news, announcements, and event notices
- Lists office bearers (president, secretary, committee members)
- Hosts a searchable directory of enrolled members
- Runs a photo gallery of association events
- Provides a multi-step online tournament registration system with UPI payment
- Hosts an association blog
- Offers a contact page

---

## 2. Hosting & Deployment

| Item | Detail |
|---|---|
| **Platform** | GitHub Pages (free static hosting) |
| **Repository** | `github.com/bbabza/bbabza.github.io` |
| **Live URL** | `https://bbabza.github.io` |
| **Branch** | `main` — pushes here deploy automatically within ~30 seconds |
| **Build step** | None — files are served as-is |
| **Local development** | Open HTML files directly in a browser via `file://` |

**Deployment workflow:**
1. Edit files locally
2. `git add` the changed files
3. `git commit -m "description"`
4. `git push origin main`

GitHub Pages picks up the push automatically — no CI/CD pipeline, no build command.

---

## 3. Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| HTML | Vanilla HTML5 | No framework needed for a static informational site |
| CSS | Vanilla CSS with custom properties | Single `styles.css`, no preprocessor |
| JavaScript | Vanilla ES6+ (IIFE pattern) | No framework; all interactivity is progressive enhancement |
| Database | Supabase (PostgreSQL, hosted) | Free tier, REST API via CDN client, no server required |
| Fonts | Self-hosted `.woff2` files | Avoids Google Fonts CDN which fails in Incognito mode |
| QR Code | `qrcode.min.js` (third-party, local) | Used only on the tournament registration page |
| Version Control | Git / GitHub | Standard |

**There is no:**
- Package manager (no `package.json`, no `node_modules`)
- Bundler (no Webpack, Vite, Parcel)
- Transpiler (no Babel)
- CSS preprocessor (no Sass/Less)
- Server-side rendering
- Build output directory

---

## 4. Site Structure

```
bbabza.github.io/
│
├── index.html                  ← Home page
├── about/
│   └── index.html              ← About & history
├── office-bearers/
│   └── index.html              ← Elected leadership
├── members/
│   └── index.html              ← Searchable members directory (uses Supabase)
├── news/
│   ├── index.html              ← News & events (tabs: News | Events | Notices)
│   └── news.json               ← News data file (flat JSON array)
├── gallery/
│   └── index.html              ← Photo gallery with category filter
├── tournament/
│   └── index.html              ← 4-step tournament registration (uses Supabase)
├── contact/
│   └── index.html              ← Contact page (static form, no submission)
├── blog/
│   ├── index.html              ← Blog listing page
│   ├── compose.html            ← Admin blog post composer
│   └── posts.json              ← Blog posts data file
│
├── css/
│   ├── styles.css              ← All site styles
│   └── fonts.css               ← @font-face declarations
│
├── js/
│   ├── script.js               ← Main shared script (loaded on every page)
│   ├── supabase-client.js      ← Supabase client initialisation
│   └── qrcode.min.js           ← QR code generator (tournament page only)
│
├── fonts/
│   ├── inter-latin.woff2
│   ├── inter-latin-ext.woff2
│   ├── librebaskerville-latin.woff2
│   └── librebaskerville-latin-ext.woff2
│
├── images/
│   ├── logo.jpeg               ← Association logo / favicon
│   ├── bba_format.jpeg
│   └── tournament.jpeg
│
└── documentation/
    └── knowledge-transfer.md   ← This file
```

---

## 5. HTML Conventions

### Clean URLs
Every `<head>` starts with this snippet so visiting `.../about/index.html` in the address bar becomes `.../about/`:

```html
<script>try{if(location.pathname.endsWith("index.html"))history.replaceState(null,"",location.pathname.slice(0,-10)||"./")}catch(e){}</script>
```

### `data-root` attribute
The `<body>` tag carries a `data-root` attribute that tells `js/script.js` the path prefix needed to reach root-level files:

| Page | `<body data-root="...">` |
|---|---|
| `index.html` (home) | `data-root=""` |
| All subfolder pages | `data-root="../"` |

In `js/script.js`:
```js
const ROOT = document.body.getAttribute('data-root') || '';
// Usage: fetch(ROOT + 'news/news.json')
```

All HTML asset `src`/`href` attributes also use this prefix (e.g., `../css/styles.css` on subfolder pages), **never a leading slash**.

### `aria-current="page"`
The currently active nav `<a>` element carries `aria-current="page"` for accessibility and the CSS active underline state.

### Standard page template (subfolder)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script>try{if(location.pathname.endsWith("index.html"))history.replaceState(null,"",location.pathname.slice(0,-10)||"./")}catch(e){}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Page description here." />
  <title>Page Title | The Bezwada Bar Association</title>
  <link rel="icon" href="../images/logo.jpeg" type="image/jpeg" />
  <link rel="stylesheet" href="../css/styles.css" />
  <link rel="stylesheet" href="../css/fonts.css" />
</head>
<body data-root="../">

  <!-- Topbar -->
  <div class="topbar">...</div>

  <!-- Header / Nav -->
  <header class="site-header">...</header>

  <!-- News Ticker -->
  <div class="news-ticker" id="newsTicker">...</div>

  <!-- Page Hero -->
  <div class="page-hero">
    <div class="container">
      <p class="page-hero-eyebrow">Eyebrow text</p>
      <h2>Page Title</h2>
      <div class="breadcrumb">
        <a href="../index.html">Home</a>
        <span class="breadcrumb-sep">›</span>
        <span>Page Name</span>
      </div>
    </div>
  </div>

  <!-- Page content sections -->
  <section class="section section-light">...</section>

  <!-- Footer -->
  <footer class="site-footer">...</footer>

  <button class="back-to-top" id="backToTop" aria-label="Back to top">↑</button>
  <script src="../js/script.js"></script>
</body>
</html>
```

---

## 6. JavaScript Architecture

### `js/script.js`

Single shared script, loaded on **every page**. It is an IIFE (immediately-invoked function expression) in strict mode.

```js
(function () {
  'use strict';
  const ROOT = document.body.getAttribute('data-root') || '';
  // ... all features
})();
```

**Features inside `script.js`:**

| Feature | Key element IDs | What it does |
|---|---|---|
| Right-click disable | — | `contextmenu` event prevented globally |
| Admin system | `adminModal`, `adminLoginTrigger` | See Section 10 |
| News ticker | `tickerTrack`, `tickerPause` | Fetches `news/news.json`, builds scrolling ticker |
| Home news preview | `homeNewsGrid` | Fetches `news/news.json`, shows first 3 items as cards |
| Mobile nav | `navToggle`, `mainNav` | Hamburger menu toggle |
| Scroll-active nav | `.main-nav a[href^="#"]` | Highlights nav link when section scrolls into view |
| Back-to-top button | `backToTop` | Shows after 400 px scroll; smooth scroll on click |
| Sticky header shrink | `.site-header` | Adds `.scrolled` class after 60 px scroll |
| News/Events tabs | `.tab-btn`, `.tab-content` | `data-tab` attribute-based tab switching |
| Member search | `memberSearch`, `memberFilter` | Filters `#membersTable tbody tr` by text and practice area |
| Gallery filter | `.gfilter-btn`, `.gallery-item` | Shows/hides items by `data-category` |
| Contact form | `contactForm`, `formMsg` | Simulates submission with 1.2 s delay; no actual transmission |
| Scroll-reveal | `.bearer-card`, `.news-card`, etc. | IntersectionObserver fade-in for cards |
| Counter animation | `.stat-num` | Animates numbers in the hero stats strip on first scroll-in |

### `js/supabase-client.js`

Initialises the Supabase JS client using the project URL and anonymous key, and exposes it as `window._supabase`.

```js
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
```

**Must be loaded:** after the Supabase CDN script and before `script.js`.

### `js/qrcode.min.js`

Third-party QR code generator library. Only loaded on `tournament/index.html`. Used to render a UPI payment QR code during Step 3 of the registration flow.

### Script load order

For pages that use Supabase (currently `members/` and `tournament/`):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="../js/supabase-client.js"></script>
<script src="../js/script.js"></script>
```

For all other pages:
```html
<script src="../js/script.js"></script>
```

---

## 7. CSS & Design System

All styles live in `css/styles.css`. Fonts are declared separately in `css/fonts.css`.

### CSS Custom Properties (Design Tokens)

Defined in `:root`:

| Variable | Value | Usage |
|---|---|---|
| `--navy` | `#2a9d8f` | Primary teal — backgrounds, accents |
| `--navy2` | `#1e7a6e` | Dark teal — section headers, dark sections |
| `--navy3` | `#0f5c54` | Darkest teal — topbar, footer |
| `--gold` | `#c9a227` | Accent — CTA buttons, active nav, highlights |
| `--gold2` | `#a07d1a` | Darker gold — hover states |
| `--cream` | `#f9f5ec` | Warm background tint |
| `--light` | `#f0faf8` | Light teal background tint |
| `--text` | `#2d2d2d` | Body text |
| `--muted` | `#667` | Secondary / muted text |
| `--ff-serif` | `'Libre Baskerville', Georgia, serif` | Heading typeface |
| `--ff-sans` | `'Inter', 'Segoe UI', sans-serif` | Body typeface |

### Key CSS Sections (in order in `styles.css`)

1. CSS reset & base
2. Typography
3. Layout utilities (`.container`, `.section`, `.section-light`, `.section-white`)
4. Topbar
5. Site header & navigation
6. News ticker
7. Hero section
8. Section cards grid
9. Home news preview
10. Page hero / breadcrumb
11. About page
12. Office bearers
13. Members table
14. News & events
15. Gallery
16. Contact
17. Blog
18. Footer
19. Back-to-top button
20. `/* ─── TOURNAMENT PAGE ───── */`
21. `/* ─── ADMIN MODAL & AUTH ───── */`

### Responsive breakpoints

- Mobile navigation collapses at `≤ 768 px` (hamburger toggle)
- Grid layouts use CSS Grid with `auto-fit` / `minmax` columns

### Section background alternation

Use `.section-light` (cream/light teal) and `.section-white` (white) alternately for visual separation.

---

## 8. Font Hosting

Google Fonts CDN is **intentionally not used** — it fails in Incognito mode (privacy settings block third-party requests in some browsers).

**Self-hosted fonts (`/fonts/`):**

| File | Font Family | Subset |
|---|---|---|
| `inter-latin.woff2` | Inter | Latin |
| `inter-latin-ext.woff2` | Inter | Latin Extended |
| `librebaskerville-latin.woff2` | Libre Baskerville | Latin |
| `librebaskerville-latin-ext.woff2` | Libre Baskerville | Latin Extended |

Declared via `@font-face` in `css/fonts.css`. Every HTML page links to `fonts.css` in its `<head>`.

**Never add** `<link href="https://fonts.googleapis.com/...">` back to any page.

---

## 9. Supabase Database Integration

**Project URL:** `https://tiwazbntxvyvwfjzcwrv.supabase.co`
**Anon key:** stored in `js/supabase-client.js`
**Global client:** `window._supabase`

Supabase provides a PostgreSQL database accessed via REST over the browser. The anonymous key allows only the operations explicitly permitted by Row Level Security (RLS) policies.

### Table: `members`

Stores enrolled advocate records.

| Column | Type | Constraints |
|---|---|---|
| `enrollment_no` | text | PRIMARY KEY equivalent — UNIQUE, NOT NULL |
| `name` | text | NOT NULL |
| `practice_area` | text | nullable |
| `enrolled_year` | integer | nullable |
| `status` | text | default `'Active'` |

**RLS policies:**
- `SELECT`: public (anyone can read)
- `INSERT`: public via anon key (admin uses this to add members)
- `UPDATE`: not permitted via anon key
- `DELETE`: not permitted via anon key

**Data flow:**
1. On `members/index.html` load → `SELECT * FROM members ORDER BY enrollment_no`
2. If rows returned → replaces static HTML `<tbody>` rows
3. If query fails / returns nothing → static HTML fallback rows shown
4. Admin "Add Member" → `INSERT INTO members (...)` → new row prepended to table without reload

### Table: `tournament_registrations`

Stores tournament registration records from the 4-step flow.

| Column | Type | Notes |
|---|---|---|
| `ref` | text | UNIQUE — e.g. `BBA-TRN-2026-34567` |
| `name` | text | Registrant's full name |
| `enrollment_no` | text | Bar enrollment number |
| `bar_association` | text | Registrant's bar association |
| `mobile` | text | 10-digit mobile |
| `email` | text | Optional |
| `events` | jsonb | Array: `[{id, label, fee}, ...]` |
| `partners` | jsonb | Object keyed by event id: `{id: {name, enrollment_no, bar_association}}` |
| `total_amount` | integer | Sum of selected event fees |
| `utr_number` | text | UPI Transaction ID — filled at Step 3 |
| `payment_status` | text | `'pending'` → `'utr_submitted'` |

**RLS policies:**
- `SELECT`, `INSERT`, `UPDATE`: all permitted via anon key

**Data flow:**
- **Step 2 → Step 3:** `saveRegistrationToDB()` inserts row with `payment_status: 'pending'`
- **Step 3 → Step 4:** `updateUTRInDB()` updates row with `utr_number` and sets `payment_status: 'utr_submitted'`

---

## 10. Admin System

All admin logic lives inside `initAdmin()` in `js/script.js`. No separate admin page exists.

### Access

An **"Admin Login"** link is injected as the last item in the Quick Links footer list on every page. Clicking it opens a login modal.

When logged in, the link text changes to **"Admin Panel"**.

### Authentication

- **Type:** Client-side only
- **Method:** SHA-256 hash comparison using the browser's native `SubtleCrypto` API
- **Credentials:** Username `admin` + password hashed to `ADMIN_HASH` constant in `script.js`
- **Session storage:** `localStorage` key `bba_admin` set to `'1'` on login, removed on logout
- **Password:** `bbabza@admin2026` (SHA-256 hash hardcoded in `script.js`)

### On login
1. `injectAdminNav()` — inserts a gold "🔒 Admin" nav item before the Contact button in the header
2. `injectAddMemberBtn()` — injects an "+ Add Member" button above the members table (members page only)

### On logout
Both injected elements are removed and `localStorage` flag is cleared.

### Add Member flow
1. Click "+ Add Member" button (members page, when logged in)
2. Modal form opens: Enrollment No., Full Name, Practice Area (dropdown), Enrolled Year, Status
3. On submit: validates fields, then calls `window._supabase.from('members').insert(...)`
4. On success: new row prepended to table live without page reload
5. On duplicate enrollment_no: user-facing error shown (Supabase error code `23505`)

### Adding new admin features

```js
// In script.js, inside initAdmin():
function myNewFeature() { /* ... */ }
function removeMyNewFeature() { /* ... */ }

// Call from the three activation points:
// 1. if (isLoggedIn()) init block
// 2. handleLogin() success branch
// 3. handleLogout() removal
```

---

## 11. News Ticker & Content Management

### Ticker bar

A horizontally scrolling news ticker appears below the site header on every page. It is powered by `news/news.json`.

**Behaviour:**
- Fetches `news/news.json` on load; falls back to hardcoded items if fetch fails
- Items scroll at 60 px/second in a CSS animation loop
- Pause/resume button (❚❚ / ▶)
- Hovering the ticker pauses scrolling automatically

### `news/news.json`

Flat JSON array — newest item at the top:

```json
[
  { "date": "03 Aug 2026", "text": "Full announcement text here." },
  { "date": "10 Jul 2026", "text": "Another item." }
]
```

**To add a new news item:** prepend a new object to the top of the array and save the file.

**Date format:** `DD Mon YYYY` (e.g., `"03 Aug 2026"`)

### Home page news preview

The home page (`index.html`) also reads `news/news.json` and shows the first 3 items as cards in the "Recent News" section (`#homeNewsGrid`).

### Fallback

`loadFallback()` inside `initTicker()` in `script.js` contains hardcoded items shown when the JSON fetch fails (e.g., offline, Incognito, network error). Keep these roughly in sync with the top 3 items in `news.json`.

---

## 12. Tournament Registration Flow

Located at `tournament/index.html`. The page is a 4-step wizard driven entirely by inline JavaScript. The step bar tracks progress visually.

### Step 1 — Select Events

- 6 event categories shown as selectable cards:
  | Event | Type | Fee |
  |---|---|---|
  | Men's Singles | Individual | ₹1,000 |
  | Women's Singles | Individual | ₹1,000 |
  | Mixed Doubles | Pair | ₹1,500 |
  | Men's Doubles | Pair | ₹1,500 |
  | Women's Doubles | Pair | ₹1,500 |
  | 50+ Doubles | Pair (both 50+) | ₹1,500 |
- A live cart panel shows selected events and running total
- "Proceed to Register" button activates once at least one event is selected

### Step 2 — Your Details

- Registrant fields: Full Name, Enrollment No., Bar Association, Mobile, Email (optional)
- For each doubles event selected: partner name, enrollment no., bar association
- Terms checkboxes: eligibility declaration, rules acceptance
- Validation: mobile must be 10 digits; all required fields must be filled; partner details required for doubles

### Step 3 — Payment

- Registration saved to Supabase (`payment_status: 'pending'`)
- QR code generated dynamically using `qrcode.min.js` encoding a UPI deep-link:
  ```
  upi://pay?pa=bbabza@sbi&pn=Bezwada+Bar+Assn&am=<total>&cu=INR&tn=<ref>
  ```
- UPI ID displayed with a copy button
- "Open UPI App" link (works on mobile)
- UTR (UPI Transaction ID) input field
- "Payment Failed?" state: shows retry options and in-person payment instructions

### Step 4 — Confirmation

- UTR saved to Supabase (`payment_status: 'utr_submitted'`)
- Confirmation card shows: reference number, registrant name/enrollment, event list, total, UTR
- Print/Save button (`window.print()`)
- Note that a coordinator will verify payment within 24 hours

### Reference number format

Generated client-side using last 5 digits of `Date.now()`:
```js
const ref = 'BBA-TRN-2026-' + String(Date.now()).slice(-5);
```

### Coordinator contacts

Listed on the tournament page:
- VG Kiran Kumar: 96663 63366
- Ram Teja: 94400 09932
- Nirmal Rajesh: 70930 02477
- Nagendra: 94410 19380
- Raisa: 83412 32743
- WhatsApp enquiries: 96663 63466

### UPI ID

`bbabza@sbi` (defined as `const UPI_ID` in the inline `<script>` at the bottom of `tournament/index.html`). Update this constant if the UPI handle changes.

---

## 13. Members Directory

Located at `members/index.html`.

### Data source

Live data from Supabase `members` table. Static `<tbody>` rows in HTML are a fallback when the database is unavailable.

**The Supabase table is the authoritative source.** To add members:
- Use the Admin panel on the site (recommended)
- Or insert directly in the Supabase dashboard at `supabase.com`

### Search & filter

- **Text search** (`#memberSearch`): filters all visible rows by matching any cell text
- **Practice area filter** (`#memberFilter`): dropdown, filters by `cells[2]` (Practice Area column)
- Both controls work together (AND logic)
- Rows that don't match get CSS class `hidden`

### Table columns

| # | Column | Source |
|---|---|---|
| 1 | Enrollment No. | `enrollment_no` |
| 2 | Name | `name` |
| 3 | Practice Area | `practice_area` |
| 4 | Enrolled Year | `enrolled_year` |
| 5 | Status | `status` (badge: Active / Inactive) |

---

## 14. Blog

Located at `blog/index.html` (listing) and `blog/compose.html` (admin composer).

### `blog/posts.json`

Blog posts are stored in this JSON file. The listing page reads it dynamically.

### Blog filter bar

Category filter buttons are injected dynamically from the unique `category` values found in `posts.json`.

### Blog compose page

`blog/compose.html` is an admin-only page for composing and saving blog posts. Access is gated by the admin login system.

---

## 15. Gallery

Located at `gallery/index.html`.

### Filter system

- Filter buttons use `.gfilter-btn` with `data-filter` attribute
- Gallery items use `.gallery-item` with `data-category` attribute
- "All" button (`data-filter="all"`) shows everything
- Other buttons show only items whose `data-category` matches the filter value
- Filtered-in items get a `fadeIn .3s ease` CSS animation

### Adding a new category

1. Add a `<button class="gfilter-btn" data-filter="new-cat">New Category</button>` in the filter bar
2. Tag the relevant gallery items with `data-category="new-cat"`

---

## 16. Contact Form

Located at `contact/index.html`.

The form is **entirely static** — it does not transmit any data. On submit:
1. Button shows "Sending…" and is disabled
2. After 1.2 seconds, a green success message appears
3. Form is reset; button re-enables

This is intentional — the association relies on direct phone/email contact listed on the page.

---

## 17. External Dependencies

| Dependency | How loaded | Version | Used by |
|---|---|---|---|
| Supabase JS | CDN (`cdn.jsdelivr.net`) | `@2` (latest v2) | `members/`, `tournament/` |
| QRCode.js | Local file (`js/qrcode.min.js`) | Bundled | `tournament/` only |

All fonts are self-hosted. No other CDN dependencies exist.

**CDN URL for Supabase:**
```
https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js
```

---

## 18. Common Maintenance Tasks

### Add a news item
1. Open `news/news.json`
2. Prepend a new object to the array:
   ```json
   { "date": "15 Sep 2026", "text": "Your announcement text." }
   ```
3. Save and push to `main`

### Add a member (via site)
1. Go to any page, scroll to footer, click "Admin Login"
2. Log in with admin credentials
3. Go to the Members page — click "+ Add Member" button
4. Fill in the form and submit

### Add a member (directly in Supabase)
1. Open `supabase.com` → project `tiwazbntxvyvwfjzcwrv` → Table Editor → `members`
2. Insert a new row with: `enrollment_no`, `name`, and optionally `practice_area`, `enrolled_year`, `status`

### Update office bearers
Edit `office-bearers/index.html` directly — office bearer data is hardcoded HTML.

### Update tournament details
Update the constants and HTML directly in `tournament/index.html`:
- Event dates, venue, registration deadline: HTML in the info strip
- UPI ID: `const UPI_ID = 'bbabza@sbi'` in the inline script
- Event categories and fees: `const CATS = { ... }` in the inline script

### Update news page events / notices
Edit the content directly in `news/index.html` — events and notices are hardcoded HTML inside tab panels.

---

## 19. Adding a New Page

1. Create `<section-name>/index.html`
   - Copy header/footer/nav from any existing subfolder page (e.g., `contact/index.html`)
   - Set `<body data-root="../">`
   - Use `../` prefix for all asset paths (`../css/styles.css`, `../images/logo.jpeg`, etc.)
2. Add `aria-current="page"` to the correct nav `<a>` for the new page
3. Add a `.page-hero` div after the ticker, before the first `<section>`
4. Add a nav `<li>` to **all existing HTML files** (currently 9 files: `index.html` + 8 subfolder pages)
5. If the page needs Supabase, add the three script tags before `js/script.js`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   <script src="../js/supabase-client.js"></script>
   <script src="../js/script.js"></script>
   ```

---

## 20. Security Notes

### Admin authentication
The admin system uses **client-side only** authentication. This is adequate for the site's use case (content management only, no sensitive personal data writable by admin):
- The password hash is visible in source code — this is a known trade-off for a static site
- Admin actions (adding members) use the Supabase anon key, which has INSERT-only permissions
- There is no UPDATE/DELETE permission via the anon key — even a logged-in admin cannot delete members from the UI

### Supabase anon key
The anon key in `supabase-client.js` is a public-facing key by design. Supabase's RLS policies are the security boundary, not the key itself. The key only permits operations explicitly allowed by the RLS rules:
- `members`: SELECT + INSERT (no UPDATE/DELETE)
- `tournament_registrations`: SELECT + INSERT + UPDATE (needed to update the UTR number)

### Right-click protection
`document.addEventListener('contextmenu', e => e.preventDefault())` is applied globally. This provides minimal deterrence for casual users — it does not prevent image saving via browser DevTools or direct URL access.

### No user passwords stored
The site collects no user passwords. Tournament registration collects only name, enrollment number, bar association, mobile, and optional email — all stored in Supabase.

---

*End of knowledge transfer document.*
