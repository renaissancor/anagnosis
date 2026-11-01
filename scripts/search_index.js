#!/usr/bin/env node
// ============================================================
// Search the source index. Every hit carries its revision URL
// and licence, so a claim can be cited or checked.
//
// Usage: node scripts/search_index.js "elite replacement persian" [limit]
// ============================================================

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'sources', 'index', 'wikipedia.sqlite');

const [query, limit = 5] = process.argv.slice(2);
if (!query) { console.error('Usage: node scripts/search_index.js "query" [limit]'); process.exit(1); }

// Quote each word so hyphens and apostrophes aren't read as FTS5 operators.
const match = query.split(/\s+/).map(w => `"${w.replace(/"/g, '')}"`).join(' OR ');

const db = new DatabaseSync(DB_FILE, { readOnly: true });
const hits = db.prepare(`
  SELECT title, section, polity_ids, url, licence,
         snippet(chunk, 2, '[', ']', ' … ', 40) AS excerpt
  FROM chunk WHERE chunk MATCH ? ORDER BY bm25(chunk, 5, 2, 1) LIMIT ?
`).all(match, Number(limit));

for (const h of hits) {
  console.log(`\n${h.title} › ${h.section}  (${h.polity_ids})\n${h.excerpt}\n${h.url}  [${h.licence}]`);
}
