# ssup with states

A fast constituency lookup — search, tap the map or use your location to find
your assembly constituency, the member who holds it, and the member of
parliament for the seat it sits inside, with every figure taken from a sworn
affidavit and linked back to it.

**States covered:** Andhra Pradesh (175 assembly seats, 25 Lok Sabha seats) and
Telangana (119 and 17). The switcher in the header moves between them; the state
leads the address, so `#/telangana/c/9` is a link anyone can open.

## Features

- A district map per state, with a stats strip and drill-down to constituencies
- Constituency profiles: declared cases, assets, education, and the sources
- Members of parliament, with the assembly segments inside each seat
- A state switcher, with each state's own map, members, pages and promises
- Search by constituency name, district, or representative
- Client-side geolocation to find your constituency
- Data pipeline with validation (duplicate checks, schema rules, banned-terms guard) and simplified geo assets under enforced size budgets

## Stack

- Vite + vanilla JS (hash-based router)
- MapLibre GL for maps
- Vitest for tests
- Node scripts for data build, geo simplification, and validation

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — build data bundle, then start Vite dev server
- `npm run build` — validate → build data → build site → build OG images
- `npm run validate` — validate representative/constituency records against spec rules
- `npm run build:data` — build the data bundle used by the app
- `npm run build:og` — generate OG images
- `npm run geo` — simplify source geo data
- `npm test` — run the test suite

## Project structure

- `src/` — app source (router, views, map, search, geolocation, formatting)
- `content/states/<slug>/` — per-state source content: `state.json`, the
  `representatives/` and `mps/` records, `geo/`, `pages/`, `promises/`
- `scripts/` — data build, geo simplification, and validation tooling
- `tests/` — test suite
- `docs/` — project docs

## Adding a state

1. `content/states/<slug>/state.json` — the manifest (validated).
2. `STATE=<slug> npm run geo` — boundaries into `content/states/<slug>/geo/`.
3. `node scripts/crawl-myneta.mjs <MyNetaSlug>` — the affidavits, cached on disk.
4. `node scripts/build-state-records.mjs <slug>` and `--mps` — the records.
5. `node scripts/add-myneta-photos.mjs content/states/<slug>/representatives`.
6. `npm run validate && npm run build` — everything is picked up automatically.

## Status

Deployed on Vercel.
