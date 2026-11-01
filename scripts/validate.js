#!/usr/bin/env node

/**
 * Anagnosis data validator — runs against the AUTHORED layer (csvs/, panels/)
 * plus the derived succession CSV. It does not read data/, so it needs no build.
 *
 * Run: node scripts/validate.js   (also `npm test`)
 *
 * Checks
 *   1. Every CSV has exactly the expected header (schema drift)
 *   2. No duplicate primary keys; no CRLF line endings; no list-commas in id-like fields
 *   3. Required fields; start_year <= end_year
 *   4. Every foreign key resolves (polity, junction tables, city tables, figures)
 *   5. Taxonomy parent_id resolves and has no cycles
 *   6. derived/polity_succession.csv: endpoints exist, no self-loops, no duplicate edges,
 *      shared_territories resolve
 *   7. panels/: every cell polity ref resolves (warning — stubs may not exist yet);
 *      every cell ethnicity ref resolves, and no entry has both keys (errors)
 *   8. source.csv: licence is allowlisted, required fields present;
 *      fact_source.csv: table, row, field, and source all resolve
 *   9. id format; year sanity
 *  10. Inheritance layer: enums and references (docs/model/inheritance.md)
 *  11. Plausibility metrics (detail in data/plausibility.md)
 *
 * Warnings and metrics are ratcheted in scripts/warning-baseline.json: they may
 * shrink, never grow. Refresh with: node scripts/validate.js --update-baseline
 *
 * Errors fail the run (exit 1). Warnings are reported in aggregate.
 */

const fs   = require('fs');
const path = require('path');
const csv  = require('../code/lib/csv');
const { ALLOWED_LICENCES } = require('../code/lib/licences');

const ROOT    = path.join(__dirname, '..');
const CSVS    = path.join(ROOT, 'csvs');
const DERIVED = path.join(ROOT, 'derived');
const PANELS  = path.join(ROOT, 'panels');

// ── Expected schemas (authored layer) ─────────────────────────────────────────

const SCHEMA = {
  'polity':            ['id', 'name', 'id_ruling_ethnicity', 'id_ruling_language', 'id_ruling_religion', 'government', 'start_year', 'end_year', 'policies', 'note', 'start_basis', 'end_basis'],
  'polity_territory':  ['territory_id', 'polity_id', 'start_year', 'end_year'],
  'polity_dynasty':    ['polity_id', 'dynasty_id', 'start_year', 'end_year'],
  'territory':         ['id', 'name'],
  'dynasty':           ['id', 'name', 'ethnicity', 'origin_region', 'note'],
  'figure':            ['polity_id', 'figure_id', 'name', 'role', 'years', 'significance'],
  'government':        ['id', 'name', 'finer_type', 'weber_legitimacy', 'description'],
  'ethnicity':         ['id', 'name', 'parent_id', 'description', 'founded'],
  'language':          ['id', 'name', 'parent_id', 'description', 'founded'],
  'religion':          ['id', 'name', 'parent_id', 'description', 'founded'],
  'city':              ['id', 'name', 'lat', 'lon', 'founding_year', 'abandonment_year', 'region', 'modern_country', 'note'],
  'city_name':         ['city_id', 'name', 'language', 'start_year', 'end_year', 'note'],
  'city_succession':   ['from_city_id', 'to_city_id', 'succession_type', 'year', 'note'],
  'source':            ['id', 'name', 'url', 'licence', 'version', 'retrieved', 'citation', 'note'],
  'fact_source':       ['entity_table', 'entity_id', 'field', 'source_id', 'source_record', 'note'],
  'inheritance_claim': ['id', 'heir_polity_id', 'source_id', 'source_type', 'source_temporal_status', 'topology', 'mechanism', 'legitimacy_mode', 'exclusivity', 'temporal_gap_years', 'provenance', 'note'],
  'inheritance_axis':  ['claim_id', 'axis', 'stance', 'strength', 'note'],
  'inheritance_recognition': ['claim_id', 'observer_id', 'observer_type', 'degree', 'note'],
  'axis_terminus':     ['polity_id', 'axis', 'year', 'note'],
};

// Free-text columns where commas are prose, not list separators.
const PROSE_COLUMNS = new Set(['note', 'description', 'significance', 'name', 'citation']);

// Empty means the date has not been assessed yet. See docs/model/polity.md.
const DATE_BASIS = new Set(['', 'recorded', 'estimated', 'first_attested']);

// ── Reporting ─────────────────────────────────────────────────────────────────

const report = { errors: 0, warnings: 0 };
const groups = new Map(); // category → { level, items[] }

function add(level, category, msg) {
  if (!groups.has(category)) groups.set(category, { level, items: [] });
  groups.get(category).items.push(msg);
  report[level === 'error' ? 'errors' : 'warnings']++;
}
const err  = (cat, msg) => add('error', cat, msg);
const warn = (cat, msg) => add('warning', cat, msg);

function section(title) { console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 56 - title.length))}`); }
function flush(maxExamples = 8) {
  for (const [category, { level, items }] of groups) {
    const mark = level === 'error' ? '✗' : '⚠';
    console.log(`  ${mark}  ${category}: ${items.length}`);
    items.slice(0, maxExamples).forEach(m => console.log(`       ${m}`));
    if (items.length > maxExamples) console.log(`       … ${items.length - maxExamples} more`);
  }
  groups.clear();
}
function ok(msg) { console.log(`  ✓  ${msg}`); }

// ── Load ──────────────────────────────────────────────────────────────────────

const T = {};   // table name → rows
const RAW = {}; // table name → raw text
for (const name of Object.keys(SCHEMA)) {
  const file = path.join(CSVS, `${name}.csv`);
  if (!fs.existsSync(file)) { err('missing CSV', `csvs/${name}.csv`); T[name] = []; continue; }
  RAW[name] = fs.readFileSync(file, 'utf8');
  T[name] = csv.parse(RAW[name]);
}

const ids = {
  polity:     new Set(T.polity.map(r => r.id)),
  territory:  new Set(T.territory.map(r => r.id)),
  dynasty:    new Set(T.dynasty.map(r => r.id)),
  government: new Set(T.government.map(r => r.id)),
  ethnicity:  new Set(T.ethnicity.map(r => r.id)),
  language:   new Set(T.language.map(r => r.id)),
  religion:   new Set(T.religion.map(r => r.id)),
  city:       new Set(T.city.map(r => r.id)),
};

// ── 1. Schema ─────────────────────────────────────────────────────────────────

section('CSV schema');
for (const [name, expected] of Object.entries(SCHEMA)) {
  if (!RAW[name]) continue;
  const actual = csv.headersOf(RAW[name]);
  if (actual.join(',') !== expected.join(',')) {
    err('header mismatch', `${name}.csv has [${actual.join(',')}] expected [${expected.join(',')}]`);
  }
  const rows = csv.parseRows(RAW[name]).slice(1).filter(r => !(r.length === 1 && r[0] === ''));
  const wide = rows.filter(r => r.length !== expected.length).length;
  if (wide) err('ragged rows', `${name}.csv: ${wide} row(s) with a field count ≠ ${expected.length}`);
}
for (const f of fs.readdirSync(CSVS)) {
  if (f.endsWith('.csv') && !SCHEMA[f.slice(0, -4)]) err('CSV not in SCHEMA', f);
}
if (!groups.size) ok('all headers match, no ragged rows'); flush();

// ── 2. Keys, line endings, list-commas ────────────────────────────────────────

section('Primary keys & file hygiene');
const PK = { inheritance_claim: ['id'], inheritance_axis: ['claim_id', 'axis'], inheritance_recognition: ['claim_id', 'observer_id'], axis_terminus: ['polity_id', 'axis'], polity: ['id'], territory: ['id'], dynasty: ['id'], government: ['id'], ethnicity: ['id'], language: ['id'], religion: ['id'], city: ['id'], figure: ['figure_id'],
  polity_territory: ['territory_id', 'polity_id', 'start_year'], polity_dynasty: ['polity_id', 'dynasty_id', 'start_year'], city_name: ['city_id', 'name', 'start_year'], city_succession: ['from_city_id', 'to_city_id'],
  source: ['id'], fact_source: ['entity_table', 'entity_id', 'field', 'source_id'] };
for (const [name, cols] of Object.entries(PK)) {
  const seen = new Set();
  for (const r of T[name]) {
    const key = cols.map(c => r[c]).join('|');
    if (cols.some(c => !r[c]) && cols.length === 1) { err('empty primary key', `${name}.csv row with empty ${cols[0]}`); continue; }
    if (seen.has(key)) err('duplicate primary key', `${name}.csv: ${key}`); else seen.add(key);
  }
}
for (const [name, text] of Object.entries(RAW)) {
  if (text.includes('\r\n')) warn('CRLF line endings', `${name}.csv (normalise to LF: any write through code/lib/csv.js does this)`);
}
for (const [name, expected] of Object.entries(SCHEMA)) {
  for (const r of T[name]) {
    for (const col of expected) {
      if (!PROSE_COLUMNS.has(col) && r[col] && r[col].includes(',')) {
        warn('comma in list/id field', `${name}.csv ${r.id || r[expected[0]]}.${col} = "${r[col]}" (use | for lists, ; in prose)`);
      }
    }
  }
}
if (!groups.size) ok('keys unique, LF endings, no stray commas'); flush();

// ── 3. Required fields & dates ────────────────────────────────────────────────

section('Required fields & dates');
for (const r of T.polity) {
  if (!r.name)                err('polity missing name', r.id);
  if (!r.id_ruling_ethnicity) err('polity missing ruling ethnicity', r.id);
  if (r.start_year === '')    err('polity missing start_year', r.id);
  if (!r.id_ruling_religion)  warn('polity missing religion', r.id);
  if (!r.government)          warn('polity missing government', r.id);
  const s = csv.toInt(r.start_year), e = csv.toInt(r.end_year);
  if (r.start_year !== '' && s === null) err('non-integer year', `polity ${r.id}.start_year = "${r.start_year}"`);
  if (r.end_year !== '' && e === null)   err('non-integer year', `polity ${r.id}.end_year = "${r.end_year}"`);
  if (s !== null && e !== null && s > e) err('start after end', `polity ${r.id}: ${s} > ${e}`);
  for (const col of ['start_basis', 'end_basis']) if (!DATE_BASIS.has(r[col])) err('polity date basis invalid', `${r.id}.${col} = "${r[col]}"`);
}
for (const name of ['polity_territory', 'polity_dynasty']) {
  for (const r of T[name]) {
    const s = csv.toInt(r.start_year), e = csv.toInt(r.end_year);
    if (r.start_year !== '' && s === null) err('non-integer year', `${name} ${r.polity_id}.start_year = "${r.start_year}"`);
    if (s !== null && e !== null && s > e) err('start after end', `${name} ${r.territory_id || r.dynasty_id}/${r.polity_id}: ${s} > ${e}`);
  }
}
if (!groups.size) ok('all required fields present, dates ordered'); flush();

// ── 4. Foreign keys ───────────────────────────────────────────────────────────

section('Foreign keys');
function fk(level, table, row, col, target, label = row.id || row[Object.keys(row)[0]]) {
  const v = row[col];
  if (v && !ids[target].has(v)) add(level, `${table}.${col} → ${target}`, `${label}: "${v}"`);
}
for (const r of T.polity) {
  fk('error', 'polity', r, 'id_ruling_ethnicity', 'ethnicity');
  fk('error', 'polity', r, 'id_ruling_language',  'language');
  fk('error', 'polity', r, 'id_ruling_religion',  'religion');
  fk('error', 'polity', r, 'government',          'government');
}
for (const r of T.polity_territory) {
  fk('error', 'polity_territory', r, 'territory_id', 'territory', `${r.territory_id}/${r.polity_id}`);
  fk('error', 'polity_territory', r, 'polity_id',    'polity',    `${r.territory_id}/${r.polity_id}`);
}
for (const r of T.polity_dynasty) {
  fk('error', 'polity_dynasty', r, 'polity_id',  'polity',  `${r.polity_id}/${r.dynasty_id}`);
  fk('error', 'polity_dynasty', r, 'dynasty_id', 'dynasty', `${r.polity_id}/${r.dynasty_id}`);
}
for (const r of T.figure)          fk('error', 'figure', r, 'polity_id', 'polity', r.figure_id);
for (const r of T.dynasty)         fk('warning', 'dynasty', r, 'ethnicity', 'ethnicity');
for (const r of T.city_name)       fk('error', 'city_name', r, 'city_id', 'city', `${r.city_id}/${r.name}`);
for (const r of T.city_succession) { fk('error', 'city_succession', r, 'from_city_id', 'city', `${r.from_city_id}→${r.to_city_id}`); fk('error', 'city_succession', r, 'to_city_id', 'city', `${r.from_city_id}→${r.to_city_id}`); }
if (!groups.size) ok('all foreign keys resolve'); flush();

// ── 5. Taxonomy trees ─────────────────────────────────────────────────────────

section('Taxonomy trees (parent_id)');
for (const name of ['ethnicity', 'language', 'religion']) {
  const byId = new Map(T[name].map(r => [r.id, r]));
  for (const r of T[name]) {
    if (r.parent_id && !byId.has(r.parent_id)) err(`${name} parent_id unresolved`, `${r.id} → "${r.parent_id}"`);
    const seen = new Set([r.id]);
    let cur = byId.get(r.parent_id);
    while (cur) {
      if (seen.has(cur.id)) { err(`${name} parent cycle`, `involving ${cur.id}`); break; }
      seen.add(cur.id); cur = byId.get(cur.parent_id);
    }
  }
}
if (!groups.size) ok('all parents resolve, no cycles'); flush();

// ── 6. Derived succession edges ───────────────────────────────────────────────

section('derived/polity_succession.csv');
const succFile = path.join(DERIVED, 'polity_succession.csv');
let succ = [];
if (!fs.existsSync(succFile)) {
  warn('derived file missing', 'derived/polity_succession.csv — run `npm run make:succession-edges`');
} else {
  succ = csv.readFile(succFile);
  const seen = new Set();
  for (const s of succ) {
    const key = `${s.from_polity_id}→${s.to_polity_id}`;
    if (!s.from_polity_id || !s.to_polity_id) { err('succession missing endpoint', JSON.stringify(s)); continue; }
    if (s.from_polity_id === s.to_polity_id)  err('succession self-loop', key);
    if (!ids.polity.has(s.from_polity_id))    err('succession endpoint not a polity', `from ${s.from_polity_id}`);
    if (!ids.polity.has(s.to_polity_id))      err('succession endpoint not a polity', `to ${s.to_polity_id}`);
    if (seen.has(key)) err('duplicate succession edge', key); else seen.add(key);
    for (const t of csv.splitPipe(s.shared_territories)) if (!ids.territory.has(t)) err('shared_territory unresolved', `${key}: ${t}`);
  }
  if (!groups.size) ok(`${succ.length} edges valid`);
}
flush();

// ── 7. Panels ─────────────────────────────────────────────────────────────────

section('panels/ polity references');
function walkPanels(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkPanels(p));
    else if (e.name.endsWith('.json')) {
      try { out.push({ file: p, data: JSON.parse(fs.readFileSync(p, 'utf8')) }); }
      catch (ex) { err('panel JSON unparsable', `${path.relative(ROOT, p)}: ${ex.message}`); }
    }
  }
  return out;
}
const panels = walkPanels(PANELS);
let cellCount = 0;
const unresolvedRefs = new Map();
for (const { file, data } of panels) {
  const panelId = data.id || path.basename(file, '.json');
  for (const row of (data.rows || [])) for (const cell of (row.cells || [])) {
    const entries = [cell, ...(cell.stack || []), ...(cell.split || [])];
    for (const entry of entries) {
      if (entry !== cell) cellCount++;
      if (entry.polity && entry.ethnicity) err('panel entry has both polity and ethnicity', `${panelId}: ${entry.label}`);
      if (entry.ethnicity && !ids.ethnicity.has(entry.ethnicity)) err('panel ethnicity ref not in ethnicity.csv', `${panelId}: "${entry.ethnicity}"`);
      if (entry.polity && !ids.polity.has(entry.polity)) {
        unresolvedRefs.set(entry.polity, (unresolvedRefs.get(entry.polity) || 0) + 1);
        if (!unresolvedRefs.has(`${entry.polity}@${panelId}`)) unresolvedRefs.set(`${entry.polity}@${panelId}`, 0);
      }
    }
  }
}
const distinctUnresolved = [...unresolvedRefs.keys()].filter(k => !k.includes('@'));
for (const id of distinctUnresolved) warn('panel polity ref not in polity.csv', `${id} (${unresolvedRefs.get(id)} cell(s))`);
if (!panels.length) warn('no panels found', 'panels/ is empty or missing');
else if (!distinctUnresolved.length) ok(`${panels.length} panels, ${cellCount} cells — all polity refs resolve`);
else console.log(`  ·  ${panels.length} panels, ${cellCount} cells, ${distinctUnresolved.length} distinct unresolved polity ids`);
flush(15);

// ── 8. Sources & provenance ───────────────────────────────────────────────────

section('Sources & provenance');
for (const r of T.source) {
  if (!ALLOWED_LICENCES.has(r.licence)) err('source licence not allowed', `${r.id}: "${r.licence}" (see docs/model/source.md)`);
  for (const col of ['name', 'url', 'version', 'citation']) if (!r[col]) err('source missing field', `${r.id}.${col}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved)) err('source retrieved not YYYY-MM-DD', `${r.id}: "${r.retrieved}"`);
}
const sourceIds = new Set(T.source.map(r => r.id));
const usedSources = new Set();
const rowKeys = {}; // table name → set of primary keys, built on first use
for (const r of T.fact_source) {
  const label = `${r.entity_table}/${r.entity_id}`;
  usedSources.add(r.source_id);
  if (!sourceIds.has(r.source_id)) err('fact_source.source_id → source', `${label}: "${r.source_id}"`);
  if (!PK[r.entity_table] || r.entity_table === 'source' || r.entity_table === 'fact_source') { err('fact_source table unknown', label); continue; }
  rowKeys[r.entity_table] ??= new Set(T[r.entity_table].map(row => PK[r.entity_table].map(c => row[c]).join('|')));
  if (!rowKeys[r.entity_table].has(r.entity_id)) err('fact_source row not found', label);
  if (r.field && !SCHEMA[r.entity_table].includes(r.field)) err('fact_source field unknown', `${label}.${r.field}`);
}
for (const r of T.source) if (!usedSources.has(r.id)) warn('source unused', `${r.id} (no fact_source row points to it)`);
if (!groups.size) ok(`${T.source.length} sources, ${T.fact_source.length} provenance rows`); flush();

// ── 9. id format & year sanity ────────────────────────────────────────────────

section('id format & years');
// Existing ids use unicode letters and apostrophes (goktürk_khaganate, k'iche'),
// so reject only clear mistakes.
const BAD_ID = /[\sA-Z",;]/;
const YEAR_COLS = { polity: ['start_year', 'end_year'], city: ['founding_year', 'abandonment_year'] };
const CURRENT_YEAR = new Date().getFullYear();
for (const [name, expected] of Object.entries(SCHEMA)) {
  if (!expected.includes('id')) continue;
  for (const r of T[name]) if (r.id && BAD_ID.test(r.id)) err('malformed id', `${name}.csv "${r.id}"`);
}
for (const [name, cols] of Object.entries(YEAR_COLS)) {
  for (const r of T[name]) for (const col of cols) {
    if (r[col] === '') continue;
    const y = Number(r[col]);
    if (!Number.isInteger(y) || y < -10000 || y > CURRENT_YEAR + 1) err('insane year', `${name}.csv ${r.id}.${col} = "${r[col]}"`);
  }
}
for (const r of T.city) {
  if (r.founding_year !== '' && r.abandonment_year !== '' && +r.founding_year > +r.abandonment_year) err('start after end', `city.csv ${r.id}`);
}
if (!groups.size) ok('all ids and years well-formed'); flush();

// ── 10. Inheritance layer ─────────────────────────────────────────────────────

section('Inheritance layer');
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
const polityIds = new Set(T.polity.map(r => r.id));
const SOURCE_SETS = { polity: polityIds, ethnicity: new Set(T.ethnicity.map(r => r.id)), religion: new Set(T.religion.map(r => r.id)) };
const claimIds = new Set();
for (const c of T.inheritance_claim) {
  const ctx = c.id;
  if (claimIds.has(c.id)) err('inheritance duplicate claim', ctx);
  claimIds.add(c.id);
  if (!polityIds.has(c.heir_polity_id)) err('inheritance heir → polity', `${ctx}: "${c.heir_polity_id}"`);
  if (SOURCE_SETS[c.source_type] && !SOURCE_SETS[c.source_type].has(c.source_id)) err('inheritance source_id', `${ctx}: "${c.source_id}" not in ${c.source_type}`);
  for (const f of ['source_type', 'source_temporal_status', 'topology', 'mechanism', 'legitimacy_mode', 'exclusivity']) {
    if (!INH[f].has(c[f])) err('inheritance bad enum', `${ctx}.${f} = "${c[f]}"`);
  }
  if (!c.id) err('inheritance empty claim id', c.heir_polity_id);
  if (!/^(wp|wd|panel|ref):.+/.test(c.provenance)) err('inheritance bad provenance', `${ctx}: "${c.provenance}"`);
}
for (const a of T.inheritance_axis) {
  const ctx = `${a.claim_id}/${a.axis}`;
  if (!claimIds.has(a.claim_id)) err('inheritance axis → claim', ctx);
  if (!INH.axis.has(a.axis)) err('inheritance bad enum', `${ctx} axis`);
  if (a.stance && !INH.stance.has(a.stance)) err('inheritance bad enum', `${ctx} stance "${a.stance}"`);
  if (a.strength !== '' && !(+a.strength >= 1 && +a.strength <= 5)) err('inheritance strength out of 1-5', ctx);
}
for (const r of T.inheritance_recognition) {
  const ctx = `${r.claim_id}/${r.observer_id}`;
  if (!claimIds.has(r.claim_id)) err('inheritance recognition → claim', ctx);
  if (!INH.degree.has(r.degree)) err('inheritance bad enum', `${ctx} degree "${r.degree}"`);
  if (!INH.observer_type.has(r.observer_type)) err('inheritance bad enum', `${ctx} observer_type "${r.observer_type}"`);
  else if (r.observer_type === 'polity' && !polityIds.has(r.observer_id)) err('inheritance observer → polity', ctx);
}
for (const t of T.axis_terminus) {
  if (!polityIds.has(t.polity_id)) err('axis_terminus → polity', t.polity_id);
  if (!INH.axis.has(t.axis)) err('inheritance bad enum', `terminus ${t.polity_id} axis "${t.axis}"`);
}
if (!groups.size) ok(`${T.inheritance_claim.length} claims, ${T.axis_terminus.length} terminus records`); flush();

// ── 11. Plausibility metrics ──────────────────────────────────────────────────

// Machine checks prove coherence, not truth, but wrong history tends to be
// incoherent, so these flag where review should concentrate.
section('Plausibility metrics');
const polityById = new Map(T.polity.map(p => [p.id, p]));
const plaus = { no_people_no_land_edges: [], gap_over_200: [], start_inversions: [], long_lived_polities: [] };
for (const e of succ) {
  const key = `${e.from_polity_id} → ${e.to_polity_id}`;
  if (!csv.toBool(e.same_ethnicity) && !csv.toBool(e.related_ethnicity) && +e.shared_territory_count === 0) plaus.no_people_no_land_edges.push(key);
  if (+e.temporal_gap_years > 200) plaus.gap_over_200.push(`${key} (gap ${e.temporal_gap_years}y)`);
  const f = polityById.get(e.from_polity_id), t = polityById.get(e.to_polity_id);
  if (f && t && +t.start_year < +f.start_year) plaus.start_inversions.push(`${key} (${t.start_year} < ${f.start_year})`);
}
for (const p of T.polity) {
  if (p.end_year !== '' && +p.end_year - +p.start_year > 1200) plaus.long_lived_polities.push(`${p.id} (${p.start_year}..${p.end_year})`);
}
const plausCounts = Object.fromEntries(Object.entries(plaus).map(([k, v]) => [k, v.length]));
for (const [k, v] of Object.entries(plausCounts)) console.log(`  ·  ${k}: ${v}`);
const reportLines = ['# Plausibility report', '', 'Generated by scripts/validate.js. Do not edit.', ''];
for (const [k, list] of Object.entries(plaus)) reportLines.push(`## ${k} (${list.length})`, '', ...list.map(i => `- ${i}`), '');
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'plausibility.md'), reportLines.join('\n'));

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(59));
console.log(`Polities: ${T.polity.length}  |  Territories: ${T.territory.length}  |  Junction rows: ${T.polity_territory.length}  |  Dynasties: ${T.dynasty.length}`);
console.log(`Ethnicities: ${T.ethnicity.length}  |  Languages: ${T.language.length}  |  Religions: ${T.religion.length}  |  Governments: ${T.government.length}`);
console.log(`Figures: ${T.figure.length}  |  Cities: ${T.city.length}  |  Succession edges: ${succ.length}  |  Panels: ${panels.length} (${cellCount} cells)`);
console.log(`Sources: ${T.source.length}  |  Provenance rows: ${T.fact_source.length}`);
console.log('');

// ── Warning ratchet ───────────────────────────────────────────────────────────

const baselineFile = path.join(__dirname, 'warning-baseline.json');
const baseline = fs.existsSync(baselineFile) ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null;
if (process.argv.includes('--update-baseline')) {
  fs.writeFileSync(baselineFile, JSON.stringify({ warnings: report.warnings, metrics: plausCounts }, null, 2) + '\n');
  console.log(`Baseline updated: ${report.warnings} warnings\n`);
} else if (baseline) {
  if (report.warnings > baseline.warnings) err('ratchet', `warning count grew: ${report.warnings} > ${baseline.warnings}`);
  for (const [k, v] of Object.entries(baseline.metrics)) {
    if ((plausCounts[k] ?? 0) > v) err('ratchet', `metric ${k} grew: ${plausCounts[k]} > ${v}`);
  }
  flush();
}

if (report.errors > 0) { console.error(`FAILED: ${report.errors} error(s), ${report.warnings} warning(s)\n`); process.exit(1); }
else if (report.warnings > 0) console.warn(`PASSED with ${report.warnings} warning(s)\n`);
else console.log('PASSED — data is clean\n');
