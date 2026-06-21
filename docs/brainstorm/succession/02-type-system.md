# The succession type system

## Principle: combinatorial, not an alphabet

History's complexity is combinatorial, so the type system must be too. Do **not** extend A/B/C/D with E, F, G… — every new letter is an arbitrary judgment that doesn't compose. A succession type is a **point in a small product space**: `Topology × Mode`, plus a `Legitimacy` overlay and a per-axis `Content` payload. The familiar "types" are just the populated cells.

## Topology — how the polity-sets map across the event

| Topology | Predecessor's fate | Examples |
|---|---|---|
| `continuation` (1→1) | persists, transformed | Roman Republic→Empire; USSR→Russian Federation |
| `fission` (1→N) | shatters into many | Carolingian→Francias; Alexander→Diadochi; Mongol→khanates |
| `fusion` (N→1) | many fuse into one | German/Italian unification |
| `secession` (1→1, **parent survives**) | parent lives on, diminished | USA←Britain; Bangladesh←Pakistan |
| `absorption` (2→1) | one eats the other | Byzantium→Ottoman; Babylon→Persia |

## Mode — how legitimacy / assets actually transfer

| Mode | Meaning |
|---|---|
| `continuity` | the thing never stopped — organic metamorphosis |
| `conquest` | force — annexation, displacement |
| `compact` | agreement — negotiated partition (Verdun), federation, Velvet Divorce |
| `claim` | assertion — *translatio imperii*, revival, irredentism, title transfer |

Topology and Mode are roughly orthogonal: a `fission` can be by `compact` (Treaty of Verdun), `conquest` (generals seizing pieces), or collapse into a vacuum. That orthogonality is *why* a flat list fails and a grid works.

## Mechanism enum — the named cells

A principled, **derived** vocabulary (each is a Topology×Mode cell, not an invented label):

`transformation` · `conquest` · `partition` · `collapse` · `unification` · `personal_union` · `secession` · `dissolution` · `revival` · `translatio` (fictive claim) · `title_transfer` · `colonial_independence`

**Excluded: `dynastic_change`.** A pure change of ruling house = the same polity continuing → a `polity_dynasty` row, never a succession edge. (This is what disqualifies many same-territory consecutive-"dynasty" pairs the old generator emits — e.g. Chinese dynasty chains — *unless* the transition was more than dynastic: conquest, Mandate transfer, or a different ruling people.)

## Legitimacy overlay — independent of Topology and Mode

- **organic ↔ constructed/fictive** — Russia's "Third Rome" is manufactured, not organic.
- **recognized ↔ contested** — and recognition is *perspectival* (see [`03-data-model.md`](./03-data-model.md)): recognized *by whom*.
- **continuous ↔ gapped-revival** — the `temporal_gap_years` dimension; a polity reborn after an interregnum.

## Inheritable axes — the Content payload

What can flow through a succession. The per-axis decomposition the old `strength` collapsed:

`territory` · `people/ethnicity` · `language` · `religion` · `legal_tradition` · `political_legitimacy` · `administrative_apparatus` · `dynasty` · `capital` · `title/office` · `name/symbols` · `regalia/relics`

> **Note — "institution" was too coarse.** The stress tests split it into `legal_tradition` / `political_legitimacy` / `administrative_apparatus`, because India *retained* British common law (affirmed) while *repudiating* British political legitimacy. Whether this axis list is complete and correctly grained is [an open question](./05-open-questions.md).
