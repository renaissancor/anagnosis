# Naming: the layer is *inheritance*, not *succession*

> **Decided 2026-06-21.**

## Why rename

"Succession" presupposes a **prior, ended predecessor** (A ended → B began). Round 2 ([`06`](./06-stress-tests-round2.md), Finding A) broke that assumption: the source of an inheritance can be

- `prior` — a dead predecessor (classic succession),
- `ongoing` — a living trans-temporal community (the Arab nation, the Jewish people),
- `abstract` — an idea or ideology with no birth/death.

The general relation is **"an heir claims inheritance from a source."** *Succession is the subset where `source_temporal_status = prior`.* So the layer is **inheritance**; "succession" is kept as the colloquial name for that prior-source slice, and "the succession graph" remains a valid view over the inheritance data.

## Canonical table names

| New name | Was | Holds |
|---|---|---|
| `inheritance_claim` | `succession` | the edge: one per (heir, source) |
| `inheritance_axis` | `succession_axis` / `claim_axis` | per **identity**-axis payload (stance, strength) |
| `inheritance_recognition` | `succession_recognition` / `claim_recognition` | perspectival recognition (observer, degree) |
| `axis_terminus` | — | positive extinction record |

Role fields: **`heir_polity_id`** (the inheriting/claiming polity) and **`source_id`** (+ `source_type`, `source_temporal_status`).

## Scope note

- The canonical model doc, when promoted out of brainstorm, becomes **`docs/model/inheritance.md`** (not `succession.md`). The old `docs/model/succession.md` documents the dead A/B/C/D system and stays as-is until replaced.
- This brainstorm **directory** keeps the name `docs/brainstorm/succession/` — it's the historical home of the redesign and renaming it would churn every internal link for no gain. Vocabulary inside is `inheritance_*`; the folder name is just a label.
- Earlier files (01–07) that say "succession" in prose are not wrong — they predate this decision and "succession" reads fine as the colloquial term. The **table names** are governed by this file.
