#!/usr/bin/env node

/**
 * Generate data/religion/ from csvs/religion.csv (source of truth).
 * Hierarchy comes from the parent_id column; the loader derives `parent` from path.
 * See code/makejson/_taxonomy_from_csv.js for the shared tree-building logic.
 */

const path = require('path');
const { run } = require('./_taxonomy_from_csv');

const CSV_PATH = path.join(__dirname, '../../csvs/religion.csv');
const DATA_DIR = path.join(__dirname, '../../data/religion');

const branchNode = (r) => ({
  id: r.id,
  name: r.name,
  parent: r.parent_id || null,
  description: r.description || null,
  founder: null,
  founded: r.founded || null,
  status: null
});

const leafNode = (r) => ({
  id: r.id,
  name: r.name,
  parent: r.parent_id || null,
  description: r.description || null,
  founder: null,
  founded: r.founded || null,
  founded_region: null,
  scriptures: [],
  theology: { type: null, deities: [], key_tenets: [] },
  adherent_count: { total: null, date: new Date().getFullYear().toString() },
  major_regions: [],
  status: null,
  sub_sects: []
});

run({ label: 'religions', csvPath: CSV_PATH, dataDir: DATA_DIR, branchNode, leafNode });
