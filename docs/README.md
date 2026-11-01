# Anagnosis documentation

The index of repository documents. **Read [ARCHITECTURE.md](ARCHITECTURE.md) first**: it holds the layers and write sets, and every other doc defers to it. `scripts/validate.js` fails if a doc is missing here or a link is dead. `brainstorm/succession/` is an archive, indexed by its own README.

## Start here

| Doc | Answers | Read when |
|---|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Where data lives; who writes what; what is enforced | Before any change |
| [TODO.md](TODO.md) | Known defects and open work | Before starting work; when you find a defect |
| [model/data-model.md](model/data-model.md) | The property-graph model | First data-model question |
| [model/editorial-policy.md](model/editorial-policy.md) | How content is added and verified | Before writing rows |
| [migration/csv_workflow.md](migration/csv_workflow.md) | Editing CSVs and panels, regenerating | Before writing rows |

## Contracts by area

| Doc | Answers | Reader |
|---|---|---|
| [model/polity.md](model/polity.md) | What is a polity row | curator |
| [model/polity_territory.md](model/polity_territory.md) | Which polity held which territory | curator |
| [model/polity_dynasty.md](model/polity_dynasty.md) | Polity and dynasty junction | curator |
| [model/territory.md](model/territory.md) | Macro territories | curator |
| [model/dynasty.md](model/dynasty.md) | Dynasty as a tag | curator |
| [model/figure.md](model/figure.md) | Key people | curator |
| [model/government.md](model/government.md) | Government forms | curator |
| [model/ethnicity.md](model/ethnicity.md) | Ethnicity taxonomy | curator |
| [model/language.md](model/language.md) | Language taxonomy | curator |
| [model/religion.md](model/religion.md) | Religion taxonomy | curator |
| [model/city.md](model/city.md) | Place-not-polis identity | curator |
| [model/source.md](model/source.md) | Sources and provenance | curator, librarians |
| [model/non_polity.md](model/non_polity.md) | Peoples, cultures, collectives, events | curator |
| [model/inheritance.md](model/inheritance.md) | The four claim tables | succession-curator |
| [model/graph.md](model/graph.md) | Candidates vs claims; open succession questions | succession-curator |
| [model/build.md](model/build.md) | Generators, validator, handoffs | build-owner |
| [model/erd.md](model/erd.md) | ERD and example queries; DDL in `erd.sql` and `erd_nofk.sql` | build-owner |
| [model/presentation.md](model/presentation.md) | Pages and routes | ui-designer |
| [model/api.md](model/api.md) | The JSON contract | ui-designer, build-owner |

## Reference

| Doc | Answers | Reader |
|---|---|---|
| [model/succession.md](model/succession.md) | How to read a computed candidate | succession-curator |
| [model/civilization.md](model/civilization.md) | Why civilization is deferred | anyone |
| [model/ideology.md](model/ideology.md) | Ideology vs policy | curator |
| [model/naming.md](model/naming.md) | Id naming and collisions | curator |
| [migration/merge_map.md](migration/merge_map.md) | Panel label to entity id | curator |
| [frontend/succession_graph.md](frontend/succession_graph.md) | Graph page notes | ui-designer |
| [brainstorm/succession/README.md](brainstorm/succession/README.md) | Archived succession design reasoning | succession-curator |

Outside `docs/`: [`../README.md`](../README.md) for people, [`../CLAUDE.md`](../CLAUDE.md) for agents, [`../code/README.md`](../code/README.md) for generators, [`../data/README.md`](../data/README.md) for built files.
