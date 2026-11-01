#!/usr/bin/env node

/**
 * derived/polity_succession.csv → data/succession/all.json
 *
 * The input is a computed file written by code/generate-successions.js
 * (run `npm run make:succession-edges` first, or `npm run make:all`).
 */

const fs   = require('fs');
const path = require('path');
const csv  = require('../lib/csv');

const ROOT     = path.join(__dirname, '../..');
const CSV_FILE = path.join(ROOT, 'derived/polity_succession.csv');
const OUT_FILE = path.join(ROOT, 'data/succession/all.json');

function buildSuccession(row) {
  return {
    from:                   row.from_polity_id,
    to:                     row.to_polity_id,
    territorial_direction:  row.territorial_direction || 'unknown',
    strength:               csv.toInt(row.strength),
    shared_territories:     csv.splitPipe(row.shared_territories),
    shared_territory_count: csv.toInt(row.shared_territory_count),
    same_ethnicity:         csv.toBool(row.same_ethnicity),
    related_ethnicity:      csv.toBool(row.related_ethnicity),
    same_language:          csv.toBool(row.same_language),
    same_religion:          csv.toBool(row.same_religion),
    temporal_gap_years:     csv.toInt(row.temporal_gap_years),
  };
}

function main() {
  console.log(`Reading CSV: ${CSV_FILE}`);
  if (!fs.existsSync(CSV_FILE)) {
    console.error('Error: derived/polity_succession.csv not found — run `npm run make:succession-edges` first');
    process.exit(1);
  }

  const successions = csv.readFile(CSV_FILE)
    .filter(r => r.from_polity_id && r.to_polity_id)
    .map(buildSuccession);

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(successions, null, 2) + '\n');
  console.log(`✓ Written ${successions.length} successions → ${OUT_FILE}`);
}

main();
