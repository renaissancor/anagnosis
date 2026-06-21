# Open questions

Unresolved as of 2026-06-21. Roughly in priority order.

## 1. Push the stress test against the *new* shape — ✅ DONE (round 2)

All four candidate break-cases were worked in [`06-stress-tests-round2.md`](./06-stress-tests-round2.md). Outcomes:

- **Source that was never a polity** → Finding A: relation is *"claims inheritance from,"* not *succeeds*; add `source_temporal_status` (prior/ongoing/abstract).
- **No successor** → Finding B: extinction must be recorded **positively**, per-axis (`axis_terminus`) — absence already means "uncurated" in a sparse dataset.
- **Fractional / overlapping territory** → Finding C: territory is **not a claim axis** — it's derived & set-valued from `polity_territory`; axes split into material(derived) vs identity(curated).
- **Simultaneous mutual claims** → Finding D: claims need an `exclusivity` flag + contested-set clustering.

New questions opened by round 2 are listed at the bottom of `06-stress-tests-round2.md` (layer renaming to `inheritance_*`, the `population` axis, contested-set representation).

## 2. Is the axis list complete and correctly grained? — ✅ DECIDED (see [`09-axes.md`](./09-axes.md))

Resolved into a **uniform model**: one axis list, each axis carrying overlap (auto) + nullable stance + recognition. Final axes: `territory`, `ruling_ethnicity`, `state_religion`, `court_language`, `dynasty`, `administrative_apparatus`, `legal_tradition`, `name_symbols`, `political_legitimacy`, `title`, and `diplomatic_personality` (provisional). Cut: capital, currency, military, grievance (the last folds into a low-recognition `territory` claim). Two provisional flags remain (see `09`).

## 3. The polity-split boundary — ✅ DECIDED (see [`07-polity-split.md`](./07-polity-split.md))

Resolved: split on **foundational ideology change** (the immutable `government` axis; ≠ religion) **or** a **structural sovereignty event** (fission/fusion/conquest), with the fission-vs-secession test and the continuity-through-the-gap test (extinguished→`revival`/new polity; suspended→`continuation`/one polity). Religion/language/dynasty/ruler/territory never split alone. Implies data-cleanup: redundant lumped `han_dynasty` row, and a 1204–1261 interruption marker on `byzantine_empire`.

## 4. Legitimacy / strength scoring — ⏸ DEFERRED (not necessary yet)

A tuning knob, not a structural decision. `strength` being *gradable* is enough for the model; the exact rule waits for data to calibrate against. Open sub-questions when picked up: (a) how a single axis's strength is set (curated 1–5? evidence-derived?); (b) whether legitimacy **decays along translatio chains** (HRE→Charlemagne→Western Empire→Rome) so a 3-hop claim is weaker than a direct one.

## 5. Valid observers for recognition — ⏸ DEFERRED (one bright line kept now)

**Non-deferrable now:** `inheritance_recognition.observer_id` references a **real entity** (a polity, or an institution like the papacy/UN) + an `observer_type`. Recognition is a **historical fact** (did the Pope recognize Charlemagne? did the West recognize the PRC?), not a judgment.

**Deferred:** *which* observers fill the set — contemporary third parties / rival claimants / later polities / institutions / a privileged `modern_consensus` observer. Decide at curation time.

**Agents and recognition** (from the "check by codex agents?" thread):
- ✅ Agents as **researchers** of historical recognition (sourced, then human-curated) — a good *build-time* tool; premature now (no tables/data).
- ⚠️ Agents as **observers/judges** writing into `inheritance_recognition` — **no**; that manufactures a fake observer ("the model's opinion") and violates FK-discipline. Recognition records what historical actors did.
- 💡 A **separate, clearly-labeled analytical layer** — perspective-prompted agents estimate "how would a Greek-nationalist / Ottoman / Western / Marxist lens view this claim?" → a generated *perspective panel*, kept distinct from curated historical recognition (as the similarity vector is kept distinct from curated claims). Fits the project's perspective spine; **derived, never ground truth**; build-time, not now.

## 6. Migration plan (mechanics, once design is ratified)

1. Define `docs/model/succession.md` (new) + model docs for each new CSV.
2. Repurpose `code/generate-successions.js` → candidate suggester that emits proposed edges + evidence columns.
3. Curate `succession.csv` / `succession_axis.csv` / `succession_recognition.csv` from the suggestions.
4. Wire a generator (`code/makejson/successions.js`) to emit `data/` from the new sources.
5. **Retire `csvs/polity_succession.csv` last**, once the replacement is populated and consumers are migrated.
