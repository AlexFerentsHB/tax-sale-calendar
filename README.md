# Tax Sale.

A read-only directory and auction calendar for tax-sale investing: every county's tax-sale
rules on one page, and the upcoming tax deed / redeemable deed / tax lien auctions in one
calendar.

**Live:** https://alexferentshb.github.io/tax-sale-calendar/

Data comes from the public WordPress REST endpoints of `vault.taxlienschool.com`
(read-only GETs only) and is normalized into static JSON at sync time. The site has no
runtime dependency on that source.

## Stack

- **Next.js 16 (App Router) + TypeScript**, exported as a fully static site
- **Tailwind CSS v4** + a small set of hand-rolled UI primitives
- **Motion (framer-motion)** for transitions and list animations
- **TanStack Query** with **IndexedDB persistence** for client-side caching and offline revisits
- **`scripts/sync.mjs`** — zero-dependency Node pipeline (fetch → normalize → emit JSON)

## Local setup

```bash
corepack disable  # if you hit "UNSUPPORTED ENGINE" on npm engine warnings
npm install
npm run sync      # pulls the docs tree + upcoming events into public/data/
npm run dev       # http://localhost:3000
```

To refresh the data: `npm run sync` (cached in `./cache/`, incremental on re-run), then
`npm run build` to publish a new static export. The in-app refresh button re-fetches the
deployed artifacts.

## Build & deploy

```bash
npm run build     # runs sync then next build; output in ./out/
```

Deploy `./out/` to any static host (Vercel, Cloudflare Pages, Netlify, GitHub Pages).

For a subpath host (this project is published at `/tax-sale-calendar/` on GitHub Pages),
set the base path at build time:

```bash
NEXT_PUBLIC_BASE_PATH=/tax-sale-calendar npm run build
```

then publish `./out/` to the `gh-pages` branch (include a `.nojekyll` file so `_next` is
not stripped).

## Data model

The WordPress source exposes two open REST APIs:

- **County docs** — `GET /wp-json/wp/v2/docs?parent=<id>` — a tree of
  program → state → county. Each county doc's `content.rendered` includes a fact table
  (sale type, sale date, redemption period, interest rate, bid procedure, deposit,
  registration, location, contact) that is parsed into structured cards.
- **Events** — `GET /wp-json/tribe/events/v1/events?start_date=<now>` — upcoming auctions.
  County and state are parsed from each event title (e.g. `Harris County TX – Redeemable
  Deed Auction`) and matched to the county docs.

Artifacts written to `public/data/`:

- `manifest.json` — programs, states, counties (with upcoming-auction counts), event months
- `events/<YYYY-MM>.json` — events split by month
- `counties/<id>.json` — one file per county (facts + sanitized article HTML)

Additions to the source propagate via `npm run sync`. The pipeline is incremental:
county docs are re-fetched only when their `modified` date changes.

## Limitations

- Data is a snapshot of the source at sync time; always confirm details with the county.
- County pages are keyed by the source's document id; slugs are not unique across states.
- Some counties have no guide content or no upcoming auctions yet, and render graceful
  empty states.