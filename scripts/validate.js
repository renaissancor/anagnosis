/**
 * Anagnosis data validator.
 * Run: node scripts/validate.js
 *
 * Checks:
 *   1. No duplicate IDs within any entity type
 *   2. All foreign key references resolve
 *   3. Required fields present on every polity
 *   4. Date validity (start < end where both exist)
 *   5. Succession integrity (both ends exist, no self-loops)
 *   6. (retired) letter-type check — edges carry evidence columns, not A/B/C/D types
 *   7. Region integrity (territory FK resolves, period polity FKs resolve)
 */

const fs   = require('fs');
const path = require('path');
const db   = require('../data');

let errors   = 0;
let warnings = 0;

function err(msg)  { console.error(`  ✗  ${msg}`); errors++; }
function warn(msg) { console.warn( `  ⚠  ${msg}`); warnings++; }
function ok(msg)   { console.log(  `  ✓  ${msg}`); }

// ── Build lookup sets ─────────────────────────────────────────────────────────

const sets = {
  polities:     new Set(db.polities.map(r => r.id)),
  territories: new Set(db.territories.map(t => t.id)),
  languages:   new Set(db.languages.map(l => l.id)),
  religions:   new Set(db.religions.map(r => r.id)),
  governments: new Set((db.governments || []).map(g => g.id)),
  ethnicities: new Set(db.ethnicities.map(e => e.id)),
  provinces:   new Set(db.provinces.map(r => r.id)),
};

// ── 1. Duplicate ID check ─────────────────────────────────────────────────────

function checkDuplicates(items, label) {
  const seen = new Map();
  for (const item of items) {
    if (!item.id) { err(`${label}: entry missing "id" field`); continue; }
    if (seen.has(item.id)) {
      err(`${label}: duplicate id "${item.id}"`);
    } else {
      seen.set(item.id, true);
    }
  }
}

console.log('\n── Duplicate IDs ────────────────────────────────────────');
checkDuplicates(db.polities,     'polities');
checkDuplicates(db.territories, 'territories');
checkDuplicates(db.provinces,   'provinces');
checkDuplicates(db.languages,   'languages');
checkDuplicates(db.religions,   'religions');
checkDuplicates(db.governments || [],  'governments');
checkDuplicates(db.ethnicities, 'ethnicities');
if (!errors) ok('no duplicates');

// ── 2. Required fields on polities ─────────────────────────────────────────────

console.log('\n── Required polity fields ───────────────────────────────');
const REQUIRED = ['id', 'name', 'ruling_ethnicity', 'start'];
let missingFields = 0;

for (const r of db.polities) {
  for (const f of REQUIRED) {
    if (r[f] == null || r[f] === '') {
      err(`polity "${r.id || '?'}": missing required field "${f}"`);
      missingFields++;
    }
  }
  if (!r.ideology?.religion)   warn(`polity "${r.id}": missing ideology.religion`);
  if (!r.ideology?.government) warn(`polity "${r.id}": missing ideology.government`);
}
if (!missingFields) ok('all required fields present');

// ── 3. Date validity ──────────────────────────────────────────────────────────

console.log('\n── Date validity ────────────────────────────────────────');
let badDates = 0;
for (const r of db.polities) {
  // Same-year polities (start == end) are valid: many ephemeral states (e.g.
  // California Republic 1846) began and ended within one year. Only start > end is wrong.
  if (r.start != null && r.end != null && r.start > r.end) {
    err(`polity "${r.id}": start (${r.start}) > end (${r.end})`);
    badDates++;
  }
}
if (!badDates) ok('all date ranges valid');

// ── 4. Foreign key references ─────────────────────────────────────────────────

console.log('\n── Foreign key references ───────────────────────────────');
let brokenFKs = 0;

function checkFK(label, value, lookupSet) {
  if (value && !lookupSet.has(value)) {
    err(`${label}: "${value}" not found`);
    brokenFKs++;
  }
}

for (const r of db.polities) {
  const ctx = `polity "${r.id}"`;
  checkFK(`${ctx} ruling_ethnicity`, r.ruling_ethnicity, sets.ethnicities);
  checkFK(`${ctx} cultural_language`, r.cultural_language, sets.languages);
  checkFK(`${ctx} ideology.religion`, r.ideology?.religion, sets.religions);
  checkFK(`${ctx} ideology.government`, r.ideology?.government, sets.governments);
  for (const t of (r.territories || [])) {
    checkFK(`${ctx} territory "${t}"`, t, sets.territories);
  }
}

if (!brokenFKs) ok('all foreign keys resolve');

// ── 5. Succession integrity ───────────────────────────────────────────────────

console.log('\n── Succession integrity ─────────────────────────────────');
let badSuccessions = 0;

for (const s of db.successions) {
  if (!s.from || !s.to) {
    err(`succession missing "from" or "to": ${JSON.stringify(s)}`);
    badSuccessions++;
    continue;
  }
  if (s.from === s.to) {
    err(`succession self-loop: "${s.from}"`);
    badSuccessions++;
  }
  if (!sets.polities.has(s.from)) {
    err(`succession from "${s.from}": polity not found`);
    badSuccessions++;
  }
  if (!sets.polities.has(s.to)) {
    err(`succession to "${s.to}": polity not found`);
    badSuccessions++;
  }
  // Note: no `type` field check — the v1 A/A-/B/C/D letter model is retired.
  // Edges carry evidence columns; see docs/brainstorm/succession/ for the
  // per-axis inheritance redesign.
}

if (!badSuccessions) ok('all successions valid');

// ── 6. Territory timeline integrity ──────────────────────────────────────────

console.log('\n── Territory timeline integrity ─────────────────────────');

for (const t of db.territories) {
  const periods = [...(t.periods || [])].sort((a, b) => a.start - b.start);

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const ctx = `territory "${t.id}" period [${p.start}–${p.end ?? '?'}]`;

    // Polity FK
    if (p.polity === undefined) {
      err(`${ctx}: missing "polity" field — use null for explicitly uncontrolled periods`);
    } else if (p.polity !== null && !sets.polities.has(p.polity)) {
      warn(`${ctx}: polity "${p.polity}" not found — may not be added yet`);
    }

    // Dominant ethnicity FK
    if (p.dominant_ethnicity && !sets.ethnicities.has(p.dominant_ethnicity)) {
      err(`${ctx}: unknown dominant_ethnicity "${p.dominant_ethnicity}"`);
    }

    // Ethnic composition FKs
    for (const ec of (p.ethnic_composition || [])) {
      if (ec.ethnicity && !sets.ethnicities.has(ec.ethnicity)) {
        err(`${ctx}: unknown ethnicity in composition "${ec.ethnicity}"`);
      }
    }

  }
}

ok('territory timeline checks complete');

// ── 7. Province integrity ─────────────────────────────────────────────────────

console.log('\n── Province integrity ───────────────────────────────────');
let badProvinces = 0;

for (const province of db.provinces) {
  const id    = province.id;
  const props = province.properties || {};
  const ctx   = `province "${id}"`;

  if (!id) {
    err(`province missing top-level "id" field`);
    badProvinces++;
    continue;
  }
  if (!props.territory) {
    err(`${ctx}: missing "territory" field`);
    badProvinces++;
  } else if (!sets.territories.has(props.territory)) {
    err(`${ctx}: territory "${props.territory}" not found`);
    badProvinces++;
  }

  for (const p of (props.periods || [])) {
    if (p.polity !== null && p.polity !== undefined && !sets.polities.has(p.polity)) {
      warn(`${ctx} period [${p.start}]: polity "${p.polity}" not found — may not be added yet`);
    }
  }
}

if (!badProvinces) ok('all provinces valid');

// ── 8. Duplicate succession edges ────────────────────────────────────────────

console.log('\n── Duplicate succession edges ───────────────────────────');
let dupEdges = 0;
const edgeSeen = new Set();
for (const s of db.successions) {
  const key = `${s.from}→${s.to}`;
  if (edgeSeen.has(key)) {
    err(`duplicate succession edge: ${key}`);
    dupEdges++;
  } else {
    edgeSeen.add(key);
  }
}
if (!dupEdges) ok('no duplicate succession edges');

// ── 9. Succession shared_territories ─────────────────────────────────────────

console.log('\n── Succession shared_territories ────────────────────────');
let badSharedTerr = 0;
for (const s of db.successions) {
  for (const t of (s.shared_territories || [])) {
    if (!sets.territories.has(t)) {
      err(`succession "${s.from}" → "${s.to}": shared_territory "${t}" not found`);
      badSharedTerr++;
    }
  }
}
if (!badSharedTerr) ok('all shared_territories resolve');

// ── 10. History panel polity references ──────────────────────────────────────

console.log('\n── History panel polity references ──────────────────────');
let badPanelRefs = 0;
let panelCount = 0;
let cellCount = 0;

function walkPanels(dir) {
  if (!fs.existsSync(dir)) return [];
  const panels = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      panels.push(...walkPanels(path.join(dir, entry.name)));
    } else if (entry.name.endsWith('.json')) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, entry.name), 'utf8'));
        panels.push({ file: path.join(dir, entry.name), data });
      } catch { /* skip malformed */ }
    }
  }
  return panels;
}

const historyDir = path.join(__dirname, '..', 'data', 'history');
const panels = walkPanels(historyDir);
panelCount = panels.length;

for (const { file, data } of panels) {
  const panelId = data.id || path.basename(file, '.json');
  for (const row of (data.rows || [])) {
    for (const cell of (row.cells || [])) {
      const entries = [...(cell.stack || []), ...(cell.split || [])];
      for (const entry of entries) {
        cellCount++;
        if (entry.polity && !sets.polities.has(entry.polity)) {
          warn(`panel "${panelId}": polity ref "${entry.polity}" not found in polity data`);
          badPanelRefs++;
        }
      }
    }
  }
}

if (!badPanelRefs) ok(`${panelCount} panels, ${cellCount} cells — all polity refs valid`);
else ok(`${panelCount} panels scanned, ${badPanelRefs} unresolved polity ref(s)`);

// ── 11. Taxonomy tree integrity ──────────────────────────────────────────────

console.log('\n── Taxonomy tree integrity ──────────────────────────────');
let badTaxonomy = 0;

function checkTree(items, label) {
  const ids = new Set(items.map(n => n.id));
  for (const node of items) {
    if (node.parent && !ids.has(node.parent)) {
      err(`${label} "${node.id}": parent "${node.parent}" not found`);
      badTaxonomy++;
    }
  }
  // Cycle detection via tortoise-and-hare on parent chain
  const byId = new Map(items.map(n => [n.id, n]));
  for (const node of items) {
    const visited = new Set();
    let cur = node;
    while (cur && cur.parent) {
      if (visited.has(cur.id)) {
        err(`${label}: cycle detected involving "${cur.id}"`);
        badTaxonomy++;
        break;
      }
      visited.add(cur.id);
      cur = byId.get(cur.parent);
    }
  }
}

checkTree(db.ethnicities, 'ethnicity');
checkTree(db.languages, 'language');
checkTree(db.religions, 'religion');
if (!badTaxonomy) ok('all taxonomy trees valid');

// ── 12. Government FK validation ────────────────────────────────────────────

console.log('\n── Government FK validation ─────────────────────────────');
let badGov = 0;
const govSet = new Set((db.governments || []).map(g => g.id));

for (const r of db.polities) {
  const gov = r.ideology?.government;
  if (gov && !govSet.has(gov)) {
    err(`polity "${r.id}": government "${gov}" not found in government.csv`);
    badGov++;
  }
}
if (!badGov) ok(`all polity government refs resolve (${govSet.size} government types)`);

// ── 13. CSV source lint ──────────────────────────────────────────────────────
// Lints csvs/*.csv directly (pre-generation), so a bad row fails even if a
// generator silently drops or rewrites it.

console.log('\n── CSV source lint ──────────────────────────────────────');
let badCsv = 0;

// Minimal RFC-4180 parser: quoted fields, escaped quotes, no embedded newlines.
function parseCsvLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// IDs must be lowercase and whitespace-free. Existing data legitimately uses
// unicode letters and apostrophes (goktürk_khaganate, k'iche'), so we reject
// only clear mistakes: whitespace, ASCII uppercase, quotes, commas, semicolons.
const BAD_ID = /[\sA-Z",;]/;

const YEAR_COLS = {
  'polity.csv': ['start_year', 'end_year'],
  'city.csv':   ['founding_year', 'abandonment_year'],
};
const CURRENT_YEAR = new Date().getFullYear();

const csvDir = path.join(__dirname, '..', 'csvs');
for (const file of fs.readdirSync(csvDir).filter(f => f.endsWith('.csv'))) {
  const lines = fs.readFileSync(path.join(csvDir, file), 'utf8').trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const idIdx = header.indexOf('id');
  const seen = new Set();

  for (let n = 1; n < lines.length; n++) {
    const row = parseCsvLine(lines[n]);
    const ctx = `${file}:${n + 1}`;

    if (row.length !== header.length) {
      err(`${ctx}: ${row.length} fields, expected ${header.length} — unquoted comma or broken row`);
      badCsv++;
      continue;
    }

    // ID format + duplicates (entity tables only; junction tables have no id col)
    if (idIdx !== -1) {
      const id = row[idIdx];
      if (!id)               { err(`${ctx}: empty id`); badCsv++; }
      else if (BAD_ID.test(id)) { err(`${ctx}: malformed id "${id}" (whitespace/uppercase/quote)`); badCsv++; }
      if (id && seen.has(id)) { err(`${ctx}: duplicate id "${id}" in source CSV`); badCsv++; }
      seen.add(id);
    }

    // Year sanity
    for (const col of (YEAR_COLS[file] || [])) {
      const i = header.indexOf(col);
      if (i === -1 || row[i] === '') continue;
      const y = Number(row[i]);
      if (!Number.isInteger(y) || y < -10000 || y > CURRENT_YEAR + 1) {
        err(`${ctx}: ${col} "${row[i]}" is not a sane integer year`);
        badCsv++;
      }
    }
    const [sc, ec] = YEAR_COLS[file] || [];
    if (sc) {
      const s = row[header.indexOf(sc)], e = row[header.indexOf(ec)];
      if (s !== '' && e !== '' && Number(s) > Number(e)) {
        err(`${ctx}: ${sc} (${s}) > ${ec} (${e})`);
        badCsv++;
      }
    }
  }
}
if (!badCsv) ok('all source CSVs pass lint');

// ── 13a. Inheritance layer ───────────────────────────────────────────────────
// The curated per-axis inheritance layer (docs/model/inheritance.md).
// Enum vocabularies are canonical per docs/brainstorm/succession/02 & 09.

console.log('\n── Inheritance layer ────────────────────────────────────');
const INH = {
  source_type:            new Set(['polity', 'ethnicity', 'religion', 'civilization', 'stateless_people']),
  source_temporal_status: new Set(['prior', 'ongoing', 'abstract']),
  topology:               new Set(['continuation', 'fission', 'fusion', 'secession', 'absorption']),
  mechanism:              new Set(['transformation', 'conquest', 'partition', 'collapse', 'unification',
                                   'personal_union', 'secession', 'dissolution', 'revival', 'translatio',
                                   'title_transfer', 'colonial_independence']),
  legitimacy_mode:        new Set(['organic', 'claimed', 'fictive']),
  exclusivity:            new Set(['exclusive', 'shared']),
  axis:                   new Set(['territory', 'ruling_ethnicity', 'state_religion', 'court_language',
                                   'dynasty', 'administrative_apparatus', 'legal_tradition', 'name_symbols',
                                   'political_legitimacy', 'title', 'diplomatic_personality']),
  stance:                 new Set(['affirmed', 'repudiated', 'transformed', 'neutral']),
  degree:                 new Set(['recognized', 'partial', 'rejected']),
  observer_type:          new Set(['polity', 'institution']),
};
const SOURCE_SETS = { polity: sets.polities, ethnicity: sets.ethnicities, religion: sets.religions };

let badInh = 0;
const inhFile = path.join(__dirname, '..', 'data', 'inheritance', 'claims.json');
const termFile = path.join(__dirname, '..', 'data', 'inheritance', 'terminus.json');
const inhClaims = fs.existsSync(inhFile) ? JSON.parse(fs.readFileSync(inhFile, 'utf8')) : [];
const inhTerminus = fs.existsSync(termFile) ? JSON.parse(fs.readFileSync(termFile, 'utf8')) : [];

const claimIds = new Set();
function inhErr(msg) { err(msg); badInh++; }

for (const c of inhClaims) {
  const ctx = `inheritance_claim "${c.id}"`;
  if (claimIds.has(c.id)) inhErr(`${ctx}: duplicate id`);
  claimIds.add(c.id);
  if (!sets.polities.has(c.heir_polity_id)) inhErr(`${ctx}: heir_polity_id "${c.heir_polity_id}" not found`);
  if (!INH.source_type.has(c.source_type))  inhErr(`${ctx}: bad source_type "${c.source_type}"`);
  else if (SOURCE_SETS[c.source_type] && !SOURCE_SETS[c.source_type].has(c.source_id)) {
    inhErr(`${ctx}: source_id "${c.source_id}" not found in ${c.source_type}`);
  }
  for (const [f, allowed] of [['source_temporal_status', INH.source_temporal_status],
                              ['topology', INH.topology], ['mechanism', INH.mechanism],
                              ['legitimacy_mode', INH.legitimacy_mode], ['exclusivity', INH.exclusivity]]) {
    if (!allowed.has(c[f])) inhErr(`${ctx}: bad ${f} "${c[f]}"`);
  }
  if (!c.provenance) inhErr(`${ctx}: missing provenance — curated claims always carry a receipt`);
  for (const a of (c.axes || [])) {
    if (!INH.axis.has(a.axis))                inhErr(`${ctx} axis: unknown axis "${a.axis}"`);
    if (a.stance && !INH.stance.has(a.stance)) inhErr(`${ctx} axis "${a.axis}": bad stance "${a.stance}"`);
    if (a.strength != null && (a.strength < 1 || a.strength > 5)) inhErr(`${ctx} axis "${a.axis}": strength ${a.strength} out of 1–5`);
  }
  for (const r of (c.recognition || [])) {
    if (!INH.degree.has(r.degree))               inhErr(`${ctx} recognition: bad degree "${r.degree}"`);
    if (!INH.observer_type.has(r.observer_type)) inhErr(`${ctx} recognition: bad observer_type "${r.observer_type}"`);
    else if (r.observer_type === 'polity' && !sets.polities.has(r.observer_id)) {
      inhErr(`${ctx} recognition: observer polity "${r.observer_id}" not found`);
    }
  }
}
for (const t of inhTerminus) {
  if (!sets.polities.has(t.polity_id)) inhErr(`axis_terminus: polity "${t.polity_id}" not found`);
  if (!INH.axis.has(t.axis))           inhErr(`axis_terminus "${t.polity_id}": unknown axis "${t.axis}"`);
}
if (!badInh) ok(`inheritance layer valid (${inhClaims.length} claims, ${inhTerminus.length} terminus records)`);

// ── 13b. Provenance tags ─────────────────────────────────────────────────────
// Every polity row and succession edge carries a provenance tag
// (docs/model/editorial-policy.md §3). Malformed = error; stub/legacy counts
// feed the plausibility ratchet — promotion shrinks them, they never grow.

console.log('\n── Provenance tags ──────────────────────────────────────');
const PROV_RE = /^(wp|wd|panel|ref):.+|^(stub|legacy)$/;
let badProv = 0;
let unpromotedPolities = 0, unpromotedEdges = 0;

for (const r of db.polities) {
  if (!r.provenance)               { err(`polity "${r.id}": missing provenance tag`); badProv++; }
  else if (!PROV_RE.test(r.provenance)) { err(`polity "${r.id}": malformed provenance "${r.provenance}"`); badProv++; }
  else if (r.provenance === 'stub' || r.provenance === 'legacy') unpromotedPolities++;
}
for (const s of db.successions) {
  if (!s.provenance)               { err(`succession ${s.from}→${s.to}: missing provenance tag`); badProv++; }
  else if (!PROV_RE.test(s.provenance)) { err(`succession ${s.from}→${s.to}: malformed provenance "${s.provenance}"`); badProv++; }
  else if (s.provenance === 'stub' || s.provenance === 'legacy') unpromotedEdges++;
}
if (!badProv) ok(`all provenance tags well-formed (unpromoted: ${unpromotedPolities} polities, ${unpromotedEdges} edges)`);

// ── 14. Plausibility metrics ─────────────────────────────────────────────────
// Machine checks prove coherence, not truth — but wrong history tends to be
// INCOHERENT, so these flag where errors concentrate. Each metric is ratcheted
// individually in warning-baseline.json (may shrink, never grow). Full detail
// is written to data/plausibility.md (untracked, regenerated every run).

console.log('\n── Plausibility metrics ─────────────────────────────────');

const polityById = new Map(db.polities.map(p => [p.id, p]));
const plaus = {
  // An edge sharing neither people nor land is exactly the "ahistorical jump"
  // (type D) this project exists to forbid. Either the edge is wrong, or its
  // evidence columns are — both need curation.
  d_shaped_edges:      [],
  // Successor claimed >200y after the predecessor ended: revival claims need a note.
  gap_over_200:        [],
  // Successor starts before its predecessor even starts: edge likely reversed.
  start_inversions:    [],
  // Polities lasting >1200y are rare and famous; the rest are usually
  // cultural continua mislabeled as polities.
  long_lived_polities: [],
};

for (const e of db.successions) {
  const key = `${e.from} → ${e.to}`;
  if (e.same_ethnicity === false && e.related_ethnicity === false && e.shared_territory_count === 0) {
    plaus.d_shaped_edges.push(key);
  }
  if ((e.temporal_gap_years ?? 0) > 200) {
    plaus.gap_over_200.push(`${key} (gap ${e.temporal_gap_years}y)`);
  }
  const f = polityById.get(e.from), t = polityById.get(e.to);
  if (f && t && f.start != null && t.start != null && t.start < f.start) {
    plaus.start_inversions.push(`${key} (${t.start} < ${f.start})`);
  }
}
for (const p of db.polities) {
  if (p.start != null && p.end != null && p.end - p.start > 1200) {
    plaus.long_lived_polities.push(`${p.id} (${p.start}..${p.end}, ${p.end - p.start}y)`);
  }
}

const plausCounts = Object.fromEntries(Object.entries(plaus).map(([k, v]) => [k, v.length]));
// Provenance promotion progress — count-only metrics (the CSVs are the detail list)
plausCounts.unpromoted_polities = unpromotedPolities;
plausCounts.unpromoted_edges    = unpromotedEdges;
for (const [k, v] of Object.entries(plausCounts)) {
  console.log(`  ·  ${k}: ${v}`);
}

// Detail report (untracked)
const reportLines = ['# Plausibility report', '', `Generated by scripts/validate.js — do not edit.`, ''];
for (const [k, list] of Object.entries(plaus)) {
  reportLines.push(`## ${k} (${list.length})`, '');
  for (const item of list) reportLines.push(`- ${item}`);
  reportLines.push('');
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'plausibility.md'), reportLines.join('\n'));
console.log('  ·  detail → data/plausibility.md');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n─────────────────────────────────────────────────────────');
console.log(`Polities: ${db.polities.length}  |  Successions: ${db.successions.length}  |  Territories: ${db.territories.length}  |  Provinces: ${db.provinces.length}`);
console.log(`Languages: ${db.languages.length}  |  Religions: ${db.religions.length}  |  Ethnicities: ${db.ethnicities.length}`);
console.log(`Dynasties: ${(db.dynasties||[]).length}  |  Governments: ${(db.governments||[]).length}`);
console.log(`History panels: ${panelCount}  |  Panel cells: ${cellCount}`);
console.log('');

// ── Warning ratchet ───────────────────────────────────────────────────────────
// Warnings are curation debt (e.g. missing ideology fields). They may shrink,
// never grow. Baseline is checked in; refresh it with:
//   node scripts/validate.js --update-baseline

const baselineFile = path.join(__dirname, 'warning-baseline.json');
const baselineData = fs.existsSync(baselineFile)
  ? JSON.parse(fs.readFileSync(baselineFile, 'utf8'))
  : null;
const current = { warnings, metrics: plausCounts };

if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(baselineFile, JSON.stringify(current, null, 2) + '\n');
  console.log(`Baseline updated: ${JSON.stringify(current.metrics)}, warnings ${baselineData?.warnings ?? 'none'} → ${warnings}\n`);
} else if (baselineData !== null) {
  let below = false;
  if (warnings > baselineData.warnings) {
    err(`warning count grew: ${warnings} > baseline ${baselineData.warnings} — fix the new gaps (or, if deliberate: node scripts/validate.js --update-baseline)`);
  } else if (warnings < baselineData.warnings) below = true;
  for (const [k, v] of Object.entries(baselineData.metrics || {})) {
    const cur = plausCounts[k] ?? 0;
    if (cur > v) err(`plausibility metric "${k}" grew: ${cur} > baseline ${v} — see data/plausibility.md (or, if deliberate: node scripts/validate.js --update-baseline)`);
    else if (cur < v) below = true;
  }
  if (below && !errors) console.log(`Below baseline on at least one count — lock it in: node scripts/validate.js --update-baseline\n`);
}

if (errors > 0) {
  console.error(`FAILED: ${errors} error(s), ${warnings} warning(s)\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`PASSED with ${warnings} warning(s)\n`);
} else {
  console.log('PASSED — data is clean\n');
}
