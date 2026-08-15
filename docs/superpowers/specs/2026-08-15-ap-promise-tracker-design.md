# ssupwithandhra — Design Spec

**Date:** 2026-08-15
**Status:** Approved design, pending implementation plan
**Domain:** ssupwithandhra.com (unregistered as of 2026-08-15)
**Repo:** `~/ssupwith`

---

## 1. Problem

Information about what the Andhra Pradesh government has actually delivered is scattered across
government orders, budget documents, press releases, and partisan news coverage. A citizen who
wants to know "what was promised, and what actually happened" has no single place to look, and
no way to distinguish a verified fact from a party talking point.

By the 2029 assembly election, there should be a public, sourced record of what the 2024 NDA
manifesto promised and what was delivered.

## 2. Landscape (researched 2026-08-15)

**Existing trackers — none cover AP at depth:**

| Project | What it does | Gap |
|---|---|---|
| [PRS MLA Track](https://prsindia.org/mlatrack) | MLA-level data, covers AP 15th assembly | No promise tracking |
| [Sarkari Vaade](https://sarkarivaade.com/) | Promise tracking, strong methodology | **Does not cover AP** — only governments 3+ years in. AP becomes eligible mid-2027 |
| [ManifestoWatch](https://manifestowatch.in/) | National promise tracking | Thin, English-only, no state depth |
| [JanataAudit](https://janataaudit.com/en), [Political Accountability Platform](https://www.political-accountability.in/), [Informed Voter Project](https://informedvoterproject.org/) | Various rep/promise tracking | Generic, no AP depth |
| [Vakku](https://www.vakku.in/) (Kerala), [WB Accountability Tracker](https://tracker.wbupdates.com/) | State-specific promise trackers | Proof the state-specific form works |
| [apsuper6.com](https://apsuper6.com/) | Super Six scheme info, Telugu | Scheme *information* (how to apply), not verdict tracking. **Closest competitor — review before launch** |

**Government sources — these are inputs, not competitors:**

- **[GOIR](https://goir.ap.gov.in/)** — every AP government order, searchable. **The primary evidence source.**
- **core.ap.gov.in** — AP department performance dashboard.
- Annual budget documents — allocation evidence.

**Conclusion:** the AP-specific, evidence-backed, plain-language slot is open. The window is
roughly until mid-2027, when Sarkari Vaade's eligibility rule brings AP into scope.

## 3. Constraints

- **Solo maintainer, a few hours per week.** This is the binding constraint on every decision below.
- Work must be **front-loaded and finite**, with low ongoing burn. Anything requiring daily or
  weekly curation is out of scope permanently, not deferred.
- Zero hosting cost, zero ops.

## 4. Scope

### v1 (this spec)

- The **Super Six** promises from the 2024 NDA (TDP–JSP–BJP) manifesto, decomposed into
  ~15–25 individually trackable sub-promises.
- English only.
- Static site, no database, no accounts.

### Explicit non-goals for v1

| Not doing | Why |
|---|---|
| News aggregation across districts | Unbounded daily work — the primary failure mode |
| Department-wide activity tracking | Unbounded |
| MLA scorecards (175 constituencies) | Ongoing per-constituency burden; phase 2+ |
| District map | **Super Six is statewide — a district map would show identical data in all 26 districts.** No public district-wise beneficiary data exists to feed it. Map belongs to the MLA layer; see §13 |
| User comments / opinions | Daily moderation obligation + intermediary liability; see §11 |
| Telugu | Deferred, not cancelled. Content layer built translation-ready |
| Telangana | Code transfers, content does not. Only after AP is self-sustaining |

## 5. Data model

One JSON file per promise under `content/andhra/promises/`.

```jsonc
{
  "id": "free-bus-travel-women",
  "promise_set": "nda-2024",
  "parties": ["TDP", "JSP", "BJP"],
  "headline": "Free bus travel for women",

  // VERBATIM from the manifesto. Never paraphrased.
  "original_text": "...",
  "original_source": { "label": "NDA Manifesto 2024, p.4", "url": "..." },

  // Ours, and visibly marked as ours. 2-3 sentences, teenager-readable.
  "explainer": "...",

  "category": "transport",
  "beneficiaries": "All women in AP",

  "status": "in_progress",
  "status_since": "2025-11-20",
  "status_reason": "...",            // one sentence justifying THIS verdict

  "evidence": [
    { "date": "2024-08-12", "type": "go", "ref": "G.O.Ms.No. 43",
      "label": "Transport Dept — scheme sanctioned",
      "url": "https://goir.ap.gov.in/..." },
    { "date": "2025-03-05", "type": "budget",
      "label": "Rs X cr allocated, 2025-26 budget", "url": "..." },
    { "date": "2025-11-20", "type": "news",
      "label": "Rollout limited to 3 districts", "url": "..." }
  ],

  "districts": []                    // phase-2 hook; populate only where variation is real
}
```

`evidence[].type` ∈ `go | budget | official | news | rti`.

**Two load-bearing decisions:**

1. **`original_text` is verbatim, with a link to the manifesto.** This defeats the most common
   attack on trackers: *"you reworded the promise to make it look broken."* The `explainer` sits
   alongside it, clearly attributed to us.
2. **`status_reason` is mandatory**, and the validator rejects any promise whose status is not
   backed by dated evidence. An unsourced verdict cannot exist in the dataset — enforced by
   build failure, not discipline.

## 6. Status vocabulary

| Status | Means |
|---|---|
| `not_started` | No GO, no allocation, no announcement |
| `announced` | Officially announced or GO issued — no money or delivery yet |
| `in_progress` | Partially rolled out; real but incomplete |
| `delivered` | Delivered substantially as promised |
| `diluted` | Delivered, but materially smaller than promised — reduced amount, narrower eligibility, fewer beneficiaries |
| `stalled` | Started, then stopped or quietly dropped |

**`diluted` is the most important category.** A real example from research: the government
[halved the beneficiary count for the farmers' aid scheme](https://www.deccanherald.com/amp/story/india%2Fandhra-pradesh%2Fandhra-govt-halved-farmers-aid-beneficiaries-congress-sharmila-3606901).
Delivered — to half the promised people. Neither "delivered" nor "broken" describes that
honestly. It will also draw the most criticism, precisely because it is the honest category.

**There is deliberately no `broken` status until 2029.** Mid-term, "broken" is an editorial
judgment rather than a defensible factual claim; `not_started` and `stalled` carry the same
information without the editorializing. `broken` becomes available when the term ends.

This vocabulary is expensive to change post-launch — it recolors every existing verdict.

## 7. Site structure

Four pages.

- **`/`** — stats strip (`6 promises · 2 delivered · 3 diluted · 1 stalled · Rs X cr allocated`),
  then the status board: every promise as a colour-coded card, filterable by status and category.
- **`/p/<id>`** — promise detail, in fixed order: verbatim promise → our explainer (marked as
  ours) → status + one-line reason → dated evidence timeline → link to this verdict's full
  change history.
- **`/methodology`** — how verdicts are decided, what each status means, how to submit a
  correction. **Written before launch, not after the first accusation of bias.**
- **`/about`** — who runs this, that it is unfunded, and any political affiliation. Declaring it
  preempts the discovery.

## 8. Stack

Inherited from ANDOLAN, which shipped and is maintained (171 entries):

- **Vanilla JS + Vite.** No framework.
- **No database.** Static JSON, fetched at runtime.
- **Vercel Hobby** hosting.
- Build merges `content/andhra/promises/*.json` → `public/promises.json` (generated, gitignored).

```
content/andhra/promises/*.json     one file per promise -> readable git diffs
content/andhra/promise-sets/nda-2024.json
site.config.json                   state metadata (multi-state hedge)
scripts/validate.mjs               runs pre-build
src/                               vanilla JS + Vite
```

Repo is named `ssupwith` and content is nested under a state folder so that adding Telangana
later is a new directory rather than a find-replace. That is the **only** concession to
multi-state; shared deploys and tenant routing are YAGNI until Telangana is real.

## 9. The validator

`scripts/validate.mjs` runs before every build. **Build fails** if any promise:

- lacks `original_text` or `original_source.url`
- has zero evidence items
- has a `status` outside the six-value enum
- is `delivered` / `diluted` / `stalled` without at least one evidence item dated on or after
  `status_since`
- has `status_since` missing, malformed, or in the future
- has a malformed URL in `original_source` or any evidence item

**Build warns** if a non-terminal status has not been touched in 90 days — the "go recheck this"
nudge that keeps the dataset from silently rotting.

## 10. Audit trail

Git history *is* a product feature, not just version control.

- One verdict change = one commit:
  `verdict: free-bus-women in_progress -> diluted — rollout capped at 3 districts (GO 112)`
- Each detail page links to that promise file's commit history.
- Public repo, so anyone can audit every verdict ever changed and why.

**Rationale:** in AP's political environment (TDP 164 seats vs YSRCP 11 after June 2024), any
tracker will be accused of partisanship by whichever side a verdict disfavours. A complete,
dated, public history of every verdict change is an answer no other tracker in India can give.
This is the single strongest defence available, and it costs roughly one extra day of setup.

## 11. Risks

| Risk | Mitigation |
|---|---|
| **Accusations of bias** — near-certain, from both sides | Public methodology page; every verdict sourced; git audit trail; declared affiliations in `/about` |
| **Legal exposure** from user-generated content about named politicians | No user content in v1. When corrections ship in phase 2: publisher model, not open comments. Intermediary rules (grievance officer, complaint timelines, takedown obligations) and defamation exposure need a lawyer's review before any user content goes live |
| **Election-period rules** | ECI Model Code and political-content restrictions apply near polls. Review well before 2029 |
| **Maintainer burnout** — the historical killer of civic projects | Scope is finite and front-loaded; monthly ritual is bounded (§12); no daily obligations by design |
| **Stale data eroding trust** | 90-day staleness warnings in the build |

## 12. The monthly ritual

The operational design that decides whether this is alive in 2029. **Once a month, ~2 hours:**

1. Check GOIR for new GOs on tracked schemes.
2. Check budget documents at allocation time.
3. Clear any staleness warnings from the build.
4. Commit each verdict change separately, with its reason.

Bounded, repeatable, and the entire maintenance cost.

## 13. Phases

- **v1** — Super Six, English, status board + stats. This spec.
- **v1.5** — Expand to the full NDA manifesto beyond Super Six.
- **v2** — Telugu.
- **v3** — Corrections/evidence submissions (publisher model, legal review first).
- **v4** — MLA layer across 175 constituencies. **This is where the map belongs** — a
  constituency is intrinsically geographic, so the click reveals something genuinely different
  each time. Boundary data is a solved problem
  ([datta07/INDIAN-SHAPEFILES](https://github.com/datta07/INDIAN-SHAPEFILES),
  [India Geodata](https://yashveeeeeeer.github.io/india-geodata/) under CC0/CC-BY).
- **later** — Telangana (Congress Six Guarantees), same schema, separate content.

## 14. Open questions

- Register `supwithandhra.com` alongside `ssupwithandhra.com` and 301 the single-s variant —
  `ssup` is a typo magnet.
- Review [apsuper6.com](https://apsuper6.com/) before launch to confirm positioning is distinct.
- Exact decomposition of Super Six into sub-promises — to be settled during implementation
  against the manifesto text.
