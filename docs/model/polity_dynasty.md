# Polity–Dynasty Junction

## Purpose

The `polity_dynasty.csv` table maps **which dynasty ruled which polity and when**. It is a many-to-many junction table that connects the `polity` and `dynasty` entities.

---

## Schema

```csv
polity_id,dynasty_id,start,end
ottoman_empire,ottoman,1299,1922
golden_horde,borjigin,1227,1502
yuan_dynasty,borjigin,1271,1368
```

| Field | Type | Required | Description |
|---|---|---|---|
| `polity_id` | ref → polity.csv | yes | The polity being ruled |
| `dynasty_id` | ref → dynasty.csv | yes | The ruling dynasty |
| `start` | integer (year, negative = BC) | yes | Year this dynasty began ruling this polity |
| `end` | integer (year) | no | Year this dynasty stopped ruling (empty = ongoing) |

---

## Cardinality

| Relationship | Example |
|---|---|
| One polity → one dynasty | Ottoman Empire → House of Osman |
| One polity → many dynasties | Byzantine Empire → Justinian, Macedonian, Komnenoi, Palaiologoi |
| One dynasty → many polities | Borjigin → Mongol Empire, Yuan, Golden Horde, Chagatai, Il-Khanate |
| Zero dynasties | Republics, communist states, tribal confederations |

---

## Current Coverage

- **274 rows** mapping polities to dynasties (measured 2026-11-10)
- **273 unique polities**; `tokugawa_shogunate` has two rows. 268 of them are among the 349 polities whose `government` is monarchical by the `polity.md` section 7 list, so 81 monarchical polities have no row
- **186 unique dynasties** referenced (of 192 defined in dynasty.csv)
- Non-monarchical polities (republics, communist states, confederations) have no rows

---

## Date Semantics

The `start` and `end` fields represent when a dynasty held power in a specific polity, **not** the dynasty's overall lifespan:

```csv
# The Borjigin clan existed before 1206 and descendants exist today,
# but they ruled the Mongol Empire only from 1206 to 1368
mongol_empire,borjigin,1206,1368
```

When a polity has multiple sequential dynasties, their date ranges should be non-overlapping and ideally contiguous:

```csv
# Sequential dynasties within one polity
kingdom_of_england,plantagenet,1154,1399
kingdom_of_england,lancaster,1399,1461
kingdom_of_england,york,1461,1485
kingdom_of_england,tudor,1485,1603
```

---

## Validation Rules

1. Every `polity_id` must exist in `polity.csv`
2. Every `dynasty_id` must exist in `dynasty.csv`
3. `start` must be earlier than `end` (when end is present)
4. For a given polity, dynasty date ranges should not overlap
5. Polities with non-monarchical government types should not appear

---

## Related Files

| File | Relationship |
|---|---|
| `csvs/polity.csv` | Parent entity (the polity being ruled) |
| `csvs/dynasty.csv` | Parent entity (the ruling dynasty) |
| `derived/polity_succession.csv` | Succession edges (computed) — dynasties add a genealogical dimension |
| `csvs/polity_territory.csv` | Analogous junction: polity × territory × time |

## Open questions

- `punt,aksumite,-2500,-1069` looks wrong (`non_polity.md` section 5).
- Which house ruled `sulu_sultanate` and `brunei_sultanate`, from when, and by what source? Both have no row since 2026-11-10. Wikidata Q7375069 "Royal House of Sulu" exists as a lead, but it gives no reign and no dates. The Wikipedia corpus has no Brunei article.

## Decision log

- 2026-11-10: `hashemite` removed from `brunei_sultanate` and `sulu_sultanate` (ledger item 26). Neither Wikidata item has a dynasty statement, and the Sulu article never uses the word; its founder's name, Sharif ul-Hashim, is the probable origin of the tag. No replacement was written, because no source confirms a reign.
