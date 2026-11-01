# API contract: data layer ↔ frontend

This is the contract between layer 3 (built JSON in `data/`) and layer 4 (`server.js` + `public/`). If the JSON shapes below hold, the frontend needs nothing else from the data layer. If a generator changes, section 3 says what it feeds and section 5 says whether the change breaks anyone.

Verified on 2026-10-31 by running `node server.js` (port 3000) against a fresh `data/` (523 polities at the time, 4107 succession edges, 54 territories, 192 dynasties, 29 governments, 72 panels). Row counts below were updated after the non-polity migration (482 polities, 3743 edges). Counts will drift; shapes should not.

## 1. Boundary rule

Layer 4 reads **only** layer 3, and only through the routes in section 2.

- `server.js` loads `data/index.js` once at start-up (`loadDir` / `loadTree`) and serves it from memory. It never reads `csvs/` or `derived/`.
- `public/**` reaches data only via `fetch('/api/...')` (through `cachedFetch` in `public/shared/cache.js`). D3 and fonts are served from `public/shared/`, so no page needs a third-party host. No page fetches a CSV, and none uses `/data/*` or `/api/db`.
- **One exception, by design:** history panels (`panels/**/*.json`, layer 1, authored) are read directly from disk by `server.js` (`/api/panel*`). They are nested and hand-curated, so they have no built form. Treat them as an authored file with its own contract (section 2.9).
- `data/` is gitignored and rebuilt by `npm run make:all`. `server.js` crashes or serves empty arrays if it is missing (`loadDir` returns `[]` for a missing dir). `npm start` runs `make:all` first via `prestart`.

## 2. Routes

All routes are `GET`, return `application/json`, and are read-only. Errors are always `{"error": "<message>"}`. A non-API path that does not exist gets `public/404.html`. There is no auth, pagination, or query-string handling. Unknown `/api/*` paths fall through to Express's default HTML 404 (not JSON).

Nullability convention used below: `?` means the key can be absent (generators only write the key when the CSV cell is non-empty); `| null` means the key is present with value `null`.

### 2.1 `GET /api/polity`: lightweight list

Source: `db.polities`, projected in `server.js`. 482 rows, about 130 KB.

| field | type | notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `start` | integer | always present in current data; BCE negative |
| `end` | integer \| null | `null` = ongoing (41 polities) |
| `ruling_ethnicity` | string \| null | id into ethnicity taxonomy; null for 0 polities today |
| `cultural_language` | string \| null | id into language taxonomy; null for 35 |
| `government` | string \| null | id into `/api/government`; null for 23 |
| `ideology` | `{religion?, government?}` \| null | null for 6 polities (no religion and no government) |
| `territories` | string[] | ids into `/api/territory`; `[]` for 6 polities |

Trimmed example:

```json
{"id":"roman_empire","name":"Roman Empire","start":-27,"end":395,
 "ruling_ethnicity":"roman","cultural_language":"latin",
 "government":"imperial_monarchy","ideology":{"government":"imperial_monarchy"},
 "territories":["anatolia","balkans","britannia","egypt","gaul","iberia","italy","levant","north_africa"]}
```

Note `government` duplicates `ideology.government`. The list **omits** `policies`, `note`, `figures` (see mismatch M1). Consumers: `public/graph.js`, `public/polity/app.js` (index), `public/territory/app.js`, `public/shared/tree.js` (for `/ethnicity/`, `/language/`, `/religion/`), `public/history/app.js` (`id` and `name` only).

### 2.2 `GET /api/polity/:id`: full detail

Source: `data/polity/<id>.json` plus computed `successors` and `predecessors` from `succession/all.json`. 404 `{"error":"Not found"}` for an unknown id. Up to about 15 KB.

Fields of the list route, **except** that `government` is not hoisted (only `ideology.government`), plus:

| field | type | notes |
|---|---|---|
| `policies` | string[]? | from `polity.policies` split on `\|` |
| `note` | string? | free text |
| `figures` | `{id?,name?,role?,years?,significance?}[]`? | from `figure.csv`; `years` is a string like `"714/775"`, not integers |
| `successors` | edge[] | always present, may be `[]` |
| `predecessors` | edge[] | always present, may be `[]` |

`edge` (reduced succession edge): `{id, name, territorial_direction, strength, shared_territories[], same_ethnicity, same_language, same_religion}`. The other `successions` fields (`related_ethnicity`, `shared_territory_count`, `temporal_gap_years`) are dropped. `name` falls back to the id if the other polity is missing.

Example (trimmed): `GET /api/polity/roman_empire`

```json
{"id":"roman_empire","name":"Roman Empire","ruling_ethnicity":"roman","cultural_language":"latin",
 "ideology":{"government":"imperial_monarchy"},"territories":["anatolia","…"],
 "start":-27,"end":395,"policies":["pax_romana","edict_of_milan","edict_of_thessalonica"],
 "successors":[{"id":"western_roman_empire","name":"Western Roman Empire","territorial_direction":"contraction",
   "strength":12,"shared_territories":["balkans","gaul","iberia","italy","north_africa"],
   "same_ethnicity":true,"same_language":true,"same_religion":false}],
 "predecessors":[{"id":"roman_republic","name":"Roman Republic","territorial_direction":"expansion","strength":12,"…":"…"}]}
```

Consumer: `public/polity/app.js` (`/polity/?id=<id>`), which shows the edges in a section labelled computed evidence.

### 2.3 `GET /api/polity/colors`

`{ "<polity_id>": "<ruling_ethnicity id>" | null, … }`, one key per polity. About 16 KB. **No page reads it since 2026-11-02**: history cells no longer carry ethnicity colours. The route stays served. Route order matters: it is registered before `/api/polity/:id`, so a polity with id `colors` would be shadowed.

### 2.4 `GET /api/succession`

Flat array of directed edges (3743, about 1 MB, the biggest payload). Source: `data/succession/all.json`.

| field | type | notes |
|---|---|---|
| `from`, `to` | string | polity ids |
| `territorial_direction` | `"same"\|"expansion"\|"contraction"\|"displacement"\|"unknown"` | counts: 1113 / 738 / 869 / 1019 / 4. Generator defaults empty to `"unknown"` |
| `strength` | integer | computed score; `null` possible if CSV cell empty (0 today) |
| `shared_territories` | string[] | territory ids |
| `shared_territory_count` | integer | |
| `same_ethnicity`, `related_ethnicity`, `same_language`, `same_religion` | boolean | |
| `temporal_gap_years` | integer | |

```json
{"from":"umayyad_caliphate","to":"abbasid_caliphate","territorial_direction":"contraction","strength":15,
 "shared_territories":["arabia","egypt","iran_plateau","khorasan","levant","mesopotamia","north_africa","transoxiana"],
 "shared_territory_count":8,"same_ethnicity":true,"related_ethnicity":false,"same_language":true,"same_religion":false,"temporal_gap_years":0}
```

Consumers: `public/graph.js` and `public/territory/app.js`, both only when the reader asks for computed evidence. **No A/B/C/D type is served** (section 6).

### 2.4a Claims: decided succession

Source: `data/inheritance/` through `db.inheritanceClaims` and `db.inheritanceTermini`. These routes are the only ones that state succession. `/api/succession` and the `successors` and `predecessors` of `/api/polity/:id` are computed candidates, despite their names (`graph.md`), and a page must label them as computed.

- `GET /api/claim`: every claim, 9 today. Fields are those of `inheritance.md` as built by `inheritance.js` (`id, heir_polity_id, source_id, source_type, source_temporal_status, topology, mechanism, legitimacy_mode, exclusivity, temporal_gap_years, provenance, note, axes[], recognition[]`), plus `heir_name` and `source_name`, and `observer_name` on each `recognition` entry. A name falls back to the id. Consumers: `public/graph.js`, `public/index.html`.
- `GET /api/polity/:id/claims`: `{as_heir: claim[], as_source: claim[], termini: {polity_id, axis, year, note}[]}`. All three arrays may be empty, which means not curated. 404 `{"error":"Not found"}` for an unknown id. Consumer: `public/polity/app.js`.

### 2.5 Territory

- `GET /api/territory`: array of all 54 territories (about 55 KB). Consumer: `public/territory/app.js`, which draws bars from `polities[]`, so a bar shows the period held on that territory and not the polity's whole life. Adjoining periods of one polity are drawn as one bar.
- `GET /api/territory/:id`: one object; 404 `{"error":"Not found"}`. No frontend page calls it.

```json
{"id":"egypt","name":"egypt","polity_count":24,
 "polities":[{"polity_id":"old_kingdom_egypt","start_year":-2686,"end_year":-2181},
             {"polity_id":"new_kingdom_egypt","start_year":-1550,"end_year":-1070}]}
```

`polities[].end_year` is **absent** (not null) when the CSV is empty. `name` is currently the lowercase id (`territory.csv` has `name == id`), so it is not display-quality. The list is sorted by `start_year`. `polity_count` counts `polity_territory` rows, not polities, so it is higher than the distinct count on 9 territories (`scandinavia` 9 against 6). The page counts distinct `polity_id`s.

### 2.6 `GET /api/taxonomy/:type`, with `type` in `ethnicity | language | religion`

Flat array of nodes (`parent` is the id of the parent node or `null` for roots; the tree is reconstructed client-side). Unknown type gives 404 `{"error":"Unknown taxonomy type"}`. Sizes: 276 / about 695 / 264 nodes.

Branch node (has children): `{id, name, parent, description|null, founded|null, status|null}` (religion branches also have `founder|null`).
Leaf node: the same, plus a block of placeholder fields that the generators hard-code to `null`/`[]` (ethnicity: `historical_depth, languages, origin_territory, ancestry, social_structure, population, major_regions`; language: `iso6393, glottocode, macro_area, coordinates, scripts, speaker_count`; religion: `founder, founded_region, scriptures, theology, adherent_count, major_regions, sub_sects`). **Leaf and branch shapes differ**, and the placeholder fields carry no data. Do not read them. `population.date` / `speaker_count.date` / `adherent_count.date` are the build year, not a data date. `founded` is text, not a year: 4 ethnicity rows hold descriptive phrases and the other two taxonomies have none, so the page formats it as a year only when it is a whole number. Root names arrive in capitals; `public/shared/tree.js` shows them in title case.

```json
{"id":"christianity","name":"Christianity","parent":"abrahamic_religions","description":null,"founder":null,"founded":null,"status":null}
```

Consumers: `public/shared/tree.js`, configured by `public/ethnicity|language|religion/app.js` (the matching type), and `public/polity/app.js` (display names).

### 2.7 Government

- `GET /api/government`: array of 29 `{id, name, finer_type|null, weber_legitimacy|null, description|null, polity_count}`.
- `GET /api/government/:id`: same plus `polities: [{id, name, start, end}]`; 404 `{"error":"Not found"}`.

Consumer: `public/polity/app.js` reads `id` and `name` of the list for display names. Nothing calls the single route.

### 2.8 Dynasty and figure

- `GET /api/dynasty`: array of `{id, name, ethnicity|null, origin_region|null, polity_count}` (192; 7 have `polity_count` 0).
- `GET /api/dynasty/:id`: `{id, name, ethnicity?, origin_region?, note?, polities?: [{polity_id, start, end, name}]}`, where `polities` is absent when there are no links. `start` and `end` are integer \| null; `name` is added by the server, falling back to the id. 404 `{"error":"Not found"}`.
- `GET /api/figure`: flat array of every polity's figures, `{id?, name?, role?, years?, significance?, polity_id, polity_name}`. Derived from polity JSON, so it has no file of its own.

No frontend page calls any of these.

### 2.9 History panels (authored, not built)

- `GET /api/panel`: `[{id:"<region>/<name>", title, region}]`, 72 entries. Consumer: `public/history/app.js`, which builds its picker from this list, so a new panel file appears with no page change.
- `GET /api/panel/:region/:id`: the raw panel JSON (`{id, title, columns:[{id,name,slots,type?}], rows…}`) via `res.sendFile`; 404 `{"error":"Panel not found"}`. The client calls it as `/api/panel/${region}/${name}` and keeps the choice in the URL as `/history/?panel=<region>/<name>`.
- Cells reference polities by `polity: "<polity_id>"`. 4191 such references exist; 2077 point at ids not in `data/polity/` (1697 unique). The client checks each id against `/api/polity`: a known id gets a link and the tint for linked cells, and an unknown one reads as plain text with no link. This is not an error, but it is where retired or never-created ids surface (section 6).
- A cell may instead hold `ethnicity: "<ethnicity_id>"`, an FK to `ethnicity.csv`, for a people that is not a polity. 57 cells do. An entry has at most one of `polity` and `ethnicity`, and `scripts/validate.js` fails on an unresolved `ethnicity` or on both keys. The client ignores this key today, so these cells render as plain text like a label (`non_polity.md`). A `note` shows on every cell form.
- A cell with only `label` is the intended form for any other non-polity: a culture, collective, event or period. 767 entries are label-only.

Panels are the layer-1 file shape, so a change to the panel JSON schema is a data-owner change that the history page must follow.

### 2.10 Other

- `GET /api/db`: the whole in-memory DB (about 1.8 MB), including the unused empty `provinces: []`. Marked "will deprecate" in `server.js`. No page uses it. Treat as unsupported.
- `GET /data/*`: `server.js` also statically serves the whole `data/` directory (including `data/index.js`). No page uses it. See M5.
- `GET /` and the static pages: `/` → `public/index.html` (home and how to read the data), `/graph.html` + `graph.js` (the one graph), `/polity/?id=`, `/territory/?id=`, `/ethnicity/`, `/language/`, `/religion/`, `/history/`.

## 3. Built files: generator and CSV provenance

All generators are `code/makejson/*.js`, run by `npm run make:all` in the order: taxonomies, territories, polities, `code/generate-successions.js` (writes `derived/`), successions, dynasties, governments. CSV reading goes through `code/lib/csv.js`. Each generator **deletes** its output dir/files first.

| Built file | Generator | Feeds from | Renames and computed fields |
|---|---|---|---|
| `data/polity/<id>.json` | `polities.js` | `polity.csv`, `polity_territory.csv`, `figure.csv` | `id_ruling_ethnicity`→`ruling_ethnicity`; `id_ruling_language`→`cultural_language`; `id_ruling_religion`→`ideology.religion`; `government`→`ideology.government`; `start_year`→`start`; `end_year`→`end` (empty→`null`); `policies` split on `\|`; `note` verbatim. `territories` is **computed** from `polity_territory` (de-duplicated, ordered by first `start_year`). `figures` is **computed** by joining `figure.csv` on `polity_id` (`figure_id`→`id`). Empty cells omit the key. |
| `data/succession/all.json` | `successions.js` | `derived/polity_succession.csv` (written by `code/generate-successions.js` from the polity and territory CSVs) | `from_polity_id`→`from`; `to_polity_id`→`to`; `from_name`/`to_name` dropped; `shared_territories` split on `\|`; `same_*` and `related_ethnicity` become booleans. |
| `data/territory/<id>.json` | `territories.js` | `territory.csv`, `polity_territory.csv` | `polity_count` and `polities[]` **computed** from the junction. `end_year` omitted if empty. |
| `data/inheritance/{claims,terminus}.json` | `inheritance.js` | `inheritance_*.csv`, `axis_terminus.csv` | Axes and recognition nested under each claim. |
| `data/dynasty/<id>.json` | `dynasties.js` | `dynasty.csv`, `polity_dynasty.csv` | `polities[]` from the junction (`start_year`→`start`, `end_year`→`end`), sorted by start. |
| `data/government/<id>.json` | `governments.js` | `government.csv`, `polity.csv` | `polity_count` **computed** by counting `polity.government`. Empty strings become `null`. |
| `data/{ethnicity,language,religion}/…` (tree) | `ethnicities.js`, `languages.js`, `religions.js` via `_taxonomy_from_csv.js` | `ethnicity.csv`, `language.csv`, `religion.csv` (`id,name,parent_id,description,founded`) | `parent_id`→`parent`, re-derived from the directory path by `loadTree`. Branch = `<id>/index.json`, leaf = `<id>.json`. |

Joined in `server.js`, not in `data/`: claim `heir_name`, `source_name` and `observer_name`, polity `successors`/`predecessors`, dynasty `polities[].name`, government `polities`, `/api/figure`, `/api/polity/colors`.

**Not served at all:** the whole provenance layer (`source.csv`, `fact_source.csv`), the `city*` CSVs, `polity.csv` columns none of the generators read, `figure.csv` as its own entity, and the `derived/` panel and entity files. If the frontend wants citations or cities, that needs a new generator and route (breaking-rule 5.2 does not apply to purely additive changes).

## 4. Served but unused, and expected but missing

### Served, never read by any page

- Whole routes: `/api/government/:id`, `/api/dynasty*`, `/api/figure`, `/api/territory/:id`, `/api/polity/colors`, `/api/db`.
- Succession fields: `related_ethnicity`, `shared_territory_count`, `strength` (no page reads it from `/api/succession`), `temporal_gap_years`.
- Polity: `ideology` + `government` duplication in the list.
- Taxonomy leaf placeholders (section 2.6) and `founder`. `status` is shown when present and is null on every row today.

### Real mismatches (found by reading the code and running it)

- **M1. Fixed 2026-11-02.** The `/` detail panel that read fields absent from the list route is gone. The polity entry shows `figures`, `policies` and `note` from `/api/polity/:id`.
- **M2. Fixed 2026-11-02.** The graph no longer reads territories.
- **M3. Territory `name` equals the id** (`"egypt"`), so no page shows it. Every label comes from the id through `placeName` in `public/shared/site.js`.
- **M4. Fixed 2026-11-02.** `public/history/app.js` loads its panel list from `/api/panel`, so all 72 panels are reachable, including the six the old hard-coded list missed: `central_africa/congo`, `east_africa/swahili_coast`, `latin_america/peru`, `oceania/oceania`, `southeast_asia/philippines`, `southern_africa/southern_africa`.
- **M5. Path traversal in `/api/panel/:region/:id`. Fixed 2026-11-01.** An encoded `..` or `/` in a route parameter could read any non-dot `.json` the process could reach, and the server listened on all interfaces. The route now requires the resolved path to stay inside `panels/`, and the server binds to `127.0.0.1`. `/data/*` still exposes all of `data/`, including `index.js`.
- **M6. `/api/polity/colors` is not a function of colours, and nothing reads it.** It returns ethnicity ids. The history page's `ETH_CLASS` table that used them was removed on 2026-11-02, because hashed or tabled colours implied shared identity. The route stays served until someone decides to remove it (section 5).
- **M7. 404 behaviour is inconsistent.** Unknown ids give JSON 404s, but an unknown `/api/...` path gives Express's HTML 404. Pages handle `!res.ok` through `cachedFetch` (`throw new Error("404 Not Found")`) and `renderLoadError` in `public/shared/site.js`. `/polity/` turns a 404 into a not-found page; `/territory/` and `/history/` do the same by checking the id against their list route.

## 5. What is breaking

**Breaking** (a frontend page stops working or silently shows wrong data):

1. Removing or renaming any field or route listed in section 2 that a page reads: `polity.{id,name,start,end,ruling_ethnicity,cultural_language,ideology.religion,ideology.government,territories,policies,note,figures}`; succession `{from,to,same_ethnicity,same_language,same_religion}`; `/api/polity/:id` `successors[]`/`predecessors[]` (`id,name,territorial_direction,strength,shared_territories`, and the `same_*` flags); claim fields in 2.4a; taxonomy `{id,name,parent,description,founded}`; government `{id,name}`; territory `{id,polities[].{polity_id,start_year,end_year}}`.
2. Changing a type: integer years to strings, boolean `same_*` to strings, `end: null` to `0`, `territories` from array to string, `parent` from id to object.
3. Changing the **vocabulary** of `territorial_direction` (the five values `same|expansion|contraction|displacement|unknown`). The polity page words the five values, and a sixth falls back to the `unknown` wording. The territory page no longer colours or words them.
4. Changing id semantics (renaming or retiring a polity, territory, ethnicity, language or religion id). Ids are cross-references across responses and into `panels/`. CLAUDE.md already says ids are never reused. Retiring one also breaks every panel `polity:` reference to it.
5. Changing the taxonomy tree encoding (the `parent` convention), or making ids non-unique.
6. Changing the meaning of `null` vs absent for a field that pages test with `=== undefined` or `in`. Pages treat `null` and absent alike, and `?` fields (`policies`, `note`, `figures`, `end_year`) are currently read with `|| []`/truthiness.

**Not breaking:** adding a field, adding a route, adding a new enum value that no page switches on, adding polities, edges, territories or taxonomy nodes, reordering arrays (no page relies on order except that territory `polities` and polity `territories` are sorted by start, which the territory page re-sorts anyway).

**Rule for a breaking change:** (a) say so in the commit message and update this file in the same commit; (b) ship the new field **alongside** the old one for at least one commit (add, migrate the page, then remove); (c) the frontend change and the generator change land together or the old field stays; (d) run the server and open the affected pages (`/`, `/graph.html`, `/polity/?id=roman_empire`, `/territory/`, `/ethnicity/`, `/language/`, `/religion/`, `/history/`) since no test covers the frontend.

## 6. Current state and open questions

- **Succession type.** The A/B/C/D classification is retired (`graph.md`). **No JSON edge carries it**: `derived/polity_succession.csv` has no such column, `successions.js` copies none, and no `public/` file reads `.type` on an edge. The only classification that reaches the frontend is `territorial_direction` (5 values).
- **What `public/graph.js` uses.** From `/api/polity`: `id, name, start, end`. From `/api/claim`: `heir_polity_id, source_id, heir_name, source_name`. From `/api/succession`, only when the reader asks for computed evidence: `from, to`.
- **Hardcoded polity ids in `public/`.** None found: no polity id string appears in any `public/**/*.js` or `.html` (checked for polity-id literals and for the merged and retired ids, including `kidarites` and `alchon_huns`, which exist as polities today, and `kidarite_kingdom`, which is retired). Hard-coded vocabularies that do exist: one default panel id and a few panel group names in `public/history/app.js`. A renamed panel loses only its group name, or the default if it was the default.
- **Retired polity ids in panels.** Panel cells still reference polity ids that are not in `data/polity/` (2077 of 4191 refs; most were never polities, since panels are sparse by design, but retired and merged ids would also land here). Several panels mention `kidarites` or `alchon` (`central_asia/*`, `south_asia/*`, `persia_central_asia/iran`); those currently resolve. Settled: label-only is the intended form for a non-polity cell (section 2.9), and an unresolved `polity` stays a warning until the remaining ids are triaged.
- **Open:** whether unused routes (`dynasty`, `government`, `figure`, `db`) are kept as public contract or removed; whether territory `name` should become a display name.

## 7. PROPOSED (not implemented): JSON shape check in the build

A small, dependency-free check, `scripts/check-json.js`, appended to `make:all` (or run from `npm test` after the build), would turn section 2 into an executable guard:

- For each of `data/polity/*.json`, `data/succession/all.json`, `data/territory/*.json`, `data/dynasty/*.json`, `data/government/*.json` and the three taxonomy trees, assert required keys and types: for example polity `{id:string, name:string, start:integer, end:integer|null, territories?:string[]}`; succession `{from,to:string, territorial_direction ∈ {same,expansion,contraction,displacement,unknown}, same_*:boolean}`.
- Cross-reference checks: every `from`/`to` is a polity id; every `territories[]` entry is a territory id; every `ruling_ethnicity`, `cultural_language`, `ideology.religion`, `ideology.government` resolves to a node in the matching taxonomy or government table; every taxonomy `parent` exists.
- Optional warning (not failure): panel `polity:` ids missing from `data/polity/`.
- Exit non-zero on any failure, with the file and field named, so a generator change that breaks section 5 fails the build rather than a page.

A hand-rolled check keeps the "no new dependency" stance (the only runtime dependency today is `express`); a JSON Schema validator such as `ajv` would also work if a dependency is acceptable. Neither exists yet.

## 8. How to validate

`npm test` proves the build, not this contract; section 7 is PROPOSED. After a route change, request the route on the running server and compare it with section 2.
