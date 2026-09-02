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
news/index.html             ← loads from Supabase; static HTML is fallback; reads news/news.json for ticker
gallery/index.html
tournament/index.html       ← 4-step registration flow with Razorpay payment; saves to Supabase
contact/index.html
blog/index.html
admin-news/index.html       ← Admin-only news & events management page (no public nav link)
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

- **`js/script.js`** — single shared script loaded by every page. Contains: session inactivity timer, admin auth system, member auth system, right-click disable, news ticker, home news preview, mobile nav, member search/filter, gallery filter, contact form, scroll-reveal, counter animation.
- **`js/supabase-client.js`** — initialises `window._supabase` using the Supabase UMD CDN. Must be loaded *after* the Supabase CDN `<script>` and *before* `js/script.js`.
- **`js/qrcode.min.js`** — third-party QR code generator (currently unused after Razorpay integration).

**Script load order** (required on pages that use Supabase):
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="../js/supabase-client.js"></script>
<script src="../js/script.js"></script>
```
Pages that load Supabase scripts: `members/index.html`, `tournament/index.html`, `news/index.html`, `admin-news/index.html`. Add the same three tags to any new page that needs DB access.

**Lazy Supabase loading:** `initAdmin()` exposes an `ensureSupabase()` helper that dynamically injects the CDN scripts on pages that don't include them statically (used by the tournament report on the tournament page).

## Supabase Integration

**Project:** `https://tiwazbntxvyvwfjzcwrv.supabase.co` — anon key stored in `js/supabase-client.js`. The client is exposed as `window._supabase` globally.

### Tables

**`members`**
| Column | Type | Notes |
|---|---|---|
| `enrollment_no` | text | unique, not null |
| `name` | text | not null |
| `cc_no` | varchar(30) | unique, nullable — Bar Council certificate number |
| `practice_area` | text | nullable |
| `enrolled_year` | integer | nullable |
| `status` | text | default `'Active'` |
| `mobile` | text | nullable |
| `address` | text | nullable |
| `description` | text | nullable — short bio |
| `photo_url` | text | nullable — public URL from `member-photos` storage bucket |
| `password_hash` | text | nullable — SHA-256 hex of member's password |
| `is_bar_council_member` | boolean | default false |
| `is_office_bearer` | boolean | default false |
| `office_bearer_position` | text | nullable — e.g. "President", "Secretary" |

RLS: public SELECT, public INSERT (anon key). No UPDATE/DELETE via anon key — updates go through edge functions.

**`member_sessions`**
| Column | Type | Notes |
|---|---|---|
| `token` | text | 64-char hex, unique |
| `enrollment_no` | text | FK to members |
| `expires_at` | timestamptz | 30 days from creation |

RLS: managed via service role key only (edge functions).

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
| `razorpay_order_id` | text | nullable — set after order creation |
| `razorpay_payment_id` | text | nullable — set after payment success |
| `payment_status` | text | `pending` → `paid` |

RLS: public SELECT, INSERT, UPDATE (anon key).

**`news_events`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `type` | text | `'news'` \| `'event'` \| `'notice'` |
| `category` | text | e.g. "Urgent", "Welfare", "Notice", "Circular" |
| `title` | text | not null — headline |
| `body` | text | not null — full description |
| `date_label` | text | not null — display format e.g. "03 Aug 2026" |
| `event_day` | text | nullable — e.g. "15" (events only) |
| `event_month` | text | nullable — e.g. "Sep" (events only) |
| `event_time` | text | nullable — e.g. "10:00 AM" (events only) |
| `event_venue` | text | nullable (events only) |
| `is_featured` | boolean | default false — full-width card on news page |
| `is_urgent` | boolean | default false — red border on notices |
| `is_published` | boolean | default true — false = draft, hidden from public |
| `created_at` | timestamptz | default now() |

RLS: public SELECT WHERE `is_published = true`. All writes via `news-admin-ops` edge function with admin password.

### Data flow
- **Members page:** On load, fetches all rows ordered by `enrollment_no`. Replaces static `<tbody>` rows if data is returned; static HTML remains as fallback.
- **News page:** On load, fetches published `news_events` from Supabase and replaces each tab's static HTML (News, Events, Notices). Static HTML remains as fallback if Supabase returns nothing.
- **News ticker:** Uses Supabase (`news_events` type='news') when `window._supabase` is available on the page; falls back to `news/news.json` otherwise.
- **Tournament (Step 1 → 2):** `saveRegistrationToDB()` inserts a row with `payment_status: 'pending'`.
- **Tournament (Step 2 → 3):** `tournament-create-order` edge function creates a Razorpay order and saves `razorpay_order_id`.
- **Tournament (Step 3 → 4):** `tournament-verify-payment` verifies HMAC-SHA256 signature and sets `payment_status: 'paid'` + `razorpay_payment_id`.

## Edge Functions

All deployed at `https://tiwazbntxvyvwfjzcwrv.supabase.co/functions/v1/<name>`.

| Function | Purpose |
|---|---|
| `admin-auth` | Verifies admin username + password against `ADMIN_HASH` env var |
| `member-auth` | Validates member enrollment_no + password, creates session token |
| `member-update` | Updates member's own profile fields: `address`, `description`, `photo_base64`. Name, mobile, cc_no, enrollment_no are **not** updatable by members |
| `member-admin-ops` | Admin CRUD on members: `set_password`, `update_member`. Allowed update fields: `name`, `cc_no`, `practice_area`, `enrolled_year`, `status`, `mobile`, `address`, `description`, `is_bar_council_member`, `is_office_bearer`, `office_bearer_position` |
| `member-reset-password` | OTP-based password reset via Firebase Phone Auth: `check_mobile` and `reset` operations |
| `news-admin-ops` | Admin CRUD on `news_events`: `list_all`, `create`, `update`, `delete` |
| `tournament-create-order` | Creates a Razorpay order via REST API and saves `razorpay_order_id` to DB |
| `tournament-verify-payment` | Verifies Razorpay HMAC-SHA256 signature and marks payment as `paid` |

**Security invariants:**
- Service role key is **never** exposed client-side — only used inside edge functions via `SUPABASE_SERVICE_ROLE_KEY` env var.
- Admin password is verified server-side against `ADMIN_HASH` (SHA-256 hex) env var.
- Razorpay signature is verified server-side — never trust the client.
- Allowed CORS origins: `https://thebezwadabarassociation.com` and `https://bbabza.github.io` only.

## Admin System

**All admin logic lives inside `initAdmin()` in `js/script.js`.**

**Authentication:** Password verified by SHA-256 via `SubtleCrypto` against `ADMIN_HASH` env var (via `admin-auth` edge function). Login state stored in `localStorage['bba_admin'] = '1'`. Admin password cached in `sessionStorage['bba_admin_pass']` for the session (used to authenticate edge function calls without re-prompting).

**Accessing the system:** An "Admin Login" link is injected as the last item in the Quick Links footer on every page. When logged in it reads "Admin Panel".

**On login, two nav items are injected** before the Contact button:
1. `📰 News` — links to `${ROOT}admin-news/` (news & events management page)
2. `🔒 Admin` — opens the admin panel modal

**Admin panel modal** contains a "Manage News & Events" button (routes to `admin-news/`) and a Logout button.

**On logout:** Both injected nav items are removed (`removeAdminNav()` clears all `.admin-nav-item` elements); `localStorage` and `sessionStorage` flags are cleared.

**Members page admin features:**
- `injectAddMemberBtn()` — injects an `+ Add Member` button above the table.
- `injectSetPwdBtns()` / `injectAdminMembersColHeader()` — adds an Actions column with 🔑 (set password) and ✏️ (edit member) buttons per row.
- `showMemberSetPwd(enrollmentNo)` — prompts for new password, calls `member-admin-ops/set_password`.
- `showMemberEditModal(enrollmentNo)` — full edit modal with 2-column grid layout; calls `member-admin-ops/update_member`.

**Tournament page admin feature:**
- `injectTournamentReport()` — injects a live registrations report table below the registration form (only on `tournament/index.html`).

**Adding new admin-only features:**
1. Add a function inside `initAdmin()`.
2. Call it from the three places that activate admin state: `if (isLoggedIn())` init block, `handleLogin()` success branch, and wire removal into `handleLogout()`.
3. Use `window._supabase` for read operations; use edge functions (with `sessionStorage['bba_admin_pass']`) for writes.

## Member Auth System

**All member auth logic lives inside `initMemberAuth()` in `js/script.js`.**

**Session storage:** `localStorage['bba_member']` holds `{ token, name, enrollment_no, member }`. Session token is validated server-side on each update.

**Inactivity timeout:** A shared `window._inactivityTimer` (defined before both `initAdmin` and `initMemberAuth`) auto-logs out any active session after **5 minutes of inactivity**. Activity events: `mousemove`, `mousedown`, `keydown`, `touchstart`, `scroll`, `click`. Timer starts on login and on page load if a session exists; stops on logout.

**Member nav item:** Avatar icon injected as the **last** nav item (after Contact button) via `injectMemberNav()`. Shows initials or photo.

**Profile modal — read-only fields (contact admin to change):**
- Enrollment No., C.C.No, Full Name, Mobile Number

**Profile modal — member-editable fields:**
- Address, Description, Photo (upload), Password (change)

**Forgot password flow:** OTP via Firebase Phone Auth → verify OTP → set new password via `member-reset-password` edge function.

## News & Events Management

**Admin page:** `admin-news/index.html` — accessible only when `localStorage['bba_admin'] === '1'`. Reachable via the `📰 News` nav item (admin only) or the "Manage News & Events" button in the admin panel modal.

**Three content types:**
- **News** — category, title, body, date_label, is_featured (makes it full-width on news page)
- **Event** — title, body, date_label, event_day, event_month, event_time, event_venue
- **Notice** — category, title, body, date_label, is_urgent (adds red styling)

**Draft/Publish:** `is_published = false` hides items from the public; admin can toggle per item.

**Display:** `news/index.html` loads from Supabase on page load and replaces each tab's static HTML. The static HTML in `news/index.html` is the visible fallback while Supabase loads (or if it fails). The news ticker uses Supabase on pages that have `window._supabase` available (news, members, tournament, admin-news pages); falls back to `news/news.json` elsewhere.

**`news/news.json`:** Still used as ticker fallback on pages without Supabase. Keep it roughly in sync with the top few news items added via the admin panel.

## Content Data

**Gallery:** Items use `data-category` on `.gallery-item` elements; filter buttons use `data-filter`. Add a category by adding a `.gfilter-btn[data-filter="<name>"]` button and tagging relevant items.

**Members:** The static `<tbody>` rows in `members/index.html` act as a fallback. The live source of truth is the Supabase `members` table. Add members via the Admin panel, or directly in the Supabase dashboard. Member table column order: Photo | Enr. No. | C.C.No | Name | Mobile | Address | Status | (admin: Actions).

**Office Bearers:** The "Bar Council Members" section in `office-bearers/index.html` is dynamically loaded from `members WHERE is_bar_council_member = true`.

## Styles

All styles in `css/styles.css`. CSS custom properties in `:root`:

| Variable | Value | Use |
|---|---|---|
| `--navy` | `#008B8B` | Primary teal — header background |
| `--navy2` | `#007575` | Dark teal — dark section backgrounds, headings |
| `--navy3` | `#006060` | Darkest teal — topbar, ticker, footer |
| `--gold` | `#c9a227` | Accent — CTAs, active nav, highlights |
| `--gold2` | `#a07d1a` | Darker gold — hover states |
| `--cream` | `#f9f5ec` | Warm background tint |
| `--light` | `#e6f7f7` | Light teal background tint |
| `--text` | `#2d2d2d` | Body text |
| `--muted` | `#667` | Secondary/muted text |
| `--ff-serif` | `'Libre Baskerville', Georgia, serif` | Headings |
| `--ff-sans` | `'Inter', 'Segoe UI', sans-serif` | Body text |

**Named sections at the bottom of `styles.css`** (in order):
- `/* ─── TOURNAMENT PAGE ─── */`
- `/* ─── ADMIN MODAL & AUTH ─── */`
- `/* ─── NEWS ADMIN MANAGEMENT ─── */`
- `/* ═══ GLOSSY ENHANCEMENTS ═══ */`

**Glossy effects active site-wide:**
- Animated gradient on home hero (`@keyframes hero-shift`, 14 s loop)
- Gold-to-white gradient clip on `.hero-content h2` and `.page-hero h2`
- Frosted-glass sticky header when scrolled (`.site-header.scrolled` — toggled by scroll listener in `script.js`)
- Shimmer sweep on gold buttons (`::after` pseudo-element)
- Inset top-edge highlight + multi-layer shadows on all white cards
- `backdrop-filter: blur()` on bearer cards and exec member cards (dark backgrounds)

## Adding a New Page

1. Create `<section-name>/index.html` — copy header/footer/nav from any existing subfolder page.
2. Set `data-root="../"` on `<body>`.
3. Use `../` prefix for all asset paths.
4. Add `aria-current="page"` to the correct nav `<a>`.
5. Add a nav `<li>` to **all** existing HTML files (currently 10 public pages).
6. Add a `.page-hero` div after the ticker, before the first `<section>`.

## Forms

- **Contact form** (`contact/index.html`): fully client-side; shows a confirmation after 1.2 s timeout, transmits nothing.
- **Tournament registration** (`tournament/index.html`): 4-step flow (Select Events → Registrant Details → Razorpay Payment → Confirmation). Registration data persisted to Supabase. Payment via Razorpay Standard Checkout; signature verified server-side via `tournament-verify-payment` edge function. Test ↔ Live switch is env-var only (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`).
- **News management** (`admin-news/index.html`): admin-only; creates/edits/deletes `news_events` rows via `news-admin-ops` edge function.
