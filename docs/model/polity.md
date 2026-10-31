# Polity

Table contract for `csvs/polity.csv`. This doc decides what counts as a polity.

**Snapshot:** every count below was measured on 2026-10-31 with `code/lib/csv.js`, after the non-polity migration (`non_polity.md`). Re-measure any duplicate list before acting on it.

**Labels used here:**

- **Decided** means a rule already recorded in a doc named beside it.
- **Data now** means what the CSV contains, whether or not it follows a rule.
- **PROPOSED** means a suggestion in this doc. It is not a current rule, and the owner has not accepted it.
- **OPEN** means nobody has decided. Section 7 lists these by number.

---

## 1. Purpose

One row is one political entity with a continuous identity, from the transition that created it to the transition that ended it: the intersection of ethnicity, territory, ideology and time.

Polity is the entity tier of the schema. Civilization is not a table (`civilization.md`). Dynasty is a tag through `polity_dynasty.csv`, not a tier.

---

## 2. Admission test

### 2.1 What is decided

No single admission rule was ever written. These pieces exist:

| Rule | Source |
|---|---|
| A polity boundary is exactly where an inheritance edge lands, so splitting and admission are the same question | **Decided**, `docs/brainstorm/succession/07-polity-split.md` |
| A change of dynasty, ruler, religion, language, territorial extent or policy never creates a row on its own | **Decided**, same |
| There are no sub-polity periods. Drift inside a long polity is handled by a split at a major transition, or not at all | **Decided**, `CLAUDE.md` (the old tier was dropped 2026-05-01) |
| Events, eras, peoples and collectives are not polities and must never be used as a polity reference | **Decided for panels**, `docs/migration/merge_map.md` §4 and §6 |
| Archaeological cultures do not belong in `polity.csv` | **Decided and carried out**, `non_polity.md`: a culture stays a panel label, and there is no `cultures` table |
| An entity earns a row through inbound references, not fame | **Decided**, `CLAUDE.md` and `city.md` Scope Discipline |
| A dependent unit may be a polity. `province` means "modelled as a polity for territorial succession only" | **Decided**, `csvs/government.csv` |

The non-polity migration brought the rows into line with the panel rules. See 2.3.

### 2.2 Test for a new row

Add a row only if all of these are true. Section 2.3 overrides this test: a candidate in one of the classes listed there is reported, not added, even if it passes every step.

1. **Rule.** You can name who governed: a ruler, a council, an assembly or an administration. A shared language or material culture is not enough.
2. **Boundaries.** At least one boundary is recorded. The other may be estimated. If the start is unknown, `start_year` is the earliest attestation.
3. **Place.** It held at least one zone in `territory.csv`, so it can get a `polity_territory` row. If no zone fits, stop and raise it: see `territory.md`.
4. **Inbound reference.** A panel cell, `figure`, or `polity_dynasty` row points at it, or will in the same change.
5. **Not already here.** No existing row covers it under the split rule in section 4. Check names, the Wikidata link and the "not synonyms" list in `merge_map.md` §3.

### 2.3 Hard cases: what the data does now

Peoples, cultures, periods, collectives, events and persons are not polities (see the decision log). Do not add rows in these classes. `non_polity.md` gives each class its home and records the classified rows, all of which have moved. If you find another such row, report it; do not delete it.

| Case | Documents say | Data now | Examples |
|---|---|---|---|
| **Peoples** with no recorded government | Not a polity (`merge_map.md` §4, §6). Home is `ethnicity.csv`; a panel cell uses the `ethnicity` key | 24 rows moved. `government = tribal_confederation` is not the test: its 14 remaining rows are kept as real governments (`non_polity.md` section 5) | Moved: `pechenegs`, `germanic_tribes`, `celts`, `illyrians`. Kept: `iroquois_confederacy`, `aq_qoyunlu`, `wusun`, `yuezhi`, `xianbei` |
| **Archaeological cultures** | A panel label, no entity; no `cultures` table (`non_polity.md`) | 4 rows retired. `mississippian_culture` became a link to ethnicity `mississippian` | `olmec`, `ancestral_pueblo`, `proto_elamite` |
| **Periods** | Eras are not polities (`merge_map.md` §6 strips `warring_states`, `sixteen_kingdoms`) | Japan's period rows have been replaced by polity rows (section 8). No other period row is listed here | None listed |
| **Collectives** covering many separate states | §6 strips "combined / multi-polity" labels. A panel label, no entity | 13 rows retired. Members have rows only where something references them (`uruk`, `tyre`, `later_liang`, `liu_song`) | `five_dynasties`, `southern_dynasties`, `ten_kingdoms`, `sumerian_city_states`, `maya_city_states`, `magna_graecia` |
| **Events and migrations** | Not polities (§6). A panel label, no entity | 2 rows retired | `federalization`, `celtic_la_tene_migration` |
| **A person** | `alexander` maps to `macedonian_empire` (§3), so a person is not a row. The person goes in `figure.csv` and the state gets a polity row | None remain | `lysimachus` became `kingdom_of_lysimachus` plus a figure |
| **Lumped row beside its split rows** | 07 says remove `han_dynasty` | These rows and their children stay (section 8) | `zhou_dynasty` with `western_zhou` + `eastern_zhou`; `song_dynasty` with `northern_song` + `southern_song` |
| **Dependent units** | Allowed | 8 `province`, 21 `colonial_administration`, 4 `puppet_state` | `byzantine_exarchate_of_ravenna`, `new_spain`, `vichy_france` |
| **Influence zones** | Skip: `{Power} sphere` is not direct rule (§4) | None in `polity.csv` | Leave the panel cell without a polity |
| **Unknown** | Skip `?` cells (§4) | None | Leave the panel cell without a polity |

Which class a row is in is often a judgment. `hephthalites`, `xiongnu` and `kara_koyunlu` carry a people's name and were real states. The test is whether someone governed (2.2 step 1), not the name. For a people with a recorded ruler, or any case that could fit either side, report it rather than add it. `pechenegs` was the test case: it failed step 1 of 2.2 and moved to `ethnicity.csv`.

### 2.4 Dynasties versus states

A dynasty as such is never a row here. A family goes in `dynasty.csv`, and its rule goes in `polity_dynasty.csv`.

A `_dynasty` id does not mean the row is a family. 68 polity ids end in `_dynasty`, because that is how those states are commonly named (`naming.md`: Chinese dynasties "are polity-level"). 40 of them share a stem with a `dynasty.csv` id, so one name in two tables is normal: `polity.csv` holds the state and `dynasty.csv` holds the house. 50 of the 68 have a `polity_dynasty` row and 18 do not (such as `qajar_dynasty`, `song_dynasty`).

Worked examples from the data:

- `kingdom_of_france` is one row across Capetian, Valois and Bourbon, because only the dynasty changed. (**Decided**, 07.)
- `tang_dynasty` and `song_dynasty` are separate rows because a sovereignty event lay between them, not because the house changed.
- `borjigin` ruled `mongol_empire`, `yuan_dynasty` and `golden_horde`: one house, many rows.

### 2.5 Other non-rows

- **A city.** A place goes in `city.csv`. A polity with a city's name is fine when it was a sovereign body: `republic_of_venice`, `carthage`.
- **A panel label qualifier.** `Safavid (collapse)` is `safavid_empire` (`merge_map.md` §1).
- **`X / Y` labels.** Link to the first entity (§2). Do not make a combined row.
- **A stub.** `derived/polity_stubs.csv` (1,704 rows) is raw extraction and includes items like `homo_sapiens_migration`. Being a stub earns nothing. A human promotes rows, using 2.2.

---

## 3. Columns

Header: `id,name,id_ruling_ethnicity,id_ruling_language,id_ruling_religion,government,start_year,end_year,policies,note,start_basis,end_basis`

```csv
mughal_empire,Mughal Empire,turkic_cluster,new_persian_farsi,sunni_hanafi,imperial_monarchy,1526,1857,din_i_ilahi|aurangzeb_sharia,Babur was Timurid ...
```

| Column | Type | Required | Meaning and how to decide | Empty means | Example |
|---|---|---|---|---|---|
| `id` | snake_case text, primary key | yes | Permanent id. Formed as in section 4 | never empty | `ottoman_empire` |
| `name` | text | yes | English display name. May add native script or a short qualifier in brackets. Avoid commas | never empty | `Eastern Han (东汉)` |
| `id_ruling_ethnicity` | FK → `ethnicity.id` | yes | The people of the **ruling group**, not the population. Use the most specific level that is historically relevant (`ethnicity.md`) | never empty. There is no "unknown" value (OPEN 9) | `mughal_empire` = `turkic_cluster` |
| `id_ruling_language` | FK → `language.id` | no | The court or administrative prestige language, which may differ from the rulers' mother tongue. The JSON and the database call this `cultural_language` | not filled in. Treat as unknown. It is not a claim that there was none (`qajar_dynasty` is empty) | `mughal_empire` = `new_persian_farsi` |
| `id_ruling_religion` | FK → `religion.id` | no; warning if empty | The religion of the state or ruling group. One value per row. For a change during the polity's life, see OPEN 4 | ambiguous today: unknown (`punt`), no state religion (`soviet_union`), or mixed across the span (`roman_empire`) | `safavid_empire` = `twelver_shia` |
| `government` | FK → `government.id` | no; warning if empty | The form and source of sovereign authority. One value, fixed for the polity's life: a foundational change means a new polity (section 4). See `government.md` | not filled in, not "none": `soviet_union` and `silla` are empty | `xiongnu` = `khaganate` |
| `start_year` | integer, BCE negative | yes | Year the transition creating this polity took place | never empty | `roman_empire` = `-27` |
| `end_year` | integer, BCE negative | no | Year the transition ending it took place. May equal `start_year` (5 rows, such as `shun`) | **ongoing**: the polity exists today. It never means unknown. If the end is unknown, give a best estimate and say so in `note` (PROPOSED) | `western_roman_empire` = `476`; `united_states` is empty |
| `policies` | `\|`-separated snake_case slugs | no | Time-bounded decisions that did not change the polity's identity (`ideology.md`). In the CSV these are bare slugs: there are no dates or descriptions, and no registry of slugs | none recorded | `ottoman_empire` = `millet_system\|tanzimat` |
| `note` | prose | no | Why the row is as it is: judgment calls, date uncertainty, what ended it. Your own words. Use `;` or an em-dash in place of commas where you can | no note | `joseon`: "Founded by Yi Seong-gye; ..." |

**Dates.** There is no "circa" marker. Put uncertainty in `note`. Use the year sovereignty changed, which may differ from the panel's era band.

**Facts that do not live in this table:**

| Fact | Home |
|---|---|
| Territory | `polity_territory.csv` only (`polity_territory.md`) |
| Ruling house | `polity_dynasty.csv` |
| People | `figure.csv` |
| Succession edges | `derived/polity_succession.csv`, computed, never hand-edited. The curated inheritance layer is still in `docs/brainstorm/succession/` |
| External ids such as QIDs | `fact_source.csv` |
| Civilization | Nowhere: it will never be a column (`civilization.md`) |
| Capital, region | No column exists, though `city.md` mentions `polity.capital_id` and `polity.region` |
| Interruption marker (07's Byzantine 1204–1261 case) | No column exists. Put it in `note` until one does (PROPOSED) |

Older docs describe `polity.ideology` as a nested object with `religion`, `government` and `philosophy`. In the CSV, ideology is the two columns `id_ruling_religion` and `government`. `philosophy` does not exist.

---

### Date basis

`start_basis` and `end_basis` say how the matching year is known. Both are optional.

| Value | Meaning | Example |
|---|---|---|
| empty | Not assessed yet. It says nothing about certainty | Every row today |
| `recorded` | A documented event fixes the year | `roman_empire` start, -27 |
| `estimated` | Inferred or rounded by scholars | PROPOSED candidate: `punt` end, -1000 |
| `first_attested` | Earliest appearance in the record. The polity is older, and the year is not its founding. Start only | PROPOSED candidate: `elam` start, -2700 |

An empty `end_year` still means ongoing, so an unknown end needs an estimate and `end_basis = estimated`. Assess these values only with a source.

---

## 4. Identity and naming

### Forming an id (`naming.md`)

- Use snake_case of the most common English name: `ottoman_empire`.
- Drop a leading article. Keep prepositions in the name: `kingdom_of_france`.
- Use the anglicized form, and the endonym when that is the common English usage: `joseon`.
- Keep to about 40 characters.
- If two entities would collide, add a geographic or temporal qualifier, or use the established name: `cao_wei`, `northern_wei`.

Ignore the part of `naming.md` headed by the `polity__dynasty` double-underscore pattern. It describes a table that does not exist.

### Retired ids

Ids are permanent and never reused. An id with no row has been retired.

There is no registry of retired ids. They survive in `STRIP_LIST` or `SYNONYM_MAP` in `scripts/dedup_and_link.js`, and in `merge_map.md` §3 or §6. Commit `ac64f59` retired `kidarites_alchon_huns`, `hephthalite_empire`, `jin_jurchen`, `western_liao`, `mongol_il_khanate` and `italy`. Later curation retired `kidarite_kingdom`, `han_dynasty`, `goktürk_khaganate`, `yamato_period`, `nara_period`, `heian_period` and `feudal_japan`.

The non-polity migration retired these 44, listed with their homes in `merge_map.md` §6:

- Peoples: `berber`, `beja`, `histri`, `illyrians`, `saka`, `cimmerian_scythian_nomads`, `dahae`, `donghu`, `scythian`, `celts`, `tupi_guarani`, `belgae`, `germanic_tribes`, `free_dacians`, `shiwei`, `pechenegs`, `carib_peoples`, `taino`, `sioux_nations`, `celtic_gauls`, `oscan_samnite_peoples`, `latin_sabine_samnite_peoples`, `italic_peoples`, `ligurians_euganei_raeti`
- Cultures: `olmec`, `ancestral_pueblo`, `proto_elamite`, `mississippian_culture`
- Collectives: `five_dynasties`, `ten_kingdoms`, `northern_dynasties`, `southern_dynasties`, `sumerian_city_states`, `phoenician_states`, `maya_city_states`, `postclassic_maya`, `lombard_principalities`, `magna_graecia`, `phoenician_colonies`, `punic_coastal_settlements`, `giudicati_of_sardinia`
- Events: `federalization`, `celtic_la_tene_migration`
- Person: `lysimachus`, replaced by `kingdom_of_lysimachus`

An id that moves to another table for the same identity, as `pechenegs` did, is not reuse (section 8). As a polity id it stays retired.

`italy` shows why you must check first: it is retired as a polity but is still a valid territory id and panel id.

To retire an id, change these together, as `ac64f59` did:

1. `csvs/polity.csv`
2. `csvs/polity_territory.csv`, `csvs/polity_dynasty.csv`, `csvs/figure.csv`, `csvs/fact_source.csv`
3. the `polity` field in `panels/**/*.json`
4. `SYNONYM_MAP` and `merge_map.md` §3 for a row replaced by another polity; `STRIP_LIST` and `merge_map.md` §6 for a row with no polity replacement

### When to split (Decided 2026-06-21, 07-polity-split.md)

A transition creates a new polity if and only if one of these holds:

1. **Foundational ideological change.** A deliberate, datable change in who rules and by what right (monarchy, republic, empire, theocracy, party-state). Roman Republic to Empire; Iran 1979; Romanov Empire to USSR.
2. **Structural sovereignty event.** The sovereign entity fissions, fuses, or ends in conquest that sticks.
   - If one branch clearly keeps the seat, the senior legitimacy and the continuity claim, it is **secession**: the parent continues and the other buds off.
   - If the division is symmetric or contested, it is **fission**: the parent ends and there are two children. Rome 395 is fission, giving `western_roman_empire` and `byzantine_empire`.
3. **Interruption.** Ask whether the polity's own sovereign government kept functioning anywhere across the gap.
   - Yes: it was suspended, so it stays one row. Byzantine 1204–1261 (Nicaea) stays one `byzantine_empire`.
   - No: it was extinguished, so there is a new row even with the same ideology or dynasty. `eastern_han` after `xin`.

**Never a split on its own:** religion, language, dynasty, ruler, territorial extent, policy. Conquest by another people splits through clause 2.

Christian Rome is one row because only the faith changed. `kingdom_of_france` is one row because only the dynasty changed.

A change of state religion never splits a polity. See the decision log in section 8.

### When to merge

Merge two rows when they name the same entity over the same span and the split rule finds no boundary between them. Keep the id with more references and retire the other (PROPOSED; no doc states which id survives). `hephthalite_empire` merged into `hephthalites` in `ac64f59`.

**Do not merge** the pairs in `merge_map.md` §3 "NOT synonyms" or §10, which is marked "do not re-litigate":

- `hohenstaufen` and `hohenstaufen_sicily`
- `kingdom_of_sicily` and `aragonese_kingdom_of_sicily`
- the Republican-era China rows
- `malwa_kingdom` and `malwa_sultanate`: `malwa_kingdom` is a panel id only, and `malwa_sultanate` is the sole row
- `macedonian_kingdom` and `macedonian_empire`

---

## 5. Sources and citation

`csvs/` is the source of truth. Sources are cited, never imported. If a source disagrees with a CSV, the CSV stands until a person edits it. Dates are compared, not copied. Write rows in your own words.

Librarian agents in `.claude/agents/` are read-only and return evidence with a record id and a confidence.

| Question | Ask |
|---|---|
| Is this the same entity? What is its QID, label, or a date to compare? (Its dates are claims) | `source-wikidata` |
| Did this entity hold an area, and when? (Borders only, not narrative or inheritance) | `source-cliopatria` |
| What happened: founding, ending, ruling people, court language, religion, form of government? (Only for articles linked through Wikidata) | `source-wikipedia` |
| Whose periodisation is this date from? Essential for period rows | `source-periodo` |
| Ancient place names and locations | `source-pleiades` |
| Is this language id correct? (Says nothing about politics) | `source-glottolog` |
| Structural language features. Rarely relevant to a polity | `source-wals` |

**When a `fact_source` row is needed** (`source.md`):

- A hand-curated row needs none.
- A fact taken from an external source needs one row per fact, pointing back at the source.
- An identity link uses `field = id`, which claims only that `source_record` is the same entity:

```csv
polity,akkadian_empire,id,wikidata,Q4461035,
```

For a polity, `entity_table` is `polity` and `entity_id` is the polity `id`. An empty `field` means the whole row. `source_id` must exist in `source.csv`, and `wikidata` is the only registered source today. To cite another source, add its `source.csv` row first, following `source.md`.

---

## 6. Validation

Run `node scripts/validate.js`. `npm test` also runs `make:all` first through `pretest`, which rewrites `derived/` and `data/`.

**Enforced as errors:**

- header matches exactly; no ragged rows
- `id` non-empty and unique
- `name`, `id_ruling_ethnicity` and `start_year` present
- years are integers, and `start_year` <= `end_year`
- ethnicity, language, religion and government values resolve when present
- every polity reference from `polity_territory`, `polity_dynasty`, `figure`, `fact_source` and the derived succession file resolves
- a panel entry's `ethnicity` resolves, and no panel entry has both `polity` and `ethnicity`

**Enforced as warnings:**

- `id_ruling_religion` empty (38)
- `government` empty (23)
- CRLF line endings
- a comma in a non-prose column, including `policies`
- a panel cell's `polity` not in `polity.csv` (1,697 distinct ids)

**Convention only, not checked:**

- id format and length (every id is ASCII snake_case; one, `transcaucasian_democratic_federative_republic`, is 45 characters)
- unique `name`
- every polity has a territory row
- every row meets section 2; every transition follows the split rule
- no two rows name one entity
- `policies` slugs; no commas in `note` (98 notes contain one, which CSV quoting handles)
- non-empty `government` for a row that has a monarch; a `polity_dynasty` row for a dynastic polity
- year fields are strictly numeric: `csv.toInt` uses `parseInt`, so `12abc` reads as 12

---

## 7. Current state and open questions

### Counts

| Measure | Value |
|---|---|
| Rows | 482 |
| Year range of `start_year` | -2900 to 1991 |
| `id_ruling_language` empty | 35 |
| `id_ruling_religion` empty | 38 |
| `government` empty | 23 |
| Empty in both language and religion | 13 |
| `end_year` empty (ongoing) | 41 |
| `policies` filled | 20 rows, 27 slugs, each used once |
| `note` filled | 357 |
| No `polity_territory` row | 6: `funan`, `khmer_empire`, `majapahit_empire`, `brunei_sultanate`, `sulu_sultanate`, `kingdom_of_tungning` |
| No `polity_dynasty` row | 208 (75 of them have a government of `*monarchy`, `chinese_imperial`, `sultanate`, `emirate`, `khanate`, `caliphate`, `khaganate`, `principality`, `shogunate` or `imamate`) |
| No `figure` row | 350 |
| Wikidata identity link | 288 (194 have none) |
| No panel reference | 16 (such as `zhou_dynasty`, `song_dynasty`, `ecuador`, `uruk`, `tyre`) |
| No panel cell, `figure` or `polity_dynasty` row (the step 4 test in 2.2) | 4: `creek_confederacy`, `ecuador`, `venezuela`, `grand_duchy_moscow` |
| Ruling ethnicity is a broad cluster, bloc or `_peoples` node | 139 |

**Coverage gaps.** There are no rows for Mali, Songhai, Ghana, Kongo, Benin or Great Zimbabwe, and Southeast Asia has only a handful (`funan`, `khmer_empire`, `majapahit_empire`, `brunei_sultanate`, `sulu_sultanate`), although panels exist for those regions. Sparse coverage is expected in this project, but queries there return little or nothing.

### Known inconsistencies

**Religion ids used interchangeably.**

- `catholic` (76) and its child `roman_catholicism` (23) have no written difference. `kingdom_of_france` is `catholic`; `hungary` is `roman_catholicism`.
- `sunni` (80), `sunni_hanafi` (10) and `sunni_shafi` (2) mix levels. `sunni_maliki` and `sunni_hanbali` do not exist in `religion.csv`.
- `shia` (12) sits beside `twelver_shia` (1) and `ismaili_shia` (2).
- `christianity` (3) is used at the root level.
- `vandal_kingdom` and `ostrogothic_kingdom` are `catholic`, and `gepid_kingdom` is the only `arianism` row. Vandal and Ostrogothic rulers are generally described as Arian, so check them. `visigothic_kingdom` has the OPEN 4 problem, as it converted during its span.

**Government ids that overlap.**

- `chinese_imperial` (11) and `imperial_monarchy`: `western_han` is one and `eastern_han` the other.
- `republic` (18) and `democratic_republic` (27): `cuba` and `haiti` versus `argentina`.
- `monarchy` (77), `absolute_monarchy` (14), `feudal_monarchy` (54): `kingdom_of_france` is `absolute_monarchy` from 987, though its own note places absolutism under Louis XIV. `manchukuo` is `absolute_monarchy`, not `puppet_state`.
- `caliphate`, `imamate`, `theocracy`: `fatimid_caliphate` and `safavid_empire` are `imamate`, `sassanid_empire` is `theocracy`, and `ottoman_empire` is `caliphate` from 1299 although its note dates the claim to 1517.
- `tribal_confederation` and `khanate`: `dzungar_khanate` and `khoshut_khanate` are the former.
- `city_state`: `anshan_kingdom` and `zapotec` are the form, `republic_of_venice` is `republic`.

See `government.md` section 7.

**Likely duplicates, pending the merge passes.** These overlap in date with the same ruling ethnicity and a shared territory:

- `egyptian_new_kingdom` / `new_kingdom_egypt`
- `north_yuan` / `northern_yuan`
- `zangid_atabegate` / `zengid_dynasty`
- `hungary` (1000..1946) / `kingdom_of_hungary` (1000..1526)

**Other row problems.**

- `elam` has ruling ethnicity `persian`. `muisca_confederation` is `mesoamerican_cluster`, though its note says Colombian highlands.
- `carolingian_empire` starts in 486 and is named `Frankish Kingdom / Carolingian Empire`, so it folds in the Merovingian state.
- `later_liang` is named `Later Liang / Northern Liang`.
- `german_confederation`'s name has an unclosed bracket.
- `kingdom_of_denmark` and `kingdom_of_sweden` are ongoing but still `feudal_monarchy`, `catholic` and (Denmark) `old_norse`.
- `kingdom_of_norway` is `germanic_paganism` for all of 872..1380.
- `cuba` is `republic`, ongoing since 1902.

### Open questions for the owner

Questions marked DECIDED are settled in section 8, and the numbers are kept because other sections refer to them.

1. ~~Do peoples, cultures, periods, collectives, events and persons stay as rows?~~ DECIDED.
2. ~~Religion and polity identity.~~ DECIDED.
3. ~~`kidarite_kingdom` versus `kidarites`.~~ DECIDED.
4. ~~A single religion value on a long row.~~ DECIDED.
5. **Which government level to use**, given the overlaps above. Should `chinese_imperial` and `imperial_monarchy` both stay? Are `feudal_monarchy` to `absolute_monarchy` shifts covered by the fixed-form rule, or are they sub-threshold?
6. **Which empties mean what.** Should `id_ruling_religion` distinguish unknown from none from mixed? This needs a value such as a `none` or `mixed` id.
7. ~~Lumped rows.~~ DECIDED.
8. **Renaming.** 07 suggests considering `eastern_roman_empire` for `byzantine_empire`. `naming.md` says ids are never renamed.
9. **An unknown ruling ethnicity.** The column is required and has no unknown value, which forces a guess or a broad cluster.
10. **Where to record an interruption** (07's Byzantine marker), since no column exists and the inheritance layer has not landed.
11. **Promotion from stubs.** 1,697 distinct panel ids do not resolve and 1,704 stubs exist. Who promotes them, by what test, and in what order?
12. **Start of a dependent phase.** Nurhaci's Later Jin state, before 1636, has no row of its own, and `qing_dynasty` starts in 1636. Should the row start earlier, or should the earlier state get a row?

---

## 8. Decision log

Decisions by the project owner, newest last. These override the open questions above.

| Date | Decision | Reason |
|---|---|---|
| 2026-10-31 | Periods are temporal terms for curation, not polities. Existing period rows stay only until real polity rows replace them. | A period names a span of time, not a government |
| 2026-10-31 | `kidarite_kingdom` is merged into `kidarites` and retired. | Same polity; its 320 start predates Kidara |
| 2026-10-31 | One value per field: use the dominant value for the polity's lifespan, and describe changes in `note`. | A single column cannot hold a timeline |
| 2026-10-31 | Use the most specific supported id. Broad ids such as `catholic` are parent categories. Government overlaps are decided in `government.md`. | Stops interchangeable use of parent and child ids |
| 2026-10-31 | Lumped rows beside split rows are to be retired one family at a time. `han_dynasty` and `goktürk_khaganate` are retired. `zhou_dynasty` and `song_dynasty` stay, and so do their children: they have records, so no row in either family is retired. | Follows the split rule in section 4 |
| 2026-10-31 | "Held territory" means effective control, not a claim. Add zones only when a polity needs them. | Keeps `polity_territory` factual and FK-driven |
| 2026-10-31 | A polity needs a government and at least one recorded boundary; the other may be estimated. Added `start_basis` and `end_basis`. | Very old polities have a known end and no known start |
| 2026-10-31 | Peoples, cultures, collectives, events and persons are not polities. Existing rows stay until they have a new home. | Same reasoning as periods; references must keep resolving |
| 2026-10-31 | `roman_empire` and `byzantine_empire` stay two rows, split by the 395 fission. Religion alone never splits a polity. The change from Augustus's authority to the sacred authority of later emperors is real, and is recorded on the inheritance link, not as a split. | Keeps the 07 rule, and puts the disputed question on the axes built for it. Known weakness: contemporaries saw 395 as one empire with two courts |
| 2026-10-31 | Japan's period rows are replaced by `yamato_kingdom`, `ritsuryo_japan`, `kamakura_shogunate`, `kenmu_government`, `ashikaga_shogunate`, `southern_court` and `oda_toyotomi_government`. Splits follow the source of authority, so Sengoku is not a split, and 1336 is fission. The 701 boundary is the closest call. | Periods are not polities |
| 2026-10-31 | `kingdom_of_norway` ends in 1380. `modern_norway` starts in 1905 as a revival. | Sovereignty was extinguished in between, so one ongoing row would break section 4 |
| 2026-10-31 | The non-polity migration is accepted (`non_polity.md`). No new table, and no `cultures` table. Peoples go to `ethnicity.csv` through a panel `ethnicity` key; cultures, collectives and events become panel labels; `lysimachus` becomes `kingdom_of_lysimachus` and a figure. `uruk` and `tyre` are promoted. `wusun`, `yuezhi`, `xianbei`, `mapuche_nation`, `cherokee_nation` and `lullubi_kingdom` stay. An id moving between tables for the same identity is not reuse. Territory gaps are accepted. | Rows earn their place through references, and most of these had none beyond a panel link |
| 2026-10-31 | Deferred: feudal states (Japan's 701 boundary, feudal Germany, the Spring and Autumn period). Japan's rows stay as they are until this is taken up. | A separate topic for the owner |
