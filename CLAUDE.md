# Anagnosis — Project Primer

Anagnosis is a CSV-first historical-political dataset. **Schema is two-tier:**

- **Civilization** (nominal top tier — deferred; a future computed projection, not an authored table. See `docs/model/civilization.md`)
- **Polity** (entity tier; a political entity at the intersection of ethnicity × territory × ideology × time)

**Dynasty** (~192 records) is a **cross-cutting tag** via the `polity_dynasty` junction, *not* a third tier. The earlier "Regime" tier was **dropped** on 2026-05-01 — identity drift inside long-running entities (Roman Republic → Pagan Empire → Christian Empire → Byzantine) is handled by polity-splits at major transitions, not sub-polity periods.

Auxiliary entities: `ethnicity`, `language`, `religion`, `territory`, `figure`, `government`, plus planned `city` (see `docs/model/city.md`).

## Layer contract — read `docs/ARCHITECTURE.md` first

A file's home is decided by **who writes it**, never by its format. Four layers, one writer each:

| Layer | Path | Writer | Tracked |
|---|---|---|---|
| 1 Authored | `csvs/*.csv`, `panels/**/*.json` | a human | yes |
| 2 Derived | `derived/*.csv` | a script (`code/`, `scripts/`) | yes — reviewed, never hand-edited |
| 3 Built | `data/`, `anagnosis.db` | `npm run make:all`, `npm run make:db` | **no** |
| 4 Served | `server.js`, `public/` | runtime | code only |

**Rules that fall out:**

1. **Edit only layer 1.** Anything under `data/` or `derived/` is overwritten on the next run. If you find yourself editing there, stop and find the CSV, panel, or script.
2. **One authored home per fact.** Territory lives only in `polity_territory.csv` (no inline column on `polity.csv`); taxonomy hierarchy lives only in `parent_id`; succession edges are computed into `derived/` from the CSVs.
3. **One CSV reader.** All CSV I/O goes through `code/lib/csv.js`. Never add a parser.
4. **Every CSV must have** a model doc in `docs/model/<concept>.md`, a header entry in `scripts/validate.js`, a generator or loader that consumes it, and DDL + load SQL.
5. **Workflow:** edit → `npm test` (validates layers 1–2 directly, no build) → `npm run make:all` → review `csvs/` + `derived/` diffs.

`docs/tree/*.md` are read-only dumps. `scripts/archive/` holds dead one-shot migrations — do not run them.

## Docs architecture

For any data-model question, **read `docs/model/<concept>.md` first.** That directory is canonical.

```
docs/
├── ARCHITECTURE.md          ← THE LAYER CONTRACT — where data lives, who writes it
├── README.md                ← docs entry point
├── TODO.md                  ← open tasks
├── model/                   ← schema docs (one file per concept) — CANONICAL
│   ├── data-model.md        ← read first for the graph model
│   ├── civilization.md      ← top tier — deliberately DEFERRED; a perspective-projection over the graph, not a curated entity
│   ├── erd.md               ← visual ERD with FK relationships
│   ├── erd.sql              ← DDL with FKs
│   ├── erd_nofk.sql         ← DDL without FKs (ingest variant)
│   ├── dynasty.md
│   ├── ethnicity.md
│   ├── religion.md
│   ├── ideology.md
│   ├── succession.md
│   ├── naming.md
│   ├── polity_dynasty.md
│   └── city.md              ← place-not-polis identity, FK-driven scoping
├── migration/               ← schema migration & curation workflows
│   ├── csv_workflow.md      ← how to edit CSVs/panels, validate, regenerate
│   ├── merge_map.md
│   └── missing_polities.md
├── frontend/                ← UI design notes
│   └── succession_graph.md
├── todo/                    ← per-concept curation TODOs
│   ├── ethnicity.md
│   ├── language.md
│   └── religion.md
└── tree/                    ← generated taxonomy tree dumps (read-only)
    ├── ethnicity.md
    ├── language.md
    ├── religion.md
    └── territories.md
```

## Conventions

- **IDs:** snake_case, stable, never reused
- **Years:** integer; BCE is negative (`-753` = 753 BCE); empty `end` field = ongoing
- **Free-text in CSVs:** avoid commas inside fields — use semicolons or em-dashes
- **Foreign keys:** plain id strings (e.g., `polity_territory.polity_id` → `polity.id`)
- **Word "regime"** is acceptable only in: brand mentions (`anagnosis`, `Anagnosis`), English-noun prose ("Pol Pot regime"), and historical reports/snapshots. **Never as an entity term in new code or schema.**

## Schema discipline — FK-driven scoping

Entity tables earn rows by inbound foreign keys, not historical fame. A row belongs in `city`, `figure`, etc. only when something else in the dataset points to it. No decorative reference rows. When seeding, walk the *references* first and back-fill entities. Canonical statement: `docs/model/city.md` *Scope Discipline*.

## Recent structural changes (2026-09-03)

- History panels moved from `data/history/` (where they were deleted along with generated output in be71029) to `panels/`.
- `csvs/derived/` → `derived/`; `polity_succession.csv` moved there and is regenerated on every `make:all`.
- `polity.csv` lost `civilization_id` and `territories`; `polity_territory.csv` is the sole territory source.
- `same_civilization` removed from the succession signal set, DDL, and loader.
- The `state` → `civilization` rename is complete; any remaining `state_*` mention is stale prose.

## What this project is *not*

Anagnosis is an **architecture for curation**, not a complete dataset. Coverage is uneven; sparse panels are expected. Decisions are driven by political-history queries, not by exhaustive cataloging.
