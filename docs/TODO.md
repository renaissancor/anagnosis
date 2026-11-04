# Anagnosis ledger

Every known defect and open job, with its owner role and whether it needs the project owner's approval. Roles and write sets are in [`ARCHITECTURE.md`](ARCHITECTURE.md). A role that finds a defect outside its task returns it, and the main session adds it here. Remove a row when the fix lands. Past work is in git history.

## Defects

| # | Severity | Where | What | Owner role | Approval |
|---|---|---|---|---|---|
| 2 | Medium | `scripts/dedup_and_link.js:468`, `scripts/extract_missing_polities.js:208` | Scripts write layer 1. Only a curator may run them, and the diff must be reviewed like a hand edit | build-owner | Yes |
| 13 | High | `csvs/polity_territory.csv` | 728 of 800 territory spans only repeat the polity's whole lifespan, so timelines cannot show tenure; the UI draws these hollow | curator | Yes |
| 7 | Medium | `scripts/validate.js` | 1,773 warnings and 1,145 `no_people_no_land_edges` are untriaged | curator, succession-curator | Yes |
| 10 | Low | `csvs/polity.csv:5`, `csvs/ethnicity.csv:277` | Punt uses the placeholder `cushitic_cluster`, and `punt_people` exists with no inbound reference | curator | Yes |
| 11 | Low | `package-lock.json` | An uncommitted local change has no recorded reason | build-owner | Yes |
| 12 | Low | `.gemini/settings.json` (history) | A personal Windows path stays in public git history. Decided 2026-11-01: history is not rewritten | owner | No |
| 17 | Low | `scripts/find_overlaps.js:271` | Logs an undefined `timelineOut`, so the script exits 1 after writing its CSV | build-owner | Yes |
| 18 | Low | `scripts/extract_missing_polities.js:197` | `--write` leaves a blank line before appended stubs and no final newline | build-owner | Yes |
| 19 | Low | `scripts/generate_stubs.js:232` | `derived/polity_stubs.csv` header still has `civilization_id` and `territories` and lacks `start_basis`/`end_basis` | build-owner | Yes |
| 20 | Low | `server.js:176` | `/api/dynasty` `polity_count` counts rows, the pattern fixed in territories; latent only | ui-designer | Yes |
| 21 | Low | `csvs/polity.csv` | `north_yuan`/`northern_yuan` and `zangid_atabegate`/`zengid_dynasty` duplicate pairs need sourced end year, language and religion before a merge | curator | Yes |
| 22 | Low | `csvs/language.csv`, `csvs/religion.csv`, `csvs/figure.csv` | 27 language names keep a legacy `()` prefix; madhhab ids mix `sunni_hanafi` with `hanbali_school`; a figure is named only "MBS" | curator | Yes |
| 23 | Low | `panels/middle_east/levant.json:734,767-769,819` | 1946 Syrian Republic cell has no `polity` key; "Syrian 1st Republic · Ba'athist Syria" lumps two polities; the "Assad / SAR" cell points to the person `assad` | curator | Yes |
| 24 | Low | `panels/east_asia/tibet.json:231,476,632`, `panels/middle_east/morocco.json:408` | Duplicate panel ids (`guge_purang_kingdom`, `sikkim`, `wattasid`); Ladakh cell has no `polity` key; `tribal_communities`, `indigenous_chiefs`, `indigenous_local_rulers` are collectives used as polity ids | curator | Yes |
| 25 | Low | `panels/east_africa/somalia.json:53`, `panels/east_africa/swahili_coast.json:44` | `azanian_coast` cells carry a `polity` key, but Azania is a region (Wikidata Q786942) and fails the admission test | curator | Yes |
| 26 | Low | `csvs/polity_territory.csv`, `csvs/polity_dynasty.csv` | `ajuran_sultanate` sits on `arabia` though Somali; `brunei_sultanate` and `sulu_sultanate` are tagged `hashemite` | curator | Yes |
| 27 | Low | `csvs/polity.csv:12` | The New Kingdom merge kept `old_egyptian` and end -1070 and dropped the retired row's `late_egyptian_demotic` and -1069; needs a source | curator | Yes |

## Open curation

**Polities named by panels and not in `csvs/polity.csv`.** Dates are suggestions, not checked facts. `node scripts/extract_missing_polities.js --min-panels 1` prints a fuller live list, without the `--write` flag; the default shows only ids in 2+ panels.

| id (suggested) | Name | Approx. dates | Panel |
|---|---|---|---|
| awadh_nawabate | Awadh Nawabate | 1722–1856 | india |
| carnatic_sultanate | Carnatic Nawabate | 1690–1855 | india |
| guge_kingdom | Guge Kingdom | c.842–1630 | tibet |
| ladakh_kingdom | Ladakh Kingdom | c.842–1846 | tibet |
| ganden_phodrang | Ganden Phodrang | 1642–1959 | tibet |
| sikkim_kingdom | Sikkim Kingdom | 1642–1975 | tibet |
| bhutan_kingdom | Kingdom of Bhutan | 1907–present | tibet |
| hashimite_hejaz | Hashimite Kingdom of Hejaz | 1916–1925 | arabia |
| syrian_arab_republic | Syrian Arab Republic | 1946–present | levant |
| lebanese_republic | Lebanese Republic | 1943–present | levant |
| wattasid_dynasty | Wattasid Dynasty | 1472–1554 | morocco |
| italian_somaliland | Italian Somaliland | | somalia, swahili_coast |
| somali_republic | Somali Republic | | somalia, swahili_coast |

Branch `overnight-polities` (2026-11-05, not merged) adds `hashimite_kingdom_of_hejaz`, `lebanese_republic`, `baathist_syrian_arab_republic` and `wattasid_dynasty` from Wikidata; it raises the warning ratchet, so it waits for the owner. The Tibet and Himalaya rows and the two Somali rows are blocked because no territory zone fits (`territory.md` known gaps). Awadh appears only inside a combined `rajput_states` cell. Carnatic has no sourced ruling ethnicity. `azanian_coast` is a region and was dropped from this list.

`bantu_expansion` is also reported, but it is an event and fails the polity admission test.

**Panel entities.** Review remaining unclassified labels in `derived/panel_labels.csv`, and promote rows from `derived/polity_stubs.csv` only by hand.

**Taxonomies.** Compare `csvs/{ethnicity,language,religion}.csv` with the retired hierarchies in `docs/todo/` at commit `5439e84`, and with Glottolog and Wikidata through the librarians.

**Succession.** Decide claims one at a time, starting from the open questions in `model/graph.md` section 6.

## Targets

These are ideas, not commitments. Each needs the owner's approval to start.

- Map of polity territories at any given year.
- Timeline comparison of several polities.
- "What existed in year X?" across all regions.
- Search by name, time range, territory and ethnicity.
- A panel for Bengal.
- Province-level geography.
