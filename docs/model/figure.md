# Figure

## 1. Purpose

One `figure.csv` row is **one notable person attached to one polity** in a stated role: the person's name, what they did for that polity, and their lifespan.

Figures illustrate polities. They are not a biographical database and are not a tier of the model. The grain is **person-in-polity**, not person: the same human who matters to two polities gets two rows with two ids (section 4).

---

## 2. Admission test

A row exists only if all of these hold:

1. Its `polity_id` resolves to a row in `polity.csv`.
2. The person is **central to that polity's story**: its founder, a defining or last ruler, or a reformer, general, thinker or cultural figure without whom the polity cannot be explained. The `significance` column must say why in one clause.
3. The person is not already a row for the same polity.

**What does not belong:** a ruler listed only because they reigned (rulers are tagged through `polity_dynasty`, not exhaustively here); a person with no polity in the dataset (add the polity first, per `docs/migration/missing_polities.md`); a person added for fame alone.

**FK-driven scoping, applied honestly.** The rule says entities earn rows from inbound foreign keys. **Nothing points at `figure`**: no other table has a `figure_id` column today (`city.md` mentions `figure.seat_city_id` and `birth_city_id`, but those columns do not exist). So figure has **0 rows with an inbound reference**, and the only test that can be applied is the outbound one above plus the editorial test in item 2. This is an open question (section 7).

**Coverage today:** 286 rows over 132 of 482 polities; **350 polities (73%) have no figure**. Most polities have 1 to 2 figures; the maximum is 5 (`kingdom_of_england`, `kingdom_of_france`). Sparse coverage is expected (`CLAUDE.md`: the dataset is an architecture for curation).

---

## 3. Columns

```csv
polity_id,figure_id,name,role,years,significance
umayyad_caliphate,muawiya_i,Muawiya I,founder,602/680,Founded the Umayyad dynasty; shifted the caliphate from elective to hereditary
```

| Column | Type | Required | Meaning and how to fill it |
|---|---|---|---|
| `polity_id` | ref → `polity.id` | yes | The polity this person is being cited for. Decide by which polity the person's main role belongs to, not where they were born. Example: `umayyad_caliphate`. Validated as an error if unresolved. |
| `figure_id` | snake_case id | yes | **The primary key.** Unique across the whole table, not per polity. Example: `muawiya_i`. See section 4. |
| `name` | text | yes | Display name; may carry an alternate spelling in parentheses (`Asparuh (Asparukh)`). Not unique: `Charles V` appears twice. |
| `role` | text | yes | The person's function for this polity. **9 values in use** (list below); not validated. Pick the one that best fits what the person did for this polity. |
| `years` | text | yes | The person's **lifespan** as `birth/death`, two integer years, BCE negative. See below. |
| `significance` | text | yes | One sentence on why the person matters to the polity. Free text, no commas (use semicolons). |

The column order is `polity_id` first, then `figure_id`. The validator's primary key is `figure_id` alone. In the DB, `figure_id` loads as `figure.id`.

**`role` values in use:** `ruler` (137), `founder` (88), `cultural` (18), `military` (11), `last_ruler` (8), `administrator` (7), `reformer` (7), `general` (5), `philosopher` (5). `military` and `general` overlap; no rule separates them. A founder who also ruled is entered as `founder`.

### The `years` column, as it really is

`years` is **lifespan, not reign**: `muawiya_i` is `602/680` (born 602, died 680), not the years he held power. Legendary figures carry traditional dates (`gilgamesh`: `-2700/-2600`). The loader (`scripts/load_csvs.sql`) splits on `/` and casts each half to an integer, giving `birth_year` and `death_year`; anything that is not an integer becomes NULL.

Observed forms across the 286 rows:

| Form | Rows | Example | Meaning |
|---|---|---|---|
| `birth/death` integers | 264 | `-2112/-2095` (`ur_nammu`) | Normal case |
| `?/death` | 11 | `?/711` (`rodrigo_visigoth`) | Birth unknown; the literal `?` |
| `/death` | 4 | `/552` (`bumin_qaghan`) | Birth unknown; empty half |
| `birth/null` | 6 | `1954/null` (`erdogan`) | Still living; the literal text `null` |
| `?/?` | 1 | `?/?` (`eulji_mundeok`) | Both unknown |

So **"unknown" is written three different ways** (`?`, empty half, and `?/?`), and **"still alive" is written `null`**. There is no single decided format. Until the owner decides (section 7), write new rows as two integers; if the birth year is unknown, use `?/death` to match the majority; if the person is living, use `birth/null`. Never leave `years` empty.

---

## 4. Identity and naming

**Id formation.** Lowercase snake_case of the most common English name, with a regnal number suffixed when needed: `simeon_i_great`, `muawiya_i`, `tariq_ibn_ziyad`. All 286 ids are ASCII snake_case and unique. Ids are stable and never reused.

**One person, several polities.** The key is `figure_id`, so the same person cited for a second polity needs a different id. Today there are 4 such pairs, and the suffix style differs:

| Person | Rows |
|---|---|
| Margaret I | `margaret_i` (`kingdom_of_denmark`), `margaret_i_kalmar` (`kalmar_union`) |
| Charles V | `charles_v_hre` (`holy_roman_empire`), `charles_v_habsburg` (`habsburg_monarchy`) |
| Babur | `babur_timurid` (`timurid_empire`), `babur` (`mughal_empire`) |
| Puyi | `puyi` (`qing_dynasty`), `puyi_manchukuo` (`manchukuo`) |

PROPOSED: suffix the second and later rows with the polity's short name and keep the first row bare; or split the table into `figure` and `figure_polity`. Not decided.

**Id collisions across tables.** `muhammad_ali` is both a figure id and a dynasty id; harmless, because ids are scoped per table.

**No hierarchy.** There is no `parent_id`. **Retired ids:** none recorded.

**Wrong polity.** If a person's `polity_id` no longer fits (the polity was split or merged), move the row to the polity that existed during their active life; do not change `figure_id`. The merge agents record polity retirements in `docs/migration/merge_map.md`.

---

## 5. Sources and citation

- For lifespans and roles, ask `source-wikipedia` and `source-wikidata` (`.claude/agents/source-wikipedia.md`, `source-wikidata.md`). Wikidata (CC0) is safe for birth and death years. Wikipedia is CC BY-SA 4.0, so write `significance` in your own words, never paste a sentence.
- `source-periodo` may help with period names; `source-pleiades` with ancient places; `source-cliopatria` and `source-glottolog` and `source-wals` do not cover people.
- **`csvs/` is the source of truth.** Sources are cited, never imported, and disagreement between a source and a row is resolved by a human, not by overwriting.
- **A `fact_source` row is needed** when a lifespan, role or the person's identity came from an external source, or when you link the person to a Wikidata QID. The entity key is `figure`/`<figure_id>`, and `field` is `id` for an identity-only link or `years` for the dates. Today there are **0** figure provenance rows (all 290 `fact_source` rows are `id`/`wikidata` links, 288 on `polity` and 2 on `ethnicity`). Hand-written rows with no outside source need no row.

---

## 6. Validation

**Enforced by `scripts/validate.js`:**

- The header is exactly `polity_id,figure_id,name,role,years,significance`; no ragged rows.
- `figure_id` is unique.
- `polity_id` resolves to a `polity.id` (error).

**Conventions only (not checked):**

- Format of `years`: it is never parsed by the validator, so `?`, `null` and an empty half pass silently.
- `birth` not after `death`.
- `role` is from the list above.
- The person's lifespan overlaps the polity's `start_year` and `end_year`.
- `name`, `role`, `years` and `significance` are non-empty (all are today).
- Id form, and one row per person per polity.

---

## 7. Current state and open questions

286 rows, 132 polities, 350 polities with none. All 286 `polity_id` values resolve today.

**Figures whose lifespan lies wholly outside the polity's years (5), found by comparing `years` with `polity.start_year` and `end_year`:**

| Figure | Years | Polity | Polity years | Likely cause |
|---|---|---|---|---|
| `nurhaci` | 1559/1626 | `qing_dynasty` | 1636/1912 | He founded the Later Jin that became the Qing; no pre-1636 polity is attached |
| `rurik` | 830/879 | `kievan_rus` | 882/1240 | Legendary founder died before the polity's start year |
| `alfred_the_great` | 849/899 | `kingdom_of_england` | 927/1707 | Alfred ruled Wessex, before the unified kingdom |
| `taharqa` | -709/-664 | `meroitic_kingdom` | -656/350 | Kushite pharaoh; the polity starts after his death |
| `damdin_sukhbaatar` | 1893/1923 | `mongolian_peoples_republic` | 1924/1992 | Died the year before the polity begins |

Some are an attachment choice (founder cited for the polity they founded); some point at a missing predecessor polity. Each needs a decision: reattach, add a polity, or accept as a "founder before the polity" case.

Open questions, none resolved here:

1. **Admission rule.** With no inbound references, what stops the table from growing without limit? PROPOSED: a cap per polity (for example 5), and `significance` required to name the link to the polity.
2. **Format of `years`.** Make unknown and living uniform (`?` vs empty vs `null`), or split into `birth_year` and `death_year` integer columns as the DDL and DB already do (`docs/model/erd_nofk.sql`). The loader's `TRY_CAST` hides the inconsistency.
3. **Lifespan or active years?** `years` is lifespan, so the polity-overlap test above is only a rough check. A reign or active-period field was never added.
4. **The 5 wrong-polity cases** above.
5. **Person-in-polity duplicates** (4 pairs) and their id style.
6. **`seat_city_id` / `birth_city_id`** are promised by `docs/model/city.md` but absent from the CSV, validator and DDL.
7. **`role` vocabulary** is unvalidated; `military` vs `general` overlap and `last_ruler` mixes a role with a position in time.
8. **`docs/model/erd.md` and DDL** describe `figure.id`, `birth_year` and `death_year`; the CSV has `figure_id` and `years`. The loader bridges them, but the CSV-side contract is only this doc.
