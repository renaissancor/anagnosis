/**
 * The one succession graph.
 * Decided claims are always drawn, in ink. Computed candidates are added
 * only on request, in pencil, and are never drawn in the claim style.
 */

const VIEW = { none: { height: 480, portrait: 960 }, chosen: { height: 820, portrait: 1800 }, all: { height: 1300, portrait: 2400 } };
const PORTRAIT_BELOW = 700;

const svg = d3.select('#graph');
const status = document.getElementById('graph-status');
const reading = document.getElementById('graph-reading');
const choiceInput = document.getElementById('polity-choice');

let polities = [], polityById = new Map(), polityByName = new Map();
let claims = [], candidates = [];
let chosenId = new URLSearchParams(location.search).get('id');
let evidence = chosenId ? 'chosen' : 'none';

const zoom = d3.zoom().scaleExtent([1, 8])
  // A plain wheel keeps scrolling the page; ctrl+wheel and pinch zoom the graph.
  .filter(e => (e.type !== 'wheel' || e.ctrlKey) && !e.button)
  .on('zoom', e => svg.select('.stage').attr('transform', e.transform));

load();

async function load() {
  status.textContent = 'Loading the graph…';
  try {
    [polities, claims] = await Promise.all([cachedFetch('/api/polity'), cachedFetch('/api/claim')]);
  } catch {
    renderLoadError(status, 'The graph');
    return;
  }
  polityById = new Map(polities.map(p => [p.id, p]));
  polityByName = new Map(polities.map(p => [p.name.toLowerCase(), p]));
  document.getElementById('polity-names').innerHTML =
    polities.map(p => `<option value="${esc(p.name)}"></option>`).join('');

  if (chosenId && !polityById.has(chosenId)) {
    status.textContent = `No polity has the id “${chosenId}”, so none is chosen.`;
    chosenId = null;
    evidence = 'none';
  }
  if (chosenId) choiceInput.value = polityById.get(chosenId).name;
  document.querySelector(`input[name="evidence"][value="${evidence}"]`).checked = true;

  document.querySelectorAll('input[name="evidence"]').forEach(radio =>
    radio.addEventListener('change', e => setEvidence(e.target.value)));
  choiceInput.addEventListener('change', () => {
    const match = polityByName.get(choiceInput.value.trim().toLowerCase());
    if (!match) {
      status.textContent = choiceInput.value.trim() ? `No polity is named “${choiceInput.value}”.` : '';
      return;
    }
    choose(match.id);
  });
  document.getElementById('zoom-in').addEventListener('click', () => svg.call(zoom.scaleBy, 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => svg.call(zoom.scaleBy, 1 / 1.5));
  document.getElementById('zoom-fit').addEventListener('click', () => svg.call(zoom.transform, d3.zoomIdentity));
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 200); });

  await draw();
}

function choose(id) {
  chosenId = id;
  if (evidence === 'none') {
    evidence = 'chosen';
    document.querySelector('input[name="evidence"][value="chosen"]').checked = true;
  }
  draw();
}

function setEvidence(value) {
  evidence = value;
  draw();
}

async function ensureCandidates() {
  if (!candidates.length) candidates = await cachedFetch('/api/succession');
  document.getElementById('all-label').textContent = `All ${candidates.length.toLocaleString('en')} overlaps`;
}

/** Candidates to draw now. Empty unless the reader asked for them. */
function visibleCandidates() {
  if (evidence === 'all') return candidates;
  if (evidence === 'chosen' && chosenId) return candidates.filter(c => c.from === chosenId || c.to === chosenId);
  return [];
}

async function draw() {
  if (evidence !== 'none') {
    status.textContent = 'Loading computed overlaps…';
    try {
      await ensureCandidates();
    } catch {
      renderLoadError(status, 'The computed overlaps');
      return;
    }
  }
  const shown = visibleCandidates();
  status.textContent = statusText(shown);

  const decidedIds = new Set(claims.flatMap(c => [c.heir_polity_id, c.source_id]));
  const ids = new Set(decidedIds);
  shown.forEach(c => { ids.add(c.from); ids.add(c.to); });
  if (chosenId) ids.add(chosenId);

  const nodes = [...ids].filter(id => polityById.has(id)).map(id => ({
    id, name: polityById.get(id).name, start: polityById.get(id).start, decided: decidedIds.has(id),
  }));
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const decidedEdges = claims.filter(c => nodeById.has(c.heir_polity_id) && nodeById.has(c.source_id))
    .map(c => ({ source: nodeById.get(c.source_id), target: nodeById.get(c.heir_polity_id) }));
  const computedEdges = shown.filter(c => nodeById.has(c.from) && nodeById.has(c.to))
    .map(c => ({ source: nodeById.get(c.from), target: nodeById.get(c.to) }));

  const width = svg.node().clientWidth;
  const portrait = width < PORTRAIT_BELOW;
  const height = VIEW[evidence][portrait ? 'portrait' : 'height'];
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);

  layout(nodes, width, height, portrait, computedEdges);
  render(nodes, decidedEdges, computedEdges, width, height, portrait);
  renderReading();
}

/** Time fixes one axis; the simulation only separates nodes along the other. */
function layout(nodes, width, height, portrait, edges) {
  const margin = { start: portrait ? 64 : 48, end: portrait ? 40 : 170 };
  const span = (portrait ? height : width) - margin.start - margin.end;
  const years = d3.extent(nodes, n => n.start);
  const time = d3.scaleLinear().domain(years).range([margin.start, margin.start + span]);
  layout.time = time;
  layout.portrait = portrait;

  nodes.forEach(n => { n.fixed = time(n.start); });
  const across = portrait ? width : height;
  const sim = d3.forceSimulation(nodes).stop()
    .force('link', d3.forceLink(edges).strength(0.01))
    .force('spread', d3.forceManyBody().strength(nodes.length > 100 ? -22 : -500))
    .force('middle', d3[portrait ? 'forceX' : 'forceY'](across / 2).strength(0.04))
    .force('collide', d3.forceCollide(nodes.length > 100 ? 7 : 24));
  const pad = portrait ? 12 : 44;
  for (let i = 0; i < (nodes.length > 100 ? 160 : 260); i++) {
    sim.tick();
    nodes.forEach(n => {
      if (portrait) { n.y = n.fixed; n.x = Math.max(pad, Math.min(width * 0.55, n.x)); }
      else { n.x = n.fixed; n.y = Math.max(pad, Math.min(height - pad, n.y)); }
    });
  }
}

function render(nodes, decidedEdges, computedEdges, width, height, portrait) {
  svg.selectAll('*').remove();
  svg.append('defs').append('marker').attr('id', 'ink-arrow').attr('viewBox', '0 -5 10 10')
    .attr('refX', 16).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
    .append('path').attr('class', 'arrow-head').attr('d', 'M0,-5L10,0L0,5');

  const stage = svg.append('g').attr('class', 'stage');
  drawAxis(stage, width, height, portrait);

  const many = computedEdges.length > 200;
  stage.append('g').selectAll('path').data(computedEdges).join('path')
    .attr('class', many ? 'edge-computed faint' : 'edge-computed').attr('d', edgePath);
  stage.append('g').selectAll('path').data(decidedEdges).join('path')
    .attr('class', 'edge-decided').attr('marker-end', 'url(#ink-arrow)').attr('d', edgePath);

  const showLabel = n => !many || n.decided || n.id === chosenId;
  const node = stage.append('g').selectAll('g').data(nodes, n => n.id).join('g')
    .attr('class', n => `node${n.decided ? ' decided' : ''}${n.id === chosenId ? ' chosen' : ''}`)
    .attr('transform', n => `translate(${n.x},${n.y})`);
  const link = node.append('a').attr('href', n => `/polity/?id=${encodeURIComponent(n.id)}`)
    .attr('aria-label', n => `${n.name}, ${formatYear(n.start)}`)
    .attr('tabindex', n => (showLabel(n) ? 0 : -1))
    .on('click', (e, n) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      choose(n.id);
    });
  link.append('circle').attr('r', n => (n.decided || n.id === chosenId ? 7 : many ? 3 : 5));
  link.filter(showLabel).append('text').attr('x', portrait ? 11 : -6)
    .attr('y', portrait ? 0 : -12).attr('dy', portrait ? '0.32em' : 0).text(n => n.name);
  link.append('title').text(n => `${n.name}, ${formatYear(n.start)}`);

  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
}

/** A shallow curve, so lines that share a direction stay apart. */
function edgePath({ source: a, target: b }) {
  const bend = Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * 0.12);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return `M${a.x},${a.y}Q${mx},${my + bend} ${b.x},${b.y}`;
}

function drawAxis(stage, width, height, portrait) {
  const axis = stage.append('g');
  const ticks = layout.time.ticks(portrait ? 8 : 10);
  axis.selectAll('line').data(ticks).join('line').attr('class', 'axis-line')
    .attr('x1', t => (portrait ? 0 : layout.time(t))).attr('x2', t => (portrait ? width : layout.time(t)))
    .attr('y1', t => (portrait ? layout.time(t) : 0)).attr('y2', t => (portrait ? layout.time(t) : height));
  axis.selectAll('text').data(ticks).join('text').attr('class', 'axis-label')
    .attr('x', t => (portrait ? width - 4 : layout.time(t) + 4))
    .attr('y', t => (portrait ? layout.time(t) - 4 : 16))
    .attr('text-anchor', portrait ? 'end' : 'start')
    .text(formatYear);
}

function statusText(shown) {
  const claimCount = `${claims.length} decided claims`;
  if (evidence === 'none') return `Showing ${claimCount}.`;
  if (evidence === 'chosen' && !chosenId) return `Showing ${claimCount}. Choose a polity to add its computed overlaps.`;
  return `Showing ${claimCount} and ${shown.length.toLocaleString('en')} computed overlaps.`;
}

/** The graph's content as text, which also serves keyboard and screen-reader use. */
function renderReading() {
  const sentence = c => `<li><a href="/polity/?id=${encodeURIComponent(c.heir_polity_id)}">${esc(c.heir_name)}</a> inherits from <a href="/polity/?id=${encodeURIComponent(c.source_id)}">${esc(c.source_name)}</a></li>`;
  const chosen = chosenId && polityById.get(chosenId);
  const own = chosen ? claims.filter(c => c.heir_polity_id === chosenId || c.source_id === chosenId) : [];
  const chosenHtml = chosen ? `
    <h2>${esc(chosen.name)}</h2>
    <p>${esc(formatDateRange(chosen.start, chosen.end))}. <a href="/polity/?id=${encodeURIComponent(chosen.id)}">Read the entry</a></p>
    ${own.length ? `<ul class="graph-reading-list">${own.map(sentence).join('')}</ul>`
      : '<p>No succession has been decided for this polity yet.</p>'}` : '';
  reading.innerHTML = chosen ? chosenHtml : `
    <h2>All decided claims</h2>
    <ul class="graph-reading-list">${claims.map(sentence).join('')}</ul>`;
}
