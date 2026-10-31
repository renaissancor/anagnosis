# Polity–Territory Junction

Table contract for `csvs/polity_territory.csv`. It is the sole authored home of a polity's territory; `polity.csv` has no territory column.

**Snapshot:** every count below was measured on 2026-10-31 at commit `ac64f59` using `code/lib/csv.js`. Merge passes are running and move these rows, so re-measure before acting on a list.

**Labels:** **Decided** is a recorded rule. **PROPOSED** is a suggestion in this doc and not a current rule. **OPEN** is undecided; section 7 numbers these.

---

## 1. Purpose

One row says that one polity held one macro territory for one continuous span of years.

---

## 2. Admission test

No doc defines "held". The junction is described only as "which territory a polity held, when" (`ARCHITECTURE.md`). These parts are settled:

- Both ids must already exist. Add a `territory.csv` row only under `territory.md`.
- Spheres of influence are not direct rule (`merge_map.md` §4), so they earn no row.
- A polity may hold many zones, and many polities may hold one zone at once. Overlap between different polities is normal.
- A span with a gap takes two rows: `scandinavia/kingdom_of_denmark` has 936–1397, 1523–1814 and 1814– .

**Test for a new row (PROPOSED).** Add a row if all of these are true:

1. The polity's own government ruled a substantial part of the zone, by direct rule or by appointing its governors.
2. It lasted long enough to count as rule. A raid, a campaign, or a passing occupation does not qualify.
3. The zone is listed in `territory.csv`. Do not invent a zone to fit a polity.

Tributaries, vassals and personal unions have no rule (OPEN 1).

**What does not belong:**

| Thing | Do instead |
|---|---|
| Influence, trade reach, or a claim never exercised | No row. Put it in `polity.note` if it matters |
| A raid or campaign | No row |
| A capital or city | `city.csv`. There is no polity-to-city link today |
| Territory on a `polity.csv` column | Never. One authored home per fact |
| A hand-edited `derived/polity_succession.csv` edge | Never. Fix the junction row and regenerate |

**A row has consequences.** `code/generate-successions.js` reads this table. It links polities that hold the same territory consecutively, within 150 years, or concurrently. Adding or moving a row therefore adds or removes computed succession edges, and the edge count is expected to move. A polity with no row here gets no territorial edges.

---

## 3. Columns

Header: `territory_id,polity_id,start_year,end_year`

```csv
arabia,ottoman_empire,1517,1918
```

| Column | Type | Required | Meaning and how to decide | Empty means | Example |
|---|---|---|---|---|---|
| `territory_id` | FK → `territory.id` | yes | The zone held. If a polity held parts of several zones, give one row per zone | never empty | `arabia` |
| `polity_id` | FK → `polity.id` | yes | The holder | never empty | `ottoman_empire` |
| `start_year` | integer, BCE negative | yes in practice; part of the key | Year this polity's hold on this zone began. It should fall within the polity's own dates (see section 6) | no row has it empty | `1517`, not the polity's 1299 |
| `end_year` | integer, BCE negative | no | Year the hold ended | **ongoing**: the polity still holds the zone today. Never unknown. It must only appear on a polity that is itself ongoing (PROPOSED; no row breaks this now) | `1918`; `anatolia/republic_of_turkey` is empty |

**How to fill the dates.** Most rows simply repeat the polity's dates: 787 of 858 do, and only 29 polities have a row that differs. Those rows assert the polity held the zone for its whole life, which is usually a default, not a researched claim. When you research a hold, record the real span as the 71 others do (`egypt/byzantine_empire` 395–641).

A zero-length span (`start_year = end_year`) is valid. Five rows have one, all for short-lived polities such as `shun`.

---

## 4. Identity and naming

There is no id. A row's key is `territory_id`, `polity_id`, `start_year`, in that order in `scripts/validate.js`. `fact_source` uses that order joined with `|`, for example `italy|kingdom_of_italy|1861`. `erd.sql` lists the same key with `polity_id` first.

**Second row or longer row?** Extend the existing row when the hold was continuous. Add a row only when there was a real gap.

**When a polity splits:** cut its rows at the split year (`polity.md` section 4). Each child gets rows within its own dates.

**When a polity id is retired:** repoint its rows to the surviving id. Two rows may then collide on the key or overlap, so combine them.

**The split rule does not apply here.** Territorial extent never creates a polity. A change in holdings is just a change in these rows.

---

## 5. Sources and citation

`csvs/` is the source of truth. Sources are cited, never imported, and if one disagrees with this table the row stands until a person edits it.

| Question | Ask |
|---|---|
| Did this polity hold roughly this area in this year? This is the main source for this table. Its polygons show one version of disputed borders | `source-cliopatria` |
| When was the zone conquered, lost or granted? | `source-wikipedia` |
| Is this the same entity? What dates does it claim? | `source-wikidata` |
| Where exactly was an ancient place? | `source-pleiades` |

Rows written by hand need no provenance row. Add a `fact_source` row when a fact was taken from a source. `entity_table` is `polity_territory`, and `entity_id` is the composite key above.

`wikidata` is the only entry in `source.csv` today, and no `fact_source` row points at this table. To cite Cliopatria, add it to `source.csv` first (`source.md`).

---

## 6. Validation

Run `node scripts/validate.js`. `npm test` runs `make:all` first.

**Enforced as errors:**

- header matches exactly; no ragged rows
- key unique
- `territory_id` and `polity_id` resolve
- `start_year` is an integer when present
- `start_year` <= `end_year`

**Convention only, not checked:**

- `start_year` is present (no row breaks this)
- `end_year` is an integer. The validator does not test it
- a row's years fall inside the polity's years (see below)
- spans of one polity on one zone do not overlap (no row breaks this)
- every polity has at least one row (6 do not)

---

## 7. Current state and open questions

### Counts

| Measure | Value |
|---|---|
| Rows | 858 |
| Polities with at least one row | 517 of 523 |
| Territories used | 54 of 54 |
| `end_year` empty | 58 |
| Rows equal to the polity's exact dates | 787 |
| Polities with any row that differs from their dates | 29 |
| Rows per polity | 1 row: 328 polities; 2: 122; 3: 34; 4: 17; 5 or more: 16 |
| Most zones | `roman_empire` has 17 rows; `ottoman_empire`, `umayyad_caliphate` and `mongol_empire` have 9 |

The busiest zones are `italy` (65), `iran_plateau` (49) and `yellow_river` (40). `territory.md` has the full list.

### Rows outside the polity's dates

| Row | Row years | Polity years | Likely reading (not decided) |
|---|---|---|---|
| `kievan_rus/golden_horde` | 1240– | 1242–1502 | Conquest dated before the polity's start |

That is 1 row starting early, and none ending late or open on a closed polity.

The reverse case is fine: `manchuria/republic_of_china` ends in 1932 while its polity is ongoing. Six rows like this exist.

### Other inconsistencies

- **Leftover boundary.** `roman_empire` has two rows on 8 zones (`-27–380` and `380–395`). These remain from the merge of `roman_empire_pagan` and `roman_empire_christian`, and mean nothing under the split rule. `britannia/roman_empire` has only `-27–380`.
- **Personal unions.** `kingdom_of_denmark` and `kingdom_of_sweden` stop at 1397 and resume at 1523 on `scandinavia`, reflecting the Kalmar Union. Norway restarts in 1905 on `modern_norway`.
- **Forced fits.** Zones are missing for parts of the world, so holders are placed in the nearest zone or none. `kanem_empire`, `aksumite_kingdom` and `italian_east_africa` are all on `nubia`, and `tibetan_empire` is on `central_asian_steppe`. Six polities have no row at all: `funan`, `khmer_empire`, `majapahit_empire`, `brunei_sultanate`, `sulu_sultanate`, `kingdom_of_tungning`.
- **Overlap from nested zones.** A polity often holds both a zone and one that looks nested in it, such as `iran_plateau` and `khorasan` (18 polities). See `territory.md`.

### Open questions for the owner

1. **What counts as "held"?** No threshold exists. Do tributaries, vassals, protectorates and personal unions count? Is partial hold enough, given there is no share column?
2. **May a row's years exceed the polity's?** If not, the row above needs fixing and a validator check is possible.
3. ~~`kingdom_of_norway` after 1380.~~ DECIDED: `modern_norway` is a separate polity starting in 1905 (`polity.md` section 8).
4. **Should the Roman `380` boundary be collapsed?** It would reduce `roman_empire` to one row per zone.
5. **Should default-dated rows be flagged?** Nothing separates a researched row from a copied one among the 787, so a reader cannot tell which are real claims.
