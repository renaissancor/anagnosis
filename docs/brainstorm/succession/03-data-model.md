# Proposed data model

## Core idea: a successor's inheritance is a *set of per-source edges*

Because inheritance is **multi-parent** (different axes from different sources), the natural representation is: **one edge per `(successor, source)` pair, each carrying the axes that flowed through it.** A polity's full inheritance = the union of its incoming edges.

The Ottoman Empire is then **three edges**, not one row:

| successor ← source | topology | mechanism | axes carried |
|---|---|---|---|
| ottoman ← byzantine_empire | absorption | conquest | territory, capital |
| ottoman ← abbasid_caliphate | continuation | title_transfer | title (caliphate), political_legitimacy |
| ottoman ← seljuk_rum | continuation | transformation | dynasty, people, administrative_apparatus |

Multi-parent falls out for free: each parent is just another edge.

## Three tables

> **Names updated** per [`08-naming.md`](./08-naming.md) (layer = *inheritance*) and the round-2 findings ([`06`](./06-stress-tests-round2.md)). This is the consolidated current shape.

```
inheritance_claim                  -- the edge: one per (heir, source)
  id
  heir_polity_id                   -- FK polity (the inheriting / claiming polity)
  source_id                        -- FK polity | ethnicity | religion | (future) civilization
  source_type                      -- polity | ethnicity | religion | civilization | stateless_people
  source_temporal_status           -- prior | ongoing | abstract   (succession = the 'prior' subset)
  topology                         -- continuation | fission | fusion | secession | absorption
  mechanism                        -- transformation | conquest | partition | revival | ...
  legitimacy_mode                  -- organic | claimed | fictive
  exclusivity                      -- exclusive | shared
  temporal_gap_years               -- 0 = immediate; >0 = revived after a gap
  note

inheritance_axis                   -- per IDENTITY-axis payload (material axes are DERIVED, not stored here)
  claim_id                         -- FK inheritance_claim
  axis                             -- political_legitimacy | title | administrative | legal_tradition | name_symbols | ...
  stance                           -- affirmed | repudiated | transformed | neutral
  strength                         -- graded (NOT boolean)

inheritance_recognition            -- perspectival legitimacy (NOT an edge attribute)
  claim_id                         -- FK inheritance_claim
  observer_id                      -- the polity / perspective doing the recognizing
  degree                           -- recognized | partial | rejected

axis_terminus                      -- positive extinction record (absence ≠ extinction in a sparse dataset)
  polity_id
  axis
```

**Material axes are derived, never stored here:** territory ← `polity_territory`, dynasty ← `polity_dynasty`, ruling ethnicity/language/religion ← `polity.id_ruling_*`. These are the old similarity vector, kept as evidence. Only **identity** axes (legitimacy, title, administration, law, name/symbols) are curated into `inheritance_axis`.

## How the three stress-test upgrades are baked in

1. **Per-axis stance** → `succession_axis.stance`. An axis can be `affirmed` (Ottoman keeps Byzantine territory), `repudiated` (Republic of Turkey keeps the land but abolishes the caliphate), or `transformed` (Rome keeps the institution but Christianizes it). Boolean "inherited?" could never say this.
2. **Multi-source / cross-type source** → multiple `succession` edges per successor, and `source_type` lets a source be a polity, an ethnicity, a religion, or the deferred `civilization`. Colonial states need this: borders ← colonizer (polity), people ← a *set* of pre-colonial polities, heritage ← a civilization/ethnicity.
3. **Perspectival recognition** → the `succession_recognition` table. "Is this succession legitimate?" has no single answer; it's indexed by observer. PRC and ROC both claim Qing succession; the answer differs per recognizer. This mirrors the [civilization-as-projection](../../model/civilization.md) resolution — *don't collapse the perspectives, index them.*

## Relationship to existing CSVs

- **Sources of truth:** `polity.csv` (unchanged) + the new `succession*.csv` (curated).
- **Derived evidence:** the old similarity vector (`same_ethnicity`, `shared_territories`, …) stays useful — `generate-successions.js`, demoted to a *candidate suggester*, proposes edges and pre-fills the evidence columns; a curator confirms which are real and annotates `mechanism` / `stance` / `legitimacy` / recognition.
- **Model-doc debt:** each new CSV needs a `docs/model/*.md` and a generator/consumer to satisfy CSV-first discipline before commit.

## Open structural question

Should `topology` + `mechanism` live on the edge (as above) or also vary per axis? Current bet: **edge-level**, because topology/mechanism describe the *relationship to that source*, while only `stance`/`strength` vary per axis. Revisit if a counterexample appears. → [`05-open-questions.md`](./05-open-questions.md)
