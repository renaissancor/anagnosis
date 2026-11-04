# Contract: Build

Owner role: `build-owner`. Last re-measured: 2026-11-01. Write sets are in [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Purpose

Turn authored data into derived and built data, and check it. Build never decides what the data says.

## What belongs here

Generators, tools, the validator, the database schema and the data loader.

## What does not

Authored rows belong to the curators. Routes and pages belong to `ui-designer`.

## Rules

1. All CSV reading and writing goes through `code/lib/csv.js`. Add no bypass.
2. Generators read `csvs/` and `derived/`, and write only `derived/` or `data/`.
3. A script never writes layer 1. `dedup_and_link.js` and `extract_missing_polities.js --write` are known exceptions, and only a curator runs them.
4. Never run `validate.js --update-baseline` to make a check pass. Refresh the baseline only after explaining the change in the commit.
5. Scripts in `scripts/archive/` are dead. Do not run them.

## Handoffs

**Schema change.** A curator proposes it in the table contract's open questions. After the owner approves, `build-owner` changes `validate.js`, the DDL, the loader and the generator, and the curator updates the CSV and contract. Both land in one branch.

**Retiring a polity.** The curator edits the rows and the contract, then returns the `SYNONYM_MAP` or `STRIP_LIST` entry for `build-owner` and the `merge_map.md` entry for the main session (`polity.md` section 4).

A polity named in an inheritance table is not retired this way: the curator stops and returns it for `succession-curator` and the owner.

**Warning ratchet.** A correct row can raise a metric. The curator returns the growth with the reason, and after the owner agrees, `build-owner` refreshes the baseline in a commit that explains it.

**New route.** `build-owner` adds the loader in `data/index.js`. Then `ui-designer` adds the route and updates `api.md`.

## How to validate

```bash
npm run validate   # layers 1 and 2, no build
npm test           # make:all, then the validator
npm run make:db    # needs DuckDB
```

Done means `npm test` passes and the `derived/` diff is reviewed.

## Current state (measured 2026-11-01)

| Measure | Value (command) |
|---|---|
| Validator warnings | 1,773 (`npm run validate`) |
| Warning baseline | 1,773 (`scripts/warning-baseline.json`) |
| DDL tables | 22 (`grep -ci '^create table' docs/model/erd.sql`) |

## Open questions

None recorded yet.

## Decision log

- 2026-11-01: contract created from `ARCHITECTURE.md`, `code/README.md` and `migration/csv_workflow.md`.
