# BUILD_LOG

## 2026-09-15 — Phase 1 (ingest, normalize, cache)

- Recon: verified the source exposes open read-only WordPress REST APIs — the county docs
  tree (`/wp-json/wp/v2/docs`) and The Events Calendar API (`/wp-json/tribe/events/v1/events`).
  CORS is open, so no scraping of the marketing pages (and none of their popups) is needed.
- Built `scripts/sync.mjs` (zero deps): walks the docs tree, fetches county article content,
  parses each county's fact table into structured fields, parses state/county/type out of
  event titles, matches events to counties, and emits static JSON under `public/data/`.
- Fixed a pagination bug: the WP docs list reports total pages via the `X-WP-TotalPages`
  HTTP header (the tribe API includes it in the body). First run only captured page 1.
- Canonicalization: counties can exist under multiple programs (redeemable, tax deed, hybrid);
  one canonical county per (state, name) is kept, preferring the doc that has guide content.
- Results: 6 programs, 46 states, 1494 counties, 1480 upcoming events (25 month files).

## 2026-09-15 — Phase 2 (shell, design system, motion)

- Next.js 16 App Router, static export (`output: "export"`), Tailwind v4 theme tokens,
  dark-by-default with a light mode toggle (persisted, no flash).
- Fonts: Space Grotesk (display) + Inter (body) via next/font.
- Motion primitives (page transition, stagger, item) + reduced-motion support.
- Header (sticky glass, nav, refresh, theme) + footer. TanStack Query + IndexedDB persistence.

## 2026-09-15 — Phase 3 (county directory)

- Hero with live stats (counties / upcoming auctions / states), instant search, state selector
  defaulting to Texas, and a responsive card grid with upcoming-auction badges.
- Hover/focus prefetches the county detail into the query cache.

## 2026-09-15 — Phase 4 (county detail pages)

- `/county/[id]` prerendered for all 1493 counties via `generateStaticParams`.
- Parsed key-facts grid, matched upcoming auctions, sanitized guide article, source link.
- Article HTML is sanitized in the sync (scripts/handlers/javascript: stripped; only
  YouTube iframes retained).

## 2026-09-15 — Phase 5 (calendar & filters)

- Upcoming auctions grouped by day, with type/state/county/date-range filters and a
  shareable county URL param. ICS + CSV export of the filtered set.

## 2026-09-15 — Phase 6 (resilience)

- All data is committed under `public/data/`, so the site renders even if the source is down.
- Empty states for no-search-results, no-counties, and no-auctions. County pages degrade to
  metadata-only when a doc has no guide content.

## 2026-09-15 — Phase 7 (test, polish, deploy)

- ESLint + `tsc --noEmit` clean. Playwright pass: 24/25 checks green (the single non-pass is a
  benign Chromium `compute-pressure` permissions warning, not app code).
- Verified at 375 / 768 / 1440px with no horizontal overflow on directory, calendar, and county.
- Deploy: created `AlexFerentsHB/tax-sale-calendar`, published `out/` to `gh-pages` with
  `.nojekyll`, enabled Pages (legacy build). Live:
  https://alexferentshb.github.io/tax-sale-calendar/
- Pivot/decision: the local `better-sqlite3` staging store from the brief was replaced with a
  JSON staging cache to avoid native-module build risk in an unattended run. Normalized output
  is identical; artifacts are the same shape.
- Decision: deploy to a NEW repo. The existing `alexferentshb.github.io` user-pages repo was
  left untouched (off-limits — it is an existing site).

### Known limitations

- Content is a snapshot at sync time; re-run `npm run sync` to refresh.
- County pages are keyed by the source document id (slugs are not unique across states).
- The deployed site is public and republishes the source's county guide text; treat the repo
  and Pages site as public.