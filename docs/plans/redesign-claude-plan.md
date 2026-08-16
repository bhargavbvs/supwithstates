# ssup with Andhra — Redesign Plan (Claude Code track)

Goal: make the site fun, colorful, and instantly readable for a Gen-Z audience,
with color theory doing the explanatory work (severity = color), an AP-only map
like the nammakasa.in reference, MLA photos, and full 175-seat data coverage.

## Project review — what's wrong today

**Bugs / broken**
1. **Constituency fills never render in real browsers.** Confirmed by the user's
   own production screenshots: layers are added, geojson loads, zero console
   errors, but MapLibre's WebGL fill layers don't paint. The map therefore shows
   the whole-of-India CARTO basemap with no AP highlight at all.
2. `src/views/static.js` is a placeholder — Methodology and About render as a
   bare `<h1>`. These pages carry the framing/trust story; they're empty.

**Design debt**
3. Zero visual identity: default system font, black-on-white, unstyled bullets.
   Stats card, district list, and profile pages read like a printed form.
4. No color semantics. "8 declared criminal cases" and "No declared cases" look
   identical in weight. Severity must be legible at a glance (green → amber →
   red → dark red).
5. No photos — initials avatar only. Profiles feel anonymous.
6. No mobile-specific layout, no share/OG cards (`build:og` was removed as an
   unimplemented stub), no meta description.

**Engineering debt**
7. Bundle is 940 KB minified, ~95 % of it maplibre-gl — for a map that doesn't
   render.
8. No CI: validate/tests run only when remembered locally.
9. 74 of 175 constituencies still lack data records.

## Core architectural decision: replace MapLibre with an inline SVG map

The WebGL fill bug has survived every configuration change while the data and
layer definitions verify as correct; it is not worth more patching. For a
state-level choropleth of 175 simple polygons, SVG is strictly better:

- **Fixes the bug class permanently** — plain DOM, no WebGL, no workers.
- **AP-only by construction** — no basemap, so no India map, no neighbor
  states. The state silhouette floats on the page background exactly like the
  nammakasa reference.
- **Full CSS control** — hover lift, transitions, severity fills, party fills,
  focus rings: everything the Gen-Z interactivity brief needs.
- **~900 KB bundle reduction** (drop maplibre-gl + its CSS).
- Geo source is small (224 KB) and already simplified; project to SVG viewBox
  at build time in `build-data.mjs` (equirectangular with latitude correction is
  fine at state scale).

Losses: street-level basemap context and slippy pan/zoom — neither is needed;
district drill-down becomes an animated `viewBox` zoom, which looks better.
"Use my location" already uses our own point-in-polygon code, so it keeps
working untouched.

## Design system (write once in `src/style.css` as tokens)

- **Mood**: playful-serious. Near-black ink on warm off-white canvas
  (`#FAF7F2`), one loud accent (electric violet `#6C3EF5`), chunky rounded
  cards (16 px radii), big numerals, subtle spring transitions (150–250 ms).
- **Severity scale (the color-theory core)** — used on map fills, badges, list
  rows, profile headers. Wording must respect the framing guard (always
  "declared cases", never label a person):
  - `sev-0` no declared cases → green `#1FA05C`
  - `sev-1` declared cases, none serious → amber `#E8A013`
  - `sev-2` ≥1 serious declared case → orange-red `#E4572E`
  - `sev-3` ≥1 conviction → deep red `#A11D33`
  - Every colored element pairs color with a text label/icon (color-blind safe).
- **Party chips**: TDP `#F5C518` (dark text), YSRCP `#1B458F`, JSP `#C41E3A`,
  BJP `#FF8F1F`, others neutral gray. Used for chips and the party map mode.
- **Type**: self-hosted Space Grotesk (display/numerals) + Inter (body) in
  `public/fonts/` — no CDN.
- **Motion**: count-up on stat numbers, constituency hover = brighten + 1.5 px
  outline, district zoom = 300 ms viewBox ease. `prefers-reduced-motion`
  respected.

## Phases (each = commit + deploy + check-in)

**P0 — SVG map engine (kills the bug, biggest visual win)**
- `scripts/lib/project-geo.mjs`: project constituencies+districts to a 1000-unit
  viewBox at build time; emit `public/geo/ap-map.json` (path strings + ids).
- `src/svg-map.js`: render `<svg>`, fill by severity from `data.json`, hover
  tooltip card (name, MLA, party chip, severity label), click → profile,
  keyboard focusable paths.
- Home: map is the hero, floating overlay card restyled; un-profiled seats get
  a hatched neutral fill so coverage progress is visible honestly.
- Remove maplibre-gl dependency.

**P1 — Design system + home polish**
- Tokens, fonts, dark-ink/off-white theme, chunky cards, count-up stats.
- Map mode toggle chips: **Cases** (severity scale) / **Assets** (sequential
  violet ramp by total assets) / **Party** (party colors). Legend always
  visible, one line, with plain-language labels.

**P2 — Profile + district pages**
- Profile: photo (from photo manifest — Gemini track), severity badge, party
  chip, asset bars (movable/immovable/liabilities as horizontal bars against
  the state max), margin bar for the 2024 result, sources footer restyled.
- District: mini SVG map of that district's constituencies (same severity
  fills) + card list with severity edge-stripes.

**P3 — Content + share**
- Real Methodology & About pages (copy from Gemini track, `docs/copy/`).
- `<meta>` description, OG tags, and a static share image; optional per-seat
  OG generation restored later.

**P4 — Data completion (runs interleaved with all phases)**
- Continue batches of ~10 to 175/175 with the established pipeline
  (MyNeta fetch → cross-check ADR PDF → result lookup → serious-case
  classification → validate → deploy). WebFetch-only fallback is proven.
- Merge photo manifest entries (`content/states/andhra/photos/manifest.json`,
  produced by Gemini track) into representative records after license review —
  validator enforces url+credit+license.

**P5 — CI**
- GitHub Action: `npm run validate && npm test && npm run build` on push/PR.

## Coordination contract with the Gemini track
- Claude owns: `src/`, `scripts/`, `index.html`,
  `content/states/andhra/representatives/`.
- Gemini owns: `docs/copy/`, `docs/design/`, `docs/qa/`,
  `content/states/andhra/photos/`.
- No overlap → no merge conflicts; Gemini commits to `main` or a branch, Claude
  merges manifest data into records (never Gemini directly editing records).
