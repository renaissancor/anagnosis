#!/usr/bin/env node
// ============================================================
// Match polities to Wikidata items by name, scored by how closely
// the dates agree. Candidates are for human review; nothing here
// writes to csvs/. Licence: Wikidata structured data is CC0.
//
// Usage:  node scripts/match_wikidata.js [--limit N]
// Output: derived/wikidata_candidates.csv
// Cache:  sources/wikidata/ (reruns do not refetch)
// ============================================================

const fs   = require('fs');
const path = require('path');
const csv  = require('../code/lib/csv');

const BASE      = path.join(__dirname, '..');
const CACHE_DIR = path.join(BASE, 'sources', 'wikidata');
const OUT_FILE  = path.join(BASE, 'derived', 'wikidata_candidates.csv');

const API        = 'https://www.wikidata.org/w/api.php';
const USER_AGENT = 'AnagnosisBot/0.1 (https://github.com/renaissancor/anagnosis) node-fetch';
const DELAY_MS   = 200;  // requests run in series, per API:Etiquette
const TOLERANCE  = 25;   // years either side for a date to count as agreeing
const SEARCH_N   = 7;

const START_PROPS = ['P571', 'P580']; // inception, start time
const END_PROPS   = ['P576', 'P582']; // dissolved, end time

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', maxlag: '5', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(DELAY_MS);
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.status === 429 || res.status >= 500) {
      await sleep((Number(res.headers.get('retry-after')) || 2 ** attempt) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const body = await res.json();
    if (body.error?.code === 'maxlag') {
      await sleep((Number(res.headers.get('retry-after')) || 5) * 1000);
      continue;
    }
    if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
    return body;
  }
  throw new Error(`gave up after retries: ${url}`);
}

async function cached(key, fetcher) {
  const file = path.join(CACHE_DIR, `${key}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = await fetcher();
  fs.writeFileSync(file, JSON.stringify(value));
  return value;
}

// Wikidata writes 27 BCE as -0027, the same sign convention as our years.
function yearOf(entity, props) {
  for (const prop of props) {
    const claims = entity.claims?.[prop] ?? [];
    const best = claims.find(c => c.rank === 'preferred') ?? claims.find(c => c.rank === 'normal');
    const time = best?.mainsnak?.datavalue?.value?.time;
    if (time) return parseInt(time.match(/^([+-]\d+)-/)[1], 10);
  }
  return null;
}

// Parenthetical glosses and slash alternates in our names defeat exact search.
function searchTerm(name) {
  return name.replace(/\(.*?\)/g, '').split('/')[0].trim();
}

function score(polity, entity) {
  const start = yearOf(entity, START_PROPS);
  const end   = yearOf(entity, END_PROPS);
  const ps = csv.toInt(polity.start_year), pe = csv.toInt(polity.end_year);
  const startDelta = start !== null && ps !== null ? start - ps : null;
  const endDelta   = end !== null && pe !== null ? end - pe : null;
  const agrees = [startDelta, endDelta].filter(d => d !== null && Math.abs(d) <= TOLERANCE).length;
  const known  = [startDelta, endDelta].filter(d => d !== null).length;
  const distance = known ? [startDelta, endDelta].reduce((s, d) => s + Math.abs(d ?? 0), 0) / known : Infinity;
  const confidence = agrees === 2 ? 'high' : agrees === 1 ? 'medium' : known ? 'conflict' : 'undated';
  return { start, end, startDelta, endDelta, agrees, distance, confidence };
}

async function matchPolity(polity) {
  const term = searchTerm(polity.name);
  const found = await cached(`search_${polity.id}`, () =>
    api({ action: 'wbsearchentities', search: term, language: 'en', type: 'item', limit: SEARCH_N }));
  let ids = (found.search ?? []).map(h => h.id);
  if (!ids.length) {
    // wbsearchentities only prefix-matches labels; fall back to full-text search.
    const fulltext = await cached(`fulltext_${polity.id}`, () =>
      api({ action: 'query', list: 'search', srsearch: term, srlimit: SEARCH_N, srnamespace: 0 }));
    ids = (fulltext.query?.search ?? []).map(h => h.title);
  }
  if (!ids.length) return { polity, term, candidates: 0 };

  const { entities } = await cached(`entities_${polity.id}`, () =>
    api({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|labels|descriptions', languages: 'en' }));

  const ranked = ids
    .map((id, order) => ({ id, order, entity: entities[id], s: score(polity, entities[id]) }))
    .sort((a, b) => b.s.agrees - a.s.agrees || a.s.distance - b.s.distance || a.order - b.order);
  return { polity, term, candidates: ids.length, best: ranked[0] };
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const limitArg = process.argv.indexOf('--limit');
  const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
  const polities = csv.readFile(path.join(BASE, 'csvs', 'polity.csv')).slice(0, limit);

  const rows = [];
  for (const [i, polity] of polities.entries()) {
    const { term, candidates, best } = await matchPolity(polity);
    rows.push({
      polity_id: polity.id,
      polity_name: polity.name,
      search_term: term,
      start_year: polity.start_year,
      end_year: polity.end_year,
      qid: best?.id ?? '',
      wikidata_label: best?.entity.labels?.en?.value ?? '',
      wikidata_description: best?.entity.descriptions?.en?.value ?? '',
      wikidata_start: best?.s.start ?? '',
      wikidata_end: best?.s.end ?? '',
      start_delta: best?.s.startDelta ?? '',
      end_delta: best?.s.endDelta ?? '',
      confidence: best?.s.confidence ?? 'none',
      candidates,
    });
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${polities.length}`);
  }

  csv.writeFile(OUT_FILE, rows, Object.keys(rows[0]));
  const tally = {};
  for (const r of rows) tally[r.confidence] = (tally[r.confidence] || 0) + 1;
  console.log(`Wrote ${rows.length} rows to derived/wikidata_candidates.csv`, tally);
}

main().catch(e => { console.error(e); process.exit(1); });
