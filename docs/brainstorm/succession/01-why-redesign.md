# Why redesign succession

## What exists today

`csvs/polity_succession.csv` — one row per ordered polity pair, with columns:
`territorial_direction, strength, shared_territories, shared_territory_count, same_ethnicity, related_ethnicity, same_language, same_religion, same_civilization, temporal_gap_years`.

Generated wholesale by `code/generate-successions.js` from `polity.csv` + `polity_territory.csv` + `ethnicity.csv`. Classified A / A− / B / C / D on an **ethnicity × territory** grid with a religion/ideology modifier.

## It is auto-derived and currently stale

Verified 2026-06-21 (regenerate-and-diff, working tree restored by sha256 round-trip):

- Generator today produces **2,621 edges**; the committed file has **~1,991**.
- The diff is **629 insertions, 0 deletions, 0 modifications** — the committed file is a *strict subset* of fresh output.

Zero deletions/modifications proves there are **no hand-edits**: it's a pure projection that simply wasn't regenerated after new polities were added to the inputs. There is no curated work to preserve — scrapping it costs nothing.

## Four reasons it can't carry the weight

1. **No mechanism axis.** It records *what two polities shared* (similarity) but not *how the succession happened* (process). Byzantine→Ottoman (conquest), Carolingian→Francias (partition), and Republic→Empire (metamorphosis) can score identical "shared territory" yet are utterly different events. Mechanism is the missing dimension. → [`02-type-system.md`](./02-type-system.md)
2. **One blended `strength` collapses perspective.** A single 1–10 scalar bakes in one weighting of the axes and discards the per-axis vector — which is exactly the thing that lets "does X inherit Y?" have a *different answer per lens*.
3. **One edge per pair can't express multi-parent inheritance.** Real successors assemble themselves from several predecessors, a different one per axis. A single typed edge has nowhere to put that. → [`03-data-model.md`](./03-data-model.md)
4. **It's the wrong *kind* of thing.** The facts that matter — mechanism (conquest vs partition vs claim-transfer), legitimacy (organic vs manufactured), recognition (Third Rome, PRC/ROC) — are **historical judgments no script can derive**. Similarity is computable; *succession* is not.

## The shift: derived similarity → curated claims

| | Current `polity_succession` | Redesign |
|---|---|---|
| Nature | derived similarity (computed) | curated claims (judged) |
| Unit | one blended edge per pair | one claim per `(successor, source, axis)` |
| Script can produce it? | yes | no — only *suggest candidates* |

The similarity math doesn't get thrown away — it's **demoted to evidence**: `generate-successions.js` becomes a *candidate suggester* that proposes possible edges from overlap, which a human then curates and annotates with mechanism / stance / legitimacy. CSV-first discipline is preserved: the new `succession` tables are **sources**, the similarity vector is **derived evidence**.
