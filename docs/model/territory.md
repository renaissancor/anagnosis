# Territory

Table contract for `csvs/territory.csv`.

**Snapshot:** every count below was measured on 2026-10-31 at commit `ac64f59` using `code/lib/csv.js`.

**Labels:** **Decided** is a recorded rule. **PROPOSED** is a suggestion in this doc and not a current rule. **OPEN** is undecided; section 7 numbers these.

---

## 1. Purpose

One row is one macro geographic zone: a stable, named stage on which polities come and go over time.

A territory is not a polity, a modern country or a border. It has no dates of its own. It accumulates holders through `polity_territory.csv`. Its main job is to let `code/generate-successions.js` find polities that held the same ground.

---

## 2. Admission test

**Decided:**

- A row earns its place through inbound references (`CLAUDE.md`, `city.md` Scope Discipline). No `polity_territory` row pointing at it, no territory row.
- Territories are macro zones (`ARCHITECTURE.md`, `data-model.md`). Nothing states how macro.

**Test for a new row (PROPOSED).** Add a row only if all of these are true:

1. At least one polity needs it, and no existing zone fits without misplacing that polity. Check the list in section 7 first.
2. It is a geographic region that stays meaningful across periods, such as a basin, plateau, peninsula or steppe, and not one state's name.
3. It would hold more than one polity over time, or fills a gap with no nearby zone.
4. It does not nest inside an existing zone. If it does, raise it first (OPEN 2).

**What does not belong:**

| Thing | Do instead |
|---|---|
| A city or site | `city.csv` |
| A polity's province, theme or colony | A row in `polity.csv` with `government = province` or `colonial_administration`, placed on an existing zone |
| A panel column, such as `lesser` in the Poland panel | Stays in the panel. Panel columns are not linked to territories |
| A modern country, for its own sake | Use the geographic zone |
| A polygon or border | Not modelled. Borders are reference data in Cliopatria |

---

## 3. Columns

Header: `id,name`

```csv
yellow_river,yellow_river
```

| Column | Type | Required | Meaning and how to decide | Empty means | Example |
|---|---|---|---|---|---|
| `id` | snake_case text, primary key | yes | Stable id, referenced by `polity_territory.territory_id` | never empty | `iran_plateau` |
| `name` | text | not enforced | Display name. In all 54 rows it is an exact copy of `id`, so the API and JSON show the snake_case string. Copy that form for a new row until OPEN 4 is settled | no row has it empty | `iran_plateau` |

The table has no description, parent, geometry, region or date column. The extent of each zone is written down nowhere. It is known only from the name and from the polities placed on it.

---

## 4. Identity and naming

**Forming an id.** Use snake_case of a geographic name. Ids are permanent and never reused (`naming.md` gives this for all entities; it has no territory section). No territory id has been retired.

**Shared id strings.** An id string may also appear in another namespace, and these are separate things:

- `hungary` and `kievan_rus` are both territory ids and polity ids.
- 12 panels share an id with a territory: `anatolia`, `arabia`, `caribbean`, `egypt`, `germany`, `hungary`, `iberia`, `italy`, `levant`, `manchuria`, `poland`, `scandinavia`. A panel is not linked to the territory by that id.
- `italy` is retired as a polity but is live as a territory and a panel.

**Split or merge.** There is no rule. Either one rewrites `polity_territory` rows and changes computed succession edges, so raise it with the owner first. The polity split rule (`polity.md` section 4) does not apply to territories.

---

## 5. Sources and citation

A territory is this project's own construct, so a hand-made row needs no `fact_source` row (`source.md`).

`csvs/` is the source of truth. Sources are cited, never imported.

| Question | Ask |
|---|---|
| Which polities held this area, and when? Use it to test whether a proposed zone is useful | `source-cliopatria` |
| Ancient place names and locations | `source-pleiades` |
| The name or period of a region as scholars use it | `source-periodo` |
| Is there an established name for this region? | `source-wikipedia`, for linked articles only |

Do not import a source's polygons or region list.

---

## 6. Validation

Run `node scripts/validate.js`. `npm test` runs `make:all` first.

**Enforced as errors:**

- header matches exactly; no ragged rows
- `id` non-empty and unique
- every `polity_territory.territory_id` resolves
- every `shared_territories` value in `derived/polity_succession.csv` resolves

**Convention only, not checked:**

- `name` is present
- every territory has an inbound row (all 54 do)
- `dynasty.origin_region` is a territory id. It is free text with no foreign key
- zones do not nest or overlap

---

## 7. Current state and open questions

### All 54 zones

Each entry gives the `polity_territory` row count and the earliest `start_year`. The grouping is for reading only; it is not in the data.

| Group | Zones |
|---|---|
| Mediterranean and Europe | `italy` 53 (-753); `balkans` 34 (-808); `hungary` 12 (350); `germany` 11 (486); `iberia` 11 (-509); `gaul` 9 (-509); `bohemia` 8 (833); `scandinavia` 9 (872); `britannia` 5 (-27); `poland` 5 (966); `prussia` 5 (1230); `lithuania` 4 (1236); `aquitaine` 3 (486); `scotland` 3 (843); `ireland` 1 (1801) |
| Eastern Europe and steppe | `kievan_rus` 11 (882); `pontic_steppe` 9 (350); `central_asian_steppe` 28 (-300); `mongolian_plateau` 14 (-209) |
| Near East and Iran | `iran_plateau` 47 (-2700); `levant` 35 (-2334); `mesopotamia` 33 (-2900); `caucasus` 19 (-860); `anatolia` 16 (-1600); `arabia` 14 (-1200); `khorasan` 34 (-550); `transoxiana` 28 (-550) |
| Africa | `north_africa` 27 (-814); `egypt` 24 (-2686); `nubia` 15 (-2686) |
| South Asia | `deccan` 23 (-322); `ganges_plain` 20 (-345); `indus_valley` 20 (-322); `punjab` 19 (-322) |
| East Asia | `yellow_river` 38 (-2070); `yangtze` 35 (-1200); `manchuria` 14 (-37); `korean_peninsula` 11 (-57); `japanese_archipelago` 11 (250); `okinawa` 1 (1429) |
| Americas | `andes` 15 (550); `caribbean` 11 (1492); `mesoamerica` 8 (-500); `us_south` 9 (1513); `patagonia` 8 (1400); `us_east` 7 (1450); `amazonia` 5 (1500); `us_midwest` 4 (1534); `us_west` 3 (1521); `quebec` 3 (1534); `atlantic_canada` 3 (1534); `western_canada` 3 (1670); `alaska` 2 (1733) |
| Pacific | `hawaii` 3 (1776) |

### Known problems

**Gaps.** No zone exists for Southeast Asia, Africa south of `nubia` and `north_africa`, Tibet, Sri Lanka, Oceania beyond `hawaii`, or Australia. As a result:

- `funan`, `khmer_empire`, `majapahit_empire`, `brunei_sultanate` and `sulu_sultanate` have no territory row and so no territorial edges. `kingdom_of_tungning` (Taiwan) has none either.
- `nubia` is a catch-all. Its 15 rows include `aksumite_kingdom`, `solomonic_dynasty`, `kanem_empire`, `darfur_sultanate`, `punt` and `italian_east_africa`.
- `tibetan_empire` sits on `central_asian_steppe`.
- In `scripts/generate_stubs.js`, the panel regions `southeast_asia`, `central_africa`, `southern_africa` and `west_africa` map to no territory, so stubs from them have none.

**Nesting and overlap.** Zones are not a partition. Several look nested or overlapping, and many polities hold both sides:

| Pair | Polities holding both |
|---|---|
| `iran_plateau` / `khorasan` | 18 |
| `indus_valley` / `punjab` | 13 |
| `central_asian_steppe` / `transoxiana` | 12 |
| `balkans` / `hungary` | 6 |
| `north_africa` / `egypt` | 6 |
| `germany` / `prussia` | 4 |
| `kievan_rus` / `pontic_steppe` | 4 |
| `gaul` / `aquitaine` | 3 |

Each shared zone feeds the computed succession edges, so a double-counted area may inflate `shared_territory_count`.

**Mixed naming principles.** `yellow_river` and `deccan` are physical geography. `germany`, `poland` and `hungary` are modern countries. `kievan_rus` is a polity name. `us_south`, `quebec` and `alaska` are modern administrative units, with `us_south` starting at 800 CE. `italy` as a territory means the peninsula and has nothing to do with `kingdom_of_italy`, though nothing states this.

**Scale.** `us_midwest` and `aquitaine` sit beside `central_asian_steppe` and `arabia`. Detail follows where the panels were richest, not any stated scale.

**Unmatched region strings.** `dynasty.origin_region` matches a territory id in 138 of 192 rows. The other 54 use `east_africa`, `india`, `japan`, `korea`, `russia`, `britain`, `tibet` or `southeast_asia`. Those strings suggest where zones are wanted, and show the same places under different names (`japan` for `japanese_archipelago`).

### Open questions for the owner

1. **Which zones to add first** for the gaps above. Southeast Asia and sub-Saharan Africa block whole panels. Should `nubia` be split at the same time?
2. **Is the table a flat list or a hierarchy?** Should overlap be removed, or should a `parent_id` be added to match the taxonomy tables? Until then, should a polity on `khorasan` also hold `iran_plateau`?
3. **What is a zone's extent?** Nothing defines any border, so two curators can disagree on where `gaul` ends. Should the table gain a one-line description column? That would need the full change list in `ARCHITECTURE.md`.
4. **What should `name` be?** All 54 rows copy the id. Should it become a display name, such as `Yellow River`?
5. **What naming principle applies?** Should modern-country and polity-named ids such as `germany` and `kievan_rus` stay? Renaming conflicts with the rule that ids are permanent.
6. **What scale counts as macro?** Is there a target number of zones, and may a zone be as small as `okinawa`?
