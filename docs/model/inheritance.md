# Inheritance — the curated succession layer

> **Status: live, served by `/api/claim` and `/api/polity/:id/claims`.** This file is the table contract for the four inheritance tables. [`graph.md`](./graph.md) owns the boundary between claims and computed candidates, and the open questions. Design rationale is archived in [`docs/brainstorm/succession/`](../brainstorm/succession/README.md).

## The one-sentence model

Inheritance is a set of **curated, per-axis claims**: each
`(heir ← source, topology, mechanism)` edge carries the identity axes that
flowed through it, with **recognition as a separate perspectival relation** —
not one blended similarity edge per polity-pair.

**Succession** is the colloquial name for the subset where
`source_temporal_status = prior` (a dead predecessor). The general relation is
*"an heir claims inheritance from a source"* — which may also be `ongoing`
(a living trans-temporal community) or `abstract` (an idea).

## Why multi-parent — the Ottoman example (the seed data)

One successor inherits different axes from *different* sources:

| claim | topology | mechanism | axes carried |
|---|---|---|---|
| ottoman ← byzantine_empire | absorption | conquest | title (Kayser-i Rum), name_symbols |
| ottoman ← abbasid_caliphate | continuation | title_transfer | title (caliphate), political_legitimacy |
| ottoman ← seljuk_rum | continuation | transformation | ruling_ethnicity, administrative_apparatus |
| republic_of_turkey ← ottoman | continuation | transformation | political_legitimacy **repudiated**, title **repudiated**, legal_tradition **repudiated** |

The fourth row is why stance exists: an heir can deliberately *reject* an
axis, and that repudiation is itself historical data.

## The four tables

### `csvs/inheritance_claim.csv` — one row per (heir, source)

| column | values |
|---|---|
| `id` | snake_case, stable |
| `heir_polity_id` | FK → `polity.id` |
| `source_id` | FK → table named by `source_type` |
| `source_type` | `polity` \| `ethnicity` \| `religion` \| `civilization` \| `stateless_people` |
| `source_temporal_status` | `prior` \| `ongoing` \| `abstract` |
| `topology` | `continuation` \| `fission` \| `fusion` \| `secession` \| `absorption` |
| `mechanism` | `transformation` \| `conquest` \| `partition` \| `collapse` \| `unification` \| `personal_union` \| `secession` \| `dissolution` \| `revival` \| `translatio` \| `title_transfer` \| `colonial_independence` |
| `legitimacy_mode` | `organic` \| `claimed` \| `fictive` |
| `exclusivity` | `exclusive` \| `shared` |
| `temporal_gap_years` | int; 0 = immediate, >0 = revival after a gap |
| `provenance` | **required** — curated claims always carry a receipt (editorial-policy §3) |
| `note` | free text (no commas — semicolons) |

**`dynastic_change` is not a mechanism.** A pure change of ruling house is a
`polity_dynasty` row, never an inheritance claim.

### `csvs/inheritance_axis.csv` — per-identity-axis payload

| column | values |
|---|---|
| `claim_id` | FK → `inheritance_claim.id` |
| `axis` | see axis list below |
| `stance` | `affirmed` \| `repudiated` \| `transformed` \| `neutral` — nullable: present only when the heir deliberately relates to the axis |
| `strength` | 1–5, graded not boolean |
| `note` | free text |

**Axes:** `territory` · `ruling_ethnicity` · `state_religion` ·
`court_language` · `dynasty` · `administrative_apparatus` · `legal_tradition` ·
`name_symbols` · `political_legitimacy` · `title` · `diplomatic_personality`
(provisional).

**Material overlap is derived, not stored here:** territory ←
`polity_territory`, dynasty ← `polity_dynasty`, ethnicity/language/religion ←
`polity.id_ruling_*`, plus the evidence columns in
`derived/polity_succession.csv`. This table stores curated *identity claims* — store
an axis row only where there is a stance or a claim, not to restate overlap.

### `csvs/inheritance_recognition.csv` — perspectival legitimacy

| column | values |
|---|---|
| `claim_id` | FK → `inheritance_claim.id` |
| `observer_id` | a **real historical entity** — FK → `polity.id` when `observer_type=polity` |
| `observer_type` | `polity` \| `institution` (papacy, UN, …) |
| `degree` | `recognized` \| `partial` \| `rejected` |
| `note` | free text |

Recognition records **what historical actors did** (did the Safavids accept
the Ottoman caliphate? no) — never a modern judgment, never an AI's opinion.
"Is this succession legitimate?" has no single answer; it is indexed by
observer. *Don't collapse the perspectives, index them.*

### `csvs/axis_terminus.csv` — positive extinction

| column | values |
|---|---|
| `polity_id` | FK → `polity.id` |
| `axis` | axis list above |
| `year` | when the axis died |
| `note` | free text |

In a sparse dataset, absence means "uncurated." Extinction must be recorded
**positively**: the caliphate did not fade away — it was abolished in 1924,
and that fact is a row.

## Pipeline

```
csvs/inheritance_*.csv + csvs/axis_terminus.csv
  → code/makejson/inheritance.js            (part of make:all)
  → data/inheritance/{claims,terminus}.json (claims nest axes + recognition)
  → scripts/validate.js                     (FKs + full enum vocabulary)
```

`code/generate-successions.js` is a **candidate suggester**: it writes
proposed edges + evidence to `derived/polity_succession.csv`; the
`succession-curator` drafts the real ones as claims here.

## Curation discipline

- Every claim: `provenance` required (validator-enforced), stance only where
  deliberate, recognition only for documented historical acts.
- Split questions (does this transition end the polity?) are governed by
  [`07-polity-split.md`](../brainstorm/succession/07-polity-split.md):
  foundational ideology change or structural sovereignty event; religion /
  language / dynasty / ruler / territory never split alone.
- Deferred, deliberately: strength scoring rules and the valid-observer set
  ([`05-open-questions.md`](../brainstorm/succession/05-open-questions.md) §4–5).

## Migration status

1. ✅ Canonical doc + curated tables + generator + validation (this page)
2. ✅ `generate-successions.js` demoted to candidate suggester
3. ⬜ Owner answers the blocking questions in `graph.md` section 6
4. ⬜ Clean the generator (`graph.md` Q8): fix or remove `related_ethnicity`, delete the redundant loop, drop `type` from both DDL files, and review the `derived/` diff
5. ⬜ Pilot by hand: Ottoman, `ottoman_empire → republic_of_turkey`, Russian chain, British Raj to India, Mexico, ROC and PRC, Gran Colombia, Carthage, three caliphs, Han revival. Revise the schema if the pilot breaks it, before any bulk work
6. ✅ Add the claim route as an addition, updating `api.md` in the same commit
7. ✅ Frontend view over claims, with candidates as labelled evidence
8. ⬜ Curate further by query need, walking references first
9. ⬜ Stop serving candidates as `successors` / `predecessors` **last**, following the `api.md` breaking-change rule (candidates stay in `derived/` as evidence)

## How to validate

`npm run validate` checks headers, enum values, foreign keys, and the `provenance` format (`wp:`, `wd:`, `panel:` or `ref:`). (heir, source) uniqueness is decided but not yet checked (`docs/TODO.md`). Done means the validator passes and the project owner has approved the claim.

## Current state (measured 2026-11-01)

| Table | Rows |
|---|---:|
| `inheritance_claim.csv` | 9 |
| `inheritance_axis.csv` | 29 |
| `inheritance_recognition.csv` | 6 |
| `axis_terminus.csv` | 1 |

## Open column questions

Moved here from `graph.md`. `graph.md` section 6 holds the ranked questions.

- `id`: format.
- `source_type`: `civilization` and `stateless_people` have no table.
- `source_temporal_status`: how it applies to a source that outlives the heir's founding.
- `topology`: whether it belongs on the claim. `07-polity-split.md` also uses `fission`, `fusion` and `continuation` as mechanisms.
- `temporal_gap_years`: authored or computed, and what a negative value means.
- Mode (`continuity`, `conquest`, `compact`, `claim`): stored or implied.
- `strength`: the scale.
- `diplomatic_personality`: provisional.
- `inheritance_axis`: identity axes only, or one uniform list; whether `territory` rows are allowed for contested claims.
- `observer_type`: values, and which observers fill the set.

## Decision log

- 2026-11-01: this file owns the table definitions; `graph.md` keeps the candidate and claim boundary.
- 2026-11-01: each succession is decided one claim at a time; computed candidates are evidence only.
