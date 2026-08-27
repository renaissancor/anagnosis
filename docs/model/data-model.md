# Data Model Overview

In this file, **Polity** = the top-level political entity (dir: `data/polity/`). The future dynasty-tier **Polity** is defined in [`erd.md`](./erd.md).

The entire project is a **property graph** — multiple node types connected by typed edges.

## Node Types

| Location | Node Type | What it represents |
|---|---|---|
| `data/territories/{region}/{id}.json` | Territory | A macro geographic zone. Accumulates rulers over time. Each file contains metadata + `periods[]` of historical control. |
| `data/languages/` (directory tree) | Language | A language in a phylogenetic tree. Parent derived from filesystem path. |
| `data/religions/` (directory tree) | Religion | A religion or religious branch in a taxonomy tree. Parent derived from filesystem path. |
| `data/ideologies.json` | Ideology | A government form or state philosophy. Kept as a single flat file. |
| `data/ethnicity/` (flat directory) | Ethnicity | A people defined by language, origin, and ancestry. |
| `data/polity/` (flat directory, subdirs supported) | Polity | A specific political entity at the intersection of Ethnicity × Territory × Ideology × Time. |
| `data/succession/` (generated) | Succession | A directed edge between two Polities carrying a shared-axis evidence vector. |

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

Today each edge in `csvs/polity_succession.csv` carries a derived **evidence vector**:

| Column | Meaning |
|---|---|
| `shared_territories` / `shared_territory_count` | land carried across the transition |
| `same_ethnicity` / `related_ethnicity` | people carried across (direct / tree-related) |
| `same_language` / `same_religion` / `same_civilization` | cultural continuity axes |
| `temporal_gap_years` | continuity vs revival |
| `territorial_direction` | same / expansion / contraction / displacement |
| `strength` | blended continuity score |

An edge sharing **neither people nor land** is the ahistorical jump the project exists to forbid (tracked as the `d_shaped_edges` plausibility metric).

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

Persian culture survived six conquests by completely different ethnic groups because it filled a functional role: the **Persianate bureaucracy** (see `ideologies.json`) was the most advanced administrative system available in the region, and every conqueror eventually adopted it.

The `cultural_language` field on polities makes this thread visible across the graph.
