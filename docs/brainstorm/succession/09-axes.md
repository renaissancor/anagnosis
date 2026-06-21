# Inheritance axes — the content layer

> **Decided 2026-06-21**, with two choices marked **provisional** (low-stakes, reversible at build time).

## The uniform model

There is **one** axis list, not a material/curated split. Every axis carries:

- **overlap** — auto-computed evidence: did heir & source share it? (from `polity` fields + junction tables)
- **stance** — curated, *nullable*: `affirmed` / `repudiated` / `transformed` / `neutral` — present only when the heir deliberately relates to the axis.
- **recognition** — perspectival, where the claim is contested.

The old "material vs curated" two-tier is just the special case where `stance` is always null. Adopting the uniform model (it emerged from the ethnicity/religion observation: those axes *do* bear stance — Turkey disestablishing Islam, Turkification suppressing ethnic plurality).

## The axes (spectrum: pure-overlap → pure-claim)

| Axis | overlap | stance | recognition | Notes |
|---|:---:|:---:|:---:|---|
| `territory` | ✓ (set, from `polity_territory`) | — | ✓ | the **one** pure-overlap axis — you can't "repudiate" land, only hold/claim it; recognition covers irredentist/contested claims |
| `ruling_ethnicity` | ✓ | ✓ | rare | overlap from `polity.id_ruling_ethnicity` |
| `state_religion` | ✓ | ✓ | rare | appears twice: as regime character here, **and** as a *grounding* of `political_legitimacy` (caliph, divine mandate) |
| `court_language` | ✓ | ✓ | — | overlap from `polity.id_ruling_language`; stance e.g. script reform |
| `dynasty` | ✓ (from `polity_dynasty`) | ✓ | — | overlap derived; stance when repudiated (Turkey abolishing the house) |
| `administrative_apparatus` | partial | ✓ | rare | the Persianate bureaucracy; British civil service |
| `legal_tradition` | partial | ✓ | rare | Roman law; common law; sharia |
| `name_symbols` | — | ✓ | rare | name, regalia, founding myth, flag (Mexico ← Aztec) |
| `political_legitimacy` | — | ✓ | ✓ (central) | see below — the edge-level shadow of node-level ideology |
| `title` | — | ✓ | ✓ (central) | specific transferable office (Caliph, Emperor, Tsar); `exclusivity` bites hardest here |
| `diplomatic_personality` | — | ✓ | ✓ | **PROVISIONAL** — external legal personhood: treaties, debts, memberships, the UN seat (USSR→RF continuator). Mostly null outside modern states. Kept separate from `political_legitimacy` (external vs internal); fold in later if it stays empty. |

## `political_legitimacy` ↔ ideology — the node/edge duality

The most important axis, and the one most entangled with the polity-split rule, because they're the same phenomenon at two levels:

- **ideology** = a property of the **polity (node)** — fixed identity; changing it *ends* the polity (`07`).
- **`political_legitimacy`** = a property of the **inheritance edge** — whether the heir *claims / repudiates / transforms* the predecessor's right to rule.

Legitimacy is grounded in ideology, so this axis carries the **ideological-continuity verdict** across a split. The diagnostic cases are where node and edge diverge:

- **Augustus** — ideology changed (republic→principate) but claimed Republican legitimacy → stance `transformed`.
- **Bolsheviks** — ideology changed *and* repudiated Tsarist legitimacy, grounding theirs in an abstract source → stance `repudiated`.

Legitimacy can be **grounded** ideologically, dynastically, religiously, or popularly — which is why it isn't redundant with the `ideology` node attribute.

## Cut / folded (with reasons)

- **capital city** — mutable *within* a polity (Constantine moved Rome→Constantinople; Russia Moscow↔Petersburg↔Moscow). Not identity-defining → not an axis; at most a derived attribute.
- **currency / fiscal** → folds into `administrative_apparatus`.
- **military / manpower** → material (territory/population), not an identity claim.
- **grievance / irredentism** → a `territory` claim with low/zero recognition, not a new axis.

## Provisional flags (revisit at build time)

1. `diplomatic_personality` as its own axis (vs folded into `political_legitimacy`).
2. The uniform overlap+stance+recognition model (vs reverting to a hard two-tier).
