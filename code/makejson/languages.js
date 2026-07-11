#!/usr/bin/env node

/**
 * Generate data/language/ from csvs/language.csv (source of truth).
 * Hierarchy comes from the parent_id column; the loader derives `parent` from path.
 * See code/makejson/_taxonomy_from_csv.js for the shared tree-building logic.
 */

const path = require('path');
const { run } = require('./_taxonomy_from_csv');

const CSV_PATH = path.join(__dirname, '../../csvs/language.csv');
const DATA_DIR = path.join(__dirname, '../../data/language');

const branchNode = (r) => ({
  id: r.id,
  name: r.name,
  parent: r.parent_id || null,
  description: r.description || null,
  founded: r.founded || null,
  status: null
});

const leafNode = (r) => ({
  id: r.id,
  name: r.name,
  parent: r.parent_id || null,
  iso6393: null,
  glottocode: null,
  description: r.description || null,
  founded: r.founded || null,
  macro_area: null,
  coordinates: { lat: null, lon: null },
  status: null,
  scripts: [],
  speaker_count: { L1: null, L2: null, date: new Date().getFullYear().toString() }
});

run({ label: 'languages', csvPath: CSV_PATH, dataDir: DATA_DIR, branchNode, leafNode });
