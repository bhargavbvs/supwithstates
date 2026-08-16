# ssup with Andhra — Parallel Plan (Gemini track)

Run these in your Gemini tool while Claude Code rebuilds the UI and finishes
the data. Everything here is deliberately **research/content work in
directories Claude does not touch**, so both tracks can push without merge
conflicts.

## Ground rules (paste into every Gemini session)

- Repo: https://github.com/bhargavbvs/supwithstates — work ONLY inside
  `docs/copy/`, `docs/design/`, `docs/qa/`, and
  `content/states/andhra/photos/`. Never edit `src/`, `scripts/`, or
  `content/states/andhra/representatives/`.
- This site publishes real elected officials' sworn-affidavit data. Framing
  rules: always say "declared criminal cases"; never call a person "criminal";
  pending cases are allegations, not convictions. Every fact needs a source
  URL.
- Commit small, push often.

## Task 1 — MLA photo manifest (highest value; model: Gemini 3.1 Pro or
Claude Sonnet 4.6 Thinking)

Produce `content/states/andhra/photos/manifest.json`: an array of entries

```json
{ "ac_no": 117, "name": "Narayana Ponguru",
  "url": "https://upload.wikimedia.org/...jpg",
  "credit": "Photographer / uploader name",
  "license": "CC BY-SA 4.0",
  "source_page": "https://commons.wikimedia.org/wiki/File:..." }
```

Rules:
- **Only freely licensed images**: Wikimedia Commons, Wikipedia infobox images,
  or official AP Legislative Assembly portraits if their terms allow reuse.
  Record the exact license string from the file page. If no free image exists,
  set `"url": null` with a note — do NOT substitute news-media photos.
- Prefer head-and-shoulders, recent (post-2019).
- Work district by district; the list of 175 winners is in
  `content/states/andhra/representatives/*.json` (read-only reference).
- Claude will merge the manifest into the records after license review.

## Task 2 — Methodology & About copy (model: any Flash tier is fine)

Write `docs/copy/methodology.md` and `docs/copy/about.md`, Gen-Z-friendly but
trustworthy:
- Methodology: where every number comes from (MyNeta/ADR/ECI), what
  "declared", "serious" (5-year max-sentence test, described in the repo's
  representative records' `note` fields), and "conviction" mean, the
  pending-cases-are-allegations disclaimer, how to report corrections.
- About: why the site exists, who it's for, plain language, short.
- Tone: short sentences, no jargon, no snark about individuals.

## Task 3 — Design references & party color audit (model: Flash)

`docs/design/references.md`:
- 5–8 screenshots/links of civic-data sites Gen-Z actually shares
  (nammakasa.in style masked maps, election scrollytelling, etc.) with one
  line each on what to steal.
- Verify official party brand colors (TDP yellow, YSRCP blue, JSP red, BJP
  saffron) with sources; suggest accessible text-on-color pairings.

## Task 4 — Data QA sweep (model: Gemini 3.1 Pro; start only after Tasks 1–2)

For each existing record in `content/states/andhra/representatives/` (101 done,
more landing daily), spot-check against its `source.myneta_url`:
- name spelling, party, age, total assets, liabilities, total case count.
- Log discrepancies to `docs/qa/discrepancies.md` as a table
  (ac_no · field · site value · source value · source URL). Do not fix files —
  Claude applies fixes so the validator and framing guard run.

## Suggested run order

1. Task 1 in chunks of ~2 districts per session (it's the long pole).
2. Task 2 once, early — Claude needs the copy for Phase P3.
3. Task 3 once, early — feeds Claude's Phase P1 palette.
4. Task 4 continuously in the background.
