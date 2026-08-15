# ssupwith — Design Spec

**Date:** 2026-08-15
**Status:** Approved design, pending implementation plan
**v1 domain:** ssupwithandhra.com (unregistered as of 2026-08-15)
**Repo:** `~/ssupwithstates` — state-neutral, one codebase serving every state site

> **Revision note (2026-08-15):** v1 was originally scoped as the promise tracker with the MLA
> map deferred to v4. Reversed after research showed affidavit data is *static until 2029* —
> a one-time import needing no upkeep — while promise verdicts need monthly judgment forever.
> Shipping facts before verdicts also builds credibility before making contested calls.
> The promise tracker design is preserved intact as v2 (§9).

---

## 1. Problem

Information about Andhra Pradesh's government and representatives is scattered across ECI
affidavits, government orders, budget documents, and partisan news. A citizen who wants to know
"who represents me, what's their record, and what was promised versus delivered" has no single
place to look, and no way to separate verified fact from party talking point.

By the 2029 assembly election, there should be a public, sourced record of both.

## 2. Constraints

- **Solo maintainer, a few hours per week.** Binding constraint on every decision below.
- Work must be **front-loaded and finite**, with low ongoing burn. Anything needing daily or
  weekly curation is out of scope permanently, not deferred.
- Zero hosting cost, zero ops.

## 3. Landscape (researched 2026-08-15)

**Representative data — the incumbent is MyNeta:**

| Project | What it does | Our edge |
|---|---|---|
| [MyNeta / ADR](https://www.myneta.info/AndhraPradesh2024/) | **All AP 2024 affidavit data already published** — education, assets, criminal cases, per candidate | Presentation only: map vs table, plain language vs affidavit-speak, mobile-usable. **Not a data edge** |
| [PRS MLA Track](https://prsindia.org/mlatrack) | MLA-level legislative data, covers AP | Different data; potential future input |

**Promise tracking — the slot is open (relevant to v2):**

| Project | Gap |
|---|---|
| [Sarkari Vaade](https://sarkarivaade.com/) | **Does not cover AP** — only governments 3+ years in. AP becomes eligible mid-2027 |
| [ManifestoWatch](https://manifestowatch.in/), [JanataAudit](https://janataaudit.com/en), [Political Accountability Platform](https://www.political-accountability.in/), [Informed Voter Project](https://informedvoterproject.org/) | Generic, national, no AP depth |
| [Vakku](https://www.vakku.in/) (Kerala), [WB Accountability Tracker](https://tracker.wbupdates.com/) | Proof the state-specific form works |
| [apsuper6.com](https://apsuper6.com/) | Super Six scheme *information* (how to apply), Telugu. Not verdict tracking. **Closest competitor — review before v2** |

**Conclusion:** v1 competes on design against an incumbent with the same data. v2 is where the
genuine data differentiation lives, and its window closes around mid-2027.

## 4. Data sources

| Source | Used for | Notes |
|---|---|---|
| [MyNeta AP 2024](https://www.myneta.info/AndhraPradesh2024/) | Affidavit data, 174/175 winners | No CSV export; API for media houses; bulk by email. **Email ADR before scraping.** [DataMeet scraper notebook](https://github.com/datameet/india-election-data/blob/master/affidavits/myneta.ipynb) exists |
| [ADR AP 2024 analysis (PDF)](https://adrindia.org/sites/default/files/Andhra_Pradesh_Assembly_Elections_2024_Criminal_and_Financial_background_details_of_Winning_Candidates_Finalver_English.pdf) | Aggregate stats, cross-check | 138/174 (79%) declared criminal cases; 98 (56%) serious; ₹11,323 cr total assets |
| ECI affidavits | Authoritative source | **Where ADR and ECI disagree, ECI is correct** (ADR's own disclaimer) |
| [DataMeet AC boundaries](https://projects.datameet.org/maps/assembly-constituencies/) / [HindustanTimesLabs](https://github.com/HindustanTimesLabs/shapefiles/tree/master/state/ac) | Constituency polygons | Converted from ECI KML |
| [datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES) / [India Geodata](https://yashveeeeeeer.github.io/india-geodata/) | District polygons (26, post-2022) | CC0 / CC-BY |
| [GOIR](https://goir.ap.gov.in/) | Government orders — v2 evidence spine | |

## 5. Multi-state architecture

Designed in from the start, because retrofitting is expensive and Telangana is planned.

```
content/states/
  andhra/
    state.json                    # all state-specific metadata
    geo/districts.geojson         # 26
    geo/constituencies.geojson    # 175
    representatives/*.json        # one file per constituency
    promises/*.json               # v2
    promise-sets/*.json           # v2
  telangana/                      # later, identical shape
src/                              # state-agnostic
site.config.js
scripts/validate.mjs
```

**Two rules keep this honest:**

1. **No state name, count, or party is ever hardcoded in `src/`.** Everything comes from
   `state.json` — display name, slug, assembly size, district count, ruling coalition, term
   start/end, GO portal URL, MyNeta slug, map centre and zoom.
2. **The entity is `representative`, not `mla`.** Lets the same schema hold MPs or corporators
   later with no migration.

**Deployment:** build per state (`STATE=andhra npm run build`); one Vercel project per state off
the same repo, one domain each. No runtime routing, no cross-state bundle bloat, complete domain
independence. Adding Telangana = one content folder + one Vercel project.

**Telangana note:** the code transfers, the content does not. Different manifesto (Congress Six
Guarantees), different GO portal, different affidavits. Treat it as a second content project, and
only start it once AP is stable and self-maintaining.

## 6. v1 scope — the map and representative layer

### In scope

- AP district map (26) → drill to constituency (175) → representative profile.
- Affidavit-derived data for all 174 profiled winners.
- Statewide stats strip.
- English only.
- Static site, no database, no accounts.

### Explicit non-goals

| Not doing | Why |
|---|---|
| **Individual MLA promises** | Not collated anywhere; 175 × manual research, unbounded. **Substitute:** show their *party's* manifesto promises via the v2 tracker |
| **"What each MLA has done"** | 175 × ongoing curation — the single most reliable way to kill this project |
| **District collectors** | Unelected (no voter decision attaches to it); rotate every 12–18 months (recurring upkeep, no election rhythm); weaker public-figure protection than politicians, so higher legal exposure; dilutes a site whose credibility depends on being narrow. A plain "your collector + official contact" directory is a *different product* — possible much later, no performance judgments |
| News aggregation | Unbounded daily work |
| User comments / opinions | Daily moderation obligation + intermediary liability; see §13 |
| Telugu | Deferred, not cancelled. Content layer built translation-ready |
| Telangana | See §5 |

### Site structure

- **`/`** — AP district map + stats strip
  (`175 constituencies · 174 profiled · 79% with declared cases · ₹11,323 cr declared assets`).
- **`/d/<district>`** — district view: constituencies within, each with its representative.
- **`/c/<constituency>`** — representative profile. Fixed order: identity → **mandatory affidavit
  disclaimer** → education → declared cases (pending and convicted shown separately) → assets and
  liabilities → election result → source links to MyNeta and ECI.
- **`/methodology`** — where data comes from, what "declared criminal case" means and does not
  mean, correction process. **Written before launch, not after the first complaint.**
- **`/about`** — who runs this, that it is unfunded, and any political affiliation.

## 7. Representative data model

One JSON file per constituency under `content/states/andhra/representatives/`.

```jsonc
{
  "id": "ap-ac-123-penukonda",
  "constituency": {
    "number": 123,
    "name": "Penukonda",
    "district": "Sri Sathya Sai",
    "reserved": null                 // null | "SC" | "ST"
  },
  "representative": {
    "name": "S. Savitha",
    "party": "TDP",
    "term_start": "2024-06",
    "age_at_election": 46,
    "profession": "Agriculture",

    "photo": {                       // nullable — omit entirely rather than guess
      "url": "...",
      "credit": "...",
      "license": "CC BY-SA 4.0"      // REQUIRED if photo present; build fails otherwise
    },

    "education": {
      "level": "Graduate",
      "detail": "B.A., Sri Krishnadevaraya University, 1998"
    },

    "declared_cases": {
      "total": 3,
      "serious": 1,                  // ADR's defined category
      "convicted": 0,                // REQUIRED even when 0 — forces the distinction
      "note": null
    },

    "assets": {
      "movable": 12300000,
      "immovable": 45000000,
      "total": 57300000,
      "liabilities": 8000000
    }
  },

  "result": {
    "votes": 89234,
    "margin": 12045,
    "runner_up": "...",
    "runner_up_party": "YSRCP"
  },

  "source": {
    "myneta_url": "https://www.myneta.info/AndhraPradesh2024/candidate.php?candidate_id=84",
    "eci_url": "...",
    "affidavit_filed": "2024-04",
    "retrieved": "2026-08-15"
  }
}
```

All figures are **as declared in a self-sworn affidavit**. Nothing is computed, inferred, or
editorialised. This is a presentation layer over public record — that is the entire legal and
credibility posture.

## 8. ⚠️ Framing of criminal case data — non-negotiable

This is the highest-risk element in the project. Declared cases are overwhelmingly **pending
allegations, not convictions**, and in AP many are politically filed in both directions.
Presenting an accused person as a criminal is defamation exposure, and it would be a fair
complaint.

**Required, everywhere the data appears:**

- The phrase is **"declared criminal cases."** Never "crimes," never "crime rate," never
  "criminal record."
- **"Serious criminal cases"** shown as a separate count, using ADR's definition.
- **Pending and convicted counts never merged** into a single number.
- Standing disclaimer on every profile and every aggregate:
  *"Self-declared in a sworn affidavit to the Election Commission of India. Pending cases are
  allegations, not convictions."*
- Attribution to ECI and ADR on every profile.
- ADR's own caveat carried: where ADR and ECI disagree, ECI is authoritative.

**Photos:** party and news photos are copyrighted — do not scrape image search. Use Wikimedia
Commons where available; otherwise render clean initial-based avatars. The validator refuses any
photo lacking a `license` field, so this cannot be forgotten under deadline pressure.

## 9. v2 — the promise tracker

Design retained from the original spec; ships after v1 is live.

### Promise data model

```jsonc
{
  "id": "free-bus-travel-women",
  "promise_set": "nda-2024",
  "parties": ["TDP", "JSP", "BJP"],
  "headline": "Free bus travel for women",

  "original_text": "...",            // VERBATIM from manifesto, never paraphrased
  "original_source": { "label": "NDA Manifesto 2024, p.4", "url": "..." },
  "explainer": "...",                // ours, visibly marked as ours

  "category": "transport",
  "beneficiaries": "All women in AP",

  "status": "in_progress",
  "status_since": "2025-11-20",
  "status_reason": "...",            // one sentence justifying THIS verdict

  "evidence": [
    { "date": "2024-08-12", "type": "go", "ref": "G.O.Ms.No. 43",
      "label": "Transport Dept — scheme sanctioned", "url": "https://goir.ap.gov.in/..." }
  ],

  "districts": []                    // populate only where variation is real
}
```

`evidence[].type` ∈ `go | budget | official | news | rti`.

**Two load-bearing decisions:** `original_text` is verbatim with a manifesto link, defeating the
standard *"you reworded it to look broken"* attack; and `status_reason` is mandatory with dated
evidence enforced by the validator, so an unsourced verdict cannot exist in the dataset.

### Status vocabulary

| Status | Means |
|---|---|
| `not_started` | No GO, no allocation, no announcement |
| `announced` | Officially announced or GO issued — no money or delivery yet |
| `in_progress` | Partially rolled out; real but incomplete |
| `delivered` | Delivered substantially as promised |
| `diluted` | Delivered, but materially smaller than promised |
| `stalled` | Started, then stopped or quietly dropped |

**`diluted` is the most important category.** Real example: the government
[halved the beneficiary count for the farmers' aid scheme](https://www.deccanherald.com/amp/story/india%2Fandhra-pradesh%2Fandhra-govt-halved-farmers-aid-beneficiaries-congress-sharmila-3606901).
Delivered — to half the promised people. Neither "delivered" nor "broken" describes that
honestly. It will draw the most criticism precisely because it is the honest category.

**No `broken` status until 2029.** Mid-term it is an editorial judgment, not a defensible factual
claim; `not_started` and `stalled` carry the same information without editorialising.

This vocabulary is expensive to change post-launch — it recolours every existing verdict.

### v2 monthly ritual

~2 hours/month: check GOIR for new GOs on tracked schemes; check budget documents at allocation
time; clear staleness warnings; commit each verdict change separately with its reason. Bounded,
repeatable, and the entire maintenance cost of v2.

## 10. Validator

`scripts/validate.mjs` runs before every build.

**Representatives — build fails if:**

- `source.myneta_url` is missing or malformed
- `declared_cases.convicted` is absent (must be explicit, even when `0`)
- `constituency.number` is outside 1–175 or duplicated
- any asset or case figure is non-numeric
- a `photo` object exists without a `license` field

**Promises (v2) — build fails if:**

- `original_text` or `original_source.url` is missing
- there are zero evidence items
- `status` is outside the six-value enum
- `delivered` / `diluted` / `stalled` lacks evidence dated on or after `status_since`
- `status_since` is missing, malformed, or in the future

**Warns** if a non-terminal promise status is untouched for 90 days.

Net effect: unsourced claims and unlicensed photos cannot physically enter the dataset —
enforced by build failure, not by discipline.

## 11. Audit trail

Git history is a product feature, not just version control.

- One data change = one commit, e.g.
  `verdict: free-bus-women in_progress -> diluted — rollout capped at 3 districts (GO 112)`
- Detail pages link to that file's commit history.
- Public repo: anyone can audit every change and its reason.

**Rationale:** with TDP at 164 seats and YSRCP at 11 after June 2024, any tracker will be accused
of partisanship by whichever side a fact disfavours. A complete, dated, public change history is
an answer no other tracker in India offers, for about a day of setup.

## 12. Stack

Inherited from ANDOLAN, which shipped and is actively maintained (171 entries):

- **Vanilla JS + Vite.** No framework.
- **MapLibre GL** for the map — already proven in ANDOLAN.
- **No database.** Static JSON fetched at runtime.
- **Vercel Hobby** hosting.
- Build merges `content/states/<state>/**` → `public/data.json` (generated, gitignored).

## 13. Risks

| Risk | Mitigation |
|---|---|
| **Defamation exposure from criminal case data** | §8, in full. Non-negotiable |
| **Photo copyright** | Wikimedia or initials only; validator enforces `license` |
| **Accusations of bias** | v1 makes no judgments at all — pure affidavit republication. Methodology page, git audit trail, declared affiliations |
| **Thin differentiation vs MyNeta in v1** | Design and usability are the edge; v2 is where unique data arrives |
| **ADR terms of use** | Email ADR before scraping; attribute everywhere |
| **Stale data** | Affidavits are static until 2029; `retrieved` date shown on every profile |
| **Legal exposure from user content (v3)** | Publisher model, not open comments. Intermediary rules and defamation exposure need a lawyer's review before any user content ships |
| **Election-period rules** | ECI Model Code and political-content restrictions apply near polls. Review well before 2029 |
| **Maintainer burnout** | v1 is finite and static; v2's burden is one bounded monthly ritual |

## 14. Phases

- **v1** — AP district map → constituency → representative profiles. This spec.
- **v2** — Promise tracker (§9), linked from each MLA via their party.
- **v3** — Telugu.
- **v4** — Corrections/evidence submissions (publisher model, legal review first).
- **later** — Telangana (Congress Six Guarantees); possibly a collector contact directory.

## 15. Open questions

- Register `supwithandhra.com` alongside `ssupwithandhra.com` and 301 the single-s variant —
  `ssup` is a typo magnet. `ssupwithtelangana.com` worth holding too. All five were unregistered
  as of 2026-08-15.
- Email ADR about bulk affidavit data access before building a scraper.
- Confirm AC boundary GeoJSON quality for AP's 175 constituencies (DataMeet vs HindustanTimesLabs).
- The 175th constituency: ADR analysed 174 of 175 winners. Identify the gap and how to display it.
- Review [apsuper6.com](https://apsuper6.com/) before v2 to confirm positioning is distinct.
