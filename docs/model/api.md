# API contract: data layer ↔ frontend

This is the contract between layer 3 (built JSON in `data/`) and layer 4 (`server.js` + `public/`). If the JSON shapes below hold, the frontend needs nothing else from the data layer. If a generator changes, section 3 says what it feeds and section 5 says whether the change breaks anyone.

Verified on 2026-10-31 by running `node server.js` (port 3000) against a fresh `data/` (523 polities, 4107 succession edges, 54 territories, 192 dynasties, 29 governments, 72 panels). Counts will drift; shapes should not.

## 1. Boundary rule

Layer 4 reads **only** layer 3, and only through the routes in section 2.

- `server.js` loads `data/index.js` once at start-up (`loadDir` / `loadTree`) and serves it from memory. It never reads `csvs/` or `derived/`.
- `public/**` reaches data only via `fetch('/api/...')` (through `cachedFetch` in `public/shared/cache.js`). No page fetches a CSV, and none uses `/data/*` or `/api/db`.
- **One exception, by design:** history panels (`panels/**/*.json`, layer 1, authored) are read directly from disk by `server.js` (`/api/panel*`). They are nested and hand-curated, so they have no built form. Treat them as an authored file with its own contract (section 2.9).
- `data/` is gitignored and rebuilt by `npm run make:all`. `server.js` crashes or serves empty arrays if it is missing (`loadDir` returns `[]` for a missing dir). `npm start` runs `make:all` first via `prestart`.

## 2. Routes

All routes are `GET`, return `application/json`, and are read-only. Errors are always `{"error": "<message>"}`. There is no auth, pagination, or query-string handling. Unknown `/api/*` paths fall through to Express's default HTML 404 (not JSON).

Nullability convention used below: `?` means the key can be absent (generators only write the key when the CSV cell is non-empty); `| null` means the key is present with value `null`.

### 2.1 `GET /api/polity`: lightweight list

Source: `db.polities`, projected in `server.js`. 523 rows, about 140 KB.

| field | type | notes |
|---|---|---|
| `id` | string | |
| `name` | string | |
| `start` | integer | always present in current data; BCE negative |
| `end` | integer \| null | `null` = ongoing (41 polities) |
| `ruling_ethnicity` | string \| null | id into ethnicity taxonomy; null for 0 polities today |
| `cultural_language` | string \| null | id into language taxonomy; null for 57 |
| `government` | string \| null | id into `/api/government`; null for 27 |
| `ideology` | `{religion?, government?}` \| null | null for 6 polities (no religion and no government) |
| `territories` | string[] | ids into `/api/territory`; `[]` for 6 polities |

Trimmed example:

```json
{"id":"roman_empire","name":"Roman Empire","start":-27,"end":395,
 "ruling_ethnicity":"roman","cultural_language":"latin",
 "government":"imperial_monarchy","ideology":{"government":"imperial_monarchy"},
 "territories":["anatolia","balkans","britannia","egypt","gaul","iberia","italy","levant","north_africa"]}
```

Note `government` duplicates `ideology.government`. The list **omits** `policies`, `note`, `figures` (see mismatch M1). Consumers: `public/app.js` (index graph), `public/graph.html`, `public/polity/app.js` (search box), `public/territory/app.js`, `public/ethnicity|language|religion/app.js`.

### 2.2 `GET /api/polity/:id`: full detail

Source: `data/polity/<id>.json` plus computed `successors` and `predecessors` from `succession/all.json`. 404 `{"error":"Not found"}` for an unknown id. About 7 KB for large polities.

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

Consumer: `public/polity/app.js` (`/polity/?id=<id>`).

### 2.3 `GET /api/polity/colors`

`{ "<polity_id>": "<ruling_ethnicity id>" | null, … }`, one key per polity. About 16 KB. Consumer: `public/history/index.html` (colours panel cells). Route order matters: it is registered before `/api/polity/:id`, so a polity with id `colors` would be shadowed.

### 2.4 `GET /api/succession`

Flat array of directed edges (4107, about 1.1 MB, the biggest payload). Source: `data/succession/all.json`.

| field | type | notes |
|---|---|---|
| `from`, `to` | string | polity ids |
| `territorial_direction` | `"same"\|"expansion"\|"contraction"\|"displacement"\|"unknown"` | counts: 1316 / 818 / 961 / 1046 / 4. Generator defaults empty to `"unknown"` |
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

Consumers: `public/app.js`, `public/graph.html`, `public/territory/app.js`. **No A/B/C/D type is served** (section 6).

### 2.5 Territory

- `GET /api/territory`: array of all 54 territories (about 59 KB). Consumers: `public/app.js` (filter labels), `public/territory/app.js`.
- `GET /api/territory/:id`: one object; 404 `{"error":"Not found"}`. No frontend page calls it.

```json
{"id":"egypt","name":"egypt","polity_count":24,
 "polities":[{"polity_id":"old_kingdom_egypt","start_year":-2686,"end_year":-2181},
             {"polity_id":"new_kingdom_egypt","start_year":-1550,"end_year":-1070}]}
```

`polities[].end_year` is **absent** (not null) when the CSV is empty. `name` is currently the lowercase id (`territory.csv` has `name == id`), so it is not display-quality. The list is sorted by `start_year`.

### 2.6 `GET /api/taxonomy/:type`, with `type` in `ethnicity | language | religion`

Flat array of nodes (`parent` is the id of the parent node or `null` for roots; the tree is reconstructed client-side). Unknown type gives 404 `{"error":"Unknown taxonomy type"}`. Sizes: 269 / about 695 / 264 nodes.

Branch node (has children): `{id, name, parent, description|null, founded|null, status|null}` (religion branches also have `founder|null`).
Leaf node: the same, plus a block of placeholder fields that the generators hard-code to `null`/`[]` (ethnicity: `historical_depth, languages, origin_territory, ancestry, social_structure, population, major_regions`; language: `iso6393, glottocode, macro_area, coordinates, scripts, speaker_count`; religion: `founder, founded_region, scriptures, theology, adherent_count, major_regions, sub_sects`). **Leaf and branch shapes differ**, and the placeholder fields carry no data. Do not read them. `population.date` / `speaker_count.date` / `adherent_count.date` are the build year, not a data date.

```json
{"id":"christianity","name":"Christianity","parent":"abrahamic_religions","description":null,"founder":null,"founded":null,"status":null}
```

Consumers: `public/ethnicity|language|religion/app.js` (the matching type) and `public/app.js` (ethnicity only).

### 2.7 Government

- `GET /api/government`: array of 29 `{id, name, finer_type|null, weber_legitimacy|null, description|null, polity_count}`.
- `GET /api/government/:id`: same plus `polities: [{id, name, start, end}]`; 404 `{"error":"Not found"}`.

No frontend page calls either route.

### 2.8 Dynasty and figure

- `GET /api/dynasty`: array of `{id, name, ethnicity|null, origin_region|null, polity_count}` (192; 7 have `polity_count` 0).
- `GET /api/dynasty/:id`: `{id, name, ethnicity?, origin_region?, note?, polities?: [{polity_id, start, end, name}]}`, where `polities` is absent when there are no links. `start` and `end` are integer \| null; `name` is added by the server, falling back to the id. 404 `{"error":"Not found"}`.
- `GET /api/figure`: flat array of every polity's figures, `{id?, name?, role?, years?, significance?, polity_id, polity_name}`. Derived from polity JSON, so it has no file of its own.

No frontend page calls any of these.

### 2.9 History panels (authored, not built)

- `GET /api/panel`: `[{id:"<region>/<name>", title, region}]`, 72 entries. **Unused**: `public/history/index.html` hard-codes its own `REGIONS` list.
- `GET /api/panel/:region/:id`: the raw panel JSON (`{id, title, columns:[{id,name,slots,type?}], rows…}`) via `res.sendFile`; 404 `{"error":"Panel not found"}`. The client calls it as `/api/panel/${region}/${name}`.
- Cells reference polities by `polity: "<polity_id>"`. 4395 such references exist; 2205 point at ids not in `data/polity/` (1793 unique). The client degrades to the default colour (`eth-default`), so this is not an error, but it is where retired or never-created ids surface (section 6).

Panels are the layer-1 file shape, so a change to the panel JSON schema is a data-owner change that the history page must follow.

### 2.10 Other

- `GET /api/db`: the whole in-memory DB (about 1.8 MB), including the unused empty `provinces: []`. Marked "will deprecate" in `server.js`. No page uses it. Treat as unsupported.
- `GET /data/*`: `server.js` also statically serves the whole `data/` directory (including `data/index.js`). No page uses it. See M5.
- `GET /` and the static pages: `/` → `public/index.html` + `app.js` (succession graph), `/graph.html` (community graph), `/polity/?id=`, `/territory/?id=`, `/ethnicity/`, `/language/`, `/religion/`, `/history/`.

## 3. Built files: generator and CSV provenance

All generators are `code/makejson/*.js`, run by `npm run make:all` in the order: taxonomies, territories, polities, `code/generate-successions.js` (writes `derived/`), successions, dynasties, governments. CSV reading goes through `code/lib/csv.js`. Each generator **deletes** its output dir/files first.

| Built file | Generator | Feeds from | Renames and computed fields |
|---|---|---|---|
| `data/polity/<id>.json` | `polities.js` | `polity.csv`, `polity_territory.csv`, `figure.csv` | `id_ruling_ethnicity`→`ruling_ethnicity`; `id_ruling_language`→`cultural_language`; `id_ruling_religion`→`ideology.religion`; `government`→`ideology.government`; `start_year`→`start`; `end_year`→`end` (empty→`null`); `policies` split on `\|`; `note` verbatim. `territories` is **computed** from `polity_territory` (de-duplicated, ordered by first `start_year`). `figures` is **computed** by joining `figure.csv` on `polity_id` (`figure_id`→`id`). Empty cells omit the key. |
| `data/succession/all.json` | `successions.js` | `derived/polity_succession.csv` (written by `code/generate-successions.js` from the polity and territory CSVs) | `from_polity_id`→`from`; `to_polity_id`→`to`; `from_name`/`to_name` dropped; `shared_territories` split on `\|`; `same_*` and `related_ethnicity` become booleans. |
| `data/territory/<id>.json` | `territories.js` | `territory.csv`, `polity_territory.csv` | `polity_count` and `polities[]` **computed** from the junction. `end_year` omitted if empty. |
| `data/dynasty/<id>.json` | `dynasties.js` | `dynasty.csv`, `polity_dynasty.csv` | `polities[]` from the junction (`start_year`→`start`, `end_year`→`end`), sorted by start. |
| `data/government/<id>.json` | `governments.js` | `government.csv`, `polity.csv` | `polity_count` **computed** by counting `polity.government`. Empty strings become `null`. |
| `data/{ethnicity,language,religion}/…` (tree) | `ethnicities.js`, `languages.js`, `religions.js` via `_taxonomy_from_csv.js` | `ethnicity.csv`, `language.csv`, `religion.csv` (`id,name,parent_id,description,founded`) | `parent_id`→`parent`, re-derived from the directory path by `loadTree`. Branch = `<id>/index.json`, leaf = `<id>.json`. |

Joined in `server.js`, not in `data/`: polity `successors`/`predecessors`, dynasty `polities[].name`, government `polities`, `/api/figure`, `/api/polity/colors`.

**Not served at all:** the whole provenance layer (`source.csv`, `fact_source.csv`), the `city*` CSVs, `polity.csv` columns none of the generators read, `figure.csv` as its own entity, and the `derived/` panel and entity files. If the frontend wants citations or cities, that needs a new generator and route (breaking-rule 5.2 does not apply to purely additive changes).

## 4. Served but unused, and expected but missing

### Served, never read by any page

- Whole routes: `/api/government*`, `/api/dynasty*`, `/api/figure`, `/api/territory/:id`, `/api/panel` (list), `/api/db`.
- Succession fields: `related_ethnicity`, `shared_territory_count`, `strength` (no page reads it from `/api/succession`), `temporal_gap_years` (copied onto graph links in `graph.html`, never displayed or used).
- Polity: `figures[].years`, `figures[].significance` (`app.js` renders figures but only from absent data, see M1). `ideology` + `government` duplication in the list.
- Taxonomy leaf placeholders (section 2.6) and `status`, `founder`.
- Polity edge `strength` and `shared_territories` on `/api/polity/:id` successors: the polity page reads only `name`, `territorial_direction` and the three `same_*` flags.

### Real mismatches (found by reading the code and running it)

- **M1. Detail panel on `/` never shows figures, policies or note.** `public/app.js` `showDetail(polity)` reads `polity.figures`, `polity.policies`, `polity.note`, but the object comes from `/api/polity` (the list), which omits all three. Those sections are always empty on the index page. Fix: either have `showDetail` fetch `/api/polity/:id`, or add the fields to the list (about +150 KB).
- **M2. `graph.html` reads `p.territory || p.territories`.** `territory` (singular) and `capital_territory` do not exist in any response; they are dead fallbacks left over from an older schema. Harmless, since `territories` is served. 6 polities have no territory in `TERRITORY_REGION` and are placed in `Unknown`.
- **M3. Territory `name` equals the id** (`"egypt"`), so UI labels derived from `name` are unformatted. The frontend labels come from the id anyway.
- **M4. `public/history` hard-codes 66 panel ids; 72 panel files exist.** Six panels are unreachable from the UI: `central_africa/congo`, `east_africa/swahili_coast`, `latin_america/peru`, `oceania/oceania`, `southeast_asia/philippines`, `southern_africa/southern_africa`. `/api/panel` would solve this, but nothing calls it. All 66 listed ids resolve to a file.
- **M5. Path traversal in `/api/panel/:region/:id`.** `GET /api/panel/%2e%2e/package` returned 200 with the repository's `package.json` (the route does `path.join(HISTORY_DIR, region/id + '.json')` with no containment check). Any `.json` file one directory above `panels/` is readable. `/data/*` also exposes all of `data/`, including `index.js`. This is a server issue, not a data issue, but it is a real defect in layer 4. Not fixed here (docs-only task).
- **M6. `/api/polity/colors` is not a function of colours.** It returns ethnicity ids, and the history page maps them through its own `ETH_CLASS` table, so any ethnicity id not in that table renders as default. The name `colors` is misleading, and the mapping is frontend-owned.
- **M7. 404 behaviour is inconsistent.** Unknown ids give JSON 404s, but an unknown `/api/...` path gives Express's HTML 404. Pages handle `!res.ok` generically via `cachedFetch` (`throw new Error("404 Not Found")`) and `showError`, with no per-route messages.

## 5. What is breaking

**Breaking** (a frontend page stops working or silently shows wrong data):

1. Removing or renaming any field or route listed in section 2 that a page reads: `polity.{id,name,start,end,ruling_ethnicity,cultural_language,ideology.religion,ideology.government,government,territories}`; succession `{from,to,territorial_direction,shared_territories,same_ethnicity,same_language,same_religion}`; taxonomy `{id,name,parent,description,founded,status}`; territory `{id,name,polities[].{polity_id,start_year,end_year}}`; `/api/polity/:id` `successors[]`/`predecessors[]` (`id,name,territorial_direction`, and the `same_*` flags).
2. Changing a type: integer years to strings, boolean `same_*` to strings, `end: null` to `0` or absent (the pages test `end || 2000`, `end == null`), `territories` from array to string, `parent` from id to object.
3. Changing the **vocabulary** of `territorial_direction` (the pages key CSS classes, colours and filters on the five values `same|expansion|contraction|displacement|unknown`). Adding a sixth value silently falls back to `unknown` styling or disappears from `graph.html`'s filter (it hard-codes the five types).
4. Changing id semantics (renaming or retiring a polity, territory, ethnicity, language or religion id). Ids are cross-references across responses and into `panels/`. CLAUDE.md already says ids are never reused. Retiring one also breaks every panel `polity:` reference to it.
5. Changing the taxonomy tree encoding (the `parent` convention), or making ids non-unique.
6. Changing the meaning of `null` vs absent for a field that pages test with `=== undefined` or `in`. No page does today, but `?` fields (`policies`, `note`, `figures`, `end_year`) are currently read with `|| []`/truthiness.

**Not breaking:** adding a field, adding a route, adding a new enum value that no page switches on, adding polities, edges, territories or taxonomy nodes, reordering arrays (no page relies on order except that territory `polities` and polity `territories` are sorted by start, which the territory page re-sorts anyway).

**Rule for a breaking change:** (a) say so in the commit message and update this file in the same commit; (b) ship the new field **alongside** the old one for at least one commit (add, migrate the page, then remove); (c) the frontend change and the generator change land together or the old field stays; (d) run the server and open the affected pages (`/`, `/graph.html`, `/polity/?id=roman_empire`, `/territory/`, `/ethnicity/`, `/language/`, `/religion/`, `/history/`) since no test covers the frontend.

## 6. Current state and open questions

- **Succession type.** `docs/model/data-model.md` line 40 (`Succession --[type]--> A | B | C | D`) and `docs/model/succession.md` describe an A/B/C/D classification. **No JSON edge carries it**: `derived/polity_succession.csv` has no such column, `successions.js` copies none, and no `public/` file reads `.type` on an edge. The only classification that reaches the frontend is `territorial_direction` (5 values). Both model docs are stale on this point. Open question for the data owner: is the A/B/C/D matrix retired (then fix the docs), or does it return in the redesign (`docs/brainstorm/succession/`)? Until that is decided, the frontend must not rely on it.
- **What `public/graph.html` actually uses.** From `/api/polity`: `id, name, start, end, ruling_ethnicity, government, ideology.religion, territories`. From `/api/succession`: `from, to, territorial_direction, shared_territories, temporal_gap_years` (the last is carried but unused). It derives the macro-region itself from a hard-coded 52-territory-id table (all 52 are valid territory ids today) and computes degree and Louvain communities client-side. It does **not** use `strength`, `same_*`, `related_ethnicity`, or `shared_territory_count`. It also hard-codes the five direction types in its filter, and colour tables keyed by religion and government ids.
- **Hardcoded polity ids in `public/`.** None found: no polity id string appears in any `public/**/*.js` or `.html` (checked for polity-id literals and for the merged and retired ids, including `kidarites` and `alchon_huns`, which exist as polities today, and `kidarite_kingdom`, which is retired). Hard-coded vocabularies that do exist: territory ids (`graph.html`), ethnicity ids (`ETH_CLASS` in `history/index.html`), religion and government ids (colour tables in `graph.html`), panel ids (`history/index.html`). A renamed or retired id in those sets degrades silently to a default colour.
- **Retired polity ids in panels.** Panel cells still reference polity ids that are not in `data/polity/` (2205 of 4395 refs; most were never polities, since panels are sparse by design, but retired and merged ids would also land here). Several panels mention `kidarites` or `alchon` (`central_asia/*`, `south_asia/*`, `persia_central_asia/iran`); those currently resolve. Open question: should `scripts/validate.js` fail on panel references to a missing polity id, or is "label-only" the intended default for non-polity cells?
- **Open:** whether `/api/polity` should carry `policies`/`note`/`figures` (M1), or the index page should fetch the detail; whether unused routes (`dynasty`, `government`, `figure`, `db`) are kept as public contract or removed; whether territory `name` should become a display name.

## 7. PROPOSED (not implemented): JSON shape check in the build

A small, dependency-free check, `scripts/check-json.js`, appended to `make:all` (or run from `npm test` after the build), would turn section 2 into an executable guard:

- For each of `data/polity/*.json`, `data/succession/all.json`, `data/territory/*.json`, `data/dynasty/*.json`, `data/government/*.json` and the three taxonomy trees, assert required keys and types: for example polity `{id:string, name:string, start:integer, end:integer|null, territories?:string[]}`; succession `{from,to:string, territorial_direction ∈ {same,expansion,contraction,displacement,unknown}, same_*:boolean}`.
- Cross-reference checks: every `from`/`to` is a polity id; every `territories[]` entry is a territory id; every `ruling_ethnicity`, `cultural_language`, `ideology.religion`, `ideology.government` resolves to a node in the matching taxonomy or government table; every taxonomy `parent` exists.
- Optional warning (not failure): panel `polity:` ids missing from `data/polity/`.
- Exit non-zero on any failure, with the file and field named, so a generator change that breaks section 5 fails the build rather than a page.

A hand-rolled check keeps the "no new dependency" stance (the only runtime dependency today is `express`); a JSON Schema validator such as `ajv` would also work if a dependency is acceptable. Neither exists yet.
