#!/usr/bin/env node

/** csvs/territory.csv (+ polity_territory.csv) → data/territory/<id>.json */

const fs   = require('fs');
const path = require('path');
const csv  = require('../lib/csv');

const ROOT          = path.join(__dirname, '../..');
const TERRITORY_CSV = path.join(ROOT, 'csvs/territory.csv');
const PERIODS_CSV   = path.join(ROOT, 'csvs/polity_territory.csv');
const OUTPUT_DIR    = path.join(ROOT, 'data/territory');

function main() {
  console.log(`Reading territories from: ${TERRITORY_CSV}`);
  console.log(`Reading periods from:     ${PERIODS_CSV}`);

  if (!fs.existsSync(TERRITORY_CSV) || !fs.existsSync(PERIODS_CSV)) {
    console.error('Error: territory.csv or polity_territory.csv not found');
    process.exit(1);
  }

  const territories = csv.readFile(TERRITORY_CSV).filter(t => t.id);
  const periods     = csv.readFile(PERIODS_CSV).filter(p => p.territory_id && p.polity_id);

  const periodsByTerritory = new Map();
  for (const p of periods) {
    if (!periodsByTerritory.has(p.territory_id)) periodsByTerritory.set(p.territory_id, []);
    const period = { polity_id: p.polity_id, start_year: csv.toInt(p.start_year) };
    const end = csv.toInt(p.end_year);
    if (end !== null) period.end_year = end;
    periodsByTerritory.get(p.territory_id).push(period);
  }
  for (const list of periodsByTerritory.values()) {
    list.sort((a, b) => (a.start_year ?? 0) - (b.start_year ?? 0));
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const file of fs.readdirSync(OUTPUT_DIR)) {
    if (file.endsWith('.json')) fs.unlinkSync(path.join(OUTPUT_DIR, file));
  }

  let created = 0;
  for (const t of territories) {
    const polities = periodsByTerritory.get(t.id) || [];
    const territory = { id: t.id, name: t.name, polity_count: polities.length, polities };
    fs.writeFileSync(path.join(OUTPUT_DIR, `${t.id}.json`), JSON.stringify(territory, null, 2) + '\n');
    created++;
  }

  console.log(`\n✓ Generated ${created} territory files`);
  console.log(`  Total polity control periods: ${periods.length}`);
}

main();
