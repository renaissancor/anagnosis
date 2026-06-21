# Civilization

> **Status: deliberately deferred.** Civilization is the schema's nominal top tier, but it is **intentionally not defined as a curated entity.** This document records *why*, and what carries its weight in the meantime. Do not write a definition into `civilization.csv` or expand its rows without first reading this file.

## TL;DR

Civilization is **not** a hand-curated tier and **not** the load-bearing structure of CivRegime. It will eventually be a **derived projection over the completed polity graph, parameterized by perspective** — computed, not authored. Until the graph is complete, `civilization.csv` stays a thin provisional stub and `polity.civilization_id` is a sparse, non-authoritative tag.

---

## Why civilization is not defined as an entity

Every attempt to give civilization a single distinctive content collides with an entity that already owns that meaning:

| Candidate meaning | Already owned by |
|---|---|
| Cultural sphere / a people grouped broadly | `ethnicity` (its `parent_id` tree groups peoples) |
| Shared faith / shared tongue | `religion` / `language` |
| "Who continues whom" — claimed succession | the inheritance graph in `polity_succession` |

What's left after removing the redundant senses is intrinsically **fuzzy** — vaguer than ethnicity, with overlapping and graded membership. Three properties make it resist crisp curation:

1. **One polity can hold several civilizations at once.** During the Pax Romana a *single* sovereign state contained both a **Latin/Western** and a **Greek/Eastern** civilization. So civilization is not a partition of polities and cannot be a single-valued `polity.civilization_id`.
2. **Ambiguity is intrinsic, not incidental.** The Latin/Greek seam ran through genuinely bilingual provinces. Greek-pagan → Greek-Orthodox shares a prestige language but breaks on religion. The Persianate tradition sits *inside* the Islamic world. Sinic Japan has the tradition but neither the people nor, by the modern era, the language. There is no anchor that yields an ambiguity-free partition.
3. **It is orthogonal to sovereignty.** "Civilization" is tempting because it sounds like the thing a *modern nation inherits from antiquity* — but that is an **edge** relationship (X claims continuity with Y), and edges live in the inheritance graph. Civilization is a noun that distracts from the verb that does the work.

Forcing a crisp definition would either encode false precision or amputate what makes civilization *civilization*. Both violate the project's FK-driven scoping discipline ("entities earn rows by inbound FKs; no decorative rows").

## What carries its weight instead

- **`ethnicity`** (+ `parent_id` tree) — the cultural / peoplehood layer, with crisp-ish membership.
- **`polity_succession`** — the **inheritance graph**. This is the actual load-bearing structure. The question that motivated civilization ("does modern Turkey / Egypt / Greece inherit X?") is answered here, *per axis* (territorial / ethnic / linguistic / religious / institutional), without the civilization entity.
- **`language` / `religion`** — the prestige-tradition components a civilization projection would later read from.

## The forward path: civilization as a perspective-parameterized projection

Once the polity / territory / succession graph is sufficiently complete, civilization can be **computed** rather than authored — and computed *several ways*, one per perspective. Each lens projects a different set of civilizations from the same graph:

| Lens | Civilization grouping it yields |
|---|---|
| Territorial | regions that stay one cultural zone across rulers |
| Ethnic | peoplehood clusters over time |
| Linguistic / prestige | great-tradition spheres (Latin, Hellenic, Sinic, Persianate, Sanskritic, Arabic) |
| Religious | confessional worlds (Latin-Christendom, Orthodoxy, Dar al-Islam) |
| Institutional | claimed-continuity chains (the inheritance graph's components) |

There is no single "true" civilization map — there are as many as there are lenses, and that plurality is the intended product, not a defect.

## Current data state (provisional — do not treat as authoritative)

- `civilization.csv` holds **2 stub rows** (`roman_civilization`, `ottoman_civilization`) whose `description` encodes a now-rejected institutional-continuity reading. They are placeholders, not a definition.
- `polity.civilization_id` is **sparsely populated** and **not** the defining backbone of the schema. Do not backfill it as if it were.

## When civilization may earn definition

- After the inheritance graph is materially complete, **and**
- when a concrete query needs a specific civilization grouping (FK-driven: it earns rows only when something points at it), **and**
- as an explicit *projection under a named lens*, never as a single hand-authored partition.

Until then, sparse is correct. This is "architecture for curation," and civilization is a documented open question, not a gap.
