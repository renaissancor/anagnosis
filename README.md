# Anagnosis

**A tool for reading the flow of civilizational history — and an open dataset you can browse, query, cite, and build on.**

Instead of memorizing a list of isolated states, Anagnosis models *how political power passes from one polity to the next* across territory and time — so the continuity and rupture of civilizations becomes something you can actually **read**.

> *anagnosis* (ἀνάγνωσις) — "reading"; deeper, *anagnōrisis*, "recognition, seeing-truly."

---

## The core model

Every **polity** (a concrete political entity) sits at the intersection of two things:

- **The ruling people — "software":** ethnicity · language · religion · ideology
- **The territory — "hardware":** the land, which stays put and accumulates successive rulers, layer over layer

```
Polity = Ethnicity (who rules) × Territory (where) × Ideology (why) × Time (when)
```

**Succession** is the question this whole project turns on: *when one polity ends and another begins, what does the successor inherit from it?*

### Why it's "legible" — succession is typed

Each transition between polities is **typed by what the two share** — same people? same land? — and scored for continuity. That typing is what turns a pile of dates into a *readable flow*.

| Type | Name | Same people | Same land | Legitimacy |
|---|---|:---:|:---:|---|
| **A** | Direct lineage | ✅ | ✅ | Orthodox — the gold standard |
| **A-** | Direct, ideology gap | ✅ | ✅ | Weakened — same people & land, ideology changed |
| **B** | Cultural migration | ✅ | ❌ | Successor — the people moved |
| **C** | Locus inheritance | ❌ | ✅ | Claimant — conquered the land |
| **D** | Arbitrary jump | ❌ | ❌ | **Ahistorical** — the thing 4X games wrongly allow |

The last row is the whole point: this framework exists to make "Tang Dynasty → Ottoman Empire" *legibly wrong*.

---

## What's in it

| | Count | | Count |
|---|---:|---|---:|
| Polities | **527** | History panels | **61** |
| Succession edges | **1,991** | Territories | **54** |
| Languages | **695** | Religions | **264** |
| Ethnicities | **269** | Dynasties | **192** |

Regional history-panel coverage spans **Europe, East / South / Southeast / Central Asia, the Middle East & Persia, and North / East / West Africa** (61 panels). The Americas, sub-Saharan Africa, and Oceania are not yet covered.

> **Scope, honestly:** Anagnosis is an *architecture for curation*, not a finished encyclopedia. Coverage is uneven by design — it grows where the questions lead.

---

## Run it

```bash
npm install
npm start        # → http://localhost:3000
```

**Pages:** `/` polity browser · `/history/` regional timeline panels · `/succession-graph.html` D3 force-directed succession graph · `/territory/`, `/ethnicity/`, `/language/`, `/religion/` browsers.

**JSON API:** `/api/polity` · `/api/polity/:id` · `/api/succession` · `/api/panel` · `/api/territory` · `/api/dynasty` · `/api/taxonomy/:type`.

---

## Use the data

The dataset is meant to be **built on, not just looked at.** It's a substrate: browse it, query the API, or take the CSVs directly.

- **Source of truth:** `csvs/*.csv` — human-readable, spreadsheet-editable, git-diffable. Everything in `data/` is generated from these.
- Edit a CSV → `npm run make:all` regenerates the JSON → `npm run validate` checks integrity.
- See [`docs/README.md`](docs/README.md) for the full model, and [`docs/model/data-model.md`](docs/model/data-model.md) for the property-graph schema.

## Contributing

Add a row to the relevant CSV, run its generator, and open a PR. Reviews are CSV diffs; `data/` diffs are generated noise. See [`docs/migration/csv_workflow.md`](docs/migration/csv_workflow.md).

## License

Code: ISC. Data license: TBD (a permissive open-data license — e.g. CC BY — is intended).
