# Anagnosis

A CSV-first historical-political dataset whose core is curated polity succession. It is an **architecture for curation**, not a complete dataset: coverage is uneven, sparse panels are expected, and political-history queries drive decisions.

Start here: [`docs/README.md`](docs/README.md) indexes the documents. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) holds the layers and write sets, and it wins any conflict with another doc. For a data-model question, read `docs/model/<concept>.md` first.

## Model

- **Polity** is the entity tier: a political entity at the intersection of ethnicity, territory, ideology and time.
- **Civilization** is deferred, a future computed projection and not a table.
- **Dynasty** is a tag through `polity_dynasty`, not a tier.
- Identity drift is handled by splitting polities at ideology or sovereignty changes. Religion alone never splits a polity.
- **Succession** is decided one claim at a time in `csvs/inheritance_*.csv`. `derived/polity_succession.csv` holds computed candidates, which are evidence and never decide.
- **Non-polities:** peoples use an `ethnicity` key on panel cells; cultures, collectives and events are plain labels.

## Rules for every agent

1. Edit only layer 1 (`csvs/`, `panels/`) for facts. `derived/` and `data/` are overwritten on the next run.
2. One authored home per fact.
3. All CSV I/O goes through `code/lib/csv.js`. Never add a parser.
4. Stay inside your write set. Log defects you notice in your return, not in your diff.
5. Sources are cited, never imported.
6. Authors don't audit their own work.
7. Workflow: edit, `npm run make:all`, `npm run validate`, then review the `csvs/` and `derived/` diffs. Any role with a write set may run `make:all`; nobody hand-edits its output.
8. Every CSV needs a model doc, a `scripts/validate.js` entry, a consumer, and DDL plus load SQL.

`scripts/archive/` holds dead migrations. Do not run them.

## Conventions

- **IDs:** snake_case, stable, never reused.
- **Years:** integers, BCE negative, empty `end` means ongoing.
- **CSV prose:** avoid commas inside fields; use semicolons or em-dashes.
- **Foreign keys:** plain id strings.
- **Entity rows** are earned by inbound foreign keys, not fame. No decorative reference rows (`docs/model/city.md`, Scope Discipline).
- **"Regime"** is never an entity term in new code or schema.
