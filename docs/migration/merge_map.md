# Merge Map — Panel Label → Entity ID Resolution

**Consolidated** from the gold-standard curation of the `iran.json`, `china.json`, and
`italy.json` panels (P3.6; commits `e4d33bb`, `d8b414f`, `de8e48b`). This turns manual
curation decisions into reusable rules so `scripts/dedup_and_link.js` can apply them to
the remaining 58 panels (P3.8). The script's `SYNONYM_MAP`, `BUG_FIXES`, and (planned)
`STRIP_LIST` constants are the executable mirror of this document — **keep them in sync.**

> This file supersedes the earlier iran-only merge map. Where the two disagreed, the
> three-panel curation wins (notably `hotak_dynasty`, no `i` — see §3).

## Rule classes

The curations exposed three distinct rule shapes:

| Class | What it does | Where it lives |
|---|---|---|
| **Synonym** | bare-name / variant → canonical polity ID | `SYNONYM_MAP` (§3) |
| **Bug fix** | wrong existing FK → correct FK (label-keyed) | `BUG_FIXES` (§8) |
| **Strip** | ID is a non-polity (event, people, era) — never write as FK | `STRIP_LIST` (§6, to add) |

---

## 1. Qualifier stripping → link to base polity

Trailing qualifiers like `(collapse)`, `(remnant)`, `(consolidating)`, `(briefly)`,
`(continued)`, `(declining)` are stripped; the cell links to the base polity.

| Pattern | → polity ID | Example |
|---|---|---|
| `{Polity} (collapse)` | base | Safavid (collapse) → `safavid_empire` |
| `{Polity} (remnant)` | base | Saffarid (remnant) → `saffarid_dynasty` |
| `{Polity} (consolidating)` | base | Qajar (consolidating) → `qajar_dynasty` |
| `{Polity} (briefly)` | base | Mauryan Empire (briefly) → `maurya_empire` |
| `{Polity} (continued)` | base | Elam (continued) → `elam` |

## 2. Combined labels (`X / Y`) → primary entity

Link to the **first-mentioned** (usually earlier/dominant); the second entity has its
own cell elsewhere. Default to `X` unless `X` is clearly subordinate to `Y`.

| Label | → polity ID | Rationale |
|---|---|---|
| Kushan / Saka | `kushan_empire` | Primary political entity |
| Ghaznavid / Ghurid | `ghaznavid_empire` | Longer rule, primary |
| Chobanid / Jalayirid | `chobanid_dynasty` | First in pair |
| Injuid / Muzaffarid | `injuid_dynasty` | First in pair |
| Kartid / Sarbadaran | `kartid_dynasty` | Primary political power |
| Kidarite / Chionite | `kidarite_kingdom` | Primary name |
| Kura-Araxes / Urartu | `kura_araxes_culture` | Pre-Urartu period |

## 3. Cross-panel synonyms

Full synonym map implemented in `dedup_and_link.js`, applied to all panels.

### Suffix variants (dynasty/empire/sultanate for the same entity)

| Panel ID | → Canonical DB ID |
|---|---|
| `samanid_dynasty` | `samanid_empire` |
| `ghaznavid_dynasty` | `ghaznavid_empire` |
| `safavid_dynasty` | `safavid_empire` |
| `median_empire` | `median_kingdom` |
| `mitanni_kingdom` | `mitanni_empire` |
| `almohad_dynasty` | `almohad_caliphate` |
| `ayyubid_dynasty` | `ayyubid_sultanate` |
| `ghurid_sultanate` / `ghurid` | `ghorid_dynasty` |

### Bare / short / spelling variants → canonical DB ID

| Panel ID | → Canonical DB ID |
|---|---|
| `sassanid` | `sassanid_empire` |
| `ottoman` | `ottoman_empire` |
| `mughal`, `mughal_empire_india` | `mughal_empire` |
| `qing` | `qing_dynasty` |
| `ming` | `ming_dynasty` |
| `tang` | `tang_dynasty` |
| `sui` | `sui_dynasty` |
| `carolingian`, `frankish_kingdom` | `carolingian_empire` |
| `habsburg`, `habsburg_empire` | `habsburg_monarchy` |
| `alexander`, `alexander_the_great` | `macedonian_empire` |
| `prc` | `peoples_republic_of_china` |
| `venice`, `venice_republic` | `republic_of_venice` |
| `il_khanate` | `ilkhanate` |
| `first_turkic_empire` | `first_turkic_khaganate` |
| `roman_empire_pagan`, `roman_empire_christian` | `roman_empire` |
| `inju`, `injuid` | `injuid_dynasty` |
| `ildeguzids`, `eldiguzids` | `eldiguzid_dynasty` |
| `khalji` | `khalji_dynasty` |
| `hotaki`, `hotaki_afghan`, `hotaki_dynasty` | **`hotak_dynasty`** ⚠ |
| `aragonese` (orphan) | `aragonese_sardinia` |

> ⚠ **`hotak_dynasty` (no `i`) is canonical**, per the Iran curation. The earlier map
> had `hotaki_dynasty`; `dedup_and_link.js:108–109` must be updated to the `hotak_`
> form before P3.8.

### NOT synonyms (genuinely different entities — keep separate)

| Panel ID | Existing ID | Why different |
|---|---|---|
| `german_confederation` | `german_empire` | 1815–1866 vs 1871–1918 |
| `russian_republic` | `russian_empire` | 1917 provisional vs tsarist |
| `serbian_kingdom` | `serbian_empire` | Medieval kingdom vs Dušan's empire |
| `german_kingdom` | `german_empire` | Medieval vs 1871 |
| `malwa_kingdom` | `malwa_sultanate` | Hindu vs Muslim states |
| `macedonian_kingdom` | `macedonian_empire` | Kingdom of Macedon vs Alexander's empire |
| `roman_republic` / `roman_empire` / `roman_kingdom` | — | Distinct polities by design |

## 4. Skip categories — no polity ID

| Pattern | Reason |
|---|---|
| `?` | Unknown / blank cell |
| `{People} / {People}` (tribal) | People, not a polity (e.g. Scythian / Saka) |
| `{Power} sphere` / `{Power} influence` | Influence zone, not direct rule |

## 5. Culture entity IDs

Prehistoric/archaeological entities get a `_culture` suffix and belong in the
`cultures` table (P3.12), **not** `polity.csv`.

| Label | → ID |
|---|---|
| Kura-Araxes culture | `kura_araxes_culture` |
| Dalma culture | `dalma_culture` |
| Zayanderud culture | `zayanderud_culture` |
| Helmand culture | `helmand_culture` |
| Oxus / BMAC culture | `bmac_culture` |
| Jiroft culture | `jiroft_culture` |

## 6. Strip list (non-polity IDs — never use as a polity FK)

These describe an **event, people, era, or collective**, not a polity. The
`categorize()` heuristic catches most; the curated panels show specific IDs that
survived and were removed by hand. Add to an explicit `STRIP_LIST` to prevent regression.

**Events / wars / movements**
```
chu_han_contention   xianbei_rising   gothic_war   investiture_controversy
vandal_raids_on_sicily   lombard_league_vs_frederick_barbarossa
guelph_vs_ghibelline   napoleon_annexes_rome   leads_risorgimento
lombardy_1859   garibaldis_expedition_of_the_thousand_1860
five_barbarians_migrating_south
```
**Periods / eras**
```
spring_and_autumn   sixteen_kingdoms   warring_states   italian_renaissance
```
**Peoples / collectives**
```
indigenous_peoples   northern_steppe_peoples   xianyun_quanrong   donghu_yuezhi
various_steppe_peoples   various_mongol_khanates   venetians   greek_colonies
city_communes   austrian_habsburg   qing_court
```
**Combined / multi-polity / sphere labels**
```
chu_wu_yue   later_chu   republics_of_siena   british_india_sphere
```

## 7. New polity stubs

### Iran (26)

| ID | Name | Years | Government |
|---|---|---|---|
| `proto_elamite` | Proto-Elamite | c.3100–2700 BCE | — |
| `lullubi_kingdom` | Lullubi Kingdom | c.2300–1200 BCE | kingdom |
| `anshan_kingdom` | Anshan Kingdom | c.2400–550 BCE | kingdom |
| `marhashi_kingdom` | Marhashi | c.2500–? BCE | kingdom |
| `kassite_babylon` | Kassite Babylon | c.1600–1155 BCE | kingdom |
| `mannai_kingdom` | Mannai Kingdom | c.850–616 BCE | kingdom |
| `gutian_dynasty` | Gutian Dynasty | c.2154–2112 BCE | dynasty |
| `kidarite_kingdom` | Kidarite Kingdom | c.320–467 CE | kingdom |
| `dabuyid_dynasty` | Dabuyid Dynasty | 642–760 | dynasty |
| `bavandid_dynasty` | Bavandid Dynasty | 651–1349 | dynasty |
| `tahirid_dynasty` | Tahirid Dynasty | 821–873 | dynasty |
| `dulafid_dynasty` | Dulafid Dynasty | 840–897 | dynasty |
| `sajid_dynasty` | Sajid Dynasty | 889–929 | dynasty |
| `ziyarid_dynasty` | Ziyarid Dynasty | 930–1090 | dynasty |
| `rawwadid_dynasty` | Rawwadid Dynasty | c.955–1071 | dynasty |
| `kakuyid_dynasty` | Kakuyid Dynasty | 1008–1051 | dynasty |
| `eldiguzid_dynasty` | Eldiguzid Dynasty | 1136–1225 | dynasty |
| `zengid_dynasty` | Zengid Dynasty | 1127–1222 | dynasty |
| `salgurid_dynasty` | Salgurid Dynasty | 1148–1286 | dynasty |
| `kartid_dynasty` | Kartid Dynasty | 1245–1381 | dynasty |
| `khalji_dynasty` | Khalji Dynasty | 1290–1320 | sultanate |
| `chobanid_dynasty` | Chobanid Dynasty | 1335–1357 | dynasty |
| `injuid_dynasty` | Injuid Dynasty | 1325–1353 | dynasty |
| `hormuz_kingdom` | Kingdom of Hormuz | 1300–1622 | kingdom |
| `karkiya_dynasty` | Kar-Kiya Dynasty | 1370–1592 | dynasty |
| `hotak_dynasty` | Hotak Dynasty | 1709–1729 | dynasty |

### China (26) — clean from the start

`xia`, `western_zhou`, `eastern_zhou`, `ba_shu`, `xin`, `xuan_han`, `eastern_han`,
`shun`, `former_qin`, `liu_song`, `southern_qi`, `liang`, `chen`, `wu_zhou`,
`huan_chu`, `later_tang`, `later_zhou`, `southern_ming`, `kingdom_of_tungning`,
`taiping_heavenly_kingdom`, `chinese_empire`, `beiyang_government`,
`nationalist_government`, `wuhan_government`, `wang_jingwei_regime`,
`chinese_soviet_republic`.

### Italy (47) — restored after the `1e6620b` refactor wiped them (from `de8e48b`)

After restoration, italy.json's FK orphans drop to 14 culture/peoples entries
(P3.12-deferred), as the original curation predicted.

> The Apr-23 refactor `1e6620b` also renamed six Iran bare-name stubs to add
> `_kingdom`/`_dynasty` suffixes (`anshan`→`anshan_kingdom`, `lullubi`→`lullubi_kingdom`,
> `mannai`→`mannai_kingdom`, `marhashi`→`marhashi_kingdom`, `kidarite`→`kidarite_kingdom`,
> `kar_kiya_dynasty`→`karkiya_dynasty`). Panel FKs were already remapped, so this is a
> no-op at the panel level; the synonyms above cover any lingering old references.

## 8. Bug fixes (label → corrected FK)

Keyed by label text so they fire only on the offending cell.

| Label | Wrong FK | Correct FK | Panel |
|---|---|---|---|
| `Dabuyid Dynasty` | `buyid_dynasty` | `dabuyid_dynasty` | iran |

## 9. Verification snapshot

After applying the merge map + Italy restoration:

| Panel | Total FKs | Orphan FKs | Orphan kind |
|---|---|---|---|
| italy.json | 115 | 16 | `*_culture` / `*_peoples` only |
| iran.json | 138 | 9 | `*_culture` only |
| china.json | 83 | 3 | `*_culture` only |

All non-culture orphans resolved; the remainder is the P3.12 cultures backlog.

## 10. Resolution decisions to preserve (do not re-litigate)

- **Hohenstaufen variants stay separate** (`hohenstaufen` vs `hohenstaufen_sicily`) per
  the `cao_wei` / `northern_wei` precedent in [`../model/naming.md`](../model/naming.md).
- **Kingdom of Sicily variants stay separate** — `kingdom_of_sicily` (1282–1816) vs
  `aragonese_kingdom_of_sicily` (1282–1409): different end dates and succession chains.
- **Republican-era China granularity is intentional** — Beiyang, Nationalist, Wuhan,
  Wang Jingwei as distinct polities (parallels Iran's Mahabad / Azerbaijan treatment).

## Application path (P3.8)

1. Update `SYNONYM_MAP` in `dedup_and_link.js`: fix `hotaki` / `hotaki_afghan` →
   `hotak_dynasty`; add `aragonese` → `aragonese_sardinia`.
2. Add a `STRIP_LIST` set keyed by ID (§6). In `resolveLabel()`, if the existing
   `polity` field is in the strip list, delete it instead of preserving it.
3. `node scripts/dedup_and_link.js --dry-run` and review the diff for the 58 uncurated panels.
4. Run for real, then re-validate FK integrity with `scripts/validate.js`.

## Source commits

- `e4d33bb` — iran.json (24 stubs, hotak typo fix, british_india_sphere strip)
- `d8b414f` — china.json (26 stubs, 14 narrative-label strips)
- `de8e48b` — italy.json (44 stubs, 15 narrative-label strips, aragonese fix)
- `2a28d09` — government taxonomy remap (27-type) — orthogonal to merge map
- `7dc9a72` — linker fix to only write resolved polity FKs
