# Anagnosis Architecture — the layer contract

This document is the **single source of truth for where data lives and who is
allowed to write it.** Every other doc defers to it. If a path or rule elsewhere
contradicts this file, this file wins and the other doc is stale.

## The rule

A file's home is decided by **who writes it**, never by its format.

| Layer | Directory | Writer | Tracked in git | Anyone else may… |
|---|---|---|---|---|
| **1 Authored** | `csvs/`, `panels/` | a human, by hand | yes | read only |
| **2 Derived** | `derived/` | a script in `code/` or `scripts/` | yes (reviewed in diffs) | read only — never hand-edit |
| **3 Built** | `data/`, `anagnosis.db` | `npm run make:all`, `npm run make:db` | **no** (regenerated) | read only |
| **4 Served** | `server.js`, `public/` | the app, at runtime | yes (code) | reads layer 3 only |

Two corollaries make the rule stick:

1. **Every fact has exactly one authored home.** If two files could disagree
   about the same fact, one of them is wrong by construction. Example: a polity's
   territories live only in `csvs/polity_territory.csv`; `polity.csv` has no
   territory column.
2. **Every layer boundary is crossed by one shared reader.** All CSV reading and
   writing goes through `code/lib/csv.js`. No script has its own parser.

Anything hand-curated that is *nested* (the history panels) is still layer 1 —
it lives in `panels/`, **not** inside `data/`. That is why `data/` can be
gitignored wholesale without losing authored work.

## Layer 1 — Authored (`csvs/`, `panels/`)

```
csvs/
  polity.csv              482  the entity tier: id, name, ruling ethnicity/language/religion, government, years, policies, note
  polity_territory.csv    803  junction: which territory a polity held, when   ← sole source of territory
  polity_dynasty.csv      275  junction: which dynasty ruled a polity, when
  territory.csv            54  macro geographic zones
  dynasty.csv             192  cross-cutting tag (not a tier)
  figure.csv              286  key people, FK → polity
  government.csv           29  government-form taxonomy (flat)
  ethnicity.csv           276  taxonomy tree via parent_id
  language.csv            695  taxonomy tree via parent_id
  religion.csv            264  taxonomy tree via parent_id
  city.csv / city_name.csv / city_succession.csv   place-not-polis identity (see model/city.md)
  source.csv / fact_source.csv   external sources and which facts came from them (see model/source.md)
  inheritance_claim.csv / inheritance_axis.csv / inheritance_recognition.csv / axis_terminus.csv   curated succession, one claim at a time (see model/inheritance.md)

panels/<region>/<country>.json   72 hand-curated regional history panels (nested: columns × rows → cells → stack/split)
```

Conventions: snake_case ids, never reused; integer years, BCE negative, empty
`end_year` = ongoing; lists inside a field use `|`; prose fields use `;` rather
than commas; LF line endings. `scripts/validate.js` enforces the header of every
CSV, so adding a column means updating the schema table there as well as the
model doc in `docs/model/`.

Every CSV must have a model doc (`docs/model/<concept>.md`) and a consumer in
layer 2 or 3. A CSV nothing reads is dead data.

**Civilization** is deliberately not a table (see `model/civilization.md`).
**Succession** has two parts. Each claim is authored and decided individually in
the `inheritance_*` tables; the computed edges below are candidates, evidence
only (`model/graph.md`).

Taxonomy generators emit directories that mirror `parent_id`, because
`data/index.js` re-derives `parent` from the on-disk path. `anagnosis.db` is a
read-only convenience for analytical queries, never a source of truth. Scripts
in `scripts/` other than `validate.js` are curation tools run deliberately, not
part of the build.

## Layer 2 — Derived (`derived/`)

Script-written CSVs that downstream steps consume. Tracked so that changes show
up in review, but **never edited by hand** — the next run overwrites them.

| File | Written by | Consumed by |
|---|---|---|
| `polity_succession.csv` | `code/generate-successions.js` (`npm run make:succession-edges`) | `code/makejson/successions.js`, `scripts/load_csvs.sql` |
| `panel_labels.csv` | `scripts/extract_labels.js` | `normalize_labels.js` |
| `panel_entities.csv`, `panel_labels_linked.csv` | `scripts/normalize_labels.js` | `dedup_and_link.js` |
| `canonical_entities.csv` | `scripts/dedup_and_link.js` | `generate_stubs.js` |
| `polity_stubs.csv` | `scripts/generate_stubs.js` | a human, who promotes rows into `csvs/polity.csv` |
| `overlap_candidates.csv` | `scripts/find_overlaps.js` | a human |
| `wikidata_candidates.csv` | `scripts/match_wikidata.js` | a reviewer, who confirms QIDs into `csvs/fact_source.csv` |

`polity_succession.csv` is a **similarity computation** over polity attributes
and territory adjacency (territorial direction, strength, same-ethnicity /
language / religion, shared territories, temporal gap). It is regenerated on
every `make:all`, so it can never be stale relative to layer 1. Its row count
moves whenever `polity_territory.csv` does; that is expected.

## Layer 3 — Built (`data/`, `anagnosis.db`)

Both are gitignored and rebuilt from layers 1 and 2. Third-party downloads in
`sources/` are gitignored too, and are refetched by `scripts/fetch_sources.js`
(see `model/source.md`).

```bash
npm run make:all     # csvs/ + derived/  →  data/**/*.json   (also regenerates derived/polity_succession.csv)
npm run make:db      # csvs/ + derived/  →  anagnosis.db     (DuckDB; drops and recreates the file)
npm run validate     # scripts/validate.js — validates layers 1 and 2 directly; no build needed
npm test             # make:all, then the same validator
```

`make:all` order: taxonomies → territories → polities → succession edges →
succession JSON → dynasties → governments → inheritance. Run `make:db` after `make:all` so the
database sees the freshly derived edges.

```
data/
  polity/<id>.json         one per polity; territories derived from polity_territory, figures nested
  succession/all.json      flat array of edges from derived/polity_succession.csv
  territory/<id>.json      one per territory with its control periods
  dynasty/<id>.json        one per dynasty with dated polity links
  government/<id>.json
  inheritance/             claims.json (axes and recognition nested), terminus.json
  ethnicity/ language/ religion/    directory trees — nesting mirrors parent_id; the loader
                                    re-derives `parent` from the path
  index.js                 (tracked) in-memory loader used by server.js
  README.md                (tracked) file formats
```

`anagnosis.db` is created by `docs/model/erd_nofk.sql` (DDL, no FK enforcement)
and filled by `scripts/load_csvs.sql`. Twenty-two tables: one per authored CSV, plus
`polity_policy`, `polity_succession`, `polity_succession_territory`. It is an
analytical convenience, not in the serving path.

## Layer 4 — Served (`server.js`, `public/`)

`server.js` loads `data/` through `data/index.js`, serves `panels/` through
`/api/panel`, and exposes the read-only JSON routes in `model/api.md`. `public/` is
vanilla JS + D3. Nothing in layer 4 reads a CSV.

## Data flow

```
 csvs/*.csv  panels/**.json          ← layer 1: humans
      │            │
      │  code/generate-successions.js
      │  scripts/{extract_labels,normalize_labels,dedup_and_link,generate_stubs}.js
      ▼            ▼
 derived/*.csv                       ← layer 2: scripts (tracked, reviewed, never hand-edited)
      │
      │  code/makejson/*.js            scripts/load_csvs.sql
      ▼                                ▼
 data/**/*.json                     anagnosis.db      ← layer 3: build outputs (untracked)
      │
      │  data/index.js
      ▼
 server.js ──► public/              ← layer 4
```

## Departments

The storage layers above say where a file lives and what kind of writer it has.
Work is organised on top of them into three departments, each staffed by agents.
Agents are replaceable and remember nothing between runs, so everything an agent
needs must be written down. The folders stay as they are.

```
Sources          →     Content           →     Presentation
what evidence says     what we assert          how people read it
```

| Department | Roles | Reads | Contract | Hands off |
|---|---|---|---|---|
| **Sources** | One librarian per source (`source-*`) | `sources/` | `model/source.md` | Cited answers |
| **Content** | `curator`, given one table per run; `succession-curator`; `build-owner` | Table contracts, librarian answers, `csvs/`, `derived/` | `model/<table>.md`, `model/inheritance.md`, `model/graph.md`, `model/build.md` | Validated CSVs, built into JSON |
| **Presentation** | `ui-designer` | Routes in `model/api.md` only | `model/presentation.md`, `model/api.md` | The app |
| **Across all** | `auditor`, always a fresh reviewer and never the author | Diffs and contracts | This file | Findings at each handoff |

Role files are in `.claude/agents/`. A contract may cover one table, so one `curator` role serves every table.

### Write sets

This table is the only place write sets are stated. Each tracked path has one writer. Librarians and the auditor write nothing.

| Path | Class | Writer |
|---|---|---|
| `csvs/` except the inheritance tables, `panels/` | role-owned | `curator`, one table per run |
| `csvs/inheritance_*.csv`, `csvs/axis_terminus.csv` | role-owned; the project owner decides each claim | `succession-curator` |
| `docs/model/`: `city`, `dynasty`, `ethnicity`, `figure`, `government`, `language`, `non_polity`, `polity`, `polity_dynasty`, `polity_territory`, `religion`, `source`, `territory` | role-owned | `curator` for that table |
| `docs/model/graph.md`, `docs/model/inheritance.md` | role-owned | `succession-curator` |
| `code/`, `scripts/`, `derived/`, `data/index.js`, `data/README.md`, `package.json`, `package-lock.json` | role-owned | `build-owner` |
| `docs/model/build.md`, `docs/model/erd.md`, `docs/model/erd.sql`, `docs/model/erd_nofk.sql` | role-owned | `build-owner` |
| `public/`, `server.js`, `docs/model/api.md`, `docs/model/presentation.md` | role-owned | `ui-designer` |
| Everything else, including `CLAUDE.md`, `README.md`, licences, `.gitignore`, `.claude/agents/`, this file, `docs/README.md`, `docs/TODO.md` and the remaining docs | owner-maintained | the main session, for the project owner |
| `data/` output, `anagnosis.db`, `sources/` | built, untracked | `build-owner`'s scripts; never by hand |

`scripts/dedup_and_link.js` and `scripts/extract_missing_polities.js --write` write layer 1. `build-owner` owns the code; only a `curator` runs them, and only their `panels/` and `polity.csv` output is that curator's file.

Agents that edit in parallel use separate worktrees. Everything tracked is public on GitHub, so no document holds private data.

### Enforced and target

A target is not a check. Do not "fix" one across the tree unasked.

| Rule | State | Where measured |
|---|---|---|
| CSV headers, keys, foreign keys, dates, enums | enforced | `scripts/validate.js` |
| Warnings and plausibility metrics do not grow | enforced | `scripts/warning-baseline.json` |
| Every doc is indexed; every role is named here | enforced | `scripts/validate.js` |
| All CSV I/O through `code/lib/csv.js` | target | `docs/TODO.md` |
| One writer per path | not checked | this table |
| Librarians and the auditor write nothing | not checked; a role rule, since Bash can write | role files |

**Targets, not yet true:**

- Sources: each librarian answers real questions with citations, and says when a source doesn't cover them.
- Tables: every row passes its admission test, and warnings are triaged.
- JSON: every route matches its contract, checked at build time.
- Graph: built entirely from `csvs/`, and never authored by hand. Curated inheritance claims are CSV rows, and the graph is their result. Computed edges remain evidence only.
- Frontend: pages pass a Playwright review at desktop and phone widths.

**Rules:**

1. **One owner per file.** Two agents never edit the same table at once. A change that crosses write sets follows the handoffs in `model/build.md`.
2. **Contracts come first.** Without a contract for its table, a curator is guessing.
   A curator reads the contract at the start of every run, and hard cases are
   logged there with the reason. Roles may update measured state and open questions.
   Changing a rule in a contract is the project owner's decision.
3. **Sources are cited, never imported.** Curators ask a librarian and write the
   row themselves. If a source disagrees with `csvs/`, the CSV stands until
   someone edits it.
4. **Each handoff is one-way.** Sources → Content is a citation; Content →
   Presentation is the JSON contract. A need from downstream becomes a contract
   change, not a workaround.
5. **Disputes become open questions.** Log them in the contract rather than
   settling them in passing.
6. **Authors don't audit their own work.**

## How to change things

| You want to… | Edit | Then run |
|---|---|---|
| add or fix a polity, territory link, dynasty, figure | the CSV in `csvs/` | `npm test && npm run make:all` |
| change taxonomy hierarchy | `parent_id` in `csvs/{ethnicity,language,religion}.csv` | same |
| add a history panel | new JSON under `panels/<region>/` | `npm test` |
| change how succession edges are scored | `code/generate-successions.js` | `npm run make:all` and review the `derived/` diff |
| add a CSV column | the CSV, `scripts/validate.js` SCHEMA, `docs/model/<concept>.md`, DDL, loader, generator | `npm test && npm run make:all && npm run make:db` |
| anything under `data/` or `derived/` by hand | **don't** — find the layer-1 source or the script |

## Key decisions (still current)

- **CSV-first for flat data.** Spreadsheet-editable, one-row-one-line diffs,
  native DuckDB ingest.
- **Text ids, not numeric.** Self-documenting and stable across imports.
- **Two-tier schema: Civilization (deferred, computed) → Polity.** Dynasty is a
  junction tag. Identity drift is handled by splitting polities at major
  transitions, with a succession edge between them.
- **Panels are first-class authored data.** They are the richest source of
  polity coverage, and the Phase 3 pipeline in `scripts/` mines them into
  `derived/` for a human to promote.

## See also

- `docs/model/data-model.md` — the property-graph view of the same data
- `docs/model/api.md` — the contract between the data layer and the frontend
- `docs/model/graph.md` — the contract for succession edges and inheritance claims
- `docs/model/erd.md`, `erd.sql`, `erd_nofk.sql` — DDL
- `docs/migration/csv_workflow.md` — step-by-step editing guide
- `docs/TODO.md` — defect ledger and open work
- `data/README.md` — generated file formats
