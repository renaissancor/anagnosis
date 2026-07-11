#!/usr/bin/env node

/**
 * Generate data/ethnicity/ from csvs/ethnicity.csv (source of truth).
 * Hierarchy comes from the parent_id column; the loader derives `parent` from path.
 * See code/makejson/_taxonomy_from_csv.js for the shared tree-building logic.
 */

const path = require('path');
const { run } = require('./_taxonomy_from_csv');

const CSV_PATH = path.join(__dirname, '../../csvs/ethnicity.csv');
const DATA_DIR = path.join(__dirname, '../../data/ethnicity');

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
  description: r.description || null,
  founded: r.founded || null,
  historical_depth: null,
  languages: [],
  origin_territory: null,
  ancestry: [],
  social_structure: { descent: null, settlement: null },
  population: { total: null, date: new Date().getFullYear().toString() },
  major_regions: [],
  status: null
});

run({ label: 'ethnicities', csvPath: CSV_PATH, dataDir: DATA_DIR, branchNode, leafNode });
