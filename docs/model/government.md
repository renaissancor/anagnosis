# Government

## 1. Purpose

One `government.csv` row is **one form of government** that a polity can have: a named structural type of rule (monarchy, caliphate, khaganate, republic) from a small, flat, shared list. It is a **classification vocabulary**, not an entity with a history: it has no dates, no parent and no territory.

Government form is part of a polity's ideology (`ideology.md`): if a polity's form changes fundamentally, that is a new polity, not an edit. So `polity.government` holds one value per polity and is never time-varying.

---

## 2. Admission test

A row exists only if at least one `polity.government` points at it, and it names a **structurally distinct way of holding power** that the existing rows cannot describe.

**What does not belong:**

- A single ruler, a dynasty or a titled office used by one polity only, unless several polities share it (`shogunate` has three polities today: `kamakura_shogunate`, `ashikaga_shogunate` and `tokugawa_shogunate`).
- A policy, ideology or religion (`ideology.md`, `religion.md`). A caliphate is a government form because it is a structural claim; "Sunni" is not.
- A time-bounded regime change inside a polity (split the polity instead; `CLAUDE.md`).
- A near-synonym of an existing row. Check section 7 first.

**Measured today:** 29 rows, **1 with no inbound reference (`city_state_league`, 0 polities after the non-polity migration)** (every other id is used by at least one polity; usage ranges from 1 to 77 polities). Separately, **23 of 482 polities have an empty `government`** (for example `silla`, `baekje`, `cao_wei`, `shu_han`, `eastern_wu`, `western_jin`).

---

## 3. Columns

```csv
id,name,finer_type,weber_legitimacy,description
khaganate,Khaganate,palace,charismatic,Steppe supreme sovereignty; khagan rules confederation of tribes
```

| Column | Type | Required | Meaning and how to fill it |
|---|---|---|---|
| `id` | snake_case id | yes | Stable key, referenced by `polity.government`. Example: `khaganate`. |
| `name` | text | yes | Display name. Example: `Khaganate`. |
| `finer_type` | text | no | Which institution is the centre of power. One of **8 values in use**: `palace`, `palace_forum`, `palace_nobility`, `palace_church`, `church`, `forum`, `nobility`, `foreign`. Compound values name a primary and a secondary seat (`palace_forum` is a ruler checked by a council or assembly). Not a foreign key; no list of allowed values is stored anywhere. Empty on no row today. Meaning of empty: not classified. |
| `weber_legitimacy` | text | no | Weber's basis of legitimacy: `traditional`, `rational_legal` or `charismatic` (the 3 values in use). Decide it from why the ruled accept the ruler: inherited custom is traditional, law and office is rational-legal, personal or ideological authority is charismatic. Not a foreign key. Empty means not classified. |
| `description` | text | yes in practice | One clause saying what makes the form distinct. All 29 rows have one. No commas (use semicolons). |

The values of `finer_type` and `weber_legitimacy` are an analytical overlay added by the curators. Nothing in `scripts/` or `code/` reads them (the generators in `code/makejson/governments.js` copy rows through; the DB loader stores them as-is). They are not validated. See open questions.

No dates, no `parent_id`, no `founded`.

---

## 4. Identity and naming

**Id formation.** Lowercase snake_case of the English name of the form: `absolute_monarchy`, `tribal_confederation`, `city_state_league`. Ids are stable and never reused. The table is **flat**: there is no `parent_id` and no hierarchy. Do not add one without an owner decision; broader groupings today live only in `finer_type` and `weber_legitimacy`.

Naming is by form, not by country. `chinese_imperial` is the one existing id that is culture-specific (see section 7); do not create `japanese_x` or `russian_x` ids.

**Retired ids.** None. No government id has been renamed or merged; none is recorded in `docs/migration/merge_map.md`.

---

## 5. Sources and citation

Government form is an analytical judgement, so most rows will rest on the curator's own reading and need no provenance row.

- For the form of a specific polity, ask `source-wikipedia` and `source-wikidata` (`.claude/agents/source-wikipedia.md`, `source-wikidata.md`); they return evidence and never edit.
- `source-cliopatria` and `source-periodo` do not carry government forms. Glottolog and WALS are irrelevant here.
- **`csvs/` is the source of truth.** Sources are cited, never imported; write the row in your own words.
- **A `fact_source` row is needed** when a fact came from an external source (the entity key is `government`/`<id>`) or when linking a row to a source record. Today there are none for this table.
- The `weber_legitimacy` labels come from Weber's published typology, which is an idea, not a licensed dataset; no source citation is needed to use them. Do not import a coded dataset such as Polity5 (excluded in `docs/model/source.md`).

---

## 6. Validation

**Enforced by `scripts/validate.js`:**

- The header is exactly `id,name,finer_type,weber_legitimacy,description`; no ragged rows.
- `id` is unique and non-empty.
- Every non-empty `polity.government` resolves to a `government.id` (error).
- A missing `polity.government` is a **warning** (`polity missing government`), not an error.

**Conventions only:**

- Admission test (no check that a government row is used).
- Id style.
- The allowed values of `finer_type` and `weber_legitimacy`.
- That the description is non-empty.
- That a polity's government matches its dynasty rows: `polity_dynasty.md` says non-monarchical polities should have none, but the validator does not check it.

---

## 7. Current state and open questions

29 rows. Polity counts per row, highest first: `monarchy` 77, `imperial_monarchy` 61, `feudal_monarchy` 54, `democratic_republic` 27, `sultanate` 26 ... `shogunate` 3, `confederation` 1.

Open questions, none resolved here:

1. **`chinese_imperial` (11 polities) vs `imperial_monarchy` (61).** Both are `traditional` and both are emperor-led. The first is distinguished by Mandate of Heaven and the civil examination system, but it is the only culture-specific id, and it sits beside a general form that could include it. Examples: `western_han` and `northern_wei` use `chinese_imperial`; `akkadian_empire` and `hittite_empire` use `imperial_monarchy`. Keep both, merge, or rename?
2. **`khaganate` (13) vs `tribal_confederation` (14) vs `khanate` (16).** `khaganate` is charismatic and `tribal_confederation` is traditional, though `xiongnu` (khaganate) and `wusun` (tribal_confederation) are both loose tribal unions. No written rule separates them. `confederation` (1: `german_confederation`) and `city_state_league` (0) add a similar overlap.
3. **`monarchy` (77) is a catch-all** next to `absolute_monarchy`, `feudal_monarchy`, `constitutional_monarchy`, `elective_monarchy`, `divine_monarchy` and `imperial_monarchy`. No decision procedure picks between them.
4. **What are `finer_type` and `weber_legitimacy` for?** Nothing reads them. They are also inconsistent between close forms: `oligarchy` is `forum` and `traditional` while `republic` is `forum` and `rational_legal`; `theocracy` and `imamate` are `church` yet `imamate` is described as Shia or Ibadi. Decide whether to validate against fixed lists, define each value in this doc, or drop the columns. The name `finer_type` has no documented parent type.
5. **One-polity row:** `confederation` (only `german_confederation`). Whether it should stay a row or fold into a broader form is undecided. `shogunate` is no longer one: it now has three polities.
6. **23 polities with no government.** Empty means not yet curated; there is no "not applicable" marker. Is a missing value acceptable for the pre-state or contested cases, or must every polity get one?
7. **`province` and `colonial_administration`** (8 and 21) describe a relationship to another power rather than an internal structure, and `finer_type` `foreign` is used only for those and `puppet_state`. Whether "dependent" should be its own dimension is undecided.
8. **`docs/model/erd.md` lists 26 governments and `docs/ARCHITECTURE.md` says 29**; the CSV has 29. The ERD figure is stale.
