# Data Model Overview

The entire project is a **property graph** — multiple node types connected by typed edges.

## Node Types

Authored in `csvs/` (see [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the layer contract); the generated JSON under `data/` is one view of the same graph.

| Source of truth | Node Type | What it represents |
|---|---|---|
| `csvs/territory.csv` + `polity_territory.csv` | Territory | A macro geographic zone. Accumulates rulers over time via the junction table. |
| `csvs/language.csv` (`parent_id` tree) | Language | A language in a phylogenetic tree. |
| `csvs/religion.csv` (`parent_id` tree) | Religion | A religion or branch in a taxonomy tree. |
| `csvs/ethnicity.csv` (`parent_id` tree) | Ethnicity | A people defined by language, origin, and ancestry. |
| `csvs/government.csv` (flat) | Government | A government form — the institutional half of ideology. |
| `csvs/polity.csv` | Polity | A political entity at the intersection of Ethnicity × Territory × Ideology × Time. |
| `csvs/dynasty.csv` + `polity_dynasty.csv` | Dynasty | A ruling house; a cross-cutting tag on polities, not a tier. |
| `csvs/figure.csv` | Figure | A key person, FK → polity. |
| `csvs/city*.csv` | City | Place-not-polis identity (see `city.md`). |
| `derived/polity_succession.csv` (computed) | Succession | A directed edge between two Polities, scored by what they share. |

## Edge Types

```
Language        --[parentOf]-->        Language          (phylogenetic tree)
Religion        --[parentOf]-->        Religion          (taxonomy tree)
Ideology        --[parentOf]-->        Ideology          (taxonomy tree)

Ethnicity       --[speaksLanguage]--> Language
Ethnicity       --[originatesIn]-->   Territory

Polity          --[ruledBy]-->         Ethnicity         (ruling_ethnicity)
Polity          --[courtLanguage]-->   Language          (cultural_language)
Polity          --[hasIdeology]-->     Ideology          (ideology.government)
Polity          --[hasReligion]-->     Religion          (ideology.religion)
Polity          --[controlled]-->      Territory[]       (with time bounds: start/end)

Succession      --[from]-->            Polity
Succession      --[to]-->              Polity
Succession      --[evidence]-->        territory · ethnicity · language · religion · gap
```

## The Succession Edge

> **The v1 letter matrix (A/A-/B/C/D) is retired.** No `type` field is stored. The ratified redesign — per-axis, multi-parent **inheritance claims** with perspectival recognition — is specced in [`docs/brainstorm/succession/`](../brainstorm/succession/README.md); the legacy derived model is documented in [`succession.md`](./succession.md).

Today each edge in `derived/polity_succession.csv` carries a derived **evidence vector**:

| Column | Meaning |
|---|---|
| `shared_territories` / `shared_territory_count` | land carried across the transition |
| `same_ethnicity` / `related_ethnicity` | people carried across (direct / tree-related) |
| `same_language` / `same_religion` | cultural continuity axes |
| `temporal_gap_years` | continuity vs revival |
| `territorial_direction` | same / expansion / contraction / displacement |
| `strength` | blended continuity score |

An edge sharing **neither people nor land** is the ahistorical jump the project exists to forbid (tracked as the `no_people_no_land_edges` plausibility metric).

Succession describes the relationship between two **polities** spanning centuries.

## Ideology vs Policy

See `ideology.md` for the full explanation. In the data:

- `polity.ideology` — **fixed**. The unchanging existential identity of the polity.
- `polity.policies[]` — **time-bounded**. Decisions made within the polity's lifespan that do not redefine its core identity.

## The Persian Cultural Thread (an example of why the model matters)

The model makes the following pattern visible:
- **Achaemenid** (Persian ruling + Persian court)
- **Macedonian/Seleucid** conquest → Greek ruling, but Persian administrative tradition survives
- **Parthian** (Iranian ruling + Persian court)
- **Sassanid** (Persian ruling + Persian court, Zoroastrian ideology)
- **Abbasid** conquest → Arab ruling, but Persian bureaucracy dominates
- **Seljuk** (Turkic ruling + **Persian** court)
- **Ilkhanate** (Mongol ruling + **Persian** court)
- **Timurid** (Turkic ruling + **Persian** court)
- **Safavid** (Persian ruling + **Persian** court, Shia ideology)
- **Mughal** (Turkic ruling + **Persian** court)

Persian culture survived six conquests by completely different ethnic groups because it filled a functional role: the **Persianate bureaucracy** (a `policies` value on polities; government forms are in `csvs/government.csv`) was the most advanced administrative system available in the region, and every conqueror eventually adopted it.

The `cultural_language` field on polities makes this thread visible across the graph.
