#!/usr/bin/env node

/** csvs/dynasty.csv (+ polity_dynasty.csv) → data/dynasty/<id>.json */

const fs   = require('fs');
const path = require('path');
const csv  = require('../lib/csv');

const ROOT           = path.join(__dirname, '../..');
const DYNASTY_CSV    = path.join(ROOT, 'csvs/dynasty.csv');
const POLITY_DYN_CSV = path.join(ROOT, 'csvs/polity_dynasty.csv');
const DATA_DIR       = path.join(ROOT, 'data/dynasty');

function loadPolityDynastyLinks() {
  if (!fs.existsSync(POLITY_DYN_CSV)) return new Map();
  const byDynasty = new Map();
  for (const row of csv.readFile(POLITY_DYN_CSV)) {
    if (!row.dynasty_id) continue;
    if (!byDynasty.has(row.dynasty_id)) byDynasty.set(row.dynasty_id, []);
    byDynasty.get(row.dynasty_id).push({
      polity_id: row.polity_id,
      start: csv.toInt(row.start_year),
      end:   csv.toInt(row.end_year),
    });
  }
  return byDynasty;
}

function main() {
  console.log(`Reading CSV: ${DYNASTY_CSV}`);
  console.log(`Links CSV:   ${POLITY_DYN_CSV}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(DYNASTY_CSV)) { console.error('Error: dynasty.csv not found'); process.exit(1); }

  const rows  = csv.readFile(DYNASTY_CSV).filter(r => r.id);
  const links = loadPolityDynastyLinks();

  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  const errors = [];
  let created = 0;
  for (const row of rows) {
    try {
      const dynasty = { id: row.id, name: row.name };
      if (row.ethnicity)     dynasty.ethnicity     = row.ethnicity;
      if (row.origin_region) dynasty.origin_region = row.origin_region;
      if (row.note)          dynasty.note          = row.note;

      const polities = links.get(row.id) || [];
      if (polities.length) dynasty.polities = polities.sort((a, b) => (a.start ?? 0) - (b.start ?? 0));

      fs.writeFileSync(path.join(DATA_DIR, `${row.id}.json`), JSON.stringify(dynasty, null, 2) + '\n');
      created++;
    } catch (err) {
      errors.push({ id: row.id, error: err.message });
    }
  }

  console.log('=== Generation Results ===');
  console.log(`✓ Created:  ${created} dynasty files`);
  console.log(`✗ Errors:   ${errors.length}\n`);
  errors.forEach(e => console.log(`  ✗ ${e.id}: ${e.error}`));
  process.exit(errors.length > 0 ? 1 : 0);
}

main();
