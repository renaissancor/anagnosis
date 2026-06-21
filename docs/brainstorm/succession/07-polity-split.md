# The polity-split boundary

> **Decided 2026-06-21.** When is a transition *"same polity, transformed"* (no edge) vs *"new polity succeeding"* (an inheritance edge)?

## This question *is* succession

A polity boundary is **exactly where an inheritance edge lands.** "When do we split a polity?" and "when is there a succession edge?" are the same question — there is no separate splitting procedure. So this rule is part of the inheritance model, not a precondition for it.

## The implicit rule was already in the data

| Transition (as stored) | Split? | Why |
|---|---|---|
| Roman Kingdom→Republic→Empire | yes | ideology (form of rule) changed |
| Roman Empire → East/West (395) | yes | sovereignty fissioned |
| `kingdom_of_france` 987→1792 (Capetian→Valois→Bourbon) | **no** | dynasty only |
| Pagan → Christian Rome (one `roman_empire` row) | **no** | religion only |
| `western_han` / `xin` / `xuan_han` / `eastern_han` | yes | Han extinguished by Xin, later revived |

The data splits on **ideology** and **sovereignty structure** — never on religion, language, or dynasty alone.

## The rule

A transition creates a **new polity** (hence an inheritance edge) iff one of:

### 1. Foundational ideological change
A deliberate, datable change in the **form/source of sovereign authority** — the `government` axis. This is grounded in the existing model: `polity.ideology` is **fixed** (the unchanging existential identity) while `policies[]` are mutable (see `docs/model/data-model.md`). If ideology is the immutable axis, changing it *necessarily* ends the polity.
*Examples: Republic→Empire; Iran monarchy→Islamic Republic; Romanov Empire→USSR.*

**Sharpening — ideology ≠ religion.** Ideology = who rules and by what right (monarchy / republic / empire / theocracy / party-state). Religion, language, and dynasty are mutable *attributes* on a constant ideology.
- Iran 1979 **splits** — source of authority changed (monarchy → *velayat-e faqih*).
- Christian Rome does **not** split — emperor still the autocratic authority; only the faith changed.

### 2. Structural sovereignty event
The sovereign entity **fissions** (divides into multiple sovereignties), **fuses** (merges), or is ended by **conquest that sticks**.

**Fission vs secession test:** if *one* branch unambiguously keeps the parent's seat **and** senior legitimacy **and** a continuity claim → **secession** (parent continues, other buds off). If the division is **symmetric or contested** — neither branch is cleanly "the original" → **fission** (parent ends, two children).
*Rome 395 is contested (West keeps the city of Rome; East keeps the surviving court) → fission. Forcing a "true heir" would be false precision.*

### 3. Interruption → the continuity-through-the-gap test
The practical form of "temporary vs forever." **Did the polity's own sovereign government keep functioning (anywhere) across the gap?**
- **Yes → suspended → one polity** + interruption marker → `continuation`.
- **No → extinguished → a new polity** linked by a `revival` edge — *regardless of shared ideology or dynasty.*

Checkable signal: **what filled the gap?**
- **Byzantine 1204–1261:** the polity's own government-in-exile (Nicaea) governed and retook the capital → *suspended* → one `byzantine_empire` row + interruption marker.
- **Western→Eastern Han:** a *different* regime (Wang Mang's `xin`) ruled all of China; no Han government existed → *extinguished* → `eastern_han` is a **revival** of `western_han`. The presence of `xin`/`xuan_han` as their own polity rows *is* the evidence of extinction.

### 4. Never a split on its own
Religion, language, dynasty, ruler, territorial extent, policy. (Conquest by a different people splits via clause 2, not via "ruling people" — no separate axis needed.)

## Data-cleanup consequences

The rule implies concrete fixes to current data (do when curating, not now):

1. **Redundant `han_dynasty` (−206→220) row** coexists with the split `western_han`/`xin`/`xuan_han`/`eastern_han` rows. The split representation is correct → **remove the lumped row**.
2. **`byzantine_empire` 395→1453** stays one row (the eastern child of the 395 fission) but should carry a **1204–1261 interruption marker**. Consider renaming to `eastern_roman_empire` — "Byzantine" is a 16th-c. exonym that hides the Roman continuity the model captures.
3. **`western_roman_empire`** is the western child of the 395 fission (ends 476) — already correct.

## How it feeds the inheritance model

Every split is an edge; the edge's **mechanism** records *how*: `transformation` (ideological refounding), `fission`/`secession`/`fusion`/`conquest` (sovereignty), `revival` (extinguished-then-reborn), `continuation` (suspended interruption — strictly a non-split, recorded as an interruption marker rather than an edge).
