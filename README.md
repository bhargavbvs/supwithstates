# ssup with Andhra

A fast, state-agnostic constituency lookup site — search or geolocate to find your Andhra Pradesh assembly constituency, its representative, and district context, with sourced, framing-compliant data.

## Features

- District map with stats strip and drill-down to constituencies
- Constituency profile pages with representative info and cited sources
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
- `content/states/` — per-state source content (currently Andhra Pradesh)
- `scripts/` — data build, geo simplification, and validation tooling
- `tests/` — test suite
- `docs/` — project docs

## Status

Not yet deployed — no hosting/Vercel configuration in the repo yet.
