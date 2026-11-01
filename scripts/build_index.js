#!/usr/bin/env node
// ============================================================
// Build a full-text index over the Wikipedia corpus, chunked by
// section, so curation can retrieve passages with their source.
// Ranking is BM25 keyword search; there are no embeddings.
//
// Usage:  node scripts/build_index.js
// Input:  sources/wikipedia/<date>/articles.jsonl (latest)
// Output: sources/index/wikipedia.sqlite
// ============================================================

const fs   = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE     = path.join(__dirname, '..');
const WIKI_DIR = path.join(BASE, 'sources', 'wikipedia');
const DB_FILE  = path.join(BASE, 'sources', 'index', 'wikipedia.sqlite');

const MAX_CHARS = 1500;
const SKIP_SECTIONS = /^(see also|references|notes|footnotes|citations|sources|bibliography|further reading|external links)$/i;

// Split on ==headings==, then pack paragraphs up to MAX_CHARS.
function chunks(text) {
  const out = [];
  let section = 'Introduction', buffer = '', skipping = false, skipLevel = 0;
  const flush = () => { if (buffer.trim()) out.push({ section, text: buffer.trim() }); buffer = ''; };

  for (const para of text.split(/\n+/)) {
    const heading = para.match(/^(={2,})\s*(.+?)\s*\1$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      if (skipping && level > skipLevel) continue;
      section = heading[2];
      skipping = SKIP_SECTIONS.test(section);
      skipLevel = level;
    } else if (!skipping) {
      if (buffer.length + para.length > MAX_CHARS) flush();
      buffer += para + '\n';
    }
  }
  flush();
  return out;
}

function main() {
  const latest = fs.readdirSync(WIKI_DIR).sort().at(-1);
  const lines = fs.readFileSync(path.join(WIKI_DIR, latest, 'articles.jsonl'), 'utf8').trim().split('\n');

  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.rmSync(DB_FILE, { force: true });
  const db = new DatabaseSync(DB_FILE);
  db.exec(`CREATE VIRTUAL TABLE chunk USING fts5(
    title, section, text, polity_ids UNINDEXED, qid UNINDEXED, url UNINDEXED, licence UNINDEXED
  )`);
  const insert = db.prepare('INSERT INTO chunk VALUES (?, ?, ?, ?, ?, ?, ?)');

  let total = 0;
  db.exec('BEGIN');
  for (const line of lines) {
    const a = JSON.parse(line);
    for (const c of chunks(a.text)) {
      insert.run(a.title, c.section, c.text, a.polity_ids.join('|'), a.qid, a.url, a.licence);
      total++;
    }
  }
  db.exec('COMMIT');
  db.close();
  console.log(`Indexed ${total} chunks from ${lines.length} articles (${latest})`);
}

main();
