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
 *   7. panels/: every cell polity ref resolves (warning — stubs may not exist yet)
 *   8. source.csv: licence is allowlisted, required fields present;
 *      fact_source.csv: table, row, field, and source all resolve
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
if (!groups.size) ok('all headers match, no ragged rows'); flush();

// ── 2. Keys, line endings, list-commas ────────────────────────────────────────

section('Primary keys & file hygiene');
const PK = { polity: ['id'], territory: ['id'], dynasty: ['id'], government: ['id'], ethnicity: ['id'], language: ['id'], religion: ['id'], city: ['id'], figure: ['figure_id'],
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

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n' + '─'.repeat(59));
console.log(`Polities: ${T.polity.length}  |  Territories: ${T.territory.length}  |  Junction rows: ${T.polity_territory.length}  |  Dynasties: ${T.dynasty.length}`);
console.log(`Ethnicities: ${T.ethnicity.length}  |  Languages: ${T.language.length}  |  Religions: ${T.religion.length}  |  Governments: ${T.government.length}`);
console.log(`Figures: ${T.figure.length}  |  Cities: ${T.city.length}  |  Succession edges: ${succ.length}  |  Panels: ${panels.length} (${cellCount} cells)`);
console.log(`Sources: ${T.source.length}  |  Provenance rows: ${T.fact_source.length}`);
console.log('');

if (report.errors > 0) { console.error(`FAILED: ${report.errors} error(s), ${report.warnings} warning(s)\n`); process.exit(1); }
else if (report.warnings > 0) console.warn(`PASSED with ${report.warnings} warning(s)\n`);
else console.log('PASSED — data is clean\n');
