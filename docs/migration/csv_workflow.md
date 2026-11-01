# CSV Workflow

How to edit Anagnosis data. The layer rules this follows are in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md); the column semantics of each file
are in `../model/<concept>.md`.

## The loop

```bash
# 1. edit a CSV in csvs/ (spreadsheet or text editor)
npm test              # 2. validate the authored layer — fails on any broken FK, duplicate key, ragged row
npm run make:all      # 3. regenerate derived/ and data/
npm run make:db       # 4. (optional) rebuild anagnosis.db for DuckDB queries
git diff csvs/ derived/   # 5. review: your CSV rows + the derived edges that moved because of them
```

Only `csvs/` and `panels/` are hand-edited. `derived/` and `data/` are
overwritten on every run.

## Field conventions

- ids: `snake_case`, stable, never reused (`ottoman_empire`, not `42`)
- years: integers; BCE negative (`-27`); empty `end_year` = ongoing
- lists inside one field: `a|b|c` (e.g. `policies`)
- prose fields (`note`, `description`, `significance`): use `;` or `—` rather than commas
- line endings: LF. Any file written through `code/lib/csv.js` is LF automatically
- quoting: only when a field contains `"`, `,`, or a newline; the validator warns on commas outside prose columns

## Common edits

### Add a polity

1. Append a row to `csvs/polity.csv`:
   ```csv
   northern_song,Northern Song Dynasty,han_chinese,middle_chinese,chinese_folk_religion,chinese_imperial,960,1127,,
   ```
   Columns: `id,name,id_ruling_ethnicity,id_ruling_language,id_ruling_religion,government,start_year,end_year,policies,note`.
   Ethnicity is required; the rest may be empty but the validator warns on missing religion/government.
2. Give it territory in `csvs/polity_territory.csv` (this is the **only** place territory is recorded):
   ```csv
   yellow_river,northern_song,960,1127
   yangtze,northern_song,960,1127
   ```
3. Optionally link a dynasty in `csvs/polity_dynasty.csv` and people in `csvs/figure.csv`.
4. `npm test && npm run make:all`. New succession edges appear in `derived/polity_succession.csv` from the territory adjacency.

### Add a territory

Add the row to `csvs/territory.csv`, then its control periods in
`csvs/polity_territory.csv`. Overlapping periods on one territory are allowed
(coexisting polities).

### Reorganise a taxonomy

Change `parent_id` in `csvs/ethnicity.csv`, `language.csv`, or `religion.csv`.
Hierarchy is expressed **only** by `parent_id`; the directory nesting under
`data/<entity>/` is generated from it. The validator rejects unresolved parents
and cycles.

### Add a government type

Add a row to `csvs/government.csv` (`id,name,finer_type,weber_legitimacy,description`).
Every `polity.government` value must exist here.

### Add or edit a history panel

Panels are hand-curated nested JSON in `panels/<region>/<country>.json`. A cell's
`polity` field must be an id in `polity.csv`; the validator lists unresolved refs
as warnings so you can add the polity (or promote a stub from
`derived/polity_stubs.csv`).

A cell for a people that is not a polity uses an `ethnicity` key in place of `polity`,
and it must resolve in `ethnicity.csv`. Any other non-polity keeps only its `label`
(`docs/model/non_polity.md`).

### Add a column

A new column touches every layer: the CSV, the `SCHEMA` table in
`scripts/validate.js`, `docs/model/<concept>.md`, `docs/model/erd*.sql`,
`scripts/load_csvs.sql`, and the generator in `code/makejson/`.

## Reading the validator

`npm test` groups findings by category and prints up to eight examples each.
**Errors** (exit 1): header mismatch, ragged row, duplicate key, missing required
field, unparsable year, start after end, unresolved FK, taxonomy cycle, bad
derived edge. **Warnings**: missing religion/government, CRLF, stray comma,
`dynasty.ethnicity` not a taxonomy id, panel ref not yet a polity.

## Things that are not sources of truth

- `data/` — generated; edits are lost on the next `make:all`
- `derived/` — script output; edit the script or the layer-1 input instead
- `docs/tree/*.md` — human-readable dumps, may lag the CSVs
- `anagnosis.db` — rebuilt by `make:db`
