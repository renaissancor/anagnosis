# Anagnosis ledger

Every known defect and open job, with its owner role and whether it needs the project owner's approval. Roles and write sets are in [`ARCHITECTURE.md`](ARCHITECTURE.md). A role that finds a defect outside its task returns it, and the main session adds it here. Remove a row when the fix lands. Past work is in git history.

## Defects

| # | Severity | Where | What | Owner role | Approval |
|---|---|---|---|---|---|
| 2 | Medium | `scripts/dedup_and_link.js:468`, `scripts/extract_missing_polities.js:208` | Scripts write layer 1. Only a curator may run them, and the diff must be reviewed like a hand edit | build-owner | Yes |
| 13 | High | `csvs/polity_territory.csv` | 731 of 803 territory spans only repeat the polity's whole lifespan, so timelines cannot show tenure; the UI draws these hollow | curator | Yes |
| 7 | Medium | `scripts/validate.js` | 1,773 warnings and 1,145 `no_people_no_land_edges` are untriaged | curator, succession-curator | Yes |
| 10 | Low | `csvs/polity.csv:5`, `csvs/ethnicity.csv:277` | Punt uses the placeholder `cushitic_cluster`, and `punt_people` exists with no inbound reference | curator | Yes |
| 11 | Low | `package-lock.json` | An uncommitted local change has no recorded reason | build-owner | Yes |
| 12 | Low | `.gemini/settings.json` (history) | A personal Windows path stays in public git history. Decided 2026-11-01: history is not rewritten | owner | No |
| 17 | Low | `scripts/find_overlaps.js:271` | Logs an undefined `timelineOut`, so the script exits 1 after writing its CSV | build-owner | Yes |
| 18 | Low | `scripts/extract_missing_polities.js:197` | `--write` leaves a blank line before appended stubs and no final newline | build-owner | Yes |
| 19 | Low | `scripts/generate_stubs.js:265` | `derived/polity_stubs.csv` header still has `civilization_id` and `territories` and lacks `start_basis`/`end_basis` | build-owner | Yes |
| 20 | Low | `server.js:146` | `/api/dynasty` `polity_count` counts rows, the pattern fixed in territories; latent only | ui-designer | Yes |
| 21 | Low | `csvs/polity.csv` | `north_yuan`/`northern_yuan` and `zangid_atabegate`/`zengid_dynasty` duplicate pairs need sourced end year, language and religion before a merge | curator | Yes |
| 22 | Low | `csvs/language.csv`, `csvs/religion.csv`, `csvs/figure.csv` | 27 language names keep a legacy `()` prefix; madhhab ids mix `sunni_hanafi` with `hanbali_school`; a figure is named only "MBS" | curator | Yes |

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
| azanian_coast | Azanian coast | | somalia, swahili_coast |
| italian_somaliland | Italian Somaliland | | somalia, swahili_coast |
| somali_republic | Somali Republic | | somalia, swahili_coast |

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
