# The Pipeline — Canonical Record

> **This file is the authoritative description of the anagnosis data pipeline.**
> If any other doc contradicts it, this file wins. Update it in the same commit
> as any change to `package.json` scripts or `code/makejson/`.

## One line

```
csvs/*.csv  ──(code/makejson/*.js)──▶  data/**/*.json  ──(data/index.js)──▶  server.js ──▶ public/
```

`csvs/` is the **only** source of truth. Everything under `data/` (except
`data/README.md` and `data/index.js`, which are tracked code) is generated and
git-ignored — never hand-edit it, never commit it.

## The default workflow

```bash
# 1. Edit a CSV in csvs/
# 2. Regenerate everything (fast, always safe):
npm run make:all
# 3. Validate referential integrity:
npm test          # = node scripts/validate.js
# 4. (optional) serve:
npm start         # prestart runs make:all automatically
```

`prestart` and `pretest` both run `make:all`, so a fresh clone works with just
`npm install && npm test`. **After any CSV edit, `make:all` + `npm test` is the
default, non-negotiable loop.** Reviews look at CSV diffs only; JSON never
appears in diffs because it is untracked.

## Generators (code/makejson/)

| npm script | generator | source CSV(s) | output |
|---|---|---|---|
| `make:ethnicities` | `ethnicities.js` | `ethnicity.csv` | `data/ethnicity/` tree |
| `make:languages` | `languages.js` | `language.csv` | `data/language/` tree |
| `make:religions` | `religions.js` | `religion.csv` | `data/religion/` tree |
| `make:territories` | `territories.js` | `territory.csv`, `polity_territory.csv` | `data/territory/` |
| `make:polities` | `polities.js` | `polity.csv`, `figure.csv` (figures embedded per polity) | `data/polity/*.json` |
| `make:successions` | `successions.js` | `polity_succession.csv` | `data/succession/all.json` |
| `make:dynasties` | `dynasties.js` | `dynasty.csv`, `polity_dynasty.csv` | `data/dynasty/*.json` |
| `make:governments` | `governments.js` | `government.csv` | `data/government/*.json` |

Taxonomy generators share `_taxonomy_from_csv.js`: hierarchy comes from the
`parent_id` column; the emitted directory nesting must mirror the `parent_id`
graph because `data/index.js` re-derives `parent` from the on-disk path.

Ordering in `make:all` matters: taxonomies first, then territories, then
polities/successions/dynasties/governments (they validate FKs against the
earlier outputs).

## Validation

- `npm test` → `scripts/validate.js`: FK integrity across all CSVs
  (ethnicity/language/religion/government/territory refs, required fields).
  Exit non-zero on errors — treat a red `npm test` as a broken build even
  though the generators still emit files.
- `./validate-json.sh`: cheap syntactic spot-check (random 50 JSON files).

## Analytics side-channel

`scripts/load_csvs.sql` loads `csvs/*.csv` into DuckDB (`anagnosis.db`,
git-ignored) for ad-hoc analytical queries. Read-only convenience; never a
source of truth.

## Not part of the pipeline (do not run)

- `scripts/{add-figures,dedup_and_link,extract_*,find_overlaps,generate_stubs,normalize_labels,…}.js`
  — one-shot curation/migration tools, run manually and deliberately, never
  as part of the build.
- `csvs/derived/` — intermediate curation artifacts (stub extraction, label
  linking), not consumed by any generator.
- `docs/tree/*.md` — human-readable taxonomy dumps; may lag the CSVs.
- `csvs/city*.csv` — planned city model (`docs/model/city.md`); not yet wired
  to a generator.
