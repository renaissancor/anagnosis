#!/usr/bin/env node
// ============================================================
// Download the third-party sources listed in scripts/sources.json
// into the gitignored sources/ directory. Refuses any licence
// outside the allowlist, and skips files already downloaded.
// Archives are unpacked into <version>/unpacked/ for reading.
//
// Usage:  node scripts/fetch_sources.js [id ...]
// Output: sources/<id>/<version>/<file>, sources/<id>/FETCHED.json
// ============================================================

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');
const { ALLOWED_LICENCES } = require('../code/lib/licences');

const BASE       = path.join(__dirname, '..');
const USER_AGENT = 'AnagnosisBot/0.1 (https://github.com/renaissancor/anagnosis)';

const unzip = (file, dest) => execFileSync('python3', ['-m', 'zipfile', '-e', file, dest]);

function unpack(source) {
  const dir  = path.join(BASE, 'sources', source.id, source.version);
  const file = path.join(dir, source.file);
  const out  = path.join(dir, 'unpacked');
  if (fs.existsSync(out) || !/\.(zip|gz)$/.test(file)) return;

  // Unpack beside the target, so a failed run leaves no partial folder to skip.
  const tmp = `${out}.part`;
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  if (file.endsWith('.gz')) {
    const name = path.basename(file, '.gz');
    fs.writeFileSync(path.join(tmp, name), execFileSync('gunzip', ['-c', file], { maxBuffer: 2 ** 31 - 1 }));
  } else {
    unzip(file, tmp);
    // Cliopatria nests its GeoJSON in a second zip.
    for (const inner of fs.readdirSync(tmp, { recursive: true }).filter(f => f.endsWith('.zip'))) {
      unzip(path.join(tmp, inner), path.dirname(path.join(tmp, inner)));
    }
  }
  fs.renameSync(tmp, out);
}

async function fetchSource(source) {
  const dir  = path.join(BASE, 'sources', source.id, source.version);
  const file = path.join(dir, source.file);
  if (fs.existsSync(file)) { console.log(`  ·  ${source.id} ${source.version} already present`); return; }

  fs.mkdirSync(dir, { recursive: true });
  const res = await fetch(source.url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status}`);

  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const meter = new Transform({ transform(chunk, _, done) { hash.update(chunk); bytes += chunk.length; done(null, chunk); } });
  await pipeline(Readable.fromWeb(res.body), meter, fs.createWriteStream(`${file}.part`));
  fs.renameSync(`${file}.part`, file);

  fs.writeFileSync(path.join(BASE, 'sources', source.id, 'FETCHED.json'), JSON.stringify({
    ...source, retrieved: new Date().toISOString().slice(0, 10), bytes, sha256: hash.digest('hex'),
  }, null, 2) + '\n');
  console.log(`  ✓  ${source.id} ${source.version} (${(bytes / 1e6).toFixed(1)} MB)`);
}

async function main() {
  const wanted = process.argv.slice(2);
  const sources = JSON.parse(fs.readFileSync(path.join(__dirname, 'sources.json'), 'utf8'))
    .filter(s => !wanted.length || wanted.includes(s.id));

  const refused = sources.filter(s => !ALLOWED_LICENCES.has(s.licence));
  if (refused.length) throw new Error(`licence not allowed: ${refused.map(s => `${s.id} (${s.licence})`).join(', ')}`);

  for (const source of sources) { await fetchSource(source); unpack(source); }
}

main().catch(e => { console.error(e.message); process.exit(1); });
