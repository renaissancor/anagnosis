#!/usr/bin/env node

/**
 * Generate rich succession relationships from ALL available data:
 *   - territory_periods (territorial handoffs)
 *   - polities (ethnicity, language, religion, dates)
 *   - ethnicities (tree ancestry for broader ethnic matching)
 *
 * Succession signals (each contributes to edge weight):
 *   1. TERRITORY:  Consecutive control of same territory
 *   2. ETHNICITY:  Same ruling ethnicity (direct match)
 *   3. ETH_FAMILY: Related ethnicity (shared ancestor in tree)
 *   4. LANGUAGE:   Same ruling language
 *   5. RELIGION:   Same ruling religion
 *   6. TEMPORAL:   How close in time (gap years)
 *
 * These columns are evidence, not a verdict: no type is emitted, and a candidate
 * never asserts succession. Curated claims live in csvs/inheritance_*.csv.
 *
 * Output: derived/polity_succession.csv (computed — never hand-edit)
 */

const fs = require('fs');
const path = require('path');

const csv = require('./lib/csv');

// ── Load all data ───────────────────────────────────────────────────────────

const politiesRaw = csv.readFile(path.join(__dirname, '../csvs/polity.csv'));
const tpRaw      = csv.readFile(path.join(__dirname, '../csvs/polity_territory.csv'));
const ethRaw     = csv.readFile(path.join(__dirname, '../csvs/ethnicity.csv'));

// Map string old_id → numeric id for ethnicities
const ethOldToNum = {};
ethRaw.forEach(e => { if (e.old_id) ethOldToNum[e.old_id] = parseInt(e.id); });

const polities = politiesRaw.map(r => ({
  id:       r.id,
  name:     r.name,
  eth:      r.id_ruling_ethnicity ? (ethOldToNum[r.id_ruling_ethnicity] || null) : null,
  ethStr:   r.id_ruling_ethnicity || null,
  lang:     r.id_ruling_language  || null,
  rel:      r.id_ruling_religion  || null,
  start:    parseInt(r.start_year),
  end:      r.end_year ? parseInt(r.end_year) : null,
}));

const tp = tpRaw.map(t => ({
  territory_id: t.territory_id,
  polity_id:    t.polity_id,
  start:        parseInt(t.start_year),
  end:          t.end_year ? parseInt(t.end_year) : null,
}));

// ── Ethnicity tree ancestry ─────────────────────────────────────────────────

const ethById = {};
ethRaw.forEach(e => { ethById[parseInt(e.id)] = e; });

// Get all ancestor IDs for an ethnicity (up the tree)
function getAncestors(ethId) {
  const ancestors = new Set();
  let cur = ethById[ethId];
  while (cur && cur.parent_id) {
    const pid = parseInt(cur.parent_id);
    if (ancestors.has(pid)) break; // cycle guard
    ancestors.add(pid);
    cur = ethById[pid];
  }
  return ancestors;
}

// Check if two ethnicities share an ancestor within N levels
function relatedEthnicity(ethA, ethB) {
  if (!ethA || !ethB) return false;
  if (ethA === ethB) return true;
  const ancestorsA = getAncestors(ethA);
  const ancestorsB = getAncestors(ethB);
  // Direct parent-child
  if (ancestorsA.has(ethB) || ancestorsB.has(ethA)) return true;
  // Shared ancestor (within 3 levels)
  for (const a of ancestorsA) {
    if (ancestorsB.has(a)) return true;
  }
  return false;
}

// ── Build lookups ───────────────────────────────────────────────────────────

const polityById = {};
polities.forEach(r => { polityById[r.id] = r; });

// Territories per polity
const polityTerritories = {};
tp.forEach(p => {
  if (!polityTerritories[p.polity_id]) polityTerritories[p.polity_id] = [];
  polityTerritories[p.polity_id].push(p);
});

// Territory periods grouped by territory
const byTerritory = {};
tp.forEach(p => {
  if (!byTerritory[p.territory_id]) byTerritory[p.territory_id] = [];
  byTerritory[p.territory_id].push(p);
});

// ── Edge accumulator ────────────────────────────────────────────────────────

const edgeMap = {};
const edgeKey = (a, b) => `${a}→${b}`;

function addEdge(fromId, toId, signals) {
  if (fromId === toId) return;
  const key = edgeKey(fromId, toId);

  if (!edgeMap[key]) {
    edgeMap[key] = {
      from:       fromId,
      to:         toId,
      signals:    { ...signals },
      territories: signals.territory ? [signals.territory] : [],
    };
  } else {
    const e = edgeMap[key];
    // Merge signals (keep truthy values)
    Object.entries(signals).forEach(([k, v]) => {
      if (k === 'territory' && v) {
        if (!e.territories.includes(v)) e.territories.push(v);
        return;
      }
      if (v && !e.signals[k]) e.signals[k] = v;
    });
  }
}

// ── Strategy 1: Territory-based (consecutive control) ───────────────────────

const TERRITORY_GAP = 150; // years tolerance for "consecutive"

Object.entries(byTerritory).forEach(([territoryId, periods]) => {
  periods.sort((a, b) => a.start - b.start || (b.end || 9999) - (a.end || 9999));

  for (let i = 0; i < periods.length; i++) {
    const curr = periods[i];
    const fromR = polityById[curr.polity_id];
    if (!fromR) continue;

    for (let j = i + 1; j < periods.length; j++) {
      const next = periods[j];
      if (curr.polity_id === next.polity_id) continue;
      const toR = polityById[next.polity_id];
      if (!toR) continue;

      const gap = next.start - (curr.end || next.start);
      if (gap > TERRITORY_GAP) break;

      addEdge(curr.polity_id, next.polity_id, { territory: territoryId });
    }

    // Also link overlapping periods
    for (let j = i + 1; j < periods.length; j++) {
      const other = periods[j];
      if (curr.polity_id === other.polity_id) continue;
      const aEnd = curr.end || 2025;
      if (other.start < aEnd) {
        addEdge(curr.polity_id, other.polity_id, { territory: territoryId });
      }
    }
  }
});

// ── Strategy 2: Ethnicity-based (same or related ethnicity) ─────────────────

const ETH_GAP = 300; // years

// Group by exact ethnicity (use string ID for grouping)
const politiesByEth = {};
polities.forEach(r => {
  if (!r.ethStr) return;
  if (!politiesByEth[r.ethStr]) politiesByEth[r.ethStr] = [];
  politiesByEth[r.ethStr].push(r);
});

// Same ethnicity, close in time — require shared territory to avoid noise
Object.values(politiesByEth).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > ETH_GAP) break;
      const aTerrs = new Set((polityTerritories[group[i].id] || []).map(t => t.territory_id));
      const bTerrs = (polityTerritories[group[j].id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) addEdge(group[i].id, group[j].id, { same_ethnicity: true });
    }
  }
});

// Related ethnicity (shared ancestor), close in time
for (let i = 0; i < polities.length; i++) {
  for (let j = i + 1; j < polities.length; j++) {
    const a = polities[i], b = polities[j];
    if (!a.eth || !b.eth || a.eth === b.eth) continue;
    const gap = Math.abs(b.start - (a.end || b.start));
    if (gap > 200) continue;
    if (relatedEthnicity(a.eth, b.eth)) {
      // Only add if they also share territory (to avoid noise)
      const aTerrs = new Set((polityTerritories[a.id] || []).map(t => t.territory_id));
      const bTerrs = (polityTerritories[b.id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) {
        addEdge(a.id, b.id, { related_ethnicity: true });
      }
    }
  }
}

// ── Strategy 3: Language-based ──────────────────────────────────────────────

// Group by exact language (string ID)
const politiesByLang = {};
polities.forEach(r => {
  if (!r.lang) return;
  if (!politiesByLang[r.lang]) politiesByLang[r.lang] = [];
  politiesByLang[r.lang].push(r);
});

Object.values(politiesByLang).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > 300) break;
      addEdge(group[i].id, group[j].id, { same_language: true });
    }
  }
});

// ── Strategy 4: Religion-based (same territory + same religion) ─────────────

// Group by exact religion (string ID)
const politiesByRel = {};
polities.forEach(r => {
  if (!r.rel) return;
  if (!politiesByRel[r.rel]) politiesByRel[r.rel] = [];
  politiesByRel[r.rel].push(r);
});

Object.values(politiesByRel).forEach(group => {
  if (group.length < 2) return;
  group.sort((a, b) => a.start - b.start);
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const gap = group[j].start - (group[i].end || group[j].start);
      if (gap > 200) break;
      // Only add religion link if they also share territory
      const aTerrs = new Set((polityTerritories[group[i].id] || []).map(t => t.territory_id));
      const bTerrs = (polityTerritories[group[j].id] || []).map(t => t.territory_id);
      const shared = bTerrs.some(t => aTerrs.has(t));
      if (shared) {
        addEdge(group[i].id, group[j].id, { same_religion: true });
      }
    }
  }
});

// ── Classify edges ──────────────────────────────────────────────────────────

const edges = Object.values(edgeMap).map(e => {
  const fromR = polityById[e.from];
  const toR   = polityById[e.to];
  const s     = e.signals;

  const hasTerritory = e.territories.length > 0;
  const sameEth      = !!s.same_ethnicity;
  const relatedEth   = !!s.related_ethnicity;
  const sameLang     = !!s.same_language;
  const sameRel      = !!s.same_religion;
  const gap          = toR.start - (fromR.end || toR.start);

  // Territorial direction: compare territory counts
  const fromTerrs = new Set((polityTerritories[e.from] || []).map(t => t.territory_id));
  const toTerrs   = new Set((polityTerritories[e.to] || []).map(t => t.territory_id));
  let territorial_direction = 'unknown';
  if (fromTerrs.size > 0 && toTerrs.size > 0) {
    const shared = [...fromTerrs].filter(t => toTerrs.has(t)).length;
    if (shared === 0) territorial_direction = 'displacement';
    else if (toTerrs.size > fromTerrs.size) territorial_direction = 'expansion';
    else if (toTerrs.size < fromTerrs.size) territorial_direction = 'contraction';
    else territorial_direction = 'same';
  }

  // Compute strength (number of matching signals)
  let strength = 0;
  if (hasTerritory)  strength += e.territories.length;
  if (sameEth)       strength += 3;
  if (relatedEth)    strength += 1;
  if (sameLang)      strength += 2;
  if (sameRel)       strength += 1;
  if (Math.abs(gap) <= 10)  strength += 2;
  else if (Math.abs(gap) <= 50) strength += 1;

  return {
    from:               e.from,
    from_name:          fromR.name,
    to:                 e.to,
    to_name:            toR.name,
    territorial_direction,
    strength,
    shared_territories: e.territories,
    same_ethnicity:     sameEth,
    related_ethnicity:  relatedEth,
    same_language:      sameLang,
    same_religion:      sameRel,
    temporal_gap:       gap,
  };
});

// Sort: strongest first
edges.sort((a, b) => b.strength - a.strength || a.territorial_direction.localeCompare(b.territorial_direction));

// ── Write CSV ───────────────────────────────────────────────────────────────

const headers = [
  'from_polity_id', 'from_name', 'to_polity_id', 'to_name',
  'territorial_direction', 'strength',
  'shared_territories', 'shared_territory_count',
  'same_ethnicity', 'related_ethnicity', 'same_language', 'same_religion',
  'temporal_gap_years',
];

function escapeCSV(val) {
  const s = String(val);
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

const csvLines = [headers.join(',')];
edges.forEach(e => {
  csvLines.push([
    e.from,
    escapeCSV(e.from_name),
    e.to,
    escapeCSV(e.to_name),
    e.territorial_direction,
    e.strength,
    e.shared_territories.join('|'),
    e.shared_territories.length,
    e.same_ethnicity  ? 1 : 0,
    e.related_ethnicity ? 1 : 0,
    e.same_language   ? 1 : 0,
    e.same_religion   ? 1 : 0,
    e.temporal_gap,
  ].join(','));
});

const csvPath = path.join(__dirname, '../derived/polity_succession.csv');
fs.mkdirSync(path.dirname(csvPath), { recursive: true });
fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf8');

// ── Stats ───────────────────────────────────────────────────────────────────

const counts = { same: 0, expansion: 0, contraction: 0, displacement: 0, unknown: 0 };
edges.forEach(e => counts[e.territorial_direction] = (counts[e.territorial_direction] || 0) + 1);

const connected = new Set();
edges.forEach(e => { connected.add(e.from); connected.add(e.to); });

const signalCounts = { territory: 0, ethnicity: 0, related_eth: 0, language: 0, religion: 0 };
edges.forEach(e => {
  if (e.shared_territories.length) signalCounts.territory++;
  if (e.same_ethnicity)   signalCounts.ethnicity++;
  if (e.related_ethnicity) signalCounts.related_eth++;
  if (e.same_language)    signalCounts.language++;
  if (e.same_religion)    signalCounts.religion++;
});

console.log(`✓ Generated derived/polity_succession.csv — ${edges.length} edges, ${connected.size}/${polities.length} polities connected`);
console.log(`  Same         : ${counts.same}`);
console.log(`  Expansion    : ${counts.expansion}`);
console.log(`  Contraction  : ${counts.contraction}`);
console.log(`  Displacement : ${counts.displacement}`);
console.log(`  Unknown      : ${counts.unknown}`);
console.log(`  Avg strength : ${(edges.reduce((s,e) => s + e.strength, 0) / edges.length).toFixed(1)}`);
console.log(`  Edges with territory signal : ${signalCounts.territory}`);
console.log(`  Edges with ethnicity signal : ${signalCounts.ethnicity}`);
console.log(`  Edges with related eth      : ${signalCounts.related_eth}`);
console.log(`  Edges with language signal  : ${signalCounts.language}`);
console.log(`  Edges with religion signal  : ${signalCounts.religion}`);
