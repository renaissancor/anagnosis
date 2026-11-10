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
const params = new URLSearchParams(location.search);
let chosenId = params.get('id');
let evidence = ['chosen', 'all'].includes(params.get('evidence')) ? params.get('evidence') : 'none';
let notice = '';
let focusAfterDraw = null;
let selectedClaimId = null;   // a decided edge the reader opened
let anchors = { key: '', across: new Map() };
let relabel = null;           // places labels again once web fonts arrive
let dropped = 0;              // computed dots left out for crowding a decided dot

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
    notice = `No polity has the id “${chosenId}”, so none is chosen.`;
    chosenId = null;
    evidence = 'none';
  }
  if (chosenId) choiceInput.value = polityById.get(chosenId).name;
  document.querySelector(`input[name="evidence"][value="${evidence}"]`).checked = true;

  document.querySelectorAll('input[name="evidence"]').forEach(radio =>
    radio.addEventListener('change', e => setEvidence(e.target.value)));
  // Clearing with the search box's own button fires `search`, not `change`.
  choiceInput.addEventListener('search', () => { if (!choiceInput.value) choose(null); });
  choiceInput.addEventListener('change', () => {
    const typed = choiceInput.value.trim();
    const match = polityByName.get(typed.toLowerCase());
    if (match || !typed) return choose(match ? match.id : null);
    notice = `No polity is named “${typed}”.`;
    status.textContent = statusText(visibleCandidates());
  });
  document.getElementById('zoom-in').addEventListener('click', () => svg.call(zoom.scaleBy, 1.5));
  document.getElementById('zoom-out').addEventListener('click', () => svg.call(zoom.scaleBy, 1 / 1.5));
  document.getElementById('zoom-fit').addEventListener('click', () => svg.call(zoom.transform, d3.zoomIdentity));
  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 200); });

  await draw();
  document.fonts?.ready.then(() => relabel?.());
}

function choose(id) {
  chosenId = id;
  selectedClaimId = null;
  notice = '';
  syncUrl();
  draw();
}

function setEvidence(value) {
  evidence = value;
  notice = '';
  syncUrl();
  draw();
}

/** The address reproduces the view, so a shared link shows the same evidence. */
function syncUrl() {
  const url = new URL(location.href);
  if (chosenId) url.searchParams.set('id', chosenId); else url.searchParams.delete('id');
  if (evidence === 'none') url.searchParams.delete('evidence'); else url.searchParams.set('evidence', evidence);
  history.replaceState(null, '', url);
}

async function ensureCandidates() {
  if (!candidates.length) candidates = await cachedFetch('/api/succession');
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

  const polityClaims = claims.filter(c => c.source_type === 'polity');
  const decidedIds = new Set(polityClaims.flatMap(c => [c.heir_polity_id, c.source_id]));
  const ids = new Set(decidedIds);
  shown.forEach(c => { ids.add(c.from); ids.add(c.to); });
  if (chosenId) ids.add(chosenId);

  // Decided nodes last, so their labels sit on top of computed ones.
  const nodes = [...ids].filter(id => polityById.has(id)).map(id => ({
    id, name: polityById.get(id).name, start: polityById.get(id).start, decided: decidedIds.has(id),
  })).sort((a, b) => a.decided - b.decided);
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const decidedEdges = polityClaims.filter(c => nodeById.has(c.heir_polity_id) && nodeById.has(c.source_id))
    .map(c => ({ claim: c, source: nodeById.get(c.source_id), target: nodeById.get(c.heir_polity_id) }));
  const computedEdges = shown.filter(c => nodeById.has(c.from) && nodeById.has(c.to))
    .map(c => ({ source: nodeById.get(c.from), target: nodeById.get(c.to) }));

  const width = svg.node().clientWidth;
  const portrait = width < PORTRAIT_BELOW;
  const height = VIEW[evidence][portrait ? 'portrait' : 'height'];
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('height', height);

  anchorDecided(polityClaims, decidedIds, width, portrait);
  layout(nodes, width, height, portrait, computedEdges, true);
  // A computed dot with no clear place is left out, with its lines, and counted.
  dropped = nodes.filter(n => n.dropped).length;
  const kept = nodes.filter(n => !n.dropped);
  const keptEdges = computedEdges.filter(e => !e.source.dropped && !e.target.dropped);
  render(kept, decidedEdges, keptEdges, width, height, portrait);
  renderReading();
  if (focusAfterDraw) {
    svg.select(`a[data-id="${focusAfterDraw}"]`).node()?.focus();
    focusAfterDraw = null;
  }
}

/**
 * Decided nodes keep one place across every view. They are laid out once on
 * their own, as on the view with no evidence, and that place is kept as a
 * share of the cross axis. Computed nodes are then fitted around them.
 */
function anchorDecided(polityClaims, decidedIds, width, portrait) {
  const key = `${width}|${portrait}|${[...decidedIds].sort().join(',')}`;
  if (anchors.key === key) return;
  const nodes = [...decidedIds].filter(id => polityById.has(id))
    .map(id => ({ id, start: polityById.get(id).start, decided: true }));
  const byId = new Map(nodes.map(n => [n.id, n]));
  const edges = polityClaims.filter(c => byId.has(c.heir_polity_id) && byId.has(c.source_id))
    .map(c => ({ source: byId.get(c.source_id), target: byId.get(c.heir_polity_id) }));
  const height = VIEW.none[portrait ? 'portrait' : 'height'];
  layout(nodes, width, height, portrait, edges, false);
  anchors = { key, across: new Map(nodes.map(n => [n.id, portrait ? n.x / width : n.y / height])) };
}

/**
 * Room kept around a decided dot: two label heights. A computed dot inside it
 * would sit at the tip of an ink arrow and read as the end of a decided claim.
 */
const CLEARANCE = 40;

/**
 * Moves each computed or chosen dot, along the axis that is not time, to the
 * nearest place outside every decided dot's clearance. It tries the usual band
 * first, then the whole frame. A computed dot with no such place is left out
 * (`dropped`) rather than drawn at an arrow's tip; the chosen dot is never left out.
 */
function keepClear(nodes, portrait, preferred, widest) {
  const pinned = nodes.filter(n => n.pinned);
  const along = portrait ? 'x' : 'y', time = portrait ? 'y' : 'x';
  for (const n of nodes.filter(m => !m.pinned)) {
    const blocked = pinned.map(d => {
      const dt = Math.abs(n[time] - d[time]);
      if (dt >= CLEARANCE) return null;
      const need = Math.sqrt(CLEARANCE ** 2 - dt ** 2) + 0.5;
      return [d[along] - need, d[along] + need];
    }).filter(Boolean);
    const clear = v => !blocked.some(([lo, hi]) => v > lo && v < hi);
    if (clear(n[along])) continue;
    const nearest = ([lo, hi]) => [lo, hi, ...blocked.flat()]
      .filter(v => v >= lo && v <= hi && clear(v))
      .sort((p, q) => Math.abs(p - n[along]) - Math.abs(q - n[along]))[0];
    const place = nearest(preferred) ?? nearest(widest);
    if (place !== undefined) n[along] = place;
    else if (n.id !== chosenId) n.dropped = true;
  }
}

/** Time fixes one axis; the simulation only separates nodes along the other. */
function layout(nodes, width, height, portrait, edges, pinDecided) {
  const margin = { start: portrait ? 64 : 48, end: portrait ? 40 : 170 };
  const span = (portrait ? height : width) - margin.start - margin.end;
  const years = d3.extent(nodes, n => n.start);
  const time = d3.scaleLinear().domain(years).range([margin.start, margin.start + span]);
  layout.time = time;
  layout.portrait = portrait;

  const across = portrait ? width : height;
  const pad = portrait ? 12 : 44;
  const clamp = v => (portrait ? Math.max(pad, Math.min(width * 0.55, v)) : Math.max(pad, Math.min(height - pad, v)));
  nodes.forEach(n => {
    n.fixed = time(n.start);
    n.pinned = pinDecided && n.decided && anchors.across.has(n.id);
    if (n.pinned) {
      const place = clamp(anchors.across.get(n.id) * across);
      if (portrait) { n.fx = place; n.fy = n.fixed; } else { n.fx = n.fixed; n.fy = place; }
    }
  });
  const sim = d3.forceSimulation(nodes).stop()
    .force('link', d3.forceLink(edges).strength(0.01))
    .force('spread', d3.forceManyBody().strength(nodes.length > 100 ? -22 : -500))
    .force('middle', d3[portrait ? 'forceX' : 'forceY'](across / 2).strength(0.04))
    .force('collide', d3.forceCollide(n => (n.pinned ? CLEARANCE : nodes.length > 100 ? 7 : 24)));
  for (let i = 0; i < (nodes.length > 100 ? 160 : 260); i++) {
    sim.tick();
    nodes.forEach(n => {
      if (n.pinned) return;
      if (portrait) { n.y = n.fixed; n.x = clamp(n.x); }
      else { n.x = n.fixed; n.y = clamp(n.y); }
    });
  }
  nodes.forEach(n => { if (n.pinned) { n.x = n.fx; n.y = n.fy; } delete n.fx; delete n.fy; });
  if (pinDecided) keepClear(nodes, portrait, portrait ? [pad, width * 0.55] : [pad, height - pad], [pad, across - pad]);
}

function render(nodes, decidedEdges, computedEdges, width, height, portrait) {
  svg.selectAll('*').remove();
  svg.append('defs').append('marker').attr('id', 'ink-arrow').attr('viewBox', '0 -5 10 10')
    .attr('refX', 16).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
    .append('path').attr('class', 'arrow-head').attr('d', 'M0,-5L10,0L0,5');
  svg.select('defs').append('marker').attr('id', 'ink-arrow-dim').attr('viewBox', '0 -5 10 10')
    .attr('refX', 16).attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
    .append('path').attr('class', 'arrow-head dim').attr('d', 'M0,-5L10,0L0,5');

  const stage = svg.append('g').attr('class', 'stage');
  drawAxis(stage, width, height, portrait);

  const many = computedEdges.length > 200;
  stage.append('g').selectAll('path').data(computedEdges).join('path')
    .attr('class', many ? 'edge-computed faint' : 'edge-computed').attr('d', e => edgePath(e, 0.08));
  // A decided edge opens its claim below the graph, by pointer or keyboard.
  const claimEdge = stage.append('g').selectAll('g').data(decidedEdges).join('g')
    .attr('class', e => `claim-edge${e.claim.id === selectedClaimId ? ' selected' : ''}${chosenId && e.source.id !== chosenId && e.target.id !== chosenId ? ' distant' : ''}`)
    .attr('tabindex', 0).attr('role', 'button')
    .attr('aria-label', e => `Decided claim: ${e.claim.heir_name} inherits from ${e.claim.source_name}. Show its terms.`)
    .on('click', (ev, e) => openClaim(e.claim.id))
    .on('focus', (ev, e) => openClaim(e.claim.id))
    .on('keydown', (ev, e) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); openClaim(e.claim.id, true); } });
  claimEdge.each(e => { e.d = edgePath(e, clearBend(e, many ? nodes.filter(n => n.decided) : nodes)); });
  claimEdge.append('path').attr('class', 'edge-hit').attr('d', e => e.d);
  const distant = e => chosenId && e.source.id !== chosenId && e.target.id !== chosenId && e.claim.id !== selectedClaimId;
  claimEdge.append('path').attr('class', 'edge-decided').attr('d', e => e.d)
    .attr('marker-end', e => (distant(e) ? 'url(#ink-arrow-dim)' : 'url(#ink-arrow)'));
  claimEdge.append('title').text(e => `${e.claim.heir_name} inherits from ${e.claim.source_name}`);

  const showLabel = n => !many || n.decided || n.id === chosenId;
  const node = stage.append('g').selectAll('g').data(nodes, n => n.id).join('g')
    .attr('class', n => `node${n.decided ? ' decided' : ''}${n.id === chosenId ? ' chosen' : ''}`)
    .attr('transform', n => `translate(${n.x},${n.y})`);
  const link = node.append('a').attr('href', n => `/polity/?id=${encodeURIComponent(n.id)}`)
    .attr('data-id', n => n.id)
    .attr('aria-label', n => `${n.name}, ${formatYear(n.start)}`)
    .attr('tabindex', n => (showLabel(n) ? 0 : -1))
    .on('click', (e, n) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      focusAfterDraw = n.id;
      choiceInput.value = n.name;
      choose(n.id);
    });
  link.append('circle').attr('r', radius);
  link.filter(showLabel).append('text').text(n => n.name);
  link.append('title').text(n => `${n.name}, ${formatYear(n.start)}`);
  // A name hidden to avoid a collision still shows on hover and focus, drawn on top.
  const peek = stage.append('g').attr('class', 'node peek').attr('aria-hidden', 'true');
  link.on('mouseenter focus', function (e, n) {
    if (!this.querySelector('text.label-hidden')) return;
    const t = this.querySelector('text');
    peek.attr('transform', `translate(${n.x},${n.y})`).classed('decided', n.decided).selectAll('text').data([n]).join('text')
      .attr('x', t.getAttribute('x')).attr('y', t.getAttribute('y')).attr('text-anchor', t.getAttribute('text-anchor')).text(n.name);
  }).on('mouseleave blur', () => peek.selectAll('text').remove());

  relabel = () => placeLabels(node, width, height, portrait);
  relabel();
  svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
}

const radius = n => (n.decided || n.id === chosenId ? 7 : visibleCandidates().length > 200 ? 3 : 5);

/**
 * Puts each name where it hits no other name, dot or axis label. Chosen and
 * decided names go first and always show; a computed name with no free place
 * is hidden until its dot is pointed at or focused. An axis label that a
 * decided name still covers steps aside.
 */
function placeLabels(node, width, height, portrait) {
  const boxes = [];
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const axisLabels = svg.selectAll('.axis-label').classed('covered', false).nodes()
    .map(el => { const b = el.getBBox(); return { el, x: b.x - 2, y: b.y - 1, w: b.width + 4, h: b.height + 2 }; });
  node.each(n => { const r = radius(n) + (n.decided ? 9 : 2); boxes.push({ id: n.id, x: n.x - r, y: n.y - r, w: 2 * r, h: 2 * r }); });

  const spots = portrait
    ? [[11, 4, 'start'], [-11, 4, 'end'], [-6, -12, 'start'], [-6, 22, 'start'], [6, -12, 'end'], [6, 22, 'end'], [11, 18, 'start'], [11, -10, 'start'], [-11, 18, 'end'], [-11, -10, 'end']]
    : [[-6, -12, 'start'], [10, 4, 'start'], [-6, 22, 'start'], [-10, 4, 'end'], [6, -12, 'end'], [6, 22, 'end'], [10, -24, 'start'], [10, 34, 'start'], [-10, -24, 'end'], [-10, 34, 'end']];
  const rank = n => (n.id === chosenId ? 0 : n.decided ? 1 : 2);
  const labelled = node.filter(function () { return this.querySelector('text'); }).nodes()
    .map(g => ({ g, n: d3.select(g).datum(), text: g.querySelector('text') }))
    .sort((a, b) => rank(a.n) - rank(b.n) || a.n.start - b.n.start);

  let hidden = 0;
  for (const { n, text } of labelled) {
    text.classList.remove('label-hidden');
    // Measure the real glyph box once, with the baseline at 0.
    text.setAttribute('x', 0); text.setAttribute('y', 0); text.setAttribute('text-anchor', 'start'); text.removeAttribute('dy');
    const glyph = text.getBBox();
    const w = glyph.width;
    const boxOf = ([dx, dy, anchor]) => ({
      x: n.x + dx - (anchor === 'end' ? w : 0) - 1, y: n.y + dy + glyph.y, w: w + 2, h: glyph.height,
    });
    const cost = spot => {
      const box = boxOf(spot);
      let total = boxes.reduce((sum, b) => sum + (b.id === n.id ? 0 : overlap(box, b)), 0);
      total += axisLabels.reduce((sum, b) => sum + overlap(box, b), 0) * (n.decided || n.id === chosenId ? 0.25 : 1);
      if (box.x < 0 || box.x + box.w > width || box.y < 0 || box.y + box.h > height) total += 1e6;
      return total;
    };
    const costs = spots.map(cost);
    let best = costs.indexOf(0);
    const mustShow = n.decided || n.id === chosenId;
    if (best === -1 && mustShow) best = costs.indexOf(Math.min(...costs));
    if (best === -1) { text.classList.add('label-hidden'); hidden++; best = 0; }
    const [dx, dy, anchor] = spots[best];
    text.setAttribute('x', dx); text.setAttribute('y', dy); text.setAttribute('text-anchor', anchor);
    text.removeAttribute('dy');
    if (!text.classList.contains('label-hidden')) {
      const box = boxOf(spots[best]);
      boxes.push(box);
      axisLabels.forEach(a => { if (overlap(box, a) > 0) a.el.classList.add('covered'); });
    }
  }
  placeLabels.hidden = hidden;
  status.textContent = statusText(visibleCandidates());
}

function controlPoint({ source: a, target: b }, bend) {
  return { x: (a.x + b.x) / 2 - (b.y - a.y) * bend, y: (a.y + b.y) / 2 + (b.x - a.x) * bend };
}

function edgePath(edge, bend) {
  const { source: a, target: b } = edge;
  const c = controlPoint(edge, bend);
  return `M${a.x},${a.y}Q${c.x},${c.y} ${b.x},${b.y}`;
}

/**
 * The smallest curve that misses every other node. An ink line through a
 * polity it does not join would read as a lineage nobody decided.
 */
function clearBend(edge, nodes) {
  const { source: a, target: b } = edge;
  const others = nodes.filter(n => n !== a && n !== b);
  const distanceToNearest = bend => {
    const c = controlPoint(edge, bend);
    let nearest = Infinity;
    for (let t = 0.04; t < 1; t += 0.04) {
      const x = (1 - t) ** 2 * a.x + 2 * t * (1 - t) * c.x + t ** 2 * b.x;
      const y = (1 - t) ** 2 * a.y + 2 * t * (1 - t) * c.y + t ** 2 * b.y;
      for (const n of others) nearest = Math.min(nearest, Math.hypot(n.x - x, n.y - y));
    }
    return nearest;
  };
  const bends = [0.08, -0.08, 0.16, -0.16, 0.26, -0.26, 0.38, -0.38, 0.5, -0.5];
  return bends.find(bend => distanceToNearest(bend) >= 20) ?? d3.greatest(bends, distanceToNearest);
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
    // There is no year 0: the tick between 1 BCE and 1 CE reads as 1 CE.
    .text(t => formatYear(t === 0 ? 1 : t));
}

function statusText(shown) {
  const claimCount = `${claims.length} decided claims`;
  const lead = notice ? `${notice} ` : '';
  const hidden = placeLabels.hidden ? ` ${placeLabels.hidden} ${placeLabels.hidden === 1 ? 'name is' : 'names are'} hidden where ${placeLabels.hidden === 1 ? 'it' : 'they'} would overlap; point at a dot to read it.` : '';
  const left = dropped ? ` ${dropped} computed ${dropped === 1 ? 'polity is' : 'polities are'} left out because no place clear of the decided ones was free.` : '';
  if (evidence === 'none') return `${lead}Showing ${claimCount}. Select a claim's line for its terms.${hidden}`;
  if (evidence === 'chosen' && !chosenId) return `${lead}Showing ${claimCount}. Choose a polity to add its computed overlaps.${hidden}`;
  return `${lead}Showing ${claimCount} and ${shown.length.toLocaleString('en')} computed overlaps.${hidden}${left}`;
}

/** The open claim's line is full ink even when it is away from the chosen polity. */
function markSelected() {
  svg.selectAll('.claim-edge').classed('selected', e => e.claim.id === selectedClaimId)
    .select('.edge-decided').attr('marker-end', e => (e.claim.id !== selectedClaimId &&
      chosenId && e.source.id !== chosenId && e.target.id !== chosenId ? 'url(#ink-arrow-dim)' : 'url(#ink-arrow)'));
}

/** Opens one decided claim below the graph; `move` takes the reader there. */
function openClaim(id, move = false) {
  if (selectedClaimId === id && !move) return;
  selectedClaimId = id;
  markSelected();
  renderReading();
  if (move) reading.querySelector('h2')?.focus();
}

/** The graph's content as text, which also serves keyboard and screen-reader use. */
function renderReading() {
  const rows = list => `<ul class="claim-rows">${list.map(c => `<li>${claimRowHtml(c)}</li>`).join('')}</ul>${claimGlossaryHtml(CLAIM_ROW_TERMS)}`;
  const opened = selectedClaimId && claims.find(c => c.id === selectedClaimId);
  if (opened) {
    reading.innerHTML = `
      <h2 tabindex="-1">${esc(opened.heir_name)} inherits from ${esc(opened.source_name)}</h2>
      ${rows([opened])}
      <p><button type="button" class="quiet-button" id="close-claim">Show all decided claims</button></p>`;
    document.getElementById('close-claim').addEventListener('click', () => {
      selectedClaimId = null;
      markSelected();
      renderReading();
    });
    return;
  }
  const chosen = chosenId && polityById.get(chosenId);
  const own = chosen ? claims.filter(c => c.heir_polity_id === chosenId || (c.source_type === 'polity' && c.source_id === chosenId)) : [];
  reading.innerHTML = chosen ? `
    <h2 tabindex="-1">${esc(chosen.name)}</h2>
    <p>${esc(formatDateRange(chosen.start, chosen.end))}. <a href="/polity/?id=${encodeURIComponent(chosen.id)}">Read the entry</a></p>
    ${own.length ? rows(own) : '<p>No succession has been decided for this polity yet.</p>'}` : `
    <h2 tabindex="-1">All decided claims</h2>
    ${rows(claims)}`;
}
