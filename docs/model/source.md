# Source and Provenance

## Purpose

`csvs/` is the source of truth. External sources are reference material: they are cited when a row is written, and never flow into `csvs/` automatically. If a source disagrees with a CSV, the CSV stands until someone edits it.

`source.csv` is the registry of external datasets. `fact_source.csv` records which of them a fact came from. Together they keep every imported fact traceable to a licence and a citation, so the dataset can stay under CC BY-SA 4.0 (see `LICENSE-DATA.md`).

A `source` row earns its place the way any entity does: something in `fact_source.csv` points to it. Hand-curated rows need no provenance row.

---

## `source.csv`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | snake_case id | yes | Stable source id, e.g. `wikidata` |
| `name` | text | yes | Display name |
| `url` | URL | yes | Where the licence was verified or the data obtained |
| `licence` | allowlisted id | yes | See below |
| `version` | text | yes | Release or dump identifier |
| `retrieved` | `YYYY-MM-DD` | yes | Download date |
| `citation` | text | yes | The citation the source asks for |
| `note` | text | no | Anything a reuser should know |

## `fact_source.csv`

| Field | Type | Required | Description |
|---|---|---|---|
| `entity_table` | CSV name | yes | Table holding the fact, e.g. `polity_territory` |
| `entity_id` | key | yes | The row's primary key; composite keys are joined with `\|` in the table's key order |
| `field` | column name | no | Column the source supports; empty = the whole row. `id` means an identity link only: `source_record` is the same entity, and no other value in the row came from that source |
| `source_id` | ref → source.csv | yes | Where it came from |
| `source_record` | text | no | The record in that source, e.g. a Wikidata QID |
| `note` | text | no | |

---

## Licence allowlist

`scripts/validate.js` fails on any `licence` outside this list, so a blocked source cannot be registered by accident:

| Value | Meaning |
|---|---|
| `public-domain`, `CC0-1.0` | No conditions |
| `CC-BY-3.0`, `CC-BY-4.0` | Attribution |
| `CC-BY-SA-4.0` | Attribution and share-alike, matching this dataset |

**Excluded on purpose:**

- **Non-commercial** (CShapes, EPR, World History Encyclopedia, D-PLACE): NC would stop downstream uses such as a game.
- **ODbL** (OpenStreetMap): no compatibility with CC BY-SA was found, so it cannot be merged here.
- **Proprietary or custom terms** (Polity5, Correlates of War, Euratlas, GeaCron, Ethnologue, World Religion Database, Pew tables): these need written permission.
- **No licence found** (ARDA) or **unclear provenance** (historical-basemaps).

CC BY 3.0 does not expressly license EU database rights, so take from a CC BY 3.0 source (Pleiades) selectively rather than wholesale.

Licences change. Seshat moved from CC BY-NC-SA to CC BY-SA, and its Equinox records disagree, so use only data downloaded under its current terms and keep a dated copy of those terms.

---

## Scope limit

`source.csv` registers licensed datasets. A book or paper has no licence that the allowlist can accept, so scholarship cannot be cited here yet. See the open question in `graph.md`.

---

## Adding a source

1. Read the licence on the source's own page, not a mirror. A licence on a repo may cover only its code.
2. Add it to `scripts/sources.json` and run `node scripts/fetch_sources.js <id>`. Downloads land in the gitignored `sources/<id>/<version>/`, unpacked into `unpacked/`, with the date and checksum in `sources/<id>/FETCHED.json`. The script refuses any licence outside the allowlist.
   Wikipedia is the exception: `node scripts/fetch_wikipedia.js` fetches only the articles for confirmed Wikidata links in `fact_source.csv`, as `sources/wikipedia/<date>/articles.jsonl`, one article per line with its revision URL. `node scripts/build_index.js` indexes that corpus by section, and `node scripts/search_index.js "query"` returns passages with their source URL and licence.
3. Add the `source.csv` row, then write facts into the layer 1 CSVs by hand in your own wording, with `fact_source.csv` rows pointing back.
4. Add a specialist in `.claude/agents/source-<id>.md`, so curators can query the source without learning its format.
5. Run `npm test`.

Citing a source does not grant permission. The licence does; the citation is a condition of it.

## How to validate

`npm run validate` checks the licence allowlist and that each `fact_source` row names a real table, row, field and source. Done means it passes.

## Citation rules (decided 2026-11-22)

1. **Binned sources.** A field may be cited to a source that bins time when the chosen year falls in, or just before, the first bin that shows the change, and the `note` names the event that fixes the year. A binned source records a change only at the next bin edge. Example: `fact_source.csv:332-333`, the Cliopatria citations for `later_byzantine_empire` in `anatolia` (end 1337, the fall of Nicomedia, inside the 1333–1343 slice) and in `balkans` (start 1246, the absorption of Thessalonica, just before the 1250–1259 slice that first shows the European territory).
2. **Spans split differently.** When our split rule divides a span differently from the source, the `id` link goes to the source item that shares the row's start. The `note` names any other items that cover the rest. Example: `later_byzantine_empire` links to Q181254 (Empire of Nicaea, from 1204), and the note names Q3053276 (1261–1453).

## Current state (measured 2026-11-22)

`source.csv` has 2 rows (`wikidata`, `cliopatria`) and `fact_source.csv` has 332: 291 identity links (`field = id`), 39 field citations on 13 polities and 2 field citations on `polity_territory` rows.

## Open questions

- A monograph or article cannot be registered today (`graph.md` Q3).

## Decision log

| Date | Decision | Reason |
|---|---|---|
| 2026-11-22 | The owner adopted the two citation rules above: binned sources (rule 1; a year in or just before the first bin that shows the change, reworded the same day) and spans split differently (rule 2). | A binned source records a change only at the next bin edge. Set while executing the Byzantine split (TODO 66), where Cliopatria bins time and Wikidata divides the span at 1261 |
