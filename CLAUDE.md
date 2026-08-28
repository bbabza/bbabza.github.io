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
members/index.html
news/index.html             ← also reads news/news.json
gallery/index.html
tournament/index.html       ← 3-step registration flow, JS-only
contact/index.html
```

### Key Patterns

**Clean URLs (no index.html in address bar):** Every `<head>` contains this snippet:
```html
<script>try{if(location.pathname.endsWith("index.html"))history.replaceState(null,"",location.pathname.slice(0,-10)||"./")}catch(e){}</script>
```

**Root-relative paths via `data-root`:** The `<body>` tag carries `data-root=""` on the home page and `data-root="../"` on all subfolder pages. `js/script.js` reads this at runtime (`const ROOT = document.body.getAttribute('data-root') || ''`) and prepends it to all dynamic fetch paths (e.g. `fetch(ROOT + 'news/news.json')`). HTML asset paths (`src`, `href`) must also use the correct relative prefix — no leading slash.

**Self-hosted fonts:** Google Fonts CDN is not used (fails in Incognito/restrictive networks). Fonts are in `/fonts/*.woff2` and declared in `css/fonts.css`. Every HTML page links to both `css/styles.css` and `css/fonts.css`. Never add `<link href="https://fonts.googleapis.com/...">` back.

**Shared JS (`js/script.js`):** Handles all pages — mobile nav toggle, news ticker (fetches `news/news.json` with inline fallback), home news preview, back-to-top, sticky header shrink, news/events tabs, members search/filter, gallery filter, contact form, scroll-reveal via `IntersectionObserver`, and counter animation. Page-specific JS (e.g. tournament registration) lives in an inline `<script>` at the bottom of that page.

## Content Data

News items for the ticker and home preview come from `news/news.json` — a flat JSON array of `{ "date": "DD Mon YYYY", "text": "..." }` objects. The ticker script fetches this at runtime and falls back to hardcoded items if the fetch fails. To add news, prepend a new object to this array.

**Members directory** is a static HTML `<table>` inside `members/index.html` — there is no members JSON file. Add or edit members by editing the table rows directly. The search/filter in `js/script.js` operates on the rendered DOM (column 2, zero-indexed, is the practice area used for the `<select>` filter).

**Gallery items** use `data-category` on each `.gallery-item` element. The filter buttons carry `data-filter` matching those category values. Add a new category by adding a `.gfilter-btn[data-filter="<name>"]` button and tagging the relevant `.gallery-item` elements with `data-category="<name>"`.

## Static-only forms

Both interactive forms are fully client-side — there is no backend:

- **Contact form** (`contact/index.html`): `submit` is intercepted, a confirmation message is shown after a 1.2 s `setTimeout`, and nothing is transmitted.
- **Tournament registration** (`tournament/index.html`): generates a local reference number from `Date.now()`. Payment and verification happen in-person at the Association office. Do not wire up a real submission endpoint without also adding server-side validation and spam protection.

## Styles

All styles are in `css/styles.css`. CSS custom properties (defined in `:root`) drive the palette and typography:

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
| `--radius` | `6px` | Border radius |
| `--shadow` | `0 4px 24px rgba(15,92,84,.12)` | Card shadow |

Tournament-specific styles are at the bottom of `styles.css` under `/* ─── TOURNAMENT PAGE ───── */`.

## Adding a New Page

1. Create `<section-name>/index.html` — copy the header/footer/nav block from any existing subfolder page.
2. Set `data-root="../"` on `<body>`.
3. Use `../` prefix for all asset paths (`../css/styles.css`, `../images/logo.jpeg`, etc.).
4. Add `aria-current="page"` to the correct nav `<a>` tag.
5. Add a nav `<li>` for the new page to **all** existing HTML files (8 files currently).
6. Add a `.page-hero` div immediately after the ticker (before the first `<section>`) to show the page title and breadcrumb — see any existing subfolder page for the pattern.

## Updating the News Ticker

Edit `news/news.json` — add new entries at the top of the array. The ticker and home news preview both consume this file. The fallback content in `js/script.js` (`loadFallback()`) should also be kept roughly in sync for the offline/Incognito case.
