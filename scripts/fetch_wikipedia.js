#!/usr/bin/env node
// ============================================================
// Fetch the English Wikipedia article for each confirmed Wikidata
// link in csvs/fact_source.csv, as one JSONL corpus for retrieval. Each line
// records the revision, which CC BY-SA attribution needs.
// Reruns skip articles already in the file.
//
// Usage:  node scripts/fetch_wikipedia.js
// Input:  csvs/fact_source.csv
// Output: sources/wikipedia/<YYYY-MM-DD>/articles.jsonl
// ============================================================

const fs   = require('fs');
const path = require('path');
const csv  = require('../code/lib/csv');

const BASE       = path.join(__dirname, '..');
const USER_AGENT = 'AnagnosisBot/0.1 (https://github.com/renaissancor/anagnosis)';
const DELAY_MS   = 200; // requests run in series, per API:Etiquette
const BATCH      = 50;  // wbgetentities id limit

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(host, params) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(DELAY_MS);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429 || res.status >= 500) {
      await sleep((Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const body = await res.json();
    if (body.error?.code === 'maxlag') { await sleep(5000); continue; }
    if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
    return body;
  }
  throw new Error(`gave up after retries: ${url}`);
}

async function titlesFor(qids) {
  const titles = new Map();
  for (let i = 0; i < qids.length; i += BATCH) {
    const { entities } = await api('www.wikidata.org', {
      action: 'wbgetentities', ids: qids.slice(i, i + BATCH).join('|'), props: 'sitelinks', sitefilter: 'enwiki',
    });
    for (const [qid, entity] of Object.entries(entities)) {
      const title = entity.sitelinks?.enwiki?.title;
      if (title) titles.set(qid, title);
    }
  }
  return titles;
}

async function article(title) {
  const { query } = await api('en.wikipedia.org', {
    action: 'query', titles: title, redirects: '1', prop: 'extracts|revisions', explaintext: '1', rvprop: 'ids|timestamp',
  });
  const page = query.pages[0];
  return { title: page.title, pageid: page.pageid, revid: page.revisions?.[0]?.revid, timestamp: page.revisions?.[0]?.timestamp, text: page.extract ?? '' };
}

async function main() {
  const rows = csv.readFile(path.join(BASE, 'csvs', 'fact_source.csv'))
    .filter(r => r.source_id === 'wikidata' && r.entity_table === 'polity' && r.field === 'id');

  const polities = new Map(); // two polity ids can share one QID
  for (const r of rows) polities.set(r.source_record, [...(polities.get(r.source_record) ?? []), r.entity_id]);

  const dir = path.join(BASE, 'sources', 'wikipedia', new Date().toISOString().slice(0, 10));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'articles.jsonl');
  const done = new Set(fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l).qid)
    : []);

  const todo = [...polities.keys()].filter(q => !done.has(q));
  const titles = await titlesFor(todo);
  let written = 0, chars = 0;
  for (const qid of todo) {
    const title = titles.get(qid);
    if (!title) continue;
    const a = await article(title);
    if (!a.text) continue;
    fs.appendFileSync(file, JSON.stringify({
      source: 'wikipedia', licence: 'CC-BY-SA-4.0', qid, polity_ids: polities.get(qid),
      url: `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(a.title.replace(/ /g, '_'))}&oldid=${a.revid}`,
      ...a,
    }) + '\n');
    written++; chars += a.text.length;
    if (written % 50 === 0) console.log(`  ${written}/${todo.length}`);
  }
  console.log(`${written} articles written (${(chars / 1e6).toFixed(1)}M chars); ${todo.length - titles.size} matches had no English article`);
}

main().catch(e => { console.error(e); process.exit(1); });
