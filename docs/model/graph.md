# Graph Edge Layer

The contract for edges in the Anagnosis graph. Layers and writers are set by [`../ARCHITECTURE.md`](../ARCHITECTURE.md); this file applies them to edges.

`csvs/` is the source of truth and the graph is built from it. Two different things are called "edges" today. Keep them apart:

| | Candidate | Claim |
|---|---|---|
| What it is | Computed similarity between two polities | A judged statement that an heir inherits from a source |
| Layer | 2, `derived/polity_succession.csv` | 1, `csvs/inheritance_*.csv` |
| Writer | `code/generate-successions.js` | `succession-curator`, with the owner deciding |
| Status | Built | Built and seeded (9 claims, Ottoman neighbourhood); served by `/api/claim` |
| Authority | Evidence only | Authoritative once curated |

**A candidate never asserts succession.** Succession is decided one claim at a time: the project owner decides each claim, and neither the generator nor a bulk rule ever makes that decision. Where no claim exists, the pair is uncurated.

Figures below were measured on 2026-11-05 through `code/lib/csv.js`, after the non-polity migration unless marked. They will move as polity merges land. Running a scratch copy of the generator on that day's `csvs/` reproduced `derived/polity_succession.csv` byte for byte.

---

## 1. Present truth

### What the file holds

`derived/polity_succession.csv` has 3,787 directed rows, covering 489 of 492 polities. There is at most one row per ordered pair, with no self-loops and no dangling ids. `funan`, `khmer_empire` and `majapahit_empire` have no edges.

### When an edge is created

`code/generate-successions.js` adds a pair when any of these fires. Line numbers refer to that file.

| Strategy | Lines | Condition, for A before B | Requires shared territory? |
|---|---:|---|---|
| Territory | 141-171 | On one territory, B's period starts no more than 150 years after A's period ends | It is the territory test |
| Same ethnicity | 186-199 | Same `id_ruling_ethnicity`; gap at most 300 | Yes, anywhere in either lifetime |
| Related ethnicity | 202-218 | Shared ancestor; absolute gap at most 200 | Yes. **Never fires, see below** |
| Same language | 230-240 | Same `id_ruling_language`; gap at most 300 | **No** |
| Same religion | 252-268 | Same `id_ruling_religion`; gap at most 200 | Yes, anywhere in either lifetime |

There is no minimum score. Any one test creates a row.

### Why almost any overlap yields an edge

- **Negative gaps pass.** The territory test only bounds the gap from above (line 156), so full contemporaries qualify. Nothing requires A to have ended.
- **An ongoing period never stops the loop.** With an empty `end_year`, the gap is forced to 0 (line 155), so that period links to every later period on the territory.
- **Territories are coarse.** There are 56 macro-zones shared by 486 polities, so a rival, a colonial occupier and a successor look alike.
- **The overlap loop is redundant.** Lines 161-169 add nothing: a scratch copy without them produced an identical file. The first loop already covers every overlap.

### Columns

| Column | How it is computed | Read it as |
|---|---|---|
| `from_polity_id`, `to_polity_id` | Territory strategy: earlier period start on that territory. Other strategies: earlier polity start | Ordering, not flow. 28 pairs exist in both directions. 23 rows have `to` founded before `from` |
| `from_name`, `to_name` | Copied from `polity.csv` | Labels |
| `territorial_direction` | Counts distinct territories over each polity's whole life (lines 285-294). No shared territory is `displacement`; a larger `to` is `expansion`, smaller is `contraction`, equal is `same`; either side empty is `unknown` | A size comparison, not an event. `ottoman_empire → vichy_france` is a "contraction" |
| `strength` | Number of `shared_territories` + 3 same ethnicity + 1 related + 2 language + 1 religion + 2 if the absolute gap is at most 10, or 1 if at most 50 (lines 297-304) | A weighted count, despite the comment on line 296 calling it a number of signals |
| `shared_territories`, `shared_territory_count` | Territories where the territory strategy fired | **Not** the intersection of two polities' territories. 340 rows have an empty list although the polities do share territory |
| `same_ethnicity`, `same_language`, `same_religion` | Id equality, subject to the table above | Label match. Ids include clusters: `turkic_cluster` covers 42 polities, so `mamluk_sultanate → ottoman_empire` is "same ethnicity" |
| `related_ethnicity` | Dead, see below | Ignore |
| `temporal_gap_years` | `to.start - from.end`, over polity lifetimes. An ongoing `from` gives 0 (line 282) | Negative means overlap. Thresholds above use territory periods, so this column does not show why a territory edge qualified |

### Profile

| Measure | Value |
|---|---:|
| `territorial_direction` | same 1,128; displacement 1,062; contraction 862; expansion 731; unknown 4 |
| Empty `shared_territories` | 1,406 (37%) |
| Of those, with `same_language` | 1,258 |
| Shared territories but no ethnicity, language or religion signal | 972 |
| `same_language` / `same_ethnicity` / `same_religion` / `related_ethnicity` | 1,933 / 1,016 / 1,027 / 0 |
| `temporal_gap_years` below 0 / 0 / above 0 | 1,592 / 340 / 1,855 |
| Polity lifetimes overlap | 1,783 (47%) |
| `strength` range; median; mean; 90th percentile | 1-15; 3; 3.35; 7 |
| `strength` at most 2 | 1,802 (48%) |
| Out-degree median; maximum | 6; 55 (`republic_of_venice`) |

`strength` does not rank historical succession. `byzantine_empire → ottoman_empire` and `ottoman_empire → vichy_france` both score 2.

### What candidates can and cannot claim

A candidate says two polities co-occurred on a macro-zone within a time window, or carry matching labels within one. It does not say that A ended, that B followed A, that anything transferred, how, or whether anyone accepted it. It carries no mechanism, stance or legitimacy.

### Known defect: `related_ethnicity` is dead

The generator maps polities through `old_id` (lines 35-36, 41), and `ethnicity.csv` no longer has that column. It also calls `parseInt` on ids that are now strings (lines 59, 66). `eth` is therefore always null, and lines 202-218 never add anything. Every value in the column is 0.

A scratch patch, run before the non-polity migration on the 4,107-edge file, resolved string ids, set the flag on 651 rows and raised the total to 4,174 edges. `csvs/` and `derived/` were not changed.

### Whether A/B/C/D exists

**No. A/B/C/D typing does not exist in the code output, the data, the database or the frontend.** Only descriptions of it exist.

| Location | What is there |
|---|---|
| `code/generate-successions.js` | The header says no type is emitted. No code implements one |
| `code/generate-successions.js:270-320` | The "Classify edges" section computes only direction and strength |
| `code/generate-successions.js:327-353` | The headers, rows and write have no type column |
| `docs/model/erd_nofk.sql`, `docs/model/erd.sql` | A `type TEXT` column on `polity_succession` |
| `scripts/load_csvs.sql:168-175` | The insert does not set `type`, so it is always NULL |
| `code/makejson/successions.js:18-32` | The JSON has no type field |
| `public/polity/app.js` | The computed-evidence list words `territorial_direction` as plain text. No page colours or filters on it |
| `csvs/city_succession.csv` | `succession_type` exists for cities only, with unrelated values: `capital_function`, `regional_center`, `merger` |

These docs describe the typing as live and are wrong on that point:

- `package.json` (`description`), which says the project types each succession
- `docs/brainstorm/succession/01-why-redesign.md`, an archive file, which also locates the file in `csvs/` and reports an old edge count

If the matrix were applied to the two nearest columns, 794 rows would have ethnicity and territory, 1,587 territory only, 222 ethnicity only and 1,184 neither. The last group is what the docs call "D, Ahistorical / Invalid". This projection is for scale only and is stored nowhere. `tang_dynasty → ottoman_empire`, the README's example, has no row, but that is absence rather than a type.

---

## 2. Vocabulary as it exists today

### Nodes

| Node | Home | Notes |
|---|---|---|
| Polity | `polity.csv` | 492 rows |
| Territory | `territory.csv` | 56 macro-zones |
| Dynasty | `dynasty.csv` | A tag, not a tier |
| Figure | `figure.csv` | |
| Government | `government.csv` | Flat. This is the current form of "ideology": the column is `polity.government` |
| Ethnicity, Language, Religion | `ethnicity.csv`, `language.csv`, `religion.csv` | Trees |
| City | `city.csv`, `city_name.csv` | |

Civilization is not a node (see `civilization.md`). `source.csv` and `fact_source.csv` are provenance, not graph content.

### Edges

| Edge | Direction | Home | Layer |
|---|---|---|---|
| parent | Ethnicity, Language, Religion to same type | `parent_id` | 1 |
| ruled by | Polity → Ethnicity | `polity.id_ruling_ethnicity` | 1 |
| ruling language | Polity → Language | `polity.id_ruling_language` | 1 |
| ruling religion | Polity → Religion | `polity.id_ruling_religion` | 1 |
| has government | Polity → Government | `polity.government` | 1 |
| controlled, dated | Polity → Territory | `polity_territory.csv` | 1 |
| ruled by house, dated | Polity → Dynasty | `polity_dynasty.csv` | 1 |
| belongs to | Figure → Polity | `figure.polity_id` | 1 |
| city succession, typed | City → City | `city_succession.csv` (7 rows) | 1 |
| candidate | Polity → Polity | `derived/polity_succession.csv` | 2 |

`data-model.md` also lists `speaksLanguage`, `originatesIn` and `courtLanguage`, along with an `Ideology` tree and `polity.ideology`. No such columns exist. `city_succession.csv` is the only authored succession data in the repo. It reaches the database only (`scripts/load_csvs.sql:232-235`), with no JSON or API consumer.

---

## 3. Target contract

**Status terms.** DECIDED means a brainstorm file marks it decided, or the owner decided it in an entry of the `inheritance.md` Decision log, and that source is named. DECIDED means decided in design; `inheritance.md` says what is built. PROPOSED means a design choice drafted where the owner's decisions were silent, awaiting the owner; `inheritance.md` lists each under "Proposed, awaiting the owner". OPEN includes anything the brainstorm marks provisional or deferred, and anything where its files disagree.

### Principles

| Rule | Status | Decided in |
|---|---|---|
| Layer is `inheritance_*`; "succession" is the `prior`-source subset; "succession graph" remains a valid view | DECIDED | `08-naming.md` |
| Claims are curated; the generator is demoted to a candidate suggester | DECIDED | `README.md` #4, `01-why-redesign.md` |
| Inheritance is per-axis and multi-parent | DECIDED | `README.md` #2, `03-data-model.md` |
| Type is Topology × Mode, not a growing alphabet | DECIDED | `README.md` #1, `02-type-system.md` |
| **Dynastic change is not succession.** A change of house alone is a `polity_dynasty` row, and `dynastic_change` is excluded from mechanisms | DECIDED | `README.md` #3, `02-type-system.md` |
| An edge lands where a polity splits: on a foundational government change, a sovereignty event, or extinction. Religion, language, dynasty, ruler, territory and policy never split alone. A polity that loses its seat to conquest is extinguished, even if a government of it keeps functioning elsewhere; that government is its own row | DECIDED | `07-polity-split.md`; the conquest clause is the owner's amendment of 2026-11-16, [`polity.md`](./polity.md) section 4 |
| A claim may also be acquired inside a polity's life, so not every claim sits on a split | DECIDED | `inheritance.md` Decision log, 2026-11-21 |
| Recognition is perspectival, not an edge boolean | DECIDED | `README.md` #5, `04-stress-tests.md` |
| Extinction is recorded positively, per axis | DECIDED | `06-stress-tests-round2.md` B |

The dynastic rule has an exception: a transition that was more than dynastic, meaning conquest, Mandate transfer or a different ruling people, may be an edge (`02-type-system.md`). Decided 2026-11-21: Mandate transfer alone does not suffice, and dynastic boundaries are tested against the split clauses (Q1). 146 candidate rows connect polities sharing a `dynasty_id`, and 67 of those also share `government`. That is a review list, not a verdict.

### Tables

[`inheritance.md`](./inheritance.md) owns the four table definitions, the rules for judging a claim, and their open column questions. This file owns the boundary between candidates and claims.

### Ottoman worked example

The claims follow the rules of 2026-11-16 and 2026-11-21 in [`inheritance.md`](./inheritance.md). The column names there, including `transfer_mode` and its value names, were decided on 2026-11-21. Mode and transfer year are filled where the precedents give them; status and gap are computed from `transfer_year` and `polity.csv`. `?` marks a value the regrade sets. The Cairo Abbasid line is not a polity row, so the caliphate reaches the Ottomans through the Mamluks.

`inheritance_claim`:

| heir_polity_id | source_id | transfer year | mode | mechanism | status (computed) | gap (computed) |
|---|---|---:|---|---|---|---:|
| `ottoman_empire` | `byzantine_empire` | 1453 | `seizure` | `conquest` | `prior` | 0 |
| `mamluk_sultanate` | `abbasid_caliphate` | 1261 | `assertion` | ? | `prior` | 3 |
| `ottoman_empire` | `mamluk_sultanate` | 1517 | `seizure` | ? | `prior` | 0 |
| `ottoman_empire` | `seljuk_rum` | ? | ? | ? | ? | ? |

Axis rows, `exclusivity` and `title_key` are set by the regrade under `inheritance.md`, "How to judge a claim".

Evidence, unchanged and separate (measured 2026-11-16):

| Candidate | `strength` | `shared_territories` | Signals | `temporal_gap_years` |
|---|---:|---|---|---:|
| `byzantine_empire → ottoman_empire` | 2 | `anatolia\|balkans` | none | -154 |
| `abbasid_caliphate → ottoman_empire` | 2 | none | same religion | 41 |
| `abbasid_caliphate → mamluk_sultanate` | 5 | `levant` | same language | -8 |
| `mamluk_sultanate → ottoman_empire` | 5 | `egypt\|levant` | same ethnicity | -218 |
| `seljuk_rum → ottoman_empire` | 7 | `anatolia` | same ethnicity, same religion | -8 |

The `abbasid_caliphate → ottoman_empire` candidate stays as evidence; no claim is written on that pair.

The 1453 Byzantine row stands on today's data. Once the decided 1204 split is executed, `byzantine_empire` ends at 1204, and the 1453 `seizure` claim takes the Nicaea row as its source: under [`polity.md`](./polity.md) open question 13, answered 2026-11-21, the empire restored in 1261 is not a new row and the Nicaea row continues to 1453. The 1547 Russian assertion takes the same row as its source. The split is not yet executed in the data.

The earlier `03` version of this example did not fit the data at four points. On 2026-11-16 the owner's rules settled each:

- `dynasty` from `seljuk_rum`, with no support in `polity_dynasty`: the axis-row rule in `inheritance.md` decides whether any `dynasty` row is written. The seed carries none.
- `abbasid_caliphate` ends in 1258 while the Ottoman title claim dates to 1517: the caliphate is now two claims, Mamluk from Abbasid (1261) and Ottoman from Mamluk (1517).
- `byzantine_empire` and `seljuk_rum` outlive the Ottoman founding, so `prior` was unclear: status is now computed against `transfer_year`, not the heir's founding.
- A Byzantine claim with no axis rows: allowed only when `shared`. Decided 2026-11-21: an `exclusive` claim needs an axis row with a `title_key`.

---

## 4. Interface rules

These follow from `ARCHITECTURE.md` and apply to whatever is built.

1. **New claims are layer 1.** They live in `csvs/inheritance_*.csv`, are written one at a time, and are read through `code/lib/csv.js`.
2. **Candidates stay in `derived/`.** No human edits them, and no script copies a candidate into `csvs/`. Promotion is a person or curator role writing a row, never a script.
3. **Authored rows never reference derived rows.** Candidates regenerate, so a claim has no candidate id. The build joins them on the pair.
4. **A claim needs no candidate.** Declared claims and gapped claims can be real where the generator finds nothing; it cannot see beyond a 300-year gap.
5. **A candidate needs no claim.** Most should never become one.
6. **One home per fact.** Overlap evidence is never retyped into a claim.
7. **Claims must not encode a dynastic change.** The validator rejects `dynastic_change`.
8. **Every new CSV** meets `CLAUDE.md` rule 8: a model doc, a `scripts/validate.js` SCHEMA entry, a consumer, and DDL plus load SQL in `erd.sql`, `erd_nofk.sql` and `scripts/load_csvs.sql`.

### Citing sources

Claims use `fact_source.csv` unchanged. `field` names the column supported, and a composite key is joined with `|` in key order (`source.md`).

| Fact | `entity_table` | `entity_id` | `field` |
|---|---|---|---|
| A claim's mechanism | `inheritance_claim` | `<claim id>` | `mechanism` |
| A stance | `inheritance_axis` | `<claim id>\|<axis>` | `stance` |
| A recognition | `inheritance_recognition` | `<claim id>\|<observer_id>` | `degree` |
| An extinction | `axis_terminus` | `<polity id>\|<axis>` | empty |

The validator already checks table, row, field and source. Each new table needs a `PK` entry in `scripts/validate.js`.

Two gaps:

- `source.csv` registers datasets and requires an allowlisted licence. Its only row is `wikidata`. `fact_source.csv` cites it for identity links and, at field level, for `start_year`, `end_year`, `government` and `id_ruling_language` on 12 polities (33 rows on 2026-11-05). A monograph or article cannot be registered today, and those are what claims will cite.
- `inheritance_claim.source_id` (the inherited-from entity) and `fact_source.source_id` (the citation) share a name for different things.

### Frontend JSON

[`api.md`](./api.md) is the contract for what is served today, and its section 5 governs changes. Claims are now served as `/api/claim` and `/api/polity/:id/claims` (`api.md` 2.4a), without the `kind`, citation or evidence fields below. The rest of this section is PROPOSED.

Candidates are served at `/api/succession` (`api.md` 2.4), and on `/api/polity/:id` as `successors` and `predecessors` (`api.md` 2.2). Those two names imply a judgment the data does not contain, but pages read them, so renaming or removing them is breaking.

This section also answers the A/B/C/D question in `api.md` section 6: the matrix is not built, and `02-type-system.md` rules out extending it. It does not return in the redesign. The frontend must not rely on it.

Required:

- Claims arrive by addition: a new `data/inheritance/` build output, a new route such as `/api/inheritance`, and new fields on `/api/polity/:id`. `api.md` section 5 counts all of these as non-breaking.
- `/api/succession`, `successors` and `predecessors` keep their fields and types until every reading page has moved. Then follow the `api.md` breaking-change rule: ship alongside, migrate the page, remove.
- Claims and candidates are never merged into one array. Each claim states its kind.
- A claim arrives with axes, recognition and citations resolved, plus computed overlap and any matching candidate as `evidence`.
- A polity with no claims shows as uncurated, not as having no heirs. Extinction appears only through `axis_terminus`.
- Unset values are `null`, and axis `strength` must not be charted until a scale exists.
- Add the new output to the `api.md` shape check (section 7) when that check is built.
- New enum values for the claim fields do not touch the five `territorial_direction` values that pages hard-code.

The example shows the `claims.json` fields of the target build decided 2026-11-21 (`inheritance.md`, "Pipeline"), plus the still-proposed frontend fields above (`kind`, `citations`, `evidence`, per-axis `overlap` and `recognition`). It shows the shape after the one commit in which `legitimacy_mode` is emitted alongside `transfer_mode`, so that alias is absent.

```json
{
  "kind": "claim",
  "id": "<claim id>",
  "heir_polity_id": "ottoman_empire",
  "source_type": "polity",
  "source_id": "mamluk_sultanate",
  "source_temporal_status": "prior",
  "temporal_gap_years": 0,
  "transfer_year": 1517,
  "topology": null,
  "mechanism": null,
  "transfer_mode": "seizure",
  "exclusivity": null,
  "contested_with": [],
  "contested_with_source": false,
  "axes": [
    { "axis": "title", "stance": "affirmed", "strength": null, "title_key": "caliph", "overlap": null,
      "recognition": [], "citations": [] }
  ],
  "citations": [],
  "evidence": { "temporal_gap_years": -218, "candidate": { "strength": 5, "same_ethnicity": true } }
}
```

---

## 5. Definition of done and migration

### Definition of done

The layer is done when all of these hold:

1. Every open question marked blocking in section 6 is answered, and `docs/model/inheritance.md` is the canonical model doc (`08-naming.md`).
2. All four tables have SCHEMA and `PK` entries, DDL, loaders and a consumer.
3. `npm test` enforces enums, heir and source resolution by `source_type`, uniqueness, `dynastic_change` exclusion, citation rules, and the checks listed in `inheritance.md`, "Checks the validator will enforce".
4. `make:all` builds claim JSON from `csvs/` plus evidence from `derived/`, and `make:db` loads both.
5. The API serves claims and candidates as separate kinds, the UI labels them differently, and `api.md` documents both.
6. The pilot cases encode without a schema change.
7. No doc describes A/B/C/D as live, and no code carries a dead `type` column or a broken signal.
8. Every claim row is reachable in the UI with its citations, and uncurated polities show as uncurated.

Coverage is not a criterion. The dataset is sparse by design.

### Migration order

`inheritance.md` holds the migration status.

Polity merges in progress change endpoint ids. Claim curation should begin after they settle.

---

## 6. Open questions for the owner

Ranked by how much they block. Recommendations are advice only and decide nothing.

### Blocking claims

**Q1. How is the dynastic rule applied to dynasty-named polities?** `polity.csv` holds many, including 45 rows with `han_chinese` rulers. `07` says dynasty never splits a polity alone, while `02` allows edges for conquest, Mandate transfer or a different ruling people. "Mandate transfer" could admit most of the chain or none of it. The answer determines where edges can land, and it overlaps the polity contract.
*Recommendation:* keep the rows, drop "Mandate transfer" as sufficient alone, and test each boundary against the `07` clauses. Where a transition fails the test, treat it as a polity-merge candidate, not a claim.
*Answered in part, 2026-11-16.* Settled: a change of dynasty alone is still never a claim (`inheritance.md`, "Is it a claim at all?"), and the boundary where a polity loses its seat to conquest follows the owner's amendment to the split rule in [`polity.md`](./polity.md) section 4. Still open: whether proclaiming a new state name or title, with no other change, creates a new polity (to be settled in a pilot on the Chinese dynastic chain); whether split clause 1 is read de jure or de facto; and whether a government in exile that holds no territory counts as carrying on. Decided 2026-11-21: "Mandate transfer" alone does not admit an edge; dynastic boundaries are tested against the split clauses.

**Q2. What does `inheritance_axis` store?** Identity axes only (`03`, `06`), or the uniform list (`09`)? Are `territory` rows permitted for contested claims? May a claim have no axis rows?
*Recommendation:* adopt the uniform axis names, keep overlap computed, and allow a `territory` row only for a contested or irredentist claim. Allow zero-axis claims, since the Byzantine case needs one.
*Answered 2026-11-16:* the uniform list stays, split into computable axes (including `territory`) that get a row only under stated conditions and non-computable axes that get a row for a deliberate act; zero-axis claims are allowed. See `inheritance.md`, "Axis rows". Decided 2026-11-21: the exception, so a zero-axis claim must be `shared`, since an `exclusive` claim needs a `title_key` row.

**Q3. What can a claim cite?** `source.csv` cannot hold scholarship, and `source.md` says hand-curated rows need no provenance.
*Recommendation:* add a non-dataset source type that does not pass through the licence allowlist, since citing a work is not importing it. Require at least one citation for each claim and recognition row, starting as a warning.

**Q4. Where do topology, mechanism and Mode live?** Is the "edge-level" bet in `03` accepted? Is Mode stored? Which term owns `fission`, `fusion` and `continuation`? `07` also uses `continuation` for a suspended polity, which is not an edge at all.
*Recommendation:* keep both on the claim, derive Mode from a published mechanism table, and keep those three words as topologies only.
*Answered in part, 2026-11-16.* Settled: Mode is stored and authored, judged by three ordered questions (handed over, taken by force, declared), not derived from mechanism. See `inheritance.md`, "The mode". Decided 2026-11-21: the column is `transfer_mode`, with values `handover`, `seizure` and `assertion`; mechanism constrains mode (`conquest` requires `seizure`; `translatio` and `revival` require `assertion`); a non-polity source is always `assertion`; and the collapse case is `handover` (to be confirmed in the pilot). Also decided 2026-11-21: topology and mechanism stay on the claim. Still open: which term owns `fission`, `fusion` and `continuation`, and `07`'s use of `continuation` for a suspended polity.

**Q5. How does time work on a claim?** `byzantine_empire` overlaps the Ottomans for 154 years. Is that `prior`? Does `prior` mean ended before the heir's founding, or before the transfer? Should the gap be stored?
*Recommendation:* `prior` means ended by the transfer, add an authored transfer year, and compute the gap from it. Storing a gap derivable from `polity.csv` otherwise breaks one-home-per-fact.
*Answered 2026-11-16:* as recommended. The transfer year is authored; for a polity source, `prior` means the source's `end_year` is on or before the transfer year, and the gap is computed and leaves the CSV. See `inheritance.md`, "Time". Decided 2026-11-21: the transfer year is required on every claim and falls from the heir's `start_year` minus 1 to its `end_year`; the gap check tolerates a gap of 1; a polity source with an empty `end_year` has status `ongoing` and gap 0. Deferred 2026-11-21: claim `end_year`. Decided 2026-11-21: the column name `transfer_year`.

**Q6. What can a source be?** `civilization` has no table and is deferred, `stateless_people` has no table, and `abstract` sources have no home.
*Recommendation:* start with `polity`, `ethnicity` and `religion`; a stateless people is an `ethnicity` with `source_temporal_status` set to `ongoing`. Enforce uniqueness on heir, source type and source id, and make claim ids readable and text-based.
*Answered in part, 2026-11-21.* Decided: a non-polity source carries an authored `source_temporal_status` of `ongoing` or `abstract`, never `prior`, so `abstract` sources have a status. Deferred, not adopted: adding the transfer year to the uniqueness key; it stays heir, source type and source id until a real claim needs a second transfer year for the same heir and source, and none of the 9 current claims does. See `inheritance.md`, "The four tables". Also open: which source types get a table (`civilization`, `stateless_people`, a `dynasty` type for descent claims), a source entity for a colonial unit, and the claim id format.

### Needed before bulk curation

**Q7. How are contested sets represented?** Explicit group table, or inferred from source, title axis and exclusivity (`06`)? `06` also says recognizing one exclusive claimant implies rejecting rivals; decide whether that is computed.
*Recommendation:* infer first, and compute implied rejection instead of authoring it.
*Answered 2026-11-16 and 2026-11-21.* Settled 2026-11-16: no group table; contests are computed and keyed on the title asserted rather than on the source. See `inheritance.md`, "Contests (computed)". Decided 2026-11-21: the `title_key` axis column that carries the title; the contest mechanics, implemented after the step 9 pilot, with periods that only touch not overlapping; and computing implied rejection from contests instead of writing it as recognition.

**Q8. Fix or remove `related_ethnicity`, and rename the candidate file?** Before the non-polity migration, a scratch fix added 67 edges and 651 flags to an already loose set. Tighter thresholds are also available, and the current file name implies succession.
*Recommendation:* remove the signal from the generator, and rename the file to `derived/inheritance_candidate.csv`. Keep `related_ethnicity` in the JSON as `false` until `api.md` allows its removal; no page reads it. Add a required overlap or end condition only after the pilot shows what curators need, and treat any change in row count as evidence to review.

**Q9. Where does an interruption marker live?** `07` wants one on `byzantine_empire` for 1204-1261, and no table defines it.
*Recommendation:* a small authored `polity_interruption.csv`, since it is a fact about a polity and not about an inheritance.
*Answered in part.* Settled: under the owner's amendment of 2026-11-16 to the split rule in [`polity.md`](./polity.md) section 4, `byzantine_empire` ends at 1204 and Nicaea is a separate row, so the 1204-1261 case that raised this question needs no marker. This follows from the amendment confirmed 2026-11-21; it was not confirmed separately. That split is not yet executed in the data. Still proposed, awaiting the owner: the marker is a fact about a polity row, carried by a table of period labels on a polity row that will also hold conventional period names. It stays proposed because no real case needs it yet. Answered 2026-11-21 (`polity.md` open question 13): the post-1261 empire is not a new row, and the Nicaea row continues to 1453. Still open: the table's design and name.

**Q10. Is the worked example still right?** See the four mismatches in section 3.
*Recommendation:* drop `dynasty` from the Seljuk claim, and re-source the title claim once Q5 and the Cairo line are settled.
*Answered 2026-11-16:* all four mismatches are settled by approved rules (the Mamluk chain, computed status, the axis-row rule, zero-axis claims); section 3 now shows the example, with the caliphate running through the Mamluks. Its column names and mode value names were decided on 2026-11-21.

### Can wait

**Q11. Does `city_succession.csv` follow the rename?** `08` does not address it.
*Recommendation:* leave it. It describes places, and its types are unrelated. Give it a consumer or say why it has none.

**Q12. Should `source_id` be renamed?** `08` decided the name, but it collides with `fact_source.source_id`.
*Recommendation:* keep the decision, and always qualify the name in docs and API. Reopen it only if joins become error-prone.

**Q14. Deferred or provisional items.** The strength scale and any decay along translatio chains (`05` §4); the observer set (`05` §5); `diplomatic_personality` and the uniform model's status (`09`).
*Recommendation:* decide after the pilot gives data to calibrate against.

**Q15. Should Seshat's relationship codes be crosswalked?** Seshat records how a polity relates to its predecessor with the codes `continuity`, `cultural assimilation`, `elite migration`, `population migration` and `secession`. The data has **not been downloaded** and is not in `source.csv`, so everything below is unverified.

| Seshat code | Possible mapping | Fit |
|---|---|---|
| `continuity` | Topology `continuation` | Plausible |
| `secession` | Topology `secession` | Plausible |
| `cultural assimilation` | Possibly stance on `state_religion` or `court_language` | Weak |
| `elite migration` | No equivalent; closest is a change on `ruling_ethnicity` | Weak |
| `population migration` | No equivalent; `population` is not an axis | None |

*Recommendation:* treat it as a second evidence stream, never as claims, and write rows by hand under the normal source rules. `source.md` requires checking Seshat's current licence terms and keeping a dated copy. Its codes describing people movement may show a gap in the model, which is worth checking in the pilot.
