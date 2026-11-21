# Inheritance — the curated succession layer

> **Status: live, served by `/api/claim` and `/api/polity/:id/claims`.** This file is the table contract for the four inheritance tables and the rules for judging a claim. [`graph.md`](./graph.md) owns the boundary between claims and computed candidates, and the ranked open questions. Design rationale is archived in [`docs/brainstorm/succession/`](../brainstorm/succession/README.md).
>
> **The contract and the files do not match yet.** On 2026-11-16 and 2026-11-21 the owner approved part of a new rule set; see the [Decision log](#decision-log). The rest is marked **PROPOSED**: a design choice awaiting the owner's confirmation, listed under [Proposed, awaiting the owner](#proposed-awaiting-the-owner). A curator must not treat a PROPOSED item as decided. The CSVs, `scripts/validate.js`, `code/makejson/inheritance.js`, the DDL and the API still carry the earlier shape (`legitimacy_mode`, an authored `temporal_gap_years`, the `neutral` stance, no transfer year). See [Migration status](#migration-status).

## The one-sentence model

Inheritance is a set of **curated, per-axis claims**: each
`(heir ← source, topology, mechanism, mode)` edge carries the identity axes that
flowed through it, with **recognition as a separate perspectival relation** —
not one blended similarity edge per polity-pair.

**Succession** is the colloquial name for the subset where the computed
`source_temporal_status` is `prior` (the source had ended by the transfer). The general relation is
*"an heir claims inheritance from a source"* — which may also be `ongoing`
(a living source or trans-temporal community) or `abstract` (an idea).

## Why multi-parent — the Ottoman example

One successor inherits different things from *different* sources. The mode is classified by the [approved questions](#the-mode). A `?` is left for the regrade.

| claim | transfer year | mode | what the heir took up |
|---|---:|---|---|
| ottoman_empire ← byzantine_empire | 1453 | seizure | the Roman imperial title (Kayser-i Rum) and Constantinople as imperial stage |
| mamluk_sultanate ← abbasid_caliphate | 1261 | assertion | the caliphate; Baybars installed an Abbasid in Cairo three years after Baghdad fell |
| ottoman_empire ← mamluk_sultanate | 1517 | seizure | the caliphate; the Cairo caliph was taken with the conquest |
| ottoman_empire ← seljuk_rum | ? | ? | the Anatolian ruling people and Persianate administration |
| republic_of_turkey ← ottoman_empire | ? | seizure | political legitimacy, title and legal tradition, all **repudiated** |

The Ottoman caliphate runs through the Mamluks because the Cairo Abbasid line is not a polity row ([Source](#source_type-and-source_id)). The 1453 row stands on today's data. Once the decided 1204 split is executed, `byzantine_empire` ends at 1204 and this `seizure` claim takes the Nicaea row as its source, since that row continues to 1453 ([`polity.md`](./polity.md) open question 13, answered 2026-11-21). The split is not yet executed in the data. The last row is why stance exists: an heir can deliberately *reject* an
axis, and that repudiation is itself historical data.

## The four tables

Each column is marked **authored** (a curator writes it), **computed** (the build derives it; never in the CSV) or **removed**. Every target header below is PROPOSED.

### `csvs/inheritance_claim.csv` — one row per (heir, source)

Target header (PROPOSED): `id,heir_polity_id,source_id,source_type,source_temporal_status,transfer_year,end_year,topology,mechanism,transfer_mode,exclusivity,provenance,note`

| column | kind | values |
|---|---|---|
| `id` | authored | snake_case, stable |
| `heir_polity_id` | authored | FK → `polity.id` |
| `source_id` | authored | FK → table named by `source_type`; see [Source](#source_type-and-source_id) |
| `source_type` | authored | `polity` \| `ethnicity` \| `religion` \| `civilization` \| `stateless_people` |
| `source_temporal_status` | computed for a polity source; authored for any other source (PROPOSED) | polity source: empty in the CSV ([Time](#time)). Other source: `ongoing` \| `abstract` (PROPOSED) |
| `transfer_year` | authored, **new**, required | integer; see [Time](#time). Required on every claim (decided 2026-11-21); the column name is PROPOSED with the target header |
| `end_year` | authored, **new**, optional — PROPOSED | integer; the year the heir renounced or dropped the claim; empty means it held to the heir's end |
| `topology` | authored | `continuation` \| `fission` \| `fusion` \| `secession` \| `absorption` |
| `mechanism` | authored | `transformation` \| `conquest` \| `partition` \| `collapse` \| `unification` \| `personal_union` \| `secession` \| `dissolution` \| `revival` \| `translatio` \| `title_transfer` \| `colonial_independence` |
| `transfer_mode` | authored; replaces `legitimacy_mode` (decided 2026-11-21) | `handover` \| `seizure` \| `assertion`; see [The mode](#the-mode) |
| `exclusivity` | authored | `exclusive` \| `shared`; see [Exclusivity](#exclusivity-and-title_key) |
| `provenance` | authored | **required** — curated claims always carry a receipt (editorial-policy §3) |
| `note` | authored | free text (no commas — semicolons) |
| `legitimacy_mode` | **removed** | `organic`, `claimed`, `fictive` are gone; replaced by the three-way mode |
| `temporal_gap_years` | **removed** from the CSV | computed ([Time](#time)) |

**Uniqueness:** (`heir_polity_id`, `source_type`, `source_id`). `source_type` is in the key because ethnicity and religion share some ids. Adding the transfer year to the key, so that two events between the same pair could both be recorded (the three partitions of Poland), is deferred until a real claim needs it (Decision log, 2026-11-21).

**`dynastic_change` is not a mechanism.** A pure change of ruling house is a
`polity_dynasty` row, never an inheritance claim.

**Computed per claim** (built into `data/inheritance/claims.json`, never authored):

| field | rule |
|---|---|
| `source_temporal_status` | polity source: `prior` when the source's `end_year` is on or before the transfer year, otherwise `ongoing`. PROPOSED: an empty `end_year` is `ongoing`. Non-polity source: the authored value (PROPOSED) |
| `temporal_gap_years` | polity source: `max(0, transfer year - source end_year)`. PROPOSED: 0 when the source's `end_year` is empty |
| `contested_with` | PROPOSED field: array of claim ids in contest with this claim ([Contests](#contests-computed)) |
| `contested_with_source` | PROPOSED field: boolean ([Contests](#contests-computed)) |

### `csvs/inheritance_axis.csv` — per-identity-axis payload

Target header (PROPOSED): `claim_id,axis,stance,strength,title_key,note`

| column | kind | values |
|---|---|---|
| `claim_id` | authored | FK → `inheritance_claim.id` |
| `axis` | authored | see axis list below |
| `stance` | authored, **required** | `affirmed` \| `repudiated` \| `transformed`; `neutral` is **removed** |
| `strength` | authored, optional | 1–5; the scale is deferred, so existing numbers stay and nothing may chart them |
| `title_key` | authored, **new**, optional — PROPOSED | snake_case name of a single-holder office; see [Exclusivity](#exclusivity-and-title_key) and [values in use](#title_key-values-in-use) |
| `note` | authored | free text |

**Axes**, in two groups that decide [when a row is written](#axis-rows):

- **Computable** (the build can see overlap from other tables): `territory` ← `polity_territory`, `ruling_ethnicity`, `state_religion` and `court_language` ← `polity.id_ruling_*`, `dynasty` ← `polity_dynasty`.
- **Non-computable:** `title`, `political_legitimacy`, `legal_tradition`, `administrative_apparatus`, `name_symbols`, `diplomatic_personality` (provisional).

Material overlap is derived, not stored here: the evidence columns in `derived/polity_succession.csv` and the tables above already hold it.

### `csvs/inheritance_recognition.csv` — perspectival legitimacy

Target header (PROPOSED): `claim_id,observer_id,observer_type,degree,year,note`

| column | kind | values |
|---|---|---|
| `claim_id` | authored | FK → `inheritance_claim.id` |
| `observer_id` | authored | a **real historical entity** — FK → `polity.id` when `observer_type=polity` |
| `observer_type` | authored | `polity` \| `institution` (papacy, UN, …) |
| `degree` | authored | `recognized` \| `partial` \| `rejected` |
| `year` | authored, **new**, optional — PROPOSED | integer; the year of the documented act |
| `note` | authored | free text |

"Is this succession legitimate?" has no single answer; it is indexed by
observer. *Don't collapse the perspectives, index them.* What may be written is in [Recognition rows](#recognition-rows).

### `csvs/axis_terminus.csv` — positive extinction

Unchanged.

| column | values |
|---|---|
| `polity_id` | FK → `polity.id` |
| `axis` | axis list above |
| `year` | when the axis died |
| `note` | free text |

In a sparse dataset, absence means "uncurated." Extinction must be recorded
**positively**: the caliphate did not fade away — it was abolished in 1924,
and that fact is a row.

## How to judge a claim

The owner's requirement: the logic used to judge one succession gives the same answer for every structurally identical case anywhere in the world. Each authored field below has a question; the answer maps to one value. Judge one claim at a time, and write it only after the owner approves it. Where a step rests on a PROPOSED item, return the claim to the owner rather than settling it.

### Is it a claim at all?

Write a claim when a **datable event** links an heir to a source: a transfer, or the heir's earliest documented assertion.

PROPOSED: a claim may be acquired in mid-life, so not every claim sits on a polity boundary; every polity boundary should end up with a claim or an `axis_terminus` row.

Not an inheritance claim:

- A change of dynasty alone. It is a `polity_dynasty` row. (Decided before 2026-11-16.)
- PROPOSED: a personal union by itself. A later fusion is a claim at the fusion.
- PROPOSED: suzerainty, vassalage, tribute, or investiture granted by a sovereign that goes on existing.
- PROPOSED: a gradual drift with no datable event. Record a claim when a datable event exists.

Whether a transition ends a polity is not decided here; that is the split rule in [`polity.md`](./polity.md) section 4, "When to split" (archived rationale: [`07-polity-split.md`](../brainstorm/succession/07-polity-split.md)). On 2026-11-16 the owner amended that rule for a polity that loses its seat to conquest; the amendment belongs in `polity.md` and is not restated here.

### `source_type` and `source_id`

- When the thing was handed over or taken by force, the source is the polity it passed from. That follows from the mode, so no separate "holder" rule exists.
- PROPOSED: when the heir declared the inheritance, the source is the entity the heir's own assertion names. When several rows carried that identity, use the latest row that bore it before the transfer year. (Open: which row is "latest" when rows overlap; see [Open column questions](#open-column-questions).)
- A line that is not a polity row cannot be a source. The Cairo Abbasid line is not a polity row, so the Ottoman caliphate is two claims: `mamluk_sultanate` ← `abbasid_caliphate` (1261, declared) and `ottoman_empire` ← `mamluk_sultanate` (1517, taken by force).

### The mode

The mode records a fact about how the thing passed, not a verdict on legitimacy; disputes about legitimacy live in `inheritance_recognition`. The three modes are **handed over**, **taken by force** and **declared**. The column is `transfer_mode` and the values are `handover`, `seizure` and `assertion` (decided 2026-11-21). Ask in order; the first answer that applies decides.

1. **Did anything pass from the source to the heir at a datable event?** That is: did the source itself hold the government, territory, or office-holder until the transfer? If no, the mode is `assertion`: the heir declares the inheritance on its own (doctrine, descent, marriage, a coronation by a third party, a name or symbol taken up, installing or hosting a member of the source's house after the source ended).
2. **Did the heir obtain it by armed force against the source's government?** Conquest, revolution, coup, a war of independence. A cession, abdication or treaty signed while the heir's forces already held the source's seat also counts. If yes, `seizure`.
3. **Otherwise `handover`:** abdication, agreement, partition by compact, lawful constitutional procedure, negotiated independence. PROPOSED (the collapse case): also when the source's centre ceased to function and the heir, already a part of that government, carried on ruling its part.

Consequences:

- Standing on the land or in the old capital of a long-dead source is not a transfer. Italy holding Rome, Mexico holding Tenochtitlan and Otto I holding Rome are all `assertion` toward the ancient source.
- A restoration by the same house after the source was extinguished is `assertion`. It is told apart from a translatio by `mechanism = revival` and an `affirmed` `dynasty` axis row.
- A revolution is `seizure` even when the ministries carry on.
- PROPOSED: a non-polity source holds no government, territory or office-holder, so question 1 answers no and the mode is `assertion`.
- `handover` and `seizure` both mean the source held the thing until the transfer; check 7 in [Checks the validator will enforce](#checks-the-validator-will-enforce) tests it.
- PROPOSED: mechanism and mode must agree (check 6).

Precedents, classified by the questions above. A new claim with the same structure takes the same mode.

| Claim | Mode | Why |
|---|---|---|
| Byzantine from Roman, 395 | handover | division by the empire's own arrangement |
| Ottoman from Byzantine, 1453 | seizure | conquest. Stands on today's data only: once the 1204 split is executed, `byzantine_empire` ends at 1204 and the source is the Nicaea row, which continues to 1453 (`polity.md` open question 13, answered 2026-11-21) |
| Latin Empire from Byzantine, 1204 | seizure | conquest |
| Republic of Turkey from Ottoman | seizure | the Ankara assembly abolished the sultanate against the sultan |
| Holy Roman Empire's Roman claim, 962 | assertion | nothing passed from a Roman government |
| Russia's Byzantine claim | assertion | doctrine, marriage and a title. Stands on today's data only: once the 1204 split is executed, `byzantine_empire` ends at 1204 and the 1547 assertion takes the Nicaea row as its source (`polity.md` open question 13, answered 2026-11-21) |
| Cao Wei from Eastern Han, 220 | handover | abdication; no army took the seat |
| Tang from Sui, 618 | seizure | the capital had already been taken by force |
| Japan's annexation of Korea, 1910 | seizure | treaty signed under occupation. Cannot be encoded yet: `joseon` ends in 1897 and no Korean Empire row exists (`TODO.md` 61), so the gap check would fail |
| Czech Republic and Slovakia, 1993 | handover | negotiated. Cannot be encoded yet: `polity.csv` has only `czechoslovakia` (1918–1993) and no Czech Republic or Slovakia row |
| Eastern Han's claim on Western Han, 25 | assertion, mechanism revival | the source was extinguished in 9 |
| Mamluk from Abbasid, 1261 | assertion | Baybars installed an Abbasid in Cairo three years after Baghdad fell |
| Ottoman from Mamluk, 1517 | seizure | conquest; the Cairo caliph was taken with it |

### Time

- **Transfer year** (authored). When the thing was handed over or taken by force, the year it changed hands. When the heir declared it, the year of the heir's earliest documented assertion.
  - PROPOSED: it must fall inside the heir's lifetime; one year before the heir's `start_year` is tolerated.
  - PROPOSED: an assertion made before the heir row began belongs to whichever polity row made it.
  - It is required on every claim (decided 2026-11-21).
- **`end_year`** (PROPOSED). The year the heir renounced or dropped the claim. Leave it empty when the claim held to the heir's end.
- **`source_temporal_status`.** For a polity source, leave it empty; the build computes it ([computed fields](#csvsinheritance_claimcsv--one-row-per-heir-source)). PROPOSED: for a non-polity source, write `ongoing` if the source still existed as a living community at the transfer year, `abstract` if it is an idea.
- **The gap** is never authored.

### `exclusivity` and `title_key`

- **`exclusivity`** is a fact about the heir's own assertion. Ask: does the title or legitimacy the heir asserts admit one holder by its own terms (Emperor of the Romans, caliph, sole legitimate government of a country)? If yes, `exclusive`; otherwise `shared`. PROPOSED: whether rivals actually existed does not change the answer.
- Contests are keyed on the **title asserted**, not on the source ([Contests](#contests-computed)).
- PROPOSED: **`title_key`** names the single-holder office in snake_case. Fill it on `title` and `political_legitimacy` axis rows that concern such an office. PROPOSED: on no other axis. PROPOSED: use a key from [the list in use](#title_key-values-in-use) when one fits, and add a new key to that list in the same change.
- PROPOSED: an `exclusive` claim must carry at least one axis row with a `title_key`; otherwise its contests cannot be computed.

### Axis rows

- **Computable axes** (`territory`, `ruling_ethnicity`, `state_religion`, `court_language`, `dynasty`) get a row only when:
  - the stance is `repudiated` or `transformed`; or
  - the stance is `affirmed` although the ids differ; or
  - the heir explicitly grounded its claim on that axis (Russia and Orthodoxy).
- Never write an axis row to cancel labelling noise in `polity.csv`; fix the label.
- **Non-computable axes** (`title`, `political_legitimacy`, `legal_tradition`, `administrative_apparatus`, `name_symbols`, `diplomatic_personality`) get a row when the heir did something deliberate about them.
- Every axis row has a stance: `affirmed`, `repudiated` or `transformed`.
- A claim with no axis rows is allowed. PROPOSED exception: not when it is `exclusive`.
- `strength`: keep existing numbers; do not grade new ones against any scale until the scale is decided.

### Recognition rows

- A row records a **documented act by a historical actor** about this claim (did the Safavids accept the Ottoman caliphate? no) — never a modern judgment, never an AI's opinion. PROPOSED: fill `year` when the act is dated.
- PROPOSED: a rival's own competing claim is not an act of rejection. Implied rejection of rivals is computed from [contests](#contests-computed) and is never written as a recognition row.

### Contests (computed)

Contests are computed, never authored, and are keyed on the **title asserted**, not on the source. The mechanics below are PROPOSED.

- A claim is **active** from the transfer year to its `end_year`, or to the heir's `end_year` when that is empty.
- Two claims are **in contest** when both are `exclusive`, both have an `affirmed` axis row with the same `title_key`, and their active periods overlap.
- An `exclusive` claim with an `affirmed` `title_key` row on a polity source whose computed status is `ongoing` is also **in contest with the source itself** (`contested_with_source`).

## `title_key` values in use

PROPOSED, with the column. PROPOSED: the validator checks only the format. A vocabulary table is deferred until the keys in use show what it needs; until then this list is the reference. Add a key here when a claim first uses it.

| `title_key` | Office |
|---|---|
| `roman_emperor` | Emperor of the Romans |
| `caliph` | the caliphate |

## Pipeline

```
csvs/inheritance_*.csv + csvs/axis_terminus.csv
  → code/makejson/inheritance.js            (part of make:all)
  → data/inheritance/{claims,terminus}.json (claims nest axes + recognition)
  → scripts/validate.js                     (FKs + full enum vocabulary)
```

PROPOSED target build: each claim in `claims.json` carries `transfer_year`, `end_year`, `transfer_mode`, the [computed fields](#csvsinheritance_claimcsv--one-row-per-heir-source) under their existing names, `title_key` on axis entries and `year` on recognition entries. The rename of `legitimacy_mode` to `transfer_mode` is decided (2026-11-21) and is a breaking change under [`api.md`](./api.md) section 5: the old field name is emitted alongside the new one for one commit with the same value, and the pages move in the same change.

`code/generate-successions.js` is a **candidate suggester**: it writes
proposed edges + evidence to `derived/polity_succession.csv`; the
`succession-curator` drafts the real ones as claims here.

## Curation discipline

- Every claim: `provenance` required (validator-enforced); every field judged by [How to judge a claim](#how-to-judge-a-claim); split questions go to the [split rule](#is-it-a-claim-at-all).
- Deferred, deliberately: the strength scale and the valid-observer set
  ([`05-open-questions.md`](../brainstorm/succession/05-open-questions.md) §4–5).

## Migration status

1. ✅ Canonical doc + curated tables + generator + validation, in the 2026-11-01 shape
2. ✅ `generate-successions.js` demoted to candidate suggester
3. ⬜ Owner answers the blocking questions in `graph.md` section 6. Q2, Q5 and Q10 were answered on 2026-11-16, and Q1, Q4, Q7 and Q9 in part. On 2026-11-21 further parts of Q4 and Q5 were decided (the `transfer_mode` column and values; a required transfer year), the uniqueness item under Q6 was deferred, and `polity.md` question 13 was answered under Q9; the rest are open, and several answers leave PROPOSED items
4. ⬜ Owner confirms or rejects each item under [Proposed, awaiting the owner](#proposed-awaiting-the-owner)
5. ✅ Approved rules and the PROPOSED target shape written in this file (2026-11-16)
6. ⬜ Regrade the 9 seeded claims under [How to judge a claim](#how-to-judge-a-claim), one claim at a time with the owner's approval; `ottoman_from_abbasid` becomes the Mamluk and Ottoman pair
7. ⬜ Build the target shape once confirmed: CSV headers, the [validator checks](#checks-the-validator-will-enforce), the computed fields in `inheritance.js`, DDL and load SQL, `api.md` with the `legitimacy_mode` alias for one commit, and the pages moved
8. ⬜ Clean the generator (`graph.md` Q8): fix or remove `related_ethnicity`, delete the redundant loop, drop `type` from both DDL files, and review the `derived/` diff
9. ⬜ Pilot by hand: Ottoman, `ottoman_empire → republic_of_turkey`, Russian chain, British Raj to India, Mexico, ROC and PRC, Gran Colombia, Carthage, three caliphs, Han revival. Revise the schema if the pilot breaks it, before any bulk work
10. ✅ Add the claim route as an addition, updating `api.md` in the same commit
11. ✅ Frontend view over claims, with candidates as labelled evidence
12. ⬜ Curate further by query need, walking references first
13. ⬜ Stop serving candidates as `successors` / `predecessors` **last**, following the `api.md` breaking-change rule (candidates stay in `derived/` as evidence)

## How to validate

Done means the validator passes and the project owner has approved the claim.

**Enforced today** (2026-11-01 shape): headers, enum values, foreign keys, and the `provenance` format (`wp:`, `wd:`, `panel:` or `ref:`). Uniqueness is checked on (`heir_polity_id`, `source_type`, `source_id`).

### Checks the validator will enforce

Not built yet (step 7). Each check fails the run. Checks marked PROPOSED wait for the owner.

1. PROPOSED: headers match the target headers above.
2. Enums: `transfer_mode` is `handover`, `seizure` or `assertion`; `stance` is present and is `affirmed`, `repudiated` or `transformed`.
3. `source_temporal_status` is empty for a polity source. PROPOSED: it is `ongoing` or `abstract` for any other source.
4. Uniqueness on (`heir_polity_id`, `source_type`, `source_id`), as enforced today. Adding the transfer year is deferred (Decision log, 2026-11-21).
5. The transfer year is present and an integer on every claim. PROPOSED: it is from the heir's `start_year` minus 1 to the heir's `end_year` (no upper bound when that is empty). PROPOSED: `end_year`, when present, is from the transfer year to the heir's `end_year`.
6. PROPOSED: **mechanism and mode agree** — `conquest` requires `seizure`; `translatio` and `revival` require `assertion`.
7. **Gap rule:** a claim handed over or taken by force from a polity source has a computed gap of 0. PROPOSED: a gap of 1 is tolerated, because years are whole numbers and two events can fall in consecutive years.
8. PROPOSED: an `exclusive` claim has at least one axis row with a non-empty `title_key`.
9. PROPOSED: `title_key` is snake_case and appears only on `title` and `political_legitimacy` rows.
10. PROPOSED: recognition `year` is empty or an integer.
11. `dynastic_change` is never a mechanism.

## Current state (measured 2026-11-01)

| Table | Rows |
|---|---:|
| `inheritance_claim.csv` | 9 |
| `inheritance_axis.csv` | 29 |
| `inheritance_recognition.csv` | 6 |
| `axis_terminus.csv` | 1 |

## Open column questions

Moved here from `graph.md`. `graph.md` section 6 holds the ranked questions.

- `id`: format.
- `source_type`: `civilization` and `stateless_people` have no table. Whether to add a `dynasty` source type for descent claims (Fatimid, Solomonic, "the Han"). Whether a colonial unit needs a source entity distinct from its metropole.
- Source row for a declared inheritance: if the PROPOSED "latest row that bore it" rule is confirmed, which row is latest when rows overlap (by start or by end). For the Holy Roman Empire in 962, `byzantine_empire` still bore the Roman title.
- `topology`: PROPOSED, it stays on the claim with `mechanism` (see [Proposed, awaiting the owner](#proposed-awaiting-the-owner)). `07-polity-split.md` also uses `fission`, `fusion` and `continuation` as mechanisms.
- `topology` and `mechanism`: no rule says which value to choose.
- `mechanism`: whether `personal_union` stays in the list.
- `strength`: the scale.
- `title_key`: a vocabulary table, deferred until the keys in use show what it needs.
- `diplomatic_personality`: provisional.
- `observer_type`: values, and which observers fill the set.
- Recognition key: the key (`claim_id`, `observer_id`) allows one row per observer per claim, so an observer who first recognized and later rejected a claim cannot have both acts recorded.
- Contests: whether two active periods that only touch (one ends in the year the other begins) overlap. Needed before contests are built.
- Sources that kept a title and lost the government: `mughal_empire` runs to 1857 through the pensioner emperors, while `abbasid_caliphate` ends in 1258 although the caliphs continued in Cairo. One convention is needed; the end year decides the computed status and gap of every claim on these rows.

## Decision log

- 2026-11-01: this file owns the table definitions; `graph.md` keeps the candidate and claim boundary.
- 2026-11-01: each succession is decided one claim at a time; computed candidates are evidence only.
- 2026-11-16: the mode is redefined three ways (handed over, taken by force, declared) and judged by three ordered questions. It replaces `legitimacy_mode` (`organic`, `claimed`, `fictive`), which had values but no rule for choosing them.
- 2026-11-16: no separate holder rule; when the thing was handed over or taken by force, the source is the polity it passed from. Replaces no rule.
- 2026-11-16: the transfer year is authored; for a polity source, `source_temporal_status` and the gap are computed from it. Replaces an authored status (`latin_from_byzantine` was `prior` while its source ran to 1453) and an authored `temporal_gap_years` with no rule for what it measured from (the seeded values are 0, 486 and 94, and `ottoman_from_abbasid` carries 0 although its source ended in 1258).
- 2026-11-16: `exclusivity` stays authored, as a fact about the heir's own assertion; contests are computed and keyed on the title asserted, not on the source. Replaces an unruled column under which the three claims on the Byzantine title were split without a rule (Ottoman and Russian `exclusive`, Latin `shared`), and the open choice in `graph.md` Q7.
- 2026-11-16: axis rows on computable axes only for a non-affirmed stance, an affirmed stance across differing ids, or an explicit grounding; on non-computable axes for a deliberate act; stance required and `neutral` removed. Replaces "store an axis row only where there is a stance or a claim" and a nullable four-value stance.
- 2026-11-16: the Cairo Abbasid line is not a polity row; `ottoman_from_abbasid` is replaced by Mamluk from Abbasid (1261) and Ottoman from Mamluk (1517).
- 2026-11-16: the owner amended the split rule for a polity that loses its seat to conquest; recorded in `polity.md`.
- 2026-11-16: whether proclaiming a new state name or title alone creates a polity stays open, for a pilot on the Chinese dynastic chain.
- 2026-11-21: the owner confirmed the split-rule amendment (`byzantine_empire` ends at 1204; Nicaea is a separate row). It follows that the Byzantine 1204–1261 case needs no interruption marker (`graph.md` Q9); this was not confirmed separately. The data split is not executed; whether the post-1261 empire is a new row stays open (`polity.md` open question 13; answered below, 2026-11-21).
- 2026-11-21: the mode column is `transfer_mode`, with values `handover` (handed over), `seizure` (taken by force) and `assertion` (declared). Replaces the column name `legitimacy_mode`. This is a breaking API rename, so `legitimacy_mode` is emitted alongside `transfer_mode` with the same value for one commit ([Pipeline](#pipeline)).
- 2026-11-21: a transfer year is required on every claim. Replaces silence. The column name `transfer_year` stays PROPOSED with the target header.
- 2026-11-21: deferred, not adopted: widening uniqueness to (`heir_polity_id`, `source_type`, `source_id`, transfer year). The key stays (`heir_polity_id`, `source_type`, `source_id`) until a real claim needs a second transfer year for the same heir and source. Reason: none of the 9 current claims needs it.
- 2026-11-21: `polity.md` open question 13 is answered (recorded in `polity.md`): the empire restored in 1261 is not a new row, and the Nicaea row continues to 1453, because recapturing the seat is not a split event. Consequence: once the 1204 split is executed, the 1453 Ottoman `seizure` claim and the 1547 Russian assertion take the Nicaea row as their source. The split is not yet executed in the data.

### Proposed, awaiting the owner

Design choices drafted where the owner's decisions were silent. None is decided.

- The collapse case under `handover`; would add a case to question 3 that no rule covered.
- A non-polity source is always `assertion`; would replace silence.
- Mechanism and mode must agree (check 6); would replace independent columns.
- Gap tolerance of 1 in check 7; would replace a strict gap of 0.
- The transfer year must fall inside the heir's lifetime, with one year of tolerance (check 5); an earlier assertion belongs to the row that made it; would replace silence.
- Claim `end_year`, bounded by the transfer year and the heir's `end_year`; would replace claims with no end.
- Recognition `year`; would replace undated recognition.
- Column `title_key`, only on `title` and `political_legitimacy` rows, format-checked only, with the in-use list as reference; would replace having no field to key contests on.
- An `exclusive` claim must carry a `title_key` row, so zero-axis claims are allowed only when `shared`; would replace allowing every zero-axis claim.
- Contest mechanics: active periods, overlap, contest with an ongoing source, and the fields `contested_with` and `contested_with_source`; would replace having no contest computation.
- Implied rejection is computed from contests and never written as recognition; would replace recognition rows that record a rival's own claim as a rejection.
- Whether rivals existed does not change `exclusivity`; would replace silence.
- Not claims: personal union alone, suzerainty and investiture by a surviving sovereign, drift with no datable event; would extend the dynastic-change rule.
- A claim may be acquired in mid-life, and every polity boundary should end with a claim or an `axis_terminus` row; would replace the assumption that claims sit only on polity boundaries.
- For a declared inheritance, the source is the entity the assertion names, the latest row that bore it before the transfer year; would replace silence.
- For a non-polity source, `source_temporal_status` is authored as `ongoing` (a living community at the transfer year) or `abstract` (an idea); would replace an authored status with `prior` allowed.
- For a polity source with an empty `end_year`, status `ongoing` and gap 0; would replace silence.
- The target table headers and the `claims.json` fields, with `legitimacy_mode` emitted alongside for one commit; would replace the 2026-11-01 shape.
- "Mandate transfer" alone does not admit an edge (`graph.md` Q1); would narrow the `02-type-system.md` exception to the dynastic rule.
- `topology` and `mechanism` stay on the claim (`graph.md` Q4); would replace the open question whether topology belongs there.
- The interruption marker is a fact about a polity row, carried by a table of period labels that will also hold conventional period names (`graph.md` Q9); would replace having no home for it.
