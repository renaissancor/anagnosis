# CSV Workflow Guide

How to edit data in Anagnosis and regenerate outputs.

> **Canonical pipeline reference: [`docs/PIPELINE.md`](../PIPELINE.md).**
> This guide covers the editing workflow; PIPELINE.md is authoritative for
> the build graph, generator list, and validation contract.

## Quick Start

```bash
# 1. Edit any CSV in csvs/
# 2. Regenerate all outputs
npm run make:all
# 3. Validate FK integrity
npm test
```

Individual generators exist as `npm run make:<entity>` (polities, successions,
territories, ethnicities, languages, religions, dynasties, governments), but
`make:all` is cheap — prefer it after any edit that touches foreign keys.

Never edit anything under `data/` — it is generated and git-ignored. The review
unit is the CSV diff.

## ID conventions

All IDs are **snake_case text, stable, never reused** (e.g. `roman_empire_pagan`,
`han_chinese`). Years are integers; BCE is negative (`-753` = 753 BCE); an empty
`end` field means ongoing. Avoid commas inside free-text fields — use semicolons
or em-dashes.

## The CSVs

Full column semantics live in `docs/model/<concept>.md` — read those before
editing a table you haven't touched recently. Summary:

| CSV | Role |
|---|---|
| `polity.csv` | Core entity: political entity at ethnicity × territory × ideology × time |
| `polity_succession.csv` | Typed succession edges between polities |
| `polity_territory.csv` | Junction: which polity controlled which territory, when |
| `polity_dynasty.csv` | Junction: dynasty tags on polities |
| `dynasty.csv` | Cross-cutting dynasty tags (~192) — not a tier |
| `ethnicity.csv`, `language.csv`, `religion.csv` | Taxonomies; hierarchy via `parent_id` self-reference |
| `territory.csv` | Geographic regions |
| `government.csv` | Government forms referenced by `polity.government` |
| `figure.csv` | Historical figures (FK-earned rows only) |
| `city*.csv` | Planned city model — see `docs/model/city.md` |

### Taxonomy edits (ethnicity / language / religion)

Hierarchy is expressed **only** by the `parent_id` column. The generator emits
a matching directory tree under `data/<taxonomy>/`; never rearrange those
directories by hand. To move a node, change its `parent_id` and rerun
`make:all`.

## Common tasks

**Add a polity**
1. Add a row to `csvs/polity.csv`. Every FK column (`id_ruling_ethnicity`,
   `id_ruling_language`, `id_ruling_religion`, `government`, `territories`)
   must reference an existing id.
2. `npm run make:all && npm test` — fix any `✗` the validator reports.
3. Wire it into `polity_succession.csv` / `polity_territory.csv` as applicable.

**Add a territory with control history**
1. Add the row to `territory.csv`, then the control periods to
   `polity_territory.csv` (one row per polity-period; overlaps are allowed
   when polities genuinely coexisted).
2. `npm run make:all && npm test`.

**Reorganize a taxonomy**
1. Edit `parent_id` values in the CSV (parent must exist, or blank for root).
2. `npm run make:all && npm test`.

## Validation

`npm test` (= `scripts/validate.js`) checks FK integrity across all CSVs and
required polity fields. A red run is a broken build — fix the CSV, don't ship
around it. Typical failures:

- `government "X" not found in government.csv` → add the government row or fix
  the polity's `government` value.
- `missing required field "ruling_ethnicity"` → fill the FK on the polity row.
- `territory "X" not found` / `cultural_language "X" not found` → add the
  referenced row or correct the id.

## Schema discipline

Rows are earned by inbound foreign keys, not historical fame (canonical
statement: `docs/model/city.md`, *Scope Discipline*). Every CSV must have a
model doc in `docs/model/` and a consuming generator in `code/makejson/`.
