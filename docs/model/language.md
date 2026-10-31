# Language

## 1. Purpose

One `language.csv` row is **one node in the language classification tree**: a family, a branch, a group, a language, or a historically distinct stage of a language (Old Chinese, Koine Greek). It exists so that a polity's ruling language and a city's name-language can point at something stable.

A language is a **speech variety**, not a people. The people are in `ethnicity.csv` (see `ethnicity.md`); the two trees are separate and share many ids on purpose (121 ids appear in both).

---

## 2. Admission test

A row exists only if at least one of these holds:

1. A `polity.id_ruling_language` points at it (the language the polity's court or administration runs in; see `ethnicity.md` on `cultural_language`).
2. A `city_name.language` points at it (the language a city name is written in; see `city.md`).
3. It is the `parent_id` of an admitted row (a node needed to keep the tree connected).

This is the FK-driven rule from `CLAUDE.md`: no inbound reference, no row. A famous language nobody points at does not earn a row.

**What does not belong:**

- A modern dialect or sociolect that no polity or city name needs.
- A script (Latin, Cyrillic). Scripts are not modeled.
- A people or religion (use `ethnicity.csv` or `religion.csv`).
- A language added only because a source lists it.

**Measured today (2026-10-31): the rule has not been applied.**

| Measure | Count |
|---|---|
| Rows | 695 (36 roots, 146 internal nodes) |
| Directly referenced by a polity or city_name | 109 by polity; city_name adds none (its 7 resolving values are also polity values, 3 more do not resolve); **109 rows in total** |
| Rows with no direct polity or city_name reference | **586** |
| Rows that are neither referenced nor an ancestor of a referenced row | **521** |
| `polity.id_ruling_language` empty | 57 of 523 polities |

The table was seeded as a broad taxonomy, ahead of the references. Whether to prune the 521 is an open question (section 7); do not delete them on your own.

---

## 3. Columns

```csv
id,name,parent_id,description,founded
old_chinese,Old Chinese,old_classical_group,,
```

| Column | Type | Required | Meaning and how to fill it |
|---|---|---|---|
| `id` | snake_case id | yes | Stable key. See section 4. Example: `old_chinese`. |
| `name` | text | yes | Display name in English. Roots are written in capitals (`INDO-EUROPEAN`, id `indo_european`); this is current practice, not a rule. Example: `Old Chinese`. |
| `parent_id` | ref → `language.id` | no | The immediately enclosing node. **Empty means the row is a root (a top-level family).** It never means "unknown"; if you do not know the classification, put the language under `language_isolates` or the nearest sure family and say so in `description`. |
| `description` | text | no | Free-text note. Only 4 rows use it. Empty means nothing to add. No commas (use semicolons). |
| `founded` | text | no | Intended as the date a language or stage emerged. **Empty on all 695 rows.** No format has ever been used or decided. Do not fill it until the owner decides (section 7). Empty means not recorded. |

There is no ISO 639-3 or Glottocode column. The retired plan in `docs/todo/language.md` proposed JSON fields (`iso6393`, `glottocode`, `macro_area`, `status`) that were never adopted in the CSV. The DDL in `docs/model/erd_nofk.sql` has `depth` and `status` columns, but `depth` is computed in `scripts/load_csvs.sql` and `status` is never loaded.

**The `()` name prefix.** 27 rows have a name that starts with `()`, for example `()Ainu`, `()Sumerian`, `()Esperanto`, `()Classical Arabic`. They are mostly isolates, extinct languages, constructed languages and creoles. Nothing documents the meaning, and no script reads it. Treat it as legacy markup; do not copy it onto new rows; its fate is an open question.

---

## 4. Identity and naming

**Id formation.** Lowercase snake_case of the most common English name: `ancient_greek`, `old_church_slavonic`. Ids are stable and never reused (`CLAUDE.md`).

Today 23 ids break the plain ASCII snake_case form: diacritics (`guaraní`, `volapük`, `yolŋu_matha`), apostrophes and punctuation (`gwich'in`, `!kung_ju|'hoansi`, `taa_!xóõ`), and an em-dash in the Austronesian and South Semitic group ids (`south_semitic_group_—_arabic`). The pipe in `!kung_ju|'hoansi` is a hazard because `|` is the list separator elsewhere. These are historical; changing an id breaks every reference, so a rename needs the owner's decision (open question). New ids: ASCII letters, digits and underscores only.

**Hierarchy.** `parent_id` is the only place hierarchy is stored (no path columns, no family column). Rules:

- The tree is validated: every parent must exist and there may be no cycles.
- Depth today runs 0 to 3.
- Use the most specific parent that is sure. Intermediate nodes (`modern_chinese_group`, `latin_group`) are acceptable where they group several rows.
- A language and its historical stages are siblings under a shared group (`old_chinese`, `middle_chinese` under `old_classical_group`), not parent and child.
- Do not nest an ethnicity-style grouping here. A language row answers "what is spoken", never "who speaks it".

**Retired ids.** None are recorded for language. (`docs/migration/merge_map.md` records polity retirements only.) There are no duplicate ids and no duplicate names today. If an id is ever retired, record the old-to-new mapping in `docs/migration/merge_map.md`; do not reuse the old id.

---

## 5. Sources and citation

- **Glottolog is the reference to compare `language.csv` against** (families, branches, ISO links). Ask the `source-glottolog` librarian (`.claude/agents/source-glottolog.md`); it reads `sources/glottolog/v5.3/`, is read-only, and reports disagreements without resolving them. Glottolog is CC BY 4.0.
- `source-wals` (WALS, structural features) may help with a typological question, not with classification.
- `source-wikipedia` and `source-wikidata` can corroborate a historical stage, for example which language a court used.
- **`csvs/` is the source of truth.** A source is cited, never imported. Write the row in your own words. If Glottolog disagrees with a row, the row stands until the owner edits it.
- **ISO 639-3 codes may be used as identifiers** if a code column is ever added, but the SIL code table may not be redistributed in the repo. **Ethnologue is not usable** (proprietary; excluded in `docs/model/source.md`).
- **When a `fact_source` row is needed:** whenever a fact in a language row came from an external source, or when you link the row to a source record (for example a Glottolog glottocode). The entity key is `language`/`<id>`. Hand-curated rows need no provenance row. Today **0** language rows have one (all 291 `fact_source` rows are `polity`/`id`/`wikidata`).

---

## 6. Validation

**Enforced by `scripts/validate.js` (errors):**

- The header is exactly `id,name,parent_id,description,founded`; no ragged rows.
- `id` is unique and non-empty.
- Every non-empty `parent_id` resolves to a `language.id`; no cycles.
- `polity.id_ruling_language` resolves to a `language.id`.
- A `fact_source` row for the table must point at an existing id and a real column.

**Conventions only (not checked):**

- Id character set and snake_case form.
- Admission test (no check that a row is referenced).
- `city_name.language` resolves. **It does not**: `city_name.csv` has `chinese` (9 rows), `greek` (4) and `phoenician` (1) that are not language ids (the nearest ids are `old_chinese`, `ancient_greek`, `phoenician_punic`). The validator checks only `city_name.city_id`.
- Prose style (no commas in free text).

---

## 7. Current state and open questions

Measured counts are in section 2. Open questions, none resolved here:

1. **Prune or keep the 521 unreferenced rows?** The current table is a seeded taxonomy, contradicting FK-driven scoping. Options: prune to the referenced set plus ancestors; or declare language a reference taxonomy exempt from the rule.
2. **Fix the 3 broken `city_name.language` values** (`chinese`, `greek`, `phoenician`), and add the foreign-key check to the validator.
3. **What does `founded` mean and what format?** Empty everywhere. A year integer with BCE negative would match the other tables, but nothing is decided.
4. **What does the `()` name prefix mean**, and should it be removed or turned into a column?
5. **Rename the 23 non-ASCII or punctuated ids?** It costs reference updates in `polity.csv`.
6. **Should an ISO 639-3 or Glottocode column be added?** PROPOSED: a Glottocode column (Glottolog is CC BY 4.0), filled via `source-glottolog`, with a `fact_source` row per link. Not authorized.
7. **57 polities have no ruling language.** Empty means unknown or not yet curated; there is no "not applicable" marker.
8. The language tree duplicates ethnicity ids (121 shared). Whether that overlap is intended coupling or accidental is undecided; see `ethnicity.md`.
