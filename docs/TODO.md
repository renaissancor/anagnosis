# Anagnosis ledger

Every known defect and open job, with its owner role and whether it needs the project owner's approval. Roles and write sets are in [`ARCHITECTURE.md`](ARCHITECTURE.md). A role that finds a defect outside its task adds it here and leaves the code alone. Remove a row when the fix lands. Past work is in git history.

## Defects

| # | Severity | Where | What | Owner role | Approval |
|---|---|---|---|---|---|
| 1 | High | `server.js`, `data/index.js`, `public/` | Curated claims are built to `data/inheritance/`, but no API route or page reads them (`model/inheritance.md`, migration step 4) | build-owner, ui-designer | Yes |
| 2 | Medium | `scripts/dedup_and_link.js:468`, `scripts/extract_missing_polities.js:208` | Scripts write layer 1. Only a curator may run them, and the diff must be reviewed like a hand edit | build-owner | Yes |
| 3 | Medium | `scripts/{extract_labels,dedup_and_link,find_overlaps,extract_missing_polities,generate_stubs}.js` | Read CSV by hand instead of through `code/lib/csv.js` | build-owner | Yes |
| 4 | Medium | `scripts/{dedup_and_link,extract_labels,find_overlaps,generate_stubs,normalize_labels,extract_missing_polities}.js`, `code/generate-successions.js` | Write CSV by hand instead of through `code/lib/csv.js` | build-owner | Yes |
| 5 | Medium | `public/history/index.html` | 66 panel ids are hard-coded and 72 exist; 6 are unreachable (`model/api.md` M4) | ui-designer | Yes |
| 6 | Medium | `public/app.js` | The index detail panel never shows figures, policies or note (`model/api.md` M1) | ui-designer | Yes |
| 7 | Medium | `scripts/validate.js` | 1,773 warnings and 1,145 `no_people_no_land_edges` are untriaged | curator, succession-curator | Yes |
| 8 | Medium | `scripts/validate.js:367` | (heir, source) uniqueness is decided but not checked | build-owner | Yes |
| 9 | Low | `server.js:11` | `/data` serves all of `data/`, including `index.js` | ui-designer | Yes |
| 10 | Low | `csvs/polity.csv:5`, `csvs/ethnicity.csv:277` | Punt uses the placeholder `cushitic_cluster`, and `punt_people` exists with no inbound reference | curator | Yes |
| 11 | Low | `package-lock.json` | An uncommitted local change has no recorded reason | owner | Yes |
| 12 | Low | `.gemini/settings.json` (history) | A personal Windows path stays in public git history. Decided 2026-11-01: history is not rewritten | owner | No |

## Open curation

**Polities named by panels and not in `csvs/polity.csv`.** Dates are suggestions, not checked facts. `node scripts/extract_missing_polities.js` prints the live list; run it without `--write`.

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
- Panels for the remaining gaps: Philippines, Bengal, Oceania.
- Province-level geography.
