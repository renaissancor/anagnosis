# Editorial Policy — adding and verifying content

Validation proves the dataset is *coherent*. This page is how we keep it *true*.
Every rule here exists to turn "is this right?" (unanswerable at scale) into
"does this follow policy?" (checkable in a PR review).

## 1. Dates: conventional dates win

- Use the **textbook date**, not the historiographically defended one. Rome
  "falls" in 476, the Ottoman Empire "starts" in 1299. Note real disputes in
  the `note` field; do not leave cells empty because scholars disagree.
- Years are integers, BCE negative, empty `end` = ongoing (see naming.md).
- A polity's `start` is its conventional founding as a *political entity*, not
  the first attestation of its people — cultural continua belong in
  `ethnicity`, not `polity`. (The `long_lived_polities` plausibility metric
  flags likely violations.)

## 2. Source hierarchy on conflict

When sources disagree, higher wins. Pick once, stop deciding per-row:

1. **Standard reference chronology** (academic atlas / handbook)
2. **Wikipedia / Wikidata** (the default for most rows)
3. **Inference from panels or neighbors** (must be tagged as such)

Divergence from Wikipedia is allowed but must be deliberate — carried by a
`note` or a higher-ranked source, never silent.

## 3. Provenance: every row carries its receipt

Rows in claim-bearing CSVs (`polity`, `polity_succession`, `figure`,
`dynasty`) get a `source` tag (column pending — see TODO):

| Tag | Meaning |
|---|---|
| `wp:<Article>` | from a Wikipedia article |
| `wd:<QID>` | cross-checked against Wikidata |
| `panel:<region>/<name>` | extracted from a history panel |
| `ref:<key>` | a real citation — required for anything contested |
| `stub` | machine-generated, **not yet human-reviewed** |
| `legacy` | predates this policy; coarse backfill |

The point is not academic rigor — it is that "verify this row" becomes a
bounded task. A row with no source is unverifiable by definition.

## 4. Disputed ≠ blocked

Represent disagreement, don't resolve it. A conventional value plus a
`note: disputed — <one line>` beats an empty cell, and beats adjudicating
historiography we are not qualified to settle.

## 5. Stubs are second-class until promoted

Machine-generated rows (`generate_stubs.js`, panel extraction) enter as
`stub`. They may carry FKs and pass validation, but they do not count as
coverage. Promotion = a human checked the row against its source and
replaced the tag. Only promoted rows are "done."

## 6. Two passes, always — authoring is not verifying

1. **Author pass** — add a bounded unit (one panel, one region's polities),
   sources attached, `stub` where unsure.
2. **Verify pass, separate lane** — a different session/person/model samples
   rows against the cited sources and reviews the plausibility report
   (`data/plausibility.md`). AI-bulk adds are never verified by the model
   that generated them in the same context.
3. **Promote** — `stub` → real tag.

**The panel is the unit of review.** "Verify the Sahel panel" is a
finishable afternoon; "verify the dataset" is not.

## 7. Plausibility metrics are the error map

`npm test` computes ratcheted metrics (warning-baseline.json): `d_shaped_edges`
(no shared people AND no shared land — the ahistorical jump this project
exists to forbid), `gap_over_200` (revival claims need a note),
`start_inversions` (edge likely reversed), `long_lived_polities` (probably a
culture, not a polity). They may shrink, never grow. When curating, start
from `data/plausibility.md` — that is where the errors concentrate.

## See also

- `docs/model/succession.md` — what the A/A-/B/C/D types mean
- `docs/model/city.md` — FK-driven scope discipline (rows earn their place)
- `docs/migration/csv_workflow.md` — the mechanical edit loop
