# Anagnosis Documentation

Anagnosis makes the flow of civilizational history legible: it models how political
power passes from one **polity** to the next across territory and time. The data is
organised in four layers — authored (`csvs/`, `panels/`), derived (`derived/`),
built (`data/`, `anagnosis.db`), served (`server.js`) — each with exactly one
writer. **Read [ARCHITECTURE.md](ARCHITECTURE.md) first**; it is the layer contract
every other doc defers to.

## Start Here

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | **The layer contract** — where data lives, who writes it, how it flows |
| [model/data-model.md](model/data-model.md) | The property-graph model and succession matrix — read first |
| [TODO.md](TODO.md) | Roadmap (incl. the *planned* DuckDB migration — Phase 3 stage) |

## Domain Model (`model/`)

Schema definitions, entity semantics, and naming conventions.

| Doc | Purpose |
|-----|---------|
| [data-model.md](model/data-model.md) | Property graph model and edge types |
| [erd.md](model/erd.md) | Visual ERD diagram, table summary, example queries |
| [erd.sql](model/erd.sql) | Full DDL schema (16 tables; `erd_nofk.sql` is the ingest variant used by `make:db`) |
| [naming.md](model/naming.md) | Entity ID naming conventions and collision resolution |
| [succession.md](model/succession.md) | Succession type logic (A/A-/B/C/D) and edge cases |
| [dynasty.md](model/dynasty.md) | Dynasty entity and lineage modeling |
| [polity_dynasty.md](model/polity_dynasty.md) | Polity-dynasty junction table |
| [ideology.md](model/ideology.md) | Ideology vs policy distinction; government form = ideology |
| [ethnicity.md](model/ethnicity.md) | Ethnicity taxonomy and tree structure |
| [religion.md](model/religion.md) | Religion taxonomy |

## Migration & Data Pipeline (`migration/`)

Guides for editing the authored layer and regenerating everything downstream.

| Doc | Purpose |
|-----|---------|
| [csv_workflow.md](migration/csv_workflow.md) | Editing CSVs / panels, running the validator, regenerating `derived/` and `data/` |
| [merge_map.md](migration/merge_map.md) | Panel label → entity ID resolution (consolidated; iran/china/italy gold-standard) |
| [missing_polities.md](migration/missing_polities.md) | Polities to be added |

## Frontend (`frontend/`)

| Doc | Purpose |
|-----|---------|
| [succession_graph.md](frontend/succession_graph.md) | D3 force-directed graph visualization |

## Reference Data

| Directory | Purpose |
|-----------|---------|
| [tree/](tree/) | Taxonomy tree structure dumps (language, religion, ethnicity, territories) |
| [todo/](todo/) | Per-entity work tracking |
