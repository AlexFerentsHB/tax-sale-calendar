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