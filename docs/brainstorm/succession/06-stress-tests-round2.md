# Stress tests — round 2 (against the *new* shape)

Round 1 ([`04-stress-tests.md`](./04-stress-tests.md)) broke the *old* A/B/C/D model. This round attacks the **upgraded three-table shape** from [`03-data-model.md`](./03-data-model.md) with the four cases parked in [`05-open-questions.md`](./05-open-questions.md). Grounded on real `polity.csv` IDs. Nothing shattered the core; two findings forced architectural change, two are additive.

## A. Source that was never a polity — `united_arab_republic`, Israel

UAR (Egypt+Syria 1958) claimed to embody **"the Arab nation"**; Israel claims **"the Jewish people"** (stateless ~1,900 yrs) + ancient Israel/Judah. `source_type = ethnicity/stateless_people` covers the *typing*, but hides the real break: **the source never ended.** The "nation" is an ongoing, trans-temporal abstraction the polity claims to *realize* — not a dead predecessor.

→ **Finding A (reframe):** the relation is **"claims inheritance from," not "succeeds."** Succession presumes predecessor-ended→successor-began; embodiment (ongoing nation), revival (ancient, across a gap), and realization (an idea) all violate it. Add a **`source_temporal_status`** (`prior` / `ongoing` / `abstract`). The umbrella concept is *inheritance claim*; "succession" is just the `prior`-source subset.

## B. No successor — `carthage`

Rome conquered Carthage's territory (a real edge), but its people were destroyed and Punic identity went **extinct**. In an edge model that's *no outgoing edge* on people/institution — but CivRegime is **deliberately sparse**, so absence already means "uncurated." Extinction and ignorance become indistinguishable.

→ **Finding B (new structure):** extinction must be recorded **positively, per-axis** — a `terminus` marker ("this axis had no heir; it ends here"). It's per-axis: Carthage's *territory* succeeds (Rome) while its *people* terminate. The model supports partial extinction once termination is statable.

## C. Fractional / overlapping territory — Poland partition, Rome's western heirs

`polish_lithuanian_commonwealth` partitioned among Russia/Prussia/Austria (one polity → three). Rome's west → `visigothic_kingdom` / `ostrogothic_kingdom` / `vandal_kingdom` / Byzantium, **with overlap** (Justinian reconquered Vandal Africa & Ostrogothic Italy — two polities claim the same ground across time). A scalar `strength` on a territory axis can't say *which* lands, nor express overlap.

→ **Finding C (architectural — the big one):** **territory is not a claim axis; it's derived and set-valued** from the existing `polity_territory` (polity × territory × time). Who held T before/after whom is computable; fractions and overlaps are just the territory sets. So the axes **cleave in two**:

| Kind | Axes | Source | Stance? | Recognition? |
|---|---|---|:---:|:---:|
| **Material** (derived) | territory, population | `polity_territory` | no | no |
| **Identity** (curated) | legitimacy, title, dynasty, state-religion, legal tradition, name/symbols | the claim | yes | yes |

This *simplifies* the design: `succession_axis` only ever holds **identity** axes; territorial succession comes free from `polity_territory`. You never curate "Russia got 38% of Poland" — you read it off the territory table.

## D. Mutual exclusive claims — PRC/ROC, two-emperors, three-caliphs

`abbasid_caliphate` vs `fatimid_caliphate` (+ Umayyad Córdoba) — three simultaneous claims to the *one* legitimate caliphate. `byzantine_empire` vs `holy_roman_empire` both claimed to *be* Rome. `north_korea`/`south_korea` each claim sole legitimate Korea. Recognition-by-observer handles "who backs whom," but misses that these claims assert **exclusivity**: "I am the *sole* heir; rivals are void" — unlike Gran Colombia's four *co-equal* heirs.

→ **Finding D (new column + relation):** claims need an **`exclusivity`** flag (`exclusive` | `shared`), and rival exclusive claims **cluster into a contested set**. Exclusivity bites hardest on **indivisible identity axes** (one caliph, one Roman emperor); territory/people are divisible. Recognizing one exclusive claimant *implies* rejecting its rivals — the model should encode that, not treat recognitions independently.

## Verdict

| Finding | Type | Effect |
|---|---|---|
| A | reframe | `source_temporal_status`; concept is *inheritance*, not *succession* |
| B | new structure | per-axis `terminus` marker |
| C | architectural | split axes material(derived) vs identity(curated); `succession_axis` → identity only |
| D | new column + relation | `claim.exclusivity` + contested-set linkage |

The three-table core held. Finding C actually *shrank* it (territory falls out to `polity_territory`); A/B/D are additive. Updated record sketch:

```
inheritance_claim(id, successor_polity, source, source_type, source_temporal_status,
                  topology, mechanism, legitimacy_mode, exclusivity, temporal_gap, note)
claim_axis(claim_id, axis, stance, strength)          -- IDENTITY axes only
claim_recognition(claim_id, observer, degree)         -- perspectival
axis_terminus(polity_id, axis)                        -- positive extinction record
-- territorial succession: DERIVED from polity_territory, not stored here
```

## Newly opened questions

- **Naming:** rename the whole layer `inheritance_*`? "Succession" now denotes only the `prior`-source subset.
- **`population` axis:** is it material (derived — but from what? there's no population table) or identity? Currently parked under material but underspecified.
- **Contested-set representation:** explicit `contested_succession` group table, or inferred from shared (source, title-axis, exclusivity=exclusive)?
