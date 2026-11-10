# Anagnosis ledger

Every known defect and open job, with its owner role and whether it needs the project owner's approval. Roles and write sets are in [`ARCHITECTURE.md`](ARCHITECTURE.md). A role that finds a defect outside its task returns it, and the main session adds it here. Remove a row when the fix lands. Past work is in git history.

## Defects

| # | Severity | Where | What | Owner role | Approval |
|---|---|---|---|---|---|
| 2 | Medium | `scripts/dedup_and_link.js:472`, `scripts/extract_missing_polities.js:201` | Scripts write layer 1. Only a curator may run them, and the diff must be reviewed like a hand edit | build-owner | Yes |
| 13 | High | `csvs/polity_territory.csv` | 740 of 812 territory spans only repeat the polity's whole lifespan, so timelines cannot show tenure; the UI draws these hollow | curator | Yes |
| 7 | Medium | `scripts/validate.js` | 1,775 warnings and 1,184 `no_people_no_land_edges` are untriaged | curator, succession-curator | Yes |
| 10 | Low | `csvs/polity.csv:5`, `csvs/ethnicity.csv:277` | Punt uses the placeholder `cushitic_cluster`, and `punt_people` exists with no inbound reference | curator | Yes |
| 11 | Low | `package-lock.json` | An uncommitted local change has no recorded reason | build-owner | Yes |
| 12 | Low | `.gemini/settings.json` (history) | A personal Windows path stays in public git history. Decided 2026-11-01: history is not rewritten | owner | No |
| 20 | Low | `server.js:176` | `/api/dynasty` `polity_count` counts rows, the pattern fixed in territories; latent only | ui-designer | Yes |
| 21 | Low | `csvs/polity.csv` | `north_yuan`/`northern_yuan` and `zangid_atabegate`/`zengid_dynasty` duplicate pairs need sourced end year, language and religion before a merge | curator | Yes |
| 22 | Low | `csvs/religion.csv:92,132` | Madhhab ids mix `sunni_hanafi`/`sunni_shafi` with `hanbali_school`/`maliki_school`. Ids are never renamed (`model/naming.md`), so aligning them means retiring the two ids through `migration/merge_map.md` section 11 as on 2026-11-05; neither has an inbound reference. Decide: retire, or accept the mix. Display names (`Sunni Islam (Hanafi)` against `Hanbali School`) differ the same way | owner, then curator | Yes |
| 23 | Low | `panels/middle_east/levant.json:734,767-769,819` | 1946 Syrian Republic cell has no `polity` key; "Syrian 1st Republic · Ba'athist Syria" lumps two polities; the "Assad / SAR" cell points to the person `assad` | curator | Yes |
| 24 | Low | `panels/east_asia/tibet.json:231` | The "Guge-Purang Kingdom" cell keeps the unresolved id `guge_purang_kingdom`. No local source has a Guge or Purang record, and the panel draws it as the predecessor of separate `guge_kingdom` and `purang_kingdom` cells; needs a sourced decision (same polity as `guge_kingdom`, or its own row) | curator | Yes |
| 25 | Low | `panels/east_africa/somalia.json:53`, `panels/east_africa/swahili_coast.json:44` | `azanian_coast` cells carry a `polity` key, but Azania is a region (Wikidata Q786942) and fails the admission test | curator | Yes |
| 26 | Low | `csvs/polity_dynasty.csv` | `brunei_sultanate` and `sulu_sultanate` have no dynasty tag since the unsupported `hashemite` tag was removed. Which house ruled each and from when is unsourced: no local Brunei record; Wikidata Q7375069 "Royal House of Sulu" is a lead with no reign statement or dates (`model/polity_dynasty.md` open questions) | curator | Yes |
| 28 | Low | `csvs/polity_dynasty.csv`, `docs/model/polity_dynasty.md:75` | Rule 5 (non-monarchical polities take no dynasty row) names no `government` ids. `hephthalites` and `japanese_korea` break it as written; `hasmonean_dynasty`, `almoravid_dynasty` and `teutonic_order` (`theocracy`) break it only if the `model/polity.md` monarchical list is the definition. Rule or data is undecided and unsourced; the contract open questions list what settles each row | owner, then curator | Yes |
| 30 | Low | `derived/wikidata_candidates.csv:68` | Best match for `funan` is a 2023 journal article (Q125912311), not the polity | curator | Yes |
| 31 | Low | `docs/model/figure.md:118`, `docs/model/graph.md:118`, `docs/model/api.md` §2.3 | Missed counts: 350 polities with no figure (now 349); polity 482 rows (now 481); `/api/polity/colors` about 15 KB, not 14 | curator, succession-curator, ui-designer | Yes |
| 32 | Medium | `code/generate-successions.js:184-197` | `same_ethnicity` is set only when two polities also share a territory, so `no_people_no_land_edges` counts some same-people edges (about 30 Arab-to-Arab edges after 2026-11-05) | build-owner | Yes |
| 33 | Low | `docs/model/source.md:32` | Does a `field=id` row exclude other rows from the same source or only the same QID? `new_kingdom_egypt` has an `id` row (Q180568) and a language row (Q1852329) | owner | Yes |

## Open curation

**Polities named by panels and not in `csvs/polity.csv`.** Dates are suggestions, not checked facts. `node scripts/extract_missing_polities.js --min-panels 1` prints a fuller live list, without the `--write` flag; the default shows only ids in 2+ panels.

| id (suggested) | Name | Approx. dates | Panel |
|---|---|---|---|
| awadh_nawabate | Awadh Nawabate | 1722–1856 | india |
| carnatic_sultanate | Carnatic Nawabate | 1690–1855 | india |
| syrian_1st_republic | Syrian Republic | 1946–1958; 1961–1963 | levant |

Added 2026-11-05 on `zones-and-new-kingdom`: the `tibetan_plateau` and `horn_of_africa` zones and 11 polities (Hejaz, Lebanon, Ba'athist Syria, Wattasid, Guge, Ladakh, Ganden Phodrang, Sikkim, Bhutan, Italian Somaliland, Somali Republic). Still open: Awadh appears only inside a combined `rajput_states` cell; Carnatic has no sourced ruling ethnicity; Syria 1946–1958 and 1961–1963 has no row; `punt` may belong on `horn_of_africa`; `yuan_dynasty`, `qing_dynasty` and `peoples_republic_of_china` lack a `tibetan_plateau` row pending `polity_territory.md` OPEN 1.

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
