# Non-polities

**Status: ACCEPTED.** The project owner approved this design on 2026-10-31 (section 8). Steps 1 to 10 of section 7 are carried out; step 11, the renderer, is not. Consequences that stay open are in section 9.

**Snapshot:** sections 1 to 6 keep the counts measured before the migration, on 2026-10-31 with `code/lib/csv.js` (523 polity rows). They were re-measured just before the move and matched. Section 9 gives the results.

---

## 1. Recommendation

**Add no table and no CSV.** Use one new panel key.

| Class | Rows moved | Home |
|---|---|---|
| Peoples | 24 | `csvs/ethnicity.csv`. 14 rows map to existing ids and 10 map to 7 new rows. Panel cells point there with a new `ethnicity` key |
| Cultures | 4 | Panel label, no entity. `mississippian_culture` is the exception: `ethnicity.csv` already has `mississippian` |
| Periods | 0 here | Panel `era` column and PeriodO. No table. The 4 Japan period rows are done: replaced by polity rows (section 2.6) |
| Collectives | 13 | Panel label, no entity. Real members keep or get their own polity rows |
| Events | 2 | Panel label, no entity |
| Persons | 1 | `csvs/figure.csv` for the person, and a new polity row for the state they ruled |

Moving these 44 rows changes 80 panel cells, deletes 57 `polity_territory` rows, moves 2 more with `lysimachus` along with its 1 `polity_dynasty` row, moves 3 figures, and removes 381 of the 4,107 computed succession edges. Six more rows that look like peoples should stay as polities (section 5).

Why no table: a table earns its rows through inbound references (`city.md` Scope Discipline). After peoples leave for `ethnicity.csv`, 18 rows remain in the culture, collective and event classes. They have 20 panel cells, no dynasty rows, and no figures once section 6 is done. Only `phoenician_colonies` is a single concept used across several panels (3). `federalization` has 2 panels, but they are two unrelated events.

---

## 2. Inventory

Rows are assigned by judgment. **Cells** counts panel entries whose `polity` is this id. **Terr.**, **Dyn.** and **Fig.** count `polity_territory`, `polity_dynasty` and `figure` rows. **Edges** counts rows in `derived/polity_succession.csv` touching the id, as a regenerated copy shows. **QID** counts Wikidata identity rows in `fact_source.csv`. Totals for edges count each edge once, so an edge between two rows in a class counts once.

"(new)" means a row to add to `ethnicity.csv`.

### 2.1 Peoples: move to `ethnicity.csv`

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `berber` | -3000..-200 | 9 | 2 | 1 | 0 | 0 | 4 | 0 | `berber_amazigh_cluster` |
| `beja` | -2000..1500 | 5 | 2 | 1 | 0 | 0 | 11 | 0 | `beja` |
| `histri` | -1000..-177 | 2 | 2 | 2 | 0 | 0 | 22 | 0 | `illyrians` (new) |
| `illyrians` | -1000..-168 | 4 | 2 | 1 | 0 | 0 | 10 | 0 | `illyrians` (new) |
| `saka` | -900..-200 | 2 | 2 | 2 | 0 | 0 | 9 | 0 | `scythian` |
| `cimmerian_scythian_nomads` | -800..-300 | 2 | 2 | 2 | 0 | 0 | 5 | 0 | `scythian` |
| `dahae` | -700..-200 | 2 | 2 | 2 | 0 | 0 | 11 | 0 | `dahae` (new) |
| `donghu` | -700..-209 | 2 | 2 | 2 | 0 | 0 | 1 | 0 | `donghu` (new) |
| `scythian` | -700..-200 | 2 | 2 | 2 | 0 | 0 | 9 | 0 | `scythian` |
| `celts` | -600..-200 | 2 | 2 | 2 | 0 | 0 | 2 | 0 | `celtic_peoples` |
| `tupi_guarani` | -500..1600 | 1 | 1 | 1 | 0 | 0 | 2 | 0 | `tupi` |
| `belgae` | -300..-50 | 3 | 2 | 1 | 0 | 0 | 3 | 0 | `celtic_peoples` |
| `germanic_tribes` | -200..500 | 2 | 2 | 2 | 0 | 0 | 1 | 0 | `germanic_tribes` |
| `free_dacians` | 106..381 | 3 | 2 | 2 | 0 | 0 | 11 | 0 | `dacians` (new) |
| `shiwei` | 388..907 | 2 | 2 | 2 | 0 | 0 | 10 | 0 | `shiwei` (new) |
| `pechenegs` | 860..1091 | 5 | 3 | 2 | 0 | 0 | 13 | 1 | `pechenegs` (new) |
| `carib_peoples` | 1200..1600 | 1 | 1 | 1 | 0 | 0 | 6 | 0 | `caribbean_indigenous` |
| `taino` | 1200..1524 | 1 | 1 | 1 | 0 | 0 | 5 | 0 | `caribbean_indigenous` |
| `sioux_nations` | 1680..1876 | 0 | 0 | 2 | 0 | 0 | 7 | 0 | `sioux_lakota` |
| `celtic_gauls` | -400..-222 | 1 | 1 | 1 | 0 | 0 | 13 | 0 | `gaulish` |
| `oscan_samnite_peoples` | -600..-290 | 1 | 1 | 1 | 0 | 0 | 14 | 0 | `italic_peoples` (new) |
| `latin_sabine_samnite_peoples` | -1000..-500 | 1 | 1 | 1 | 0 | 0 | 14 | 0 | `italic_peoples` (new) |
| `italic_peoples` | -1000..-500 | 1 | 1 | 1 | 0 | 0 | 14 | 0 | `italic_peoples` (new) |
| `ligurians_euganei_raeti` | -1000..-200 | 1 | 1 | 1 | 0 | 0 | 15 | 0 | `ancient_european` |
| **Total (24 rows)** | | **55** | | **36** | **0** | **0** | **187** | **1** | |

### 2.2 Cultures

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `olmec` | -1500..-400 | 1 | 1 | 1 | 0 | 0 | 2 | 0 | Label |
| `ancestral_pueblo` | 100..1300 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | Label |
| `proto_elamite` | -3100..-2700 | 1 | 1 | 1 | 0 | 0 | 3 | 1 | Label |
| `mississippian_culture` | 800..1600 | 2 | 1 | 3 | 0 | 0 | 13 | 1 | `ethnicity: mississippian` |
| **Total (4 rows)** | | **5** | | **6** | **0** | **0** | **18** | **2** | |

### 2.3 Collectives

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `five_dynasties` | 907..960 | 1 | 1 | 1 | 0 | 0 | 13 | 0 | Label; members `later_liang`…`later_zhou` all have rows |
| `ten_kingdoms` | 907..979 | 1 | 1 | 1 | 0 | 0 | 9 | 0 | Label; no member rows |
| `northern_dynasties` | 386..581 | 0 | 0 | 1 | 0 | 0 | 13 | 0 | Label; members `northern_wei`; `western_wei` have rows |
| `southern_dynasties` | 420..589 | 1 | 1 | 1 | 0 | 0 | 17 | 1 | Label; members `liu_song`; `southern_qi`; `liang`; `chen` have rows |
| `sumerian_city_states` | -3500..-2334 | 1 | 1 | 1 | 0 | 2 | 2 | 0 | Label; new `uruk`; figures move (section 6) |
| `phoenician_states` | -1200..-332 | 1 | 1 | 1 | 0 | 1 | 17 | 0 | Label; new `tyre`; figure moves (section 6) |
| `maya_city_states` | 250..900 | 1 | 1 | 1 | 0 | 0 | 4 | 0 | Label |
| `postclassic_maya` | 900..1524 | 1 | 1 | 1 | 0 | 0 | 5 | 0 | Label |
| `lombard_principalities` | 849..1077 | 1 | 1 | 1 | 0 | 0 | 31 | 0 | Label; `lombard_duchy_of_benevento`; `principality_of_salerno` have rows |
| `magna_graecia` | -750..-280 | 1 | 1 | 1 | 0 | 0 | 19 | 0 | Label |
| `phoenician_colonies` | -900..-550 | 3 | 3 | 1 | 0 | 0 | 15 | 0 | Label |
| `punic_coastal_settlements` | -800..-275 | 1 | 1 | 1 | 0 | 0 | 15 | 0 | Label |
| `giudicati_of_sardinia` | 900..1420 | 1 | 1 | 1 | 0 | 0 | 35 | 0 | Label; `giudicati_torres` has a row |
| **Total (13 rows)** | | **14** | | **13** | **0** | **3** | **186** | **1** | |

### 2.4 Events

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `federalization` | 1969..1992 | 2 | 2 | 1 | 0 | 0 | 5 | 0 | Czech cell links to `czechoslovakia`; Belgian cell is a label |
| `celtic_la_tene_migration` | -450..-222 | 1 | 1 | 1 | 0 | 0 | 13 | 0 | Label |
| **Total (2 rows)** | | **3** | | **2** | **0** | **0** | **18** | **0** | |

`federalization` is a mislink as well as an event: one row serves both Czechoslovakia and Belgium.

### 2.5 Persons

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `lysimachus` | -306..-281 | 3 | 3 | 2 | 1 | 0 | 12 | 0 | New polity row for the kingdom; new `figure` row |
| **Total (1 rows)** | | **3** | | **2** | **1** | **0** | **12** | **0** | |

### 2.6 Periods: done, not migrated here

These rows are gone. The decision log in `polity.md` section 8 replaced Japan's four period rows (`yamato_period`, `nara_period`, `heian_period`, `feudal_japan`) with `yamato_kingdom`, `ritsuryo_japan`, `kamakura_shogunate`, `kenmu_government`, `ashikaga_shogunate`, `southern_court` and `oda_toyotomi_government`. `prince_shotoku` now sits on `yamato_kingdom`, and no `fact_source` row names a retired Japan id. The lumped `han_dynasty` and `goktürk_khaganate` were retired too. `zhou_dynasty` and `song_dynasty` stay, and so do their children. They are outside this migration.

---

## 3. Homes by class

### 3.1 Peoples go in `ethnicity.csv`

`ethnicity.md` defines ethnicity as a named people, usually a linguistic ancestry grouping, and `civilization.md` already sends "a people grouped broadly" there. `graph.md` Q6 recommends that a stateless people be an `ethnicity`, which also gives the planned inheritance layer a source for these groups, such as `dahae` to `parthian_empire`.

Three peoples already share an id across both tables: `beja`, `scythian` and `germanic_tribes`. The 7 new rows follow that pattern where they can:

| New `ethnicity.id` | `parent_id` | Takes cells from |
|---|---|---|
| `illyrians` | `ancient_european` | `illyrians`, `histri` |
| `dacians` | `ancient_european` | `free_dacians` |
| `italic_peoples` | `ancient_european` | `italic_peoples`, `oscan_samnite_peoples`, `latin_sabine_samnite_peoples` |
| `dahae` | `iranian_cluster` | `dahae` |
| `donghu` | `central_asian_steppe_bloc` | `donghu` |
| `shiwei` | `mongolic_cluster` | `shiwei` |
| `pechenegs` | `turkic_cluster` | `pechenegs` |

`ethnicity.csv` has no year columns. Dates go in `description` as prose, from a source rather than from the retired row's span. A column would serve only these rows; 256 of 269 ethnicity rows have neither `description` nor `founded`.

A people's row needs an inbound reference like any other, so a people that no cell points to gets no new row. `sioux_nations` has 0 cells and needs only the existing `sioux_lakota`, if anything.

### 3.2 Persons go in `figure.csv`

`lysimachus` names a person, but the cells describe a state ("Lysimachus — Kingdom of Thrace"). The kingdom was real (-306 to -281), so it passes the admission test. Add a polity row `kingdom_of_lysimachus`, move its 3 cells, 2 territory rows and dynasty row, and add a `figure` row with `figure_id` `lysimachus`, which is unused today. The new id avoids a person-named polity. Its dynasty row pointed at `macedonian_argead`, which was wrong: Lysimachus was the son of Agathocles, a Thessalian family settled at Pella, not an Argead. The row was deleted rather than moved, and no `lysimachid` dynasty was added. See section 9.

### 3.3 Cultures, collectives and events are labels

`label` is already the fallback. 620 of 5,015 panel entries are label-only and render as plain text. These rows give nothing beyond a name, a date range and a territory. The name is in the label and the date is in the panel row.

- **Collectives.** Where members have rows, they already carry the territory and the succession edges. Where they do not, the collective is hiding real polities, which should be promoted individually under `polity.md` 2.2 when something references them. It should not stand in for them.
- **Cultures.** `merge_map.md` §5 and `docs/TODO.md` P3.12 name a `cultures` table of about 100 rows. Panels hold 96 further `*_culture` ids in 128 cells that resolve to nothing, of which 12 ids appear in more than one panel. None has a consumer: no route, no figure, no dynasty, and no succession edge would use them. Recommend closing P3.12 as won't do. Revisit only when a query or an inheritance claim needs a culture as an endpoint.

### 3.4 Periods need no table

Panels already carry period terms: 512 rows hold an `era.label`, with 253 distinct labels. The owner's decision makes periods temporal terms for curation, and for that the dates need an authority, not a row of ours. `source-periodo` answers "whose periodisation is this" from the PeriodO snapshot in `sources/periodo/`. No table is needed. The Japan rows are gone, so no row listed here is a period, and nothing has an inbound reference to one.

### 3.5 One table with a `kind` column, or several

If the owner wants a table anyway, use one: `non_polity(id, name, kind, start_year, end_year, note)`. Separate tables for 3, 13 and 2 rows cannot be justified. Recommend neither. A `kind` table would hold the 18 rows above, needs a model doc, schema entry, DDL, loader and generator under the layer contract, and would have no consumer beyond a panel link.

---

## 4. How a cell points at a non-polity

### 4.1 What the code does today

- `public/history/index.html` links any cell with `polity` to `/polity/?id=…`. An id with no row shows "Polity not found", so **all 2,205 of today's unresolved refs (out of 4,395) are dead links**. Retiring a row without changing its cells adds to that.
- A cell without `polity` renders its `label` as plain text and gets `colorOf` class `eth-indigenous`. So a Celtic or Turkic cell turns that colour until the renderer learns a new key. This is cosmetic.
- The renderer ignores unknown keys, so a new key is safe before any UI change.
- `scripts/validate.js` section 7 reads only `entry.polity`, and an unresolved one is a warning.
- **`scripts/dedup_and_link.js` can undo the migration.** For a cell with no `polity`, `resolveLabel` calls `matchExistingPolity` on the label before any strip check, and writes `polity` back if a row matches. `STRIP_LIST` covers only an existing field and a newly generated id. While a retired row still exists, a run relinks its label-only cells. The script is not part of `make:all`, so it runs only by hand.
- `polity.csv` rows have no reference from `city` or `dynasty`, and no hard-coded polity id appears in `public/` (`api.md`).

### 4.2 Design

Add one optional key, `ethnicity`, beside `label`. It is an FK to `ethnicity.id`. Other non-polity cells drop `polity` and keep `label`.

```json
{ "label": "Pechenegs (from c.895 CE)", "ethnicity": "pechenegs" }
{ "label": "Magna Graecia (Greek colonies)" }
```

Rules:

1. An entry has at most one of `polity` and `ethnicity`.
2. An `X / Y` label takes the first people, as `merge_map.md` §2 does for polities.
3. A generic reference such as `"ref": {"table": …, "id": …}` is rejected. There is one target table, so one key is simpler.

Required code changes:

| File | Change |
|---|---|
| `scripts/validate.js` | Section 7: an unresolved `entry.ethnicity` is an error, and an entry with both keys is an error |
| `scripts/dedup_and_link.js` | Skip entries with `ethnicity`. Reject a `matchExistingPolity` result that is in `STRIP_LIST`. Add retired ids to `STRIP_LIST` |
| `docs/model/api.md` 2.9 | Record the key. This settles its open question: label-only is the intended form for a non-polity cell |
| `public/history/index.html` | Optional and later: link `ethnicity` to the ethnicity page and colour it. This is the Presentation department's change, and it follows the contract |

---

## 5. Peoples that may be real polities

The test is `polity.md` 2.2 step 1, whether someone governed, and the decision log's requirement for a government and one recorded boundary. A people's name does not settle it, and neither does the `tribal_confederation` value: it covers 42 rows of mixed kinds. Reasons below come from general knowledge unless marked checked, so a curator should confirm each one with a librarian before acting.

**Recommended to stay as polities:**

| Row | Span | Cells | Panels | Terr. | Dyn. | Fig. | Edges | QID | Home |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `wusun` | -200..400 | 3 | 2 | 1 | 0 | 0 | 11 | 0 | Stay |
| `yuezhi` | -300..-130 | 5 | 5 | 2 | 0 | 0 | 10 | 0 | Stay |
| `xianbei` | 93..234 | 4 | 4 | 3 | 0 | 0 | 11 | 1 | Stay |
| `mapuche_nation` | 1400..1883 | 1 | 1 | 1 | 0 | 0 | 7 | 0 | Stay |
| `cherokee_nation` | 1540..1838 | 1 | 1 | 2 | 0 | 0 | 13 | 0 | Stay |
| `lullubi_kingdom` | -2300..-1200 | 1 | 1 | 1 | 0 | 0 | 4 | 0 | Stay |
| **Total (6 rows)** | | **15** | | **10** | **0** | **0** | **53** | **1** | |

| Row | Recommendation | Reason |
|---|---|---|
| `wusun` | Keep; review `government` | Chinese sources name its rulers (*kunmi*) and record marriage ties with Han |
| `yuezhi` | Keep; review `government` | A king is recorded, and the row carries a link toward `kushan_empire` that matters to succession |
| `xianbei` | Keep | Tanshihuai's confederation had a ruler and fell apart after his death in 181 (checked: Wikipedia, *Han dynasty*). The row's 93 start and its `Xianbei (Murong · Tuoba)` cells are looser; those cells may use a people link later |
| `mapuche_nation` | Keep; review the 1400 start | Treated with Spain as a counterparty, with a recorded end in 1883. Assemblies count under step 1 |
| `cherokee_nation` | Keep; review the 1540 start | The 1827 constitution and principal chief are a government. The earlier span may not be |
| `lullubi_kingdom` | Keep; change `government` | Kings are attested and its own note calls it a kingdom, so `tribal_confederation` is the error |

**Recommended to leave `polity.csv`, though close:**

| Row | Recommendation | Reason |
|---|---|---|
| `pechenegs` | Ethnicity `pechenegs` | Eight tribes under separate leaders, in Constantine VII's account (checked: Wikipedia, *Pechenegs*, Composition). No ruler over all of them is recorded, so step 1 fails. Its QID moves to the ethnicity row |
| `donghu` | Ethnicity `donghu` | One king appears in the Xiongnu story and nothing else. One edge only |
| `scythian` | Ethnicity `scythian` | Royal Scythians and later kingdoms did exist, but this row lumps Scythians with Sarmatians across 500 years. A specific kingdom can get its own row if a reference needs it |
| `sioux_nations` | Ethnicity `sioux_lakota` | No panel cell or figure points at it, so it fails step 4 regardless |
| `beja`, `berber` | Ethnicity | Spans of 3,500 and 2,800 years cannot be one government. `mauretania_kingdom` already holds the real Berber kingdom, and a Beja state can get its own row |

**Other classes: stay as polities, and flag.**

| Row | Recommendation | Reason |
|---|---|---|
| `iroquois_confederacy`, `kara_koyunlu`, `aq_qoyunlu`, `dzungar_khanate`, `khoshut_khanate`, `hephthalites`, `muisca_confederation` | Keep | Named rulers or a council, so step 1 passes. `creek_confederacy` too, though it has no panel cell (`polity.md` section 7) |
| `teotihuacan`, `zapotec`, `tiwanaku` | Keep | Each is a centred state, though the evidence is archaeological. The reason differs from `olmec`, whose row holds no single place of rule |
| `punt` | Keep | Egyptian records name its rulers. Its `aksumite` dynasty row looks wrong |
| `ba_shu` | Keep until split | Two states in one row (1 cell, 4 edges). Recommend rows `ba` and `shu`, not a label, since each was a real state |
| `thirteen_colonies`, `spanish_caribbean`, `british_caribbean`, `french_caribbean` | Keep as dependent units | One crown governed each, so they fit `polity.md` 2.3's allowance. But `thirteen_colonies` holds mislinked Canadian cells (Quebec, Nova Scotia, Newfoundland), which should be fixed separately |
| `muhallabid_governors` | Keep as a dependent unit | Governors of a province, not one person. Its `umayyad` dynasty row looks wrong for 771..793 |
| `al_andalus` | Pass to the lumped review | It spans the emirate, caliphate, taifas and Granada |
| `hohenstaufen` | Keep | `merge_map.md` §10 says not to re-litigate it |

---

## 6. Territory, succession, figures and sources

**`polity_territory` rows are deleted, not moved.** That table means effective control by a polity. A people's location is already shown by which panel and column holds its cell. Adding `ethnicity_territory` would be a table with one use.

The cost is visible on territory pages. Nothing reaches zero rows, but these lose more than 500 years of coverage that no other row provides:

| Territory | Years uncovered | Main span | Caused by |
|---|---:|---|---|
| `north_africa` | 2,186 | -3000..-815 | `berber` |
| `amazonia` | 2,000 | -500..1499 | `tupi_guarani` |
| `mesoamerica` | 1,259 | -1500..-501; 1169..1427 | `olmec`, Maya rows |
| `us_west` | 1,201 | 100..1300 | `ancestral_pueblo` |
| `mesopotamia` | 1,166 | -3500..-2335 | `sumerian_city_states` |
| `us_midwest`, `us_south`, `us_east` | 734, 713, 650 | from 800 | `mississippian_culture` |
| `bohemia`, `germany` | 701, 686 | from -200 | `germanic_tribes` |
| `mongolian_plateau`, `manchuria` | 617, 521 | from -700 | `donghu`, `shiwei` |
| `central_asian_steppe`, `pontic_steppe` | 600, 601 | -900..-301; -800..-200 | `saka`, `dahae`; Scythian rows |

Recommendation: accept the gaps. An empty span says that no polity is recorded, which is true of most of them. Mesopotamia and Mesoamerica are different: states existed there, so the gap measures missing rows.

**Succession edges need no authored change.** They are computed, and regenerate on `make:all`. A scratch copy with 43 rows removed (all of the above except `lysimachus`, which is replaced, not removed) went from 4,107 edges to 3,726. It lost 381 and gained none, so no new false edge appears across a gap. The generator was run in the copy only. Those 381 are similarity evidence, not claims. The inheritance layer can re-express any that matter with an `ethnicity` source.

**Figures.** `figure.polity_id` is required, and `code/makejson/polities.js` drops a figure with none, so all 3 must move first:

| Figure | Now | Move to |
|---|---|---|
| `ur_nammu` | `sumerian_city_states` | `ur_iii`, the state Ur-Nammu founded (already flagged in `figure.md`) |
| `gilgamesh` | `sumerian_city_states` | New polity `uruk` |
| `hiram_tyre` | `phoenician_states` | New polity `tyre` |

`uruk` and `tyre` each have a figure as an inbound reference, plus a named ruler, a place and an estimable boundary. They also narrow the `mesopotamia` and `levant` gaps. Both need a curator and a source.

**`fact_source.csv`.** Four QIDs are affected. `pechenegs` (Q181752) and `mississippian_culture` (Q1052095) change `entity_table` and `entity_id` to the ethnicity row; `validate.js` already accepts `ethnicity`. `proto_elamite` (Q1196237) and `southern_dynasties` (Q9726365) lose their row, so record the QID beside the retired id in `merge_map.md`.

**`polity_dynasty`.** Only `lysimachus` is affected among rows moved. Its row was wrong, so it was deleted (section 3.2).

---

## 7. Migration

Each step is one commit, and leaves `npm test` passing. `pretest` runs `make:all`, which is required: the validator fails if `derived/polity_succession.csv` still names a removed polity. `code/makejson/polities.js` clears `data/polity/` first, so no stale JSON survives.

Order inside any row's move: **references first, the row last.** Follow the retirement steps in `polity.md` section 4.

1. **Contracts.** Owner approves. Update `polity.md` 2.3, `api.md` 2.9, `merge_map.md` §5 and §6, `naming.md`'s `cultures` section, the `pechenegs` example in `graph.md`, and the `ur_nammu` line in `figure.md`. Close `docs/TODO.md` P3.12.
2. **Guards.** Make the `validate.js` and `dedup_and_link.js` changes in section 4.2. No data changes. Until this step lands, do not run `dedup_and_link.js`.
3. **Figures.** Move `ur_nammu`. Add `uruk` and `tyre` with their territory rows, then move `gilgamesh` and `hiram_tyre`.
4. **New ethnicity rows.** Add the 7 rows in section 3.1. Nothing points at them yet.
5. **Peoples, one family per commit:** steppe; Italic and Alpine; Celtic and Germanic; Balkans; Africa; Americas. For each row: change its cells from `polity` to `ethnicity`; move any QID; delete its `polity_territory` rows; delete the row; add the id to `STRIP_LIST` and `merge_map.md`. Run `npm test`.
6. **Cultures.** Same order. `mississippian_culture` takes the `ethnicity` key, and the other three drop `polity`.
7. **Collectives.** Do those with member rows first (`five_dynasties`, `northern_dynasties`, `southern_dynasties`, `lombard_principalities`, `giudicati_of_sardinia`), then the rest. `sumerian_city_states` and `phoenician_states` must follow step 3.
8. **Events.** Relink the Czech `federalization` cell to `czechoslovakia`, strip the Belgian one, and strip `celtic_la_tene_migration`.
9. **Person.** Add `kingdom_of_lysimachus`, move its references, add the figure, retire `lysimachus`.
10. **Dangling `*_culture` cells (optional).** Drop `polity` from the 128 cells. This adds no rows, and removes 128 dead links.
11. **Renderer (optional).** The Presentation change in section 4.2.

Each batch should leave the count of unresolved panel ids unchanged, except step 10, which lowers it. A rise means a cell was missed.

No DDL, loader or `SCHEMA` change is needed, because no CSV or column is added. Panels are not loaded into the database.

---

## 8. Owner decisions

Decided on 2026-10-31.

| # | Question | Answer |
|---|---|---|
| 1 | Approve no new table? | Yes. No new table, and the `cultures` table in `merge_map.md` §5 is dropped |
| 2 | Accept the territory gaps in section 6? | Yes |
| 3 | Promote `uruk` and `tyre`? | Yes, as polity rows |
| 4 | The six stay-rows in section 5 | They stay |
| 5 | `pechenegs` | Leaves `polity.csv` |
| 6 | Is reusing a retired id in another table acceptable? | An id moving from polity to ethnicity for the same identity is not reuse |
| 7 | Ethnicity's definition | Widened to include a named people (`ethnicity.md`) |
| 8 | `kingdom_of_lysimachus` | Used as a new id |

---

## 9. Result and consequences

Measured after step 10, with `npm test` passing.

| Measure | Before | After |
|---|---:|---:|
| `polity.csv` rows | 523 | 482 (44 retired; `uruk`, `tyre`, `kingdom_of_lysimachus` added) |
| `ethnicity.csv` rows | 269 | 276 |
| `polity_territory.csv` rows | 858 | 803 |
| `polity_dynasty.csv` rows | 276 | 275 |
| `figure.csv` rows | 285 | 286 |
| `fact_source.csv` rows | 292 | 290 |
| Succession edges | 4,107 | 3,743 |
| Panel entries with `polity` | 4,395 | 4,191 |
| Panel entries with `ethnicity` | 0 | 57 |
| Label-only panel entries | 620 | 767 |
| Unresolved panel ids | 1,793 | 1,697 |
| Unresolved panel cells | 2,205 | 2,077 |
| `npm test` warnings | 1,894 | 1,773 |

Unresolved ids stayed at 1,793 through steps 3 to 9. All of the drop is the 96 `*_culture` ids in step 10.

**The four affected QIDs.**

| QID | Was | Now |
|---|---|---|
| Q181752 | polity `pechenegs` | ethnicity `pechenegs` |
| Q1052095 | polity `mississippian_culture` | ethnicity `mississippian` |
| Q1196237 | polity `proto_elamite` | No row; recorded in `merge_map.md` §6 |
| Q9726365 | polity `southern_dynasties` | No row; recorded in `merge_map.md` §6 |

Q1052095 names a culture and now identifies a people row, which is close but not exact.

**Territory gaps.** Accepted, and the table in section 6 stands, except that `uruk` narrows `mesopotamia` to -3500..-2901 and `tyre` keeps `levant` covered from -1200. Earliest coverage moved later in several zones, for example `north_africa` to -814, `amazonia` to 1500, `us_west` to 1521, `pontic_steppe` to 350 and `central_asian_steppe` to -300. Mesopotamia and Mesoamerica measure missing rows, not missing states. `maya_city_states` and `postclassic_maya` left no member rows, and `mesoamerica` now starts at -500.

**Rows classified by judgment.** Every assignment in section 2 is a judgment, as are the stay-rows in section 5. The closest calls were `pechenegs`, `donghu` and `scythian`, which left, and `wusun`, `yuezhi` and `xianbei`, which stayed. Reasons in section 5 were mostly general knowledge. `pechenegs` (composition) and `xianbei` (Tanshihuai) were checked against Wikipedia. The others are unverified.

**Choices made during the move.**

- `shiwei`, `donghu` and `dahae` have the `parent_id` in section 3.1, but the evidence fits other parents better. Wikipedia treats the Shiwei as Mongolic, and `mongolic_cluster` exists. It links the Donghu to Mongolic peoples, without certainty. It calls the Dahae generally Eastern Iranian, and `iranian_cluster` exists. The descriptions say so. Moving the parents is the owner's decision.
- `ligurians_euganei_raeti` links to the broad `ancient_european` node, and `belgae` to `celtic_peoples`, though one of its labels says Celtic-Germanic.
- `kingdom_of_lysimachus` holds `anatolia` from -301 (Ipsus), not -306 as the retired row had it. Its dynasty row was deleted, not moved.
- The `pechenegs` description uses the 8th-century first certain attestation, not the row's 860.
- `czech_slovakia`'s `federalization` cell now links to `czechoslovakia`.
- `STRIP_LIST` also holds 5 ids that the labels of moved cells would otherwise generate: `phoenician_city_states`, `ancestral_puebloans`, `chinese_southern_dynasties`, `kura_araxes`, `jiroft`.
- Until step 11, ethnicity-linked cells render as plain text with the `eth-indigenous` colour.
