#!/usr/bin/env node

/**
 * Shared taxonomy generator: CSV (source of truth) → directory tree under data/<entity>/.
 *
 * Source of truth is csvs/<entity>.csv with columns: id, name, parent_id, description, founded.
 * Hierarchy is expressed by parent_id self-references (NOT by markdown headings, NOT by path).
 *
 * Output matches what data/index.js `loadTree` expects:
 *   - Branch node (has children):  <dir>/<...ancestors>/<id>/index.json
 *   - Leaf node   (no children):   <dir>/<...ancestors-of-parent>/<parent>/<id>.json
 * The loader re-derives `parent` from the directory path, so correct nesting is what matters.
 *
 * Used by languages.js / ethnicities.js / religions.js, which supply per-entity JSON schemas.
 */

const fs   = require('fs');
const path = require('path');

// ── CSV parsing (RFC-4180-ish: quoted fields, "" escapes, commas/newlines in quotes) ──

function parseCSV(text) {
  const rows = [];
  let field = '', row = [], inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function loadRows(csvPath) {
  const cells = parseCSV(fs.readFileSync(csvPath, 'utf8'))
    .filter(r => r.some(c => c !== ''));
  const header = cells.shift().map(h => h.trim());
  return cells.map(r => {
    const o = {};
    header.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
    return o;
  });
}

// ── Tree assembly from parent_id ────────────────────────────────────────────────

function indexNodes(rows) {
  const byId = new Map();
  for (const r of rows) {
    if (!r.id) continue;
    if (byId.has(r.id)) throw new Error(`Duplicate id: ${r.id}`);
    byId.set(r.id, r);
  }

  const parentIds = new Set();
  for (const r of byId.values()) {
    if (r.parent_id) {
      if (!byId.has(r.parent_id)) {
        throw new Error(`Dangling parent_id "${r.parent_id}" referenced by "${r.id}"`);
      }
      parentIds.add(r.parent_id);
    }
  }

  return { byId, isBranch: (id) => parentIds.has(id) };
}

/** Chain of ids from root → id (inclusive), with cycle detection. */
function chainTo(id, byId) {
  const chain = [];
  const seen = new Set();
  let cur = id;
  while (cur) {
    if (seen.has(cur)) throw new Error(`Cycle in parent_id chain at "${cur}"`);
    seen.add(cur);
    chain.unshift(cur);
    cur = byId.get(cur).parent_id || null;
  }
  return chain;
}

function cleanDataDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {object}   opts
 * @param {string}   opts.csvPath   absolute path to source CSV
 * @param {string}   opts.dataDir   absolute path to output tree root
 * @param {function} opts.branchNode (row) => object  JSON for an internal node
 * @param {function} opts.leafNode   (row) => object  JSON for a leaf node
 */
function buildTaxonomy({ csvPath, dataDir, branchNode, leafNode }) {
  const rows = loadRows(csvPath);
  const { byId, isBranch } = indexNodes(rows);

  cleanDataDir(dataDir);
  const results = { branches: 0, leaves: 0 };

  for (const r of byId.values()) {
    if (isBranch(r.id)) {
      const dir = path.join(dataDir, ...chainTo(r.id, byId));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(branchNode(r), null, 2) + '\n');
      results.branches++;
    } else {
      // Leaf lives inside its parent branch's directory (or the root for parentless leaves).
      const dir = r.parent_id
        ? path.join(dataDir, ...chainTo(r.parent_id, byId))
        : dataDir;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${r.id}.json`), JSON.stringify(leafNode(r), null, 2) + '\n');
      results.leaves++;
    }
  }

  return results;
}

/** Standard CLI runner shared by the three entity generators. */
function run({ label, csvPath, dataDir, branchNode, leafNode }) {
  console.log(`Reading ${label} from: ${csvPath}`);
  console.log(`Output directory: ${dataDir}\n`);

  if (!fs.existsSync(csvPath)) {
    console.error(`Error: source CSV not found: ${csvPath}`);
    process.exit(1);
  }

  try {
    const { branches, leaves } = buildTaxonomy({ csvPath, dataDir, branchNode, leafNode });
    console.log('=== Generation Results ===');
    console.log(`✓ Branch nodes: ${branches}`);
    console.log(`✓ Leaf nodes:   ${leaves}`);
    console.log(`✓ Total:        ${branches + leaves}`);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

module.exports = { buildTaxonomy, run, parseCSV, loadRows };
