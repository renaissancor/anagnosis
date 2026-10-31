# Graph Edge Layer

The contract for edges in the Anagnosis graph. Layers and writers are set by [`../ARCHITECTURE.md`](../ARCHITECTURE.md); this file applies them to edges.

`csvs/` is the source of truth and the graph is built from it. Two different things are called "edges" today. Keep them apart:

| | Candidate | Claim |
|---|---|---|
| What it is | Computed similarity between two polities | A judged statement that an heir inherits from a source |
| Layer | 2, `derived/polity_succession.csv` | 1, `csvs/inheritance_*.csv` |
| Writer | `code/generate-successions.js` | A human |
| Status | Built | Designed, not built |
| Authority | Evidence only | Authoritative once curated |

**A candidate never asserts succession.** Until claims exist, the project has no curated polity-to-polity succession data.

Figures below were measured on 2026-10-31 through `code/lib/csv.js`, after the non-polity migration unless marked. They will move as polity merges land. Running a scratch copy of the generator on that day's `csvs/` reproduced `derived/polity_succession.csv` byte for byte.

---

## 1. Present truth

### What the file holds

`derived/polity_succession.csv` has 3,743 directed rows, covering 479 of 482 polities. There is at most one row per ordered pair, with no self-loops and no dangling ids. `funan`, `khmer_empire` and `majapahit_empire` have no edges.

### When an edge is created

`code/generate-successions.js` adds a pair when any of these fires. Line numbers refer to that file.

| Strategy | Lines | Condition, for A before B | Requires shared territory? |
|---|---:|---|---|
| Territory | 144-174 | On one territory, B's period starts no more than 150 years after A's period ends | It is the territory test |
| Same ethnicity | 189-202 | Same `id_ruling_ethnicity`; gap at most 300 | Yes, anywhere in either lifetime |
| Related ethnicity | 205-221 | Shared ancestor; absolute gap at most 200 | Yes. **Never fires, see below** |
| Same language | 233-243 | Same `id_ruling_language`; gap at most 300 | **No** |
| Same religion | 255-271 | Same `id_ruling_religion`; gap at most 200 | Yes, anywhere in either lifetime |

There is no minimum score. Any one test creates a row.

### Why almost any overlap yields an edge

- **Negative gaps pass.** The territory test only bounds the gap from above (line 159), so full contemporaries qualify. Nothing requires A to have ended.
- **An ongoing period never stops the loop.** With an empty `end_year`, the gap is forced to 0 (line 158), so that period links to every later period on the territory.
- **Territories are coarse.** There are 54 macro-zones shared by 476 polities, so a rival, a colonial occupier and a successor look alike.
- **The overlap loop is redundant.** Lines 164-172 add nothing: a scratch copy without them produced an identical file. The first loop already covers every overlap.

### Columns

| Column | How it is computed | Read it as |
|---|---|---|
| `from_polity_id`, `to_polity_id` | Territory strategy: earlier period start on that territory. Other strategies: earlier polity start | Ordering, not flow. 32 pairs exist in both directions. 25 rows have `to` founded before `from` |
| `from_name`, `to_name` | Copied from `polity.csv` | Labels |
| `territorial_direction` | Counts distinct territories over each polity's whole life (lines 288-297). No shared territory is `displacement`; a larger `to` is `expansion`, smaller is `contraction`, equal is `same`; either side empty is `unknown` | A size comparison, not an event. `ottoman_empire → vichy_france` is a "contraction" |
| `strength` | Number of `shared_territories` + 3 same ethnicity + 1 related + 2 language + 1 religion + 2 if the absolute gap is at most 10, or 1 if at most 50 (lines 300-307) | A weighted count, despite the comment on line 299 calling it a number of signals |
| `shared_territories`, `shared_territory_count` | Territories where the territory strategy fired | **Not** the intersection of two polities' territories. 367 rows have an empty list although the polities do share territory |
| `same_ethnicity`, `same_language`, `same_religion` | Id equality, subject to the table above | Label match. Ids include clusters: `turkic_cluster` covers 42 polities, so `mamluk_sultanate → ottoman_empire` is "same ethnicity" |
| `related_ethnicity` | Dead, see below | Ignore |
| `temporal_gap_years` | `to.start - from.end`, over polity lifetimes. An ongoing `from` gives 0 (line 285) | Negative means overlap. Thresholds above use territory periods, so this column does not show why a territory edge qualified |

### Profile

| Measure | Value |
|---|---:|
| `territorial_direction` | same 1,113; displacement 1,019; contraction 869; expansion 738; unknown 4 |
| Empty `shared_territories` | 1,367 (37%) |
| Of those, with `same_language` | 1,218 |
| Shared territories but no ethnicity, language or religion signal | 978 |
| `same_language` / `same_ethnicity` / `same_religion` / `related_ethnicity` | 1,889 / 1,002 / 1,031 / 0 |
| `temporal_gap_years` below 0 / 0 / above 0 | 1,591 / 322 / 1,830 |
| Polity lifetimes overlap | 1,766 (47%) |
| `strength` range; median; mean; 90th percentile | 1-15; 3; 3.34; 7 |
| `strength` at most 2 | 1,803 (48%) |
| Out-degree median; maximum | 6; 55 (`republic_of_venice`) |

`strength` does not rank historical succession. `byzantine_empire → ottoman_empire` and `ottoman_empire → vichy_france` both score 2.

### What candidates can and cannot claim

A candidate says two polities co-occurred on a macro-zone within a time window, or carry matching labels within one. It does not say that A ended, that B followed A, that anything transferred, how, or whether anyone accepted it. It carries no mechanism, stance or legitimacy.

### Known defect: `related_ethnicity` is dead

The generator maps polities through `old_id` (lines 38-39, 44), and `ethnicity.csv` no longer has that column. It also calls `parseInt` on ids that are now strings (lines 62, 69). `eth` is therefore always null, and lines 205-221 never add anything. Every value in the column is 0.

A scratch patch, run before the non-polity migration on the 4,107-edge file, resolved string ids, set the flag on 651 rows and raised the total to 4,174 edges. `csvs/` and `derived/` were not changed.

### Whether A/B/C/D exists

**No. A/B/C/D typing does not exist in the code output, the data, the database or the frontend.** Only descriptions of it exist.

| Location | What is there |
|---|---|
| `code/generate-successions.js:17-21` | Header comment listing A, A-, B, C. D is not listed. No code implements it |
| `code/generate-successions.js:273-323` | The "Classify edges" section computes only direction and strength |
| `code/generate-successions.js:330-336` | The output has no type column |
| `docs/model/erd_nofk.sql:101`, `docs/model/erd.sql:99` | A `type TEXT` column on `polity_succession` |
| `scripts/load_csvs.sql:161-165` | The insert does not set `type`, so it is always NULL |
| `code/makejson/successions.js:18-32` | The JSON has no type field |
| `public/app.js:11,132`, `public/graph.html:860,1140`, `public/territory/app.js:322` | Colours and filters use `territorial_direction`. `btn.dataset.type` at `graph.html:1140` holds a direction, not a type |
| `csvs/city_succession.csv` | `succession_type` exists for cities only, with unrelated values: `capital_function`, `regional_center`, `merger` |

These docs describe the typing as live and are wrong on that point:

- `README.md:26-34`, which adds a "4,229 edges" count at line 45
- `docs/model/data-model.md:20,38-40,43-55`
- `docs/model/succession.md:3`, which calls it "currently implemented"; its four categories, colour rules and worked queries are not implemented either, and line 13 still cites civilization membership
- `docs/brainstorm/succession/README.md:3` and `01-why-redesign.md`, which also still locates the file in `csvs/` and reports an old edge count

If the matrix were applied to the two nearest columns, 780 rows would have ethnicity and territory, 1,596 territory only, 222 ethnicity only and 1,145 neither. The last group is what the docs call "D, Ahistorical / Invalid". This projection is for scale only and is stored nowhere. `tang_dynasty → ottoman_empire`, the README's example, has no row, but that is absence rather than a type.

---

## 2. Vocabulary as it exists today

### Nodes

| Node | Home | Notes |
|---|---|---|
| Polity | `polity.csv` | 482 rows |
| Territory | `territory.csv` | 54 macro-zones |
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

`data-model.md` also lists `speaksLanguage`, `originatesIn` and `courtLanguage`, along with an `Ideology` tree and `polity.ideology`. No such columns exist. `city_succession.csv` is the only authored succession data in the repo. It reaches the database only (`scripts/load_csvs.sql:225`), with no JSON or API consumer.

---

## 3. Target contract

**Status terms.** DECIDED means a brainstorm file marks it decided, and that file is named. The brainstorm README still labels the whole directory non-canonical until ratified, so DECIDED means decided in design, not built. OPEN includes anything the brainstorm marks provisional or deferred, and anything where its files disagree.

### Principles

| Rule | Status | Decided in |
|---|---|---|
| Layer is `inheritance_*`; "succession" is the `prior`-source subset; "succession graph" remains a valid view | DECIDED | `08-naming.md` |
| Claims are curated; the generator is demoted to a candidate suggester | DECIDED | `README.md` #4, `01-why-redesign.md` |
| Inheritance is per-axis and multi-parent | DECIDED | `README.md` #2, `03-data-model.md` |
| Type is Topology × Mode, not a growing alphabet | DECIDED | `README.md` #1, `02-type-system.md` |
| **Dynastic change is not succession.** A change of house alone is a `polity_dynasty` row, and `dynastic_change` is excluded from mechanisms | DECIDED | `README.md` #3, `02-type-system.md` |
| An edge lands where a polity splits: on a foundational government change, a sovereignty event, or extinction. Religion, language, dynasty, ruler, territory and policy never split alone | DECIDED | `07-polity-split.md` |
| Recognition is perspectival, not an edge boolean | DECIDED | `README.md` #5, `04-stress-tests.md` |
| Extinction is recorded positively, per axis | DECIDED | `06-stress-tests-round2.md` B |

The dynastic rule has an exception: a transition that was more than dynastic, meaning conquest, Mandate transfer or a different ruling people, may be an edge (`02-type-system.md`). 148 candidate rows connect polities sharing a `dynasty_id`, and 70 of those also share `government`. That is a review list, not a verdict.

### `inheritance_claim.csv`

One row per (heir, source): DECIDED (`03-data-model.md`, `08-naming.md`).

| Column | Values | Status |
|---|---|---|
| `id` | | DECIDED that it exists (`03`). Format OPEN |
| `heir_polity_id` | → `polity.id` | DECIDED (`08`) |
| `source_id` | → the table named by `source_type` | DECIDED (`08`) |
| `source_type` | `polity`, `ethnicity`, `religion`, `civilization`, `stateless_people` | DECIDED that sources cross entity types (`03`, `04`). OPEN for `civilization`, which has no table, and `stateless_people`, which has none either |
| `source_temporal_status` | `prior`, `ongoing`, `abstract` | DECIDED (`06` A, `08`). OPEN: how it applies to a source outliving the heir's founding |
| `topology` | `continuation`, `fission`, `fusion`, `secession`, `absorption` | DECIDED (`02`). Placement on the claim is OPEN (`03`, "current bet") |
| `mechanism` | `transformation`, `conquest`, `partition`, `collapse`, `unification`, `personal_union`, `secession`, `dissolution`, `revival`, `translatio`, `title_transfer`, `colonial_independence` | DECIDED (`02`). OPEN: `07` uses `fission`, `fusion` and `continuation` as mechanisms; `02` has them as topologies |
| `legitimacy_mode` | `organic`, `claimed`, `fictive` | DECIDED (`03`) |
| `exclusivity` | `exclusive`, `shared` | DECIDED (`06` D) |
| `temporal_gap_years` | Integer | Listed in `03`. OPEN whether authored or computed, and what a negative value means |
| `note` | Prose | DECIDED (`03`) |

`02` also defines Mode: `continuity`, `conquest`, `compact`, `claim`. `03` has no Mode column, and `02` says each mechanism is a Topology × Mode cell without giving the mapping. Whether Mode is stored or implied is OPEN.

### `inheritance_axis.csv`

| Column | Values | Status |
|---|---|---|
| `claim_id` | → `inheritance_claim.id` | DECIDED (`03`) |
| `axis` | See below | DECIDED (`09`), with one provisional value |
| `stance` | `affirmed`, `repudiated`, `transformed`, `neutral`; nullable | DECIDED (`04`, `09`) |
| `strength` | Graded, not boolean | DECIDED that it is graded (`03`, `05` §4). Scale OPEN (deferred) |

| Axis | Overlap evidence (computed) | Stance | Recognition | Status |
|---|---|:---:|:---:|---|
| `territory` | `polity_territory` | No | Yes | DECIDED (`09`) |
| `ruling_ethnicity` | `polity.id_ruling_ethnicity` | Yes | Rare | DECIDED |
| `state_religion` | `polity.id_ruling_religion` | Yes | Rare | DECIDED |
| `court_language` | `polity.id_ruling_language` | Yes | No | DECIDED |
| `dynasty` | `polity_dynasty` | Yes | No | DECIDED |
| `administrative_apparatus` | Partial | Yes | Rare | DECIDED |
| `legal_tradition` | Partial | Yes | Rare | DECIDED |
| `name_symbols` | None | Yes | Rare | DECIDED |
| `political_legitimacy` | None | Yes | Central | DECIDED |
| `title` | None | Yes | Central | DECIDED |
| `diplomatic_personality` | None | Yes | Yes | OPEN (provisional) |

Cut: capital, currency, military, grievance (`09`). Overlap is computed, never authored: DECIDED. `population` is absent from the final list, although `06` left it parked.

**Conflict, OPEN.** `03` and `06` say this table holds identity axes only and that material axes are never stored. `09` is later and says one uniform list, while marking that model provisional. It also folds irredentism into a `territory` claim, which needs somewhere to live. `03` further uses `affirmed` on territory, while `09` gives territory no stance.

### `inheritance_recognition.csv`

| Column | Values | Status |
|---|---|---|
| `claim_id` | → `inheritance_claim.id` | DECIDED (`03`) |
| `observer_id` | A real polity or institution, never a model's opinion | DECIDED (`05` §5) |
| `observer_type` | | DECIDED (`05` §5). Missing from the `03` sketch; values OPEN |
| `degree` | `recognized`, `partial`, `rejected` | DECIDED (`03`) |

Which observers fill the set is OPEN (deferred). Agents may research recognition, with a human curating the result. They may not act as observers. Any perspective panel is a separate, labelled derived layer (`05` §5).

### `axis_terminus.csv`

Columns `polity_id` and `axis`: DECIDED (`03`, `06` B, `08`). Example: Carthage's territory passes on while its identity axes terminate.

### Ottoman worked example

The edges and carried axes come from `03-data-model.md`, translated into the `09` vocabulary. `?` marks a value the brainstorm does not give; none is decided here. Gaps come from `polity.csv`.

`inheritance_claim`:

| heir_polity_id | source_id | source_type | status | topology | mechanism | legitimacy_mode | exclusivity | gap |
|---|---|---|---|---|---|---|---|---:|
| `ottoman_empire` | `byzantine_empire` | `polity` | ? | `absorption` | `conquest` | ? | ? | -154 |
| `ottoman_empire` | `abbasid_caliphate` | `polity` | ? | `continuation` | `title_transfer` | ? | ? | 41 |
| `ottoman_empire` | `seljuk_rum` | `polity` | ? | `continuation` | `transformation` | ? | ? | -8 |

`inheritance_axis`:

| claim (source) | axis | stance | strength | Origin in `03` |
|---|---|---|---|---|
| `abbasid_caliphate` | `title` | ? | ? | title (caliphate) |
| `abbasid_caliphate` | `political_legitimacy` | ? | ? | political_legitimacy |
| `seljuk_rum` | `dynasty` | ? | ? | dynasty |
| `seljuk_rum` | `ruling_ethnicity` | ? | ? | people |
| `seljuk_rum` | `administrative_apparatus` | ? | ? | administrative_apparatus |

The Byzantine claim stores no axis row under the `03` and `06` reading. Its territory comes from `polity_territory`, and `capital` was cut by `09`. The brainstorm supplies no recognition rows for this case.

Evidence, unchanged and separate:

| Candidate | `strength` | `shared_territories` | Signals | `temporal_gap_years` |
|---|---:|---|---|---:|
| `byzantine_empire → ottoman_empire` | 2 | `anatolia\|balkans` | none | -154 |
| `abbasid_caliphate → ottoman_empire` | 2 | none | same religion | 41 |
| `seljuk_rum → ottoman_empire` | 7 | `anatolia` | same ethnicity, same religion | -8 |

The example does not fit current data at four points, each of which needs the owner's review:

- `dynasty` from `seljuk_rum` has no support in `polity_dynasty`: the Ottomans are `ottoman` and Rum is `seljuk`.
- `abbasid_caliphate` ends in 1258, but `polity.csv` dates the Ottoman title claim to 1517. No row covers the Cairo line in between.
- `byzantine_empire` and `seljuk_rum` both outlive the Ottoman founding, so `prior` is unclear.
- A Byzantine claim with no axis rows is only valid if zero-axis claims are allowed.

---

## 4. Interface rules

These follow from `ARCHITECTURE.md` and apply to whatever is built.

1. **New claims are layer 1.** They live in `csvs/inheritance_*.csv`, are hand-written, and are read through `code/lib/csv.js`.
2. **Candidates stay in `derived/`.** No human edits them, and no script copies a candidate into `csvs/`. Promotion is a person writing a row.
3. **Authored rows never reference derived rows.** Candidates regenerate, so a claim has no candidate id. The build joins them on the pair.
4. **A claim needs no candidate.** Fictive and gapped claims can be real where the generator finds nothing; it cannot see beyond a 300-year gap.
5. **A candidate needs no claim.** Most should never become one.
6. **One home per fact.** Overlap evidence is never retyped into a claim.
7. **Claims must not encode a dynastic change.** The validator rejects `dynastic_change`.
8. **Every new CSV** meets `CLAUDE.md` rule 4: a model doc, a `scripts/validate.js` SCHEMA entry, a consumer, and DDL plus load SQL in `erd.sql`, `erd_nofk.sql` and `scripts/load_csvs.sql`.

### Citing sources

Claims use `fact_source.csv` unchanged. `field` names the column supported, and a composite key is joined with `|` in key order (`source.md`).

| Fact | `entity_table` | `entity_id` | `field` |
|---|---|---|---|
| A claim's mechanism | `inheritance_claim` | `<claim id>` | `mechanism` |
| A stance | `inheritance_axis` | `<claim id>\|<axis>` | `stance` |
| A recognition | `inheritance_recognition` | `<claim id>\|<observer_type>\|<observer_id>` | `degree` |
| An extinction | `axis_terminus` | `<polity id>\|<axis>` | empty |

The validator already checks table, row, field and source (`scripts/validate.js:287-294`). Each new table needs a `PK` entry at `scripts/validate.js:124`.

Two gaps:

- `source.csv` registers datasets and requires an allowlisted licence (`scripts/validate.js:280`). Its only row is `wikidata`, used for identity links. A monograph or article cannot be registered today, and those are what claims will cite.
- `inheritance_claim.source_id` (the inherited-from entity) and `fact_source.source_id` (the citation) share a name for different things.

### Frontend JSON

[`api.md`](./api.md) is the contract for what is served today, and its section 5 governs changes. Nothing below alters that contract yet. The shape is PROPOSED.

Candidates are served at `/api/succession` (`server.js:85`, `api.md` 2.4), and on `/api/polity/:id` as `successors` and `predecessors` (`server.js:58-79`, `api.md` 2.2). Those two names imply a judgment the data does not contain, but pages read them, so renaming or removing them is breaking.

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

```json
{
  "kind": "claim",
  "id": "<claim id>",
  "heir": "ottoman_empire",
  "source": { "type": "polity", "id": "abbasid_caliphate", "temporal_status": null },
  "topology": "continuation",
  "mechanism": "title_transfer",
  "legitimacy_mode": null,
  "exclusivity": null,
  "axes": [
    { "axis": "title", "stance": null, "strength": null, "overlap": null,
      "recognition": [], "citations": [] }
  ],
  "citations": [],
  "evidence": { "temporal_gap_years": 41, "candidate": { "strength": 2, "same_religion": true } }
}
```

---

## 5. Definition of done and migration

### Definition of done

The layer is done when all of these hold:

1. Every open question marked blocking in section 6 is answered, and `docs/model/inheritance.md` is the canonical model doc (`08-naming.md`).
2. All four tables have SCHEMA and `PK` entries, DDL, loaders and a consumer.
3. `npm test` enforces enums, heir and source resolution by `source_type`, uniqueness, `dynastic_change` exclusion, and citation rules.
4. `make:all` builds claim JSON from `csvs/` plus evidence from `derived/`, and `make:db` loads both.
5. The API serves claims and candidates as separate kinds, the UI labels them differently, and `api.md` documents both.
6. The pilot cases encode without a schema change.
7. No doc describes A/B/C/D as live, and no code carries a dead `type` column or a broken signal.
8. Every claim row is reachable in the UI with its citations, and uncurated polities show as uncurated.

Coverage is not a criterion. The dataset is sparse by design.

### Migration order: PROPOSED

This updates `05-open-questions.md` §6, which predates the rename and the move to `derived/`.

| Step | Work | Depends on |
|---|---|---|
| 0 | Owner answers blocking questions | |
| 1 | Correct docs: `README.md`, `data-model.md`, `succession.md` banner | |
| 2 | Clean the generator: fix or remove `related_ethnicity`, delete the redundant loop and the A/B/C comment, drop `type` from both DDL files, review the `derived/` diff | Q8 |
| 3 | Write `docs/model/inheritance.md`; add empty CSVs, SCHEMA, `PK`, validators, DDL and loaders together | 0 |
| 4 | Pilot by hand on the brainstorm's cases: Ottoman, `ottoman_empire → republic_of_turkey`, Russian chain, British Raj to India, Mexico, ROC and PRC, Gran Colombia, Carthage, three caliphs, Han revival | 3 |
| 5 | Revise the schema if the pilot breaks it, before any bulk work | 4 |
| 6 | Add `code/makejson/` output for claims and the new route as additions, and update `docs/model/api.md` in the same commit | 5 |
| 7 | Move the frontend to claims first, with candidates as labelled evidence | 6 |
| 8 | Curate further by query need, walking references first | 7 |
| 9 | Stop presenting candidates as succession, following the `api.md` breaking-change rule. Keep the file as evidence (`ARCHITECTURE.md:61-63`) | 7 |

`05` §6 says to retire the old file last, while `01` and `ARCHITECTURE.md` keep it as evidence. Step 9 follows the latter: only its use as succession is retired.

Polity merges in progress change endpoint ids. Claim curation should begin after they settle.

---

## 6. Open questions for the owner

Ranked by how much they block. Recommendations are advice only and decide nothing.

### Blocking step 3 or 4

**Q1. How is the dynastic rule applied to dynasty-named polities?** `polity.csv` holds many, including 49 rows with `han_chinese` rulers. `07` says dynasty never splits a polity alone, while `02` allows edges for conquest, Mandate transfer or a different ruling people. "Mandate transfer" could admit most of the chain or none of it. The answer determines where edges can land, and it overlaps the polity contract.
*Recommendation:* keep the rows, drop "Mandate transfer" as sufficient alone, and test each boundary against the `07` clauses. Where a transition fails the test, treat it as a polity-merge candidate, not a claim.

**Q2. What does `inheritance_axis` store?** Identity axes only (`03`, `06`), or the uniform list (`09`)? Are `territory` rows permitted for contested claims? May a claim have no axis rows?
*Recommendation:* adopt the uniform axis names, keep overlap computed, and allow a `territory` row only for a contested or irredentist claim. Allow zero-axis claims, since the Byzantine case needs one.

**Q3. What can a claim cite?** `source.csv` cannot hold scholarship, and `source.md` says hand-curated rows need no provenance.
*Recommendation:* add a non-dataset source type that does not pass through the licence allowlist, since citing a work is not importing it. Require at least one citation for each claim and recognition row, starting as a warning.

**Q4. Where do topology, mechanism and Mode live?** Is the "edge-level" bet in `03` accepted? Is Mode stored? Which term owns `fission`, `fusion` and `continuation`? `07` also uses `continuation` for a suspended polity, which is not an edge at all.
*Recommendation:* keep both on the claim, derive Mode from a published mechanism table, and keep those three words as topologies only.

**Q5. How does time work on a claim?** `byzantine_empire` overlaps the Ottomans for 154 years. Is that `prior`? Does `prior` mean ended before the heir's founding, or before the transfer? Should the gap be stored?
*Recommendation:* `prior` means ended by the transfer, add an authored transfer year, and compute the gap from it. Storing a gap derivable from `polity.csv` otherwise breaks one-home-per-fact.

**Q6. What can a source be?** `civilization` has no table and is deferred, `stateless_people` has no table, and `abstract` sources have no home.
*Recommendation:* start with `polity`, `ethnicity` and `religion`; a stateless people is an `ethnicity` with `source_temporal_status` set to `ongoing`. Enforce uniqueness on heir, source type and source id, and make claim ids readable and text-based.

### Needed before bulk curation

**Q7. How are contested sets represented?** Explicit group table, or inferred from source, title axis and exclusivity (`06`)? `06` also says recognizing one exclusive claimant implies rejecting rivals; decide whether that is computed.
*Recommendation:* infer first, and compute implied rejection instead of authoring it.

**Q8. Fix or remove `related_ethnicity`, and rename the candidate file?** A fix adds 67 edges and 651 flags to an already loose set. Tighter thresholds are also available, and the current file name implies succession.
*Recommendation:* remove the signal from the generator, and rename the file to `derived/inheritance_candidate.csv`. Keep `related_ethnicity` in the JSON as `false` until `api.md` allows its removal; no page reads it. Add a required overlap or end condition only after the pilot shows what curators need, and treat any change in row count as evidence to review.

**Q9. Where does an interruption marker live?** `07` wants one on `byzantine_empire` for 1204-1261, and no table defines it.
*Recommendation:* a small authored `polity_interruption.csv`, since it is a fact about a polity and not about an inheritance.

**Q10. Is the worked example still right?** See the four mismatches in section 3.
*Recommendation:* drop `dynasty` from the Seljuk claim, and re-source the title claim once Q5 and the Cairo line are settled.

### Can wait

**Q11. Does `city_succession.csv` follow the rename?** `08` does not address it.
*Recommendation:* leave it. It describes places, and its types are unrelated. Give it a consumer or say why it has none.

**Q12. Should `source_id` be renamed?** `08` decided the name, but it collides with `fact_source.source_id`.
*Recommendation:* keep the decision, and always qualify the name in docs and API. Reopen it only if joins become error-prone.

**Q13. Is this file kept once `inheritance.md` exists?**
*Recommendation:* keep this as the edge-layer contract, move table definitions to `inheritance.md`, and point `succession.md` at both when it is replaced.

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
