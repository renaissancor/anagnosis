# `code/` — generators (layer 1 + 2 → layer 3)

Node scripts that turn the authored CSVs into the derived and built layers. See
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the layer contract.

```
code/
  lib/csv.js                  the ONE CSV reader/writer — every script uses it (RFC 4180, LF out)
  generate-successions.js     csvs/{polity,polity_territory,ethnicity}.csv → derived/polity_succession.csv
  makejson/
    _taxonomy_from_csv.js     shared: parent_id tree → directory tree of JSON
    ethnicities.js            csvs/ethnicity.csv → data/ethnicity/
    languages.js              csvs/language.csv  → data/language/
    religions.js              csvs/religion.csv  → data/religion/
    territories.js            csvs/territory.csv + polity_territory.csv → data/territory/<id>.json
    polities.js               csvs/polity.csv + polity_territory.csv + figure.csv → data/polity/<id>.json
    successions.js            derived/polity_succession.csv → data/succession/all.json
    dynasties.js              csvs/dynasty.csv + polity_dynasty.csv → data/dynasty/<id>.json
    governments.js            csvs/government.csv (+ polity.csv counts) → data/government/<id>.json
```

## Run

```bash
npm run make:all                # everything, in dependency order
npm run make:succession-edges   # just derived/polity_succession.csv
npm run make:polities           # any single generator: make:<plural>
```

Generators are idempotent: each clears its output directory and rewrites it.
`make:all` runs them in order: taxonomies → territories → polities →
succession edges → succession JSON → dynasties → governments.

## Writing a generator

- Read CSVs with `csv.readFile(path)` (rows as objects) from `code/lib/csv.js`;
  use `csv.splitPipe`, `csv.toInt`, `csv.toBool` for field types. Do not add a
  parser.
- Read only from `csvs/` and `derived/`; write only to `data/` (or `derived/`
  if the output is a CSV another step consumes).
- Register the npm script in `package.json` and add it to `make:all`.
- Add the loader in `data/index.js` and, if the CSV is new, its schema in
  `scripts/validate.js`, a model doc in `docs/model/`, and DDL + load SQL.

## Taxonomy trees

`_taxonomy_from_csv.js` assembles the `parent_id` graph of a taxonomy CSV into a
directory tree: a node with children becomes `<id>/index.json`, a leaf becomes
`<parent-path>/<id>.json`. `data/index.js` re-derives `parent` from the path, so
the on-disk nesting must match the CSV; the generator guarantees that. Hierarchy
is **only** expressed by `parent_id` — the markdown trees in `docs/tree/` are
read-only dumps.

## Succession edges

`generate-successions.js` computes one edge per polity pair from territory
adjacency (consecutive control of the same territory) plus attribute matches
(same or related ethnicity, same language, same religion) and temporal gap. It
writes `derived/polity_succession.csv` with a `strength` score and
`territorial_direction`. This is derived evidence, not curated judgment; the
curated inheritance layer is in `csvs/inheritance_*.csv` (`docs/model/inheritance.md`).
