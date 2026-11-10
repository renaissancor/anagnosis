# Polity–Dynasty Junction

## Purpose

The `polity_dynasty.csv` table maps **which dynasty ruled which polity and when**. It is a many-to-many junction table that connects the `polity` and `dynasty` entities.

---

## Schema

```csv
polity_id,dynasty_id,start_year,end_year
ottoman_empire,ottoman,1299,1922
golden_horde,borjigin,1227,1502
yuan_dynasty,borjigin,1271,1368
```

| Field | Type | Required | Description |
|---|---|---|---|
| `polity_id` | ref → polity.csv | yes | The polity being ruled |
| `dynasty_id` | ref → dynasty.csv | yes | The ruling dynasty |
| `start_year` | integer (year, negative = BC) | yes | Year this dynasty began ruling this polity |
| `end_year` | integer (year) | no | Year this dynasty stopped ruling (empty = ongoing) |

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
- **5 rows** sit on a polity whose `government` is not on that list: `hasmonean_dynasty`, `almoravid_dynasty` and `teutonic_order` (`theocracy`), `hephthalites` (`tribal_confederation`) and `japanese_korea` (`colonial_administration`). The last two break validation rule 5 as written; the three `theocracy` rows break it only if that list is the definition. See the open questions

---

## Date Semantics

The `start_year` and `end_year` fields represent when a dynasty held power in a specific polity, **not** the dynasty's overall lifespan:

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
3. `start_year` must be earlier than `end_year` (when `end_year` is present)
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
- **Rule 5 and its 5 rows** (ledger item 28, measured 2026-11-10). Rule 5 does not say which `government` values count as non-monarchical. The only written lists are the "Zero dynasties" line under Cardinality (republics, communist states, tribal confederations), the table in `dynasty.md` under "When a Polity Has No Dynasty" (which adds `colonial_administration` and says "typically"), and the monarchical ids listed in the `polity.md` section 7 count of polities with no row. `theocracy` is on none of the three. So `hephthalites` and `japanese_korea` break the rule as written, while the three `theocracy` rows break it only if the `polity.md` list is the definition. Proposal for the owner, not adopted: make rule 5 name the excluded `government` ids, and decide whether `theocracy` is among them. No row was changed. Each row needs one of three outcomes: a rule exception, a new `government` value on the polity, or deletion of the junction row.
  - `almoravid_dynasty,almoravid,1040,1147` (`theocracy`). The Wikipedia article (https://en.wikipedia.org/w/index.php?title=Almoravid_dynasty&oldid=1382195230) calls it a "Berber Muslim dynasty" in its lead, and mentions the title Amir al-Muslimin once, for one ruler (Ali bin Yusuf bin Tashfin, in a quotation about an emissary to Baghdad in 498/1104). It does not say that the line held the title. The lead supports the junction row, so the likely fix is the `government` value. It was not made, for three reasons. Wikidata Q75613 has P122 = Q7269, and the label of Q7269 was not available. The article is not citable in `fact_source.csv`, because `source.csv` registers only `wikidata`. The choice among `emirate`, `sultanate` and `monarchy` falls under `polity.md` open question 5. What settles it: the label of Q7269, and an owner choice of the id.
  - `hasmonean_dynasty,hasmonean,-164,-37` (`theocracy`). Undecided between a wrong `government` value and a rule exception for hereditary theocracies. Wikidata Q496922 is a house-type item with no form of government. The corpus has no article, and says only "Hasmonean kingdom" and "Hasmonean prince" in passing. What settles it: a source that gives the form of government of the Hasmonean state, and whether and when the house held a royal title. The row starts in -164 and the polity in -140.
  - `teutonic_order,teutonic,1224,1525` (`theocracy`). Undecided between deleting the row and a rule exception. The note on the `teutonic` row in `dynasty.csv` says only "Grand Masters of the Teutonic Order". If that is an office and not a family, the dynasty row itself may fail `dynasty.md`. The corpus mentions a last grand master who secularised the state in 1525 (Kingdom of Prussia record) and "Hermann of Salza, Grand Master of the Teutonic Knights" in 1227 (Kingdom of Jerusalem record). Neither says how grand masters were chosen. What settles it: a source on how grand masters were chosen. If they were elected, both the junction row and the dynasty row go. The row starts in 1224 and the polity in 1230.
  - `hephthalites,hunnic,440,670` (`tribal_confederation`). Undecided between a wrong `government` value (if the Hephthalites had hereditary kings), deleting the row, and a wrong dynasty: `hunnic` is "Attila's ruling clan" in `dynasty.csv`, and no source ties that clan to the Hephthalites. The corpus calls them "White Huns" (Sasanian and Gupta records), as does the note on the polity row; that is the probable origin of the tag. Wikidata Q26576 has no form of government and the corpus has no article. What settles it: a source that names the Hephthalite ruling house and the form of rule. The row ends in 670 and the polity in 560; Q26576 P576 is 670, which matches the junction row and disagrees with the polity row.
  - `japanese_korea,imperial_yamato,1910,1945` (`colonial_administration`). Undecided between deleting the row and a rule exception for a colony whose sovereign is a dynastic monarch. The `government` value is not in doubt. `dynasty.md` says a colony is "ruled by distant metropolitan civilization" and typically has no entry. The other 21 `colonial_administration` polities have no row, so this row is the only one of its kind. No source is needed; this is an owner decision on the rule.
- Which house ruled `sulu_sultanate` and `brunei_sultanate`, from when, and by what source? Both have no row since 2026-11-10. Wikidata Q7375069 "Royal House of Sulu" exists as a lead, but it gives no reign and no dates. The Wikipedia corpus has no Brunei article.

## Decision log

- 2026-11-10: `hashemite` removed from `brunei_sultanate` and `sulu_sultanate` (ledger item 26). Neither Wikidata item has a dynasty statement, and the Sulu article never uses the word; its founder's name, Sharif ul-Hashim, is the probable origin of the tag. No replacement was written, because no source confirms a reign.
- 2026-11-10: schema block, field table and prose now use the CSV header `start_year,end_year` (ledger item 28). The validator, the DDL and the loader already used it. The 5 rows on a polity outside the `polity.md` monarchical list were measured and left unchanged. Two break rule 5 as written, and the three `theocracy` rows break it only if that list is the definition; see the open questions.
