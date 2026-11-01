/**
 * Territory pages.
 * /territory/ is the index; /territory/?id=<id> is a timeline of the periods
 * polities held that territory, with time running down the page.
 * Periods come from polity_territory, so a bar shows the holding and not the
 * polity's whole life. Candidates stay hidden until asked for, and in pencil.
 */

const page = document.getElementById('page');
const territoryId = new URLSearchParams(location.search).get('id');

const LANE = 10.5;          // rem, one column of the timeline
const PAD_TOP = 16;         // px above the earliest bar
const PAD_BOTTOM = 40;      // px below the tallest entry
const MIN_BAR = 3;          // px, so a brief holding still shows
const MIN_SCALE = 0.1;      // px per year
const MAX_SCALE = 32;

const polityCountLabel = n => `${n} ${n === 1 ? 'polity' : 'polities'}`;
const distinctPolities = t => new Set(t.polities.map(p => p.polity_id)).size;

init();

async function init() {
  let territories, polities;
  try {
    [territories, polities] = await Promise.all([cachedFetch('/api/territory'), cachedFetch('/api/polity')]);
  } catch {
    page.innerHTML = `<h1>Territories</h1><div></div>`;
    renderLoadError(page.lastElementChild, territoryId ? 'This territory' : 'The list of territories');
    return;
  }
  const sorted = [...territories].sort((a, b) => placeName(a.id).localeCompare(placeName(b.id)));
  if (territoryId) renderEntry(sorted, polities);
  else renderIndex(sorted);
}

// ── Index ───────────────────────────────────────────────────────────────────

function renderIndex(territories) {
  page.innerHTML = `
    <h1>Territories</h1>
    <p class="lede">${territories.length} macro-zones, each with a timeline of the polities recorded on it.</p>
    <label class="filter">Find a territory by name
      <input type="search" id="territory-search" autocomplete="off" />
    </label>
    <p class="state" id="no-match" role="status" hidden></p>
    <ul class="entry-list measure" id="territory-list">
      ${territories.map(t => `<li data-name="${esc(placeName(t.id).toLowerCase())}">
        <a href="/territory/?id=${encodeURIComponent(t.id)}">${esc(placeName(t.id))}</a>
        <span class="when">${esc(polityCountLabel(distinctPolities(t)))}</span>
      </li>`).join('')}
    </ul>`;

  const items = [...page.querySelectorAll('#territory-list li')];
  const noMatch = document.getElementById('no-match');
  document.getElementById('territory-search').addEventListener('input', e => {
    const query = e.target.value.trim().toLowerCase();
    let shown = 0;
    items.forEach(item => {
      const match = item.dataset.name.includes(query);
      item.hidden = !match;
      if (match) shown++;
    });
    noMatch.hidden = shown > 0;
    noMatch.textContent = shown ? '' : `No territory has “${e.target.value}” in its name.`;
  });
}

// ── Entry ───────────────────────────────────────────────────────────────────

/** One span per unbroken holding. Adjoining periods of a polity read as one bar. */
function holdings(territory, polityById) {
  const now = new Date().getFullYear();
  const periods = territory.polities
    .filter(p => polityById.has(p.polity_id))
    .map(p => ({ id: p.polity_id, start: p.start_year, end: p.end_year ?? null }))
    .sort((a, b) => a.id.localeCompare(b.id) || a.start - b.start);

  const merged = [];
  for (const period of periods) {
    const last = merged[merged.length - 1];
    if (last && last.id === period.id && last.end !== null && period.start <= last.end) {
      last.end = period.end === null ? null : Math.max(last.end, period.end);
    } else {
      merged.push({ ...period });
    }
  }
  return merged
    .map(h => ({ ...h, name: polityById.get(h.id).name, to: h.end ?? now }))
    .sort((a, b) => a.start - b.start || a.to - b.to);
}

function renderEntry(territories, polities) {
  const territory = territories.find(t => t.id === territoryId);
  if (!territory) {
    document.title = 'Territory not found — Anagnosis';
    page.innerHTML = `<h1>Territory not found</h1>
      <p>No territory has the id “${esc(territoryId)}”. <a href="/territory/">Browse all territories</a></p>`;
    return;
  }

  const name = placeName(territory.id);
  document.title = `${name} — Anagnosis`;
  const polityById = new Map(polities.map(p => [p.id, p]));
  const spans = holdings(territory, polityById);
  const politiesHere = new Set(spans.map(s => s.id)).size;
  const first = spans.length ? spans[0].start : null;
  const last = spans.some(s => s.end === null) ? null : Math.max(...spans.map(s => s.end));

  const picker = `<label class="filter">Go to another territory
      <select id="territory-picker">${territories.map(t =>
        `<option value="${esc(t.id)}"${t.id === territory.id ? ' selected' : ''}>${esc(placeName(t.id))}</option>`).join('')}
      </select>
    </label>`;

  page.innerHTML = `
    <p><a href="/territory/">All territories</a></p>
    <h1>${esc(name)}</h1>
    ${spans.length ? `<p class="dates">${esc(polityCountLabel(politiesHere))}, ${esc(formatDateRange(first, last))}</p>` : ''}
    ${picker}
    ${spans.length ? timelineShellHtml(name) : `<p>No polity is recorded on ${esc(name)} yet. That means it is not curated, not that nothing happened there.</p>`}`;

  document.getElementById('territory-picker').addEventListener('change', e => {
    location.href = `/territory/?id=${encodeURIComponent(e.target.value)}`;
  });
  if (spans.length) startTimeline(spans);
}

function timelineShellHtml(name) {
  return `
    <p class="lede">Each bar runs for the years a polity held this territory, earliest at the top. Select a name to open its entry. Empty stretches mean nothing has been curated for those years. If the chart is wider than the screen, it scrolls sideways.</p>
    <div class="timeline-controls">
      <div class="scale-buttons" role="group" aria-label="Time scale">
        <button type="button" class="quiet-button" id="scale-in">Stretch time</button>
        <button type="button" class="quiet-button" id="scale-out">Compress time</button>
      </div>
    </div>
    <section class="pencil measure" aria-label="Computed evidence">
      <label class="computed-toggle"><input type="checkbox" id="show-computed" /> Show computed overlaps</label>
      <p id="computed-status" role="status">Computed overlaps are hidden. They are lines a script draws between polities that match on territory, language, ruling people or religion. Nobody has judged them, and none states that succession happened.</p>
    </section>
    <div class="timeline-scroll" id="timeline-scroll" tabindex="0" role="region" aria-label="Timeline of ${esc(name)}">
      <div class="timeline" id="timeline"></div>
    </div>`;
}

// ── Timeline ────────────────────────────────────────────────────────────────

/** A round step between axis labels, at least 72px apart on screen. */
function axisStep(scale) {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  return steps.find(step => step * scale >= 72) ?? 2000;
}

function axisHtml(from, to, y, scale) {
  const step = axisStep(scale);
  const ticks = [];
  for (let year = Math.ceil(from / step) * step; year <= to; year += step) {
    // There is no year 0: the tick between 1 BCE and 1 CE reads as 1 CE.
    ticks.push(`<div class="tick" style="top:${y(year)}px"><span>${esc(formatYear(year === 0 ? 1 : year))}</span></div>`);
  }
  return ticks.join('');
}

function startTimeline(spans) {
  const timeline = document.getElementById('timeline');
  const from = spans[0].start;
  const to = Math.max(...spans.map(s => s.to));
  // A long record fills about a thousand pixels; a short one stays short.
  let scale = Math.min(2.5, Math.max(0.4, 1000 / Math.max(to - from, 1)));
  let overlaps = null;

  function draw() {
    const y = year => PAD_TOP + (year - from) * scale;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const laneWidth = LANE * rem;
    const axisWidth = parseFloat(getComputedStyle(timeline).getPropertyValue('--axis')) * rem;

    timeline.style.width = '';
    timeline.innerHTML = axisHtml(from, to, y, scale) +
      '<svg class="timeline-lines" aria-hidden="true"></svg>' +
      spans.map((s, i) => `<a class="span" data-i="${i}" href="/polity/?id=${encodeURIComponent(s.id)}"
        style="top:${y(s.start)}px;width:${laneWidth}px"
        title="${esc(s.name)}, ${esc(formatDateRange(s.start, s.end))}">
        <span class="span-bar" style="height:${Math.max((s.to - s.start) * scale, MIN_BAR)}px"></span>
        <span class="span-name">${esc(s.name)}<span class="span-dates">${esc(formatDateRange(s.start, s.end))}</span></span>
      </a>`).join('');

    // Lanes come from the height each entry really takes, so names never collide.
    const laneBottoms = [];
    const placed = [...timeline.querySelectorAll('.span')].map(el => {
      const s = spans[Number(el.dataset.i)];
      const top = y(s.start);
      const bottom = top + Math.max((s.to - s.start) * scale, el.querySelector('.span-name').offsetHeight, MIN_BAR) + 6;
      let lane = laneBottoms.findIndex(end => end <= top);
      if (lane === -1) lane = laneBottoms.length;
      laneBottoms[lane] = bottom;
      const left = axisWidth + lane * laneWidth;
      el.style.left = `${left}px`;
      return { s, left, top, bottom: top + (s.to - s.start) * scale };
    });

    const height = Math.max(...laneBottoms, y(to)) + PAD_BOTTOM;
    const width = axisWidth + laneBottoms.length * laneWidth;
    timeline.style.height = `${height}px`;
    timeline.style.width = `${width}px`;
    if (overlaps) drawOverlaps(placed, width, height);
  }

  function drawOverlaps(placed, width, height) {
    const svg = timeline.querySelector('.timeline-lines');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    const firstOf = new Map(), lastOf = new Map();
    for (const p of placed) {
      if (!firstOf.has(p.s.id)) firstOf.set(p.s.id, p);
      lastOf.set(p.s.id, p);
    }
    const shown = overlaps.filter(o => lastOf.has(o.from) && firstOf.has(o.to));
    const barMiddle = 6;
    svg.innerHTML = shown.map(o => {
      const a = lastOf.get(o.from), b = firstOf.get(o.to);
      const x1 = a.left + barMiddle, x2 = b.left + barMiddle;
      const midY = (a.bottom + b.top) / 2;
      const signals = [o.same_ethnicity && 'same ruling people', o.same_language && 'same language', o.same_religion && 'same religion'].filter(Boolean);
      const label = `Computed, unjudged: ${a.s.name} and ${b.s.name}${signals.length ? `; ${signals.join(', ')}` : ''}`;
      return `<path class="edge-computed${shown.length > 200 ? ' faint' : ''}" d="M${x1},${a.bottom} C${x1},${midY} ${x2},${midY} ${x2},${b.top}"><title>${esc(label)}</title></path>`;
    }).join('');
    return shown.length;
  }

  function rescale(factor) {
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    draw();
  }
  document.getElementById('scale-in').addEventListener('click', () => rescale(1.5));
  document.getElementById('scale-out').addEventListener('click', () => rescale(1 / 1.5));

  const status = document.getElementById('computed-status');
  const hiddenText = status.textContent;
  document.getElementById('show-computed').addEventListener('change', async e => {
    if (!e.target.checked) {
      overlaps = null;
      draw();
      status.textContent = hiddenText;
      return;
    }
    status.textContent = 'Loading computed overlaps…';
    try {
      const ids = new Set(spans.map(s => s.id));
      overlaps = (await cachedFetch('/api/succession')).filter(o => ids.has(o.from) && ids.has(o.to));
    } catch {
      e.target.checked = false;
      renderLoadError(status, 'The computed overlaps');
      return;
    }
    draw();
    status.textContent = `Showing ${overlaps.length} computed ${overlaps.length === 1 ? 'overlap' : 'overlaps'} as dotted pencil lines. A script drew them and nobody has judged them. They include rivals and contemporaries, the line order is not a direction, and none states that succession happened.`;
  });

  draw();
  // Web fonts can change how names wrap, so lay out again once they arrive.
  document.fonts?.ready.then(draw);
}
