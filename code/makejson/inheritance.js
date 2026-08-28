#!/usr/bin/env node

/**
 * Generate data/inheritance/ from the curated inheritance layer:
 *   csvs/inheritance_claim.csv        → the (heir, source) edges
 *   csvs/inheritance_axis.csv         → per-identity-axis payloads (nested)
 *   csvs/inheritance_recognition.csv  → perspectival recognition (nested)
 *   csvs/axis_terminus.csv            → positive extinction records
 *
 * Output:
 *   data/inheritance/claims.json   — claims with axes[] and recognition[] nested
 *   data/inheritance/terminus.json — flat terminus records
 *
 * Canonical model: docs/model/inheritance.md
 */

const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../../csvs');
const OUT_DIR = path.join(__dirname, '../../data/inheritance');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function readCSV(file) {
  const content = fs.readFileSync(path.join(CSV_DIR, file), 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

function parseInt2(value) {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

function main() {
  const claims      = readCSV('inheritance_claim.csv');
  const axes        = readCSV('inheritance_axis.csv');
  const recognition = readCSV('inheritance_recognition.csv');
  const terminus    = readCSV('axis_terminus.csv');

  const out = claims.filter(c => c.id).map(c => ({
    id:                     c.id,
    heir_polity_id:         c.heir_polity_id,
    source_id:              c.source_id,
    source_type:            c.source_type,
    source_temporal_status: c.source_temporal_status,
    topology:               c.topology,
    mechanism:              c.mechanism,
    legitimacy_mode:        c.legitimacy_mode,
    exclusivity:            c.exclusivity,
    temporal_gap_years:     parseInt2(c.temporal_gap_years),
    provenance:             c.provenance || null,
    note:                   c.note || null,
    axes: axes.filter(a => a.claim_id === c.id).map(a => ({
      axis:     a.axis,
      stance:   a.stance || null,
      strength: parseInt2(a.strength),
      note:     a.note || null,
    })),
    recognition: recognition.filter(r => r.claim_id === c.id).map(r => ({
      observer_id:   r.observer_id,
      observer_type: r.observer_type,
      degree:        r.degree,
      note:          r.note || null,
    })),
  }));

  const termOut = terminus.filter(t => t.polity_id).map(t => ({
    polity_id: t.polity_id,
    axis:      t.axis,
    year:      parseInt2(t.year),
    note:      t.note || null,
  }));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'claims.json'), JSON.stringify(out, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT_DIR, 'terminus.json'), JSON.stringify(termOut, null, 2) + '\n');

  console.log(`✓ Written ${out.length} inheritance claims (${axes.length} axis rows, ${recognition.length} recognition rows) + ${termOut.length} terminus records → data/inheritance/`);
}

main();
