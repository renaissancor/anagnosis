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

## Adding a source

1. Read the licence on the source's own page, not a mirror. A licence on a repo may cover only its code.
2. Add it to `scripts/sources.json` and run `node scripts/fetch_sources.js <id>`. Downloads land in the gitignored `sources/<id>/<version>/`, unpacked into `unpacked/`, with the date and checksum in `sources/<id>/FETCHED.json`. The script refuses any licence outside the allowlist.
   Wikipedia is the exception: `node scripts/fetch_wikipedia.js` fetches only the articles for confirmed Wikidata links in `fact_source.csv`, as `sources/wikipedia/<date>/articles.jsonl`, one article per line with its revision URL. `node scripts/build_index.js` indexes that corpus by section, and `node scripts/search_index.js "query"` returns passages with their source URL and licence.
3. Add the `source.csv` row, then write facts into the layer 1 CSVs by hand in your own wording, with `fact_source.csv` rows pointing back.
4. Add a specialist in `.claude/agents/source-<id>.md`, so curators can query the source without learning its format.
5. Run `npm test`.

Citing a source does not grant permission. The licence does; the citation is a condition of it.
