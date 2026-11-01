#!/usr/bin/env node

/** csvs/government.csv (+ polity.csv for counts) → data/government/<id>.json */

const fs   = require('fs');
const path = require('path');
const csv  = require('../lib/csv');

const ROOT       = path.join(__dirname, '../..');
const CSV_FILE   = path.join(ROOT, 'csvs/government.csv');
const POLITY_CSV = path.join(ROOT, 'csvs/polity.csv');
const DATA_DIR   = path.join(ROOT, 'data/government');

function main() {
  console.log(`Reading CSV: ${CSV_FILE}`);
  console.log(`Output dir:  ${DATA_DIR}\n`);

  if (!fs.existsSync(CSV_FILE)) { console.error('Error: government.csv not found'); process.exit(1); }

  const rows = csv.readFile(CSV_FILE).filter(r => r.id);

  const polityCounts = new Map();
  if (fs.existsSync(POLITY_CSV)) {
    for (const p of csv.readFile(POLITY_CSV)) {
      if (p.government) polityCounts.set(p.government, (polityCounts.get(p.government) || 0) + 1);
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(DATA_DIR, file));
  }

  let created = 0;
  for (const row of rows) {
    const gov = {
      id: row.id,
      name: row.name,
      finer_type: row.finer_type || null,
      weber_legitimacy: row.weber_legitimacy || null,
      description: row.description || null,
      polity_count: polityCounts.get(row.id) || 0,
    };
    fs.writeFileSync(path.join(DATA_DIR, `${row.id}.json`), JSON.stringify(gov, null, 2) + '\n');
    created++;
  }

  console.log(`✓ Created: ${created} government files`);
  console.log(`  Finer types: ${[...new Set(rows.map(r => r.finer_type))].join(', ')}`);
  console.log(`  Weber types: ${[...new Set(rows.map(r => r.weber_legitimacy))].join(', ')}`);
}

main();
