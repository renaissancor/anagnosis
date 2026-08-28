# Inheritance — the curated succession layer

> **Status: LIVE (step 1 of the migration).** Tables exist, are validated, and
> are seeded with the Ottoman worked example. The legacy derived layer
> (`csvs/polity_succession.csv`, documented in [`succession.md`](./succession.md))
> remains in place as **evidence** until this layer is populated enough to
> replace it. Design rationale and stress tests live in
> [`docs/brainstorm/succession/`](../brainstorm/succession/README.md) — this
> page is the operational contract.

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
`polity.id_ruling_*`, plus the legacy evidence vector in
`polity_succession.csv`. This table stores curated *identity claims* — store
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

The old `code/generate-successions.js` is a **candidate suggester**: it writes
proposed edges + evidence to `csvs/derived/succession_candidates.csv`; a
curator turns the real ones into claims here.

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
3. ⬜ Curate claims from `succession_candidates.csv` + panels, region by region
4. ⬜ Frontend view over `data/inheritance/`
5. ⬜ Retire `csvs/polity_succession.csv` **last**, when consumers are migrated
