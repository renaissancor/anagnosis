#!/usr/bin/env node

/**
 * csvs/polity.csv (+ polity_territory.csv, figure.csv) → data/polity/<id>.json
 *
 * Territories are read from the polity_territory junction table only; polity.csv
 * carries no territory column.
 */

const fs   = require('fs');
const path = require('path');
const csv  = require('../lib/csv');

const ROOT          = path.join(__dirname, '../..');
const POLITY_CSV    = path.join(ROOT, 'csvs/polity.csv');
const TERRITORY_CSV = path.join(ROOT, 'csvs/polity_territory.csv');
const FIGURE_CSV    = path.join(ROOT, 'csvs/figure.csv');
const DATA_DIR      = path.join(ROOT, 'data/polity');

function loadFiguresByPolity() {
  if (!fs.existsSync(FIGURE_CSV)) return new Map();
  const byPolity = new Map();
  for (const row of csv.readFile(FIGURE_CSV)) {
    if (!row.polity_id) continue;
    const fig = {};
    if (row.figure_id)    fig.id           = row.figure_id;
    if (row.name)         fig.name         = row.name;
    if (row.role)         fig.role         = row.role;
    if (row.years)        fig.years        = row.years;
    if (row.significance) fig.significance = row.significance;
    if (!byPolity.has(row.polity_id)) byPolity.set(row.polity_id, []);
    byPolity.get(row.polity_id).push(fig);
  }
  return byPolity;
}

/** polity_id → ordered, de-duplicated list of territory ids (by first control start). */
function loadTerritoriesByPolity() {
  const rows = csv.readFile(TERRITORY_CSV)
    .filter(r => r.polity_id && r.territory_id)
    .sort((a, b) => (csv.toInt(a.start_year) ?? 0) - (csv.toInt(b.start_year) ?? 0));
  const byPolity = new Map();
  for (const r of rows) {
    if (!byPolity.has(r.polity_id)) byPolity.set(r.polity_id, []);
    const list = byPolity.get(r.polity_id);
    if (!list.includes(r.territory_id)) list.push(r.territory_id);
  }
  return byPolity;
}

function buildPolity(row, territoriesByPolity, figuresByPolity) {
  const polity = { id: row.id, name: row.name };

  if (row.id_ruling_ethnicity) polity.ruling_ethnicity  = row.id_ruling_ethnicity;
  if (row.id_ruling_language)  polity.cultural_language = row.id_ruling_language;

  if (row.id_ruling_religion || row.government) {
    polity.ideology = {};
    if (row.id_ruling_religion) polity.ideology.religion   = row.id_ruling_religion;
    if (row.government)         polity.ideology.government = row.government;
  }

  const territories = territoriesByPolity.get(row.id) || [];
  if (territories.length) polity.territories = territories;

  polity.start = csv.toInt(row.start_year);
  polity.end   = csv.toInt(row.end_year);

  const policies = csv.splitPipe(row.policies);
  if (policies.length) polity.policies = policies;

  if (row.note) polity.note = row.note;

  const figures = figuresByPolity.get(row.id) || [];
  if (figures.length) polity.figures = figures;

  return polity;
}

function main() {
  console.log(`Reading CSV: ${POLITY_CSV}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(POLITY_CSV)) { console.error('Error: polity.csv not found'); process.exit(1); }

  const rows = csv.readFile(POLITY_CSV).filter(r => r.id);
  const territoriesByPolity = loadTerritoriesByPolity();
  const figuresByPolity     = loadFiguresByPolity();

  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  const errors = [];
  let created = 0;
  for (const row of rows) {
    try {
      const polity = buildPolity(row, territoriesByPolity, figuresByPolity);
      fs.writeFileSync(path.join(DATA_DIR, `${row.id}.json`), JSON.stringify(polity, null, 2) + '\n');
      created++;
    } catch (err) {
      errors.push({ id: row.id, error: err.message });
    }
  }

  console.log('=== Generation Results ===');
  console.log(`✓ Created:  ${created} polity files`);
  console.log(`✗ Errors:   ${errors.length}\n`);
  errors.forEach(e => console.log(`  ✗ ${e.id}: ${e.error}`));
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
