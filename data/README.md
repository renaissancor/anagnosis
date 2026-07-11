# `data/` — Generated Output & Hand-Curated Panels

> **`data/` is mostly generated. Do not hand-edit generated files.** The source of
> truth for flat/relational data is `csvs/*.csv`; everything under `data/` except
> `history/` is produced from those CSVs by `code/makejson/*.js`. Edit a CSV → run
> the generator → `data/` updates. (See `../docs/migration/csv_workflow.md`.)

The one exception is `data/history/` (regional timeline panels), which is
inherently nested and is hand-curated JSON — see below.

## Layout & current counts

Counts below are the live CSV row counts (the source of truth). The running server
loads the generated JSON via `data/index.js`.

| Path | Node type | Count | Source of truth | Loader |
|---|---|---:|---|---|
| `polity/*.json` | Polity | **527** | `csvs/polity.csv` | `loadDir` (flat) |
| `succession/all.json` | Succession edge | **1,991** | `csvs/polity_succession.csv` | `loadDir` (flat) |
| `territory/*.json` | Territory | **54** | `csvs/territory.csv` | `loadDir` (flat) |
| `ethnicity/` (dir tree) | Ethnicity | **269** | `csvs/ethnicity.csv` | `loadTree` |
| `language/` (dir tree) | Language | **695** | `csvs/language.csv` | `loadTree` |
| `religion/` (dir tree) | Religion | **264** | `csvs/religion.csv` | `loadTree` |
| `dynasty/*.json` | Dynasty | **192** | `csvs/dynasty.csv` | `loadDir` (flat) |
| `government/*.json` | Government form | **26** | `csvs/government.csv` | `loadDir` (flat) |
| `civilizations.json` | Civilization | **2** (stubs) | `csvs/civilization.csv` | `loadJSON` |
| `ideologies.json` | Ideology lookup | ~30 | static | `loadJSON` |
| `history/{region}/*.json` | History panel | **61** | *hand-curated* | served statically |

> Civilization is deliberately only a 2-row provisional stub — it is a *deferred,
> derived projection*, not a curated tier. See `../docs/model/civilization.md`.

## How generation works

1. **Edit a CSV** in `csvs/` (entities and relations; taxonomy hierarchy is the
   `parent_id` self-reference column, *not* a filesystem path).
2. **Run a generator**: `npm run make:all` (or an individual `npm run make:polities`,
   `make:successions`, `make:languages`, …). Generators live in `code/makejson/`.
3. `data/` is rewritten. **Reviews are CSV diffs; `data/` diffs are generated noise.**

For the taxonomy trees, the generator emits the directory nesting and `data/index.js`
re-derives each node's `parent` from the **path**, so the on-disk tree shape must
match the `parent_id` graph in the CSV.

## File formats

### Polity — `polity/{id}.json`

```json
{
  "id": "kushan_empire",
  "name": "Kushan Empire",
  "ruling_ethnicity": "central_asian_steppe_bloc",
  "cultural_language": "bactrian",
  "ideology": { "religion": "buddhism", "government": "imperial_monarchy" },
  "territories": ["transoxiana", "khorasan", "punjab", "indus_valley"],
  "start": 30,
  "end": 375,
  "note": "Founded by Kujula Kadphises from the Yuezhi confederation…"
}
```

Cross-references are string IDs: `ruling_ethnicity` → ethnicity, `cultural_language`
→ language, `ideology.religion` → religion, `ideology.government` → government,
`territories[]` → territory. Years are integers; BCE is negative; empty `end` = ongoing.

### Succession — `succession/all.json`

A flat array of directed edges between polities, typed `A / A- / B / C / D` by what
the two polities share (see `../docs/model/succession.md` for the type semantics).
Each edge carries computed continuity fields consumed by the API/graph:

```json
{
  "from": "roman_republic",
  "to": "roman_empire",
  "territorial_direction": "stable",
  "strength": 18,
  "same_ethnicity": true,
  "same_language": true,
  "same_religion": false,
  "shared_territories": ["italia", "gallia", "hispania"]
}
```

### Taxonomy node — `ethnicity/` · `language/` · `religion/`

Each node is one JSON file inside a directory tree; `parent` is re-derived from the
path by the loader.

```json
{ "id": "english", "name": "English", "parent": "west_germanic", "…": null }
```

### History panel — `history/{region}/{country}.json` (hand-curated)

Nested table: `columns[]` (geographic sub-regions) × `rows[]` (temporal eras) →
`cells[]`. A cell may carry a `label`, an optional `polity` FK (enables colour-coding
and linking), a `span`, a `stack[]` (sequential rulers), or a `split[]` (parallel
entities, e.g. Free France / Vichy France).

```json
{
  "id": "pakistan",
  "title": "History of Pakistan (Sindh / Punjab / Gandhara-Kashmir)",
  "columns": [ { "id": "era", "name": "Era", "type": "era" }, { "id": "north", "name": "North" } ],
  "rows": [ { "era": { "label": "Ancient" },
             "cells": [ { "polity": "achaemenid_empire", "label": "Achaemenid Empire", "span": 3 } ] } ],
  "footnotes": ["…"]
}
```

## Loader — `data/index.js`

- `loadDir(dir)` — flat recursive load into an array (polity, succession, territory,
  dynasty, government). Strips `//` comments before parsing.
- `loadTree(dir)` — taxonomy loader; derives `parent` from directory structure
  (ethnicity, language, religion) and exposes `db.tree.<type>(id)` for descendant queries.
- `loadJSON(file)` — single file (civilizations, ideologies).

## Validation

```bash
npm run validate     # = node scripts/validate.js  (also runs as pretest)
```

Checks: all JSON parses; required fields (`id`, `name`, `parent`) present; every
`parent` resolves within the same taxonomy; no circular parent chains; all polity FKs
resolve; succession `type` ∈ {A, A-, B, C, D}; no orphaned taxonomy nodes.
