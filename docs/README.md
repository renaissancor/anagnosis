# Anagnosis Documentation

Anagnosis makes the flow of civilizational history legible: it models how political
power passes from one **polity** to the next across territory and time. The running
app is **CSV-first** — `csvs/*.csv` are the source of truth, generators emit `data/`
JSON, and an Express server serves it. (A DuckDB analytical layer is *planned* and
not in the running path; see the roadmap below.)

## Start Here

| Doc | Purpose |
|-----|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture and data flow (CSV → JSON → server) |
| [model/data-model.md](model/data-model.md) | The property-graph model and succession matrix — read first |
| [TODO.md](TODO.md) | Roadmap (incl. the *planned* DuckDB migration — Phase 3 stage) |

## Domain Model (`model/`)

Schema definitions, entity semantics, and naming conventions.

| Doc | Purpose |
|-----|---------|
| [data-model.md](model/data-model.md) | Property graph model and edge types |
| [editorial-policy.md](model/editorial-policy.md) | How content is added and verified — dates, sources, stubs, two-pass review |
| [erd.md](model/erd.md) | Visual ERD diagram, table summary, example queries |
| [erd.sql](model/erd.sql) | Full DDL schema (24 tables, Polity model) |
| [naming.md](model/naming.md) | Entity ID naming conventions and collision resolution |
| [inheritance.md](model/inheritance.md) | **The curated succession layer** — per-axis claims, recognition, terminus |
| [succession.md](model/succession.md) | Legacy derived similarity layer (evidence columns) |
| [dynasty.md](model/dynasty.md) | Dynasty entity and lineage modeling |
| [polity_dynasty.md](model/polity_dynasty.md) | Polity-dynasty junction table |
| [ideology.md](model/ideology.md) | Ideology vs policy distinction; government form = ideology |
| [ethnicity.md](model/ethnicity.md) | Ethnicity taxonomy and tree structure |
| [religion.md](model/religion.md) | Religion taxonomy |

## Migration & Data Pipeline (`migration/`)

Guides for the CSV-to-JSON-to-DuckDB data pipeline.

| Doc | Purpose |
|-----|---------|
| [csv_workflow.md](migration/csv_workflow.md) | Editing CSVs and regenerating JSON |
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
