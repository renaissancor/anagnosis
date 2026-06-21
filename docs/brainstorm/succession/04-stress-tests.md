# Stress tests

Six real rows from `polity.csv`, encoded in the proposed shape, chosen to **break** the model rather than confirm it. The `topology × mechanism` core held on all six; three hidden assumptions broke.

## Cases

### 1. `ottoman_empire → republic_of_turkey` — repudiation
Transformation. Kept Anatolian territory ✓ and Turkish people ✓ — but Atatürk **abolished the sultanate (1922), the caliphate (1924), the Arabic script, and Islamic law.**
→ **Breakage #1:** a boolean `axis_inherited` can't express *inherited-and-rejected*. Inheritance has a **stance**.

### 2. `russian_empire → soviet_union → russian_federation` — many edges, one chain
Empire→USSR = transformation by **repudiation** (Bolsheviks disclaimed everything Tsarist); USSR→RF = `continuation`/`claim` (RF kept the UN seat, nukes, treaties — the recognized continuator); USSR→Ukraine/Kazakhstan/… = `fission`/`dissolution`.
→ **Confirms, not breaks:** one historical event spawns many edges of *different* types. The per-edge model handles it natively.

### 3. `british_raj → republic_of_india` — multi-source, cross-type
Borders ✓, common law ✓, civil service ✓, English link-language ✓ ← Britain. But India's people and civilizational heritage descend from the Mughals and a *subcontinent* of pre-colonial polities — **not one source**. British institutions are *politically repudiated* yet *functionally retained*.
→ **Breakage #2:** source isn't always a single polity — it's a **set**, possibly a non-polity entity (an ethnicity, or the deferred "Indic civilization"). And "institution" splits into `legal_tradition` (affirmed) vs `political_legitimacy` (repudiated).

### 4. `new_spain → mexico` + `aztec_empire → mexico` — opposite axes, one with a gap
Language, religion, law ← Spain. But the **name ("Mexica"), the flag's eagle-and-serpent, the founding myth** ← the Aztecs, across a ~300-year colonial gap.
→ Reinforces #2: even *within* culture, sub-axes have different parents; one parent's claim is a gapped revival.

### 5. `qing_dynasty → republic_of_china` … then ROC vs PRC
Both the ROC and the PRC claim to *be* China, successor to the Qing.
→ **Breakage #3:** recognition is **not** a boolean on the edge — it's relational and perspectival. PRC recognized by most, ROC by few; Israel, Taiwan, Kosovo identical. *Recognized-by-whom.*

### 6. `gran_colombia → {venezuela, colombia, ecuador, panama}` — clean fission
`fission` / `dissolution`. Encoded without strain — a control case showing the grid isn't over-fitted to the hard ones.

## Verdict → three upgrades

| # | Hidden assumption that broke | Fix | Driven by |
|---|---|---|---|
| 1 | inheritance is *positive* | per-axis **stance** (`affirmed/repudiated/transformed/neutral`) | Turkey, USSR |
| 2 | source is a *single polity* | source = **set**, may **cross entity types** | India, Mexico |
| 3 | recognition is *objective* | recognition = **perspectival relation** `recognized_by(claim, observer)→degree` | PRC/ROC |

## The quietly important one

**#3 is the same architectural move that resolved the [civilization tier](../../model/civilization.md):** when a question ("is this succession legitimate?" / "what civilization is this?") has no single true answer, **don't collapse the perspectives — index them.** The top tier and the inheritance-legitimacy layer are solved by the same principle. That internal consistency is a signal the model is on the right track.
