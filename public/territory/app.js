/**
 * Territory pages.
 * /territory/ is the index; /territory/?id=<id> is a timeline of the periods
 * polities held that territory, with time running down the page.
 * Periods come from polity_territory, so a bar shows the holding and not the
 * polity's whole life. Candidates stay hidden until asked for, and in pencil.
 * ?year=<year> (BCE negative) draws a year cursor and says who was recorded then.
 */

const page = document.getElementById('page');
const params = new URLSearchParams(location.search);
const territoryId = params.get('id');

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
    .map(h => {
      const polity = polityById.get(h.id);
      const whole = h.start === polity.start && h.end === (polity.end ?? null);
      return { ...h, name: polity.name, to: h.end ?? now, whole };
    })
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
  if (spans.length) startTimeline(spans, name);
}

function timelineShellHtml(name) {
  return `
    <p class="lede">Polities recorded on this territory, earliest at the top. A solid bar gives years curated for this territory. A hollow bar only repeats the polity's whole lifespan: it was here at some point, not necessarily for all those years. Empty stretches mean nothing has been curated. Select a name to open its entry, or empty space to set the year.</p>
    <form class="year-form" id="year-form">
      <label for="year-input">Who was recorded here in a year?</label>
      <span class="year-fields">
        <input id="year-input" type="text" inputmode="text" autocomplete="off" placeholder="1500 or 300 BCE" aria-describedby="year-hint" />
        <button type="submit" class="quiet-button">Show</button>
        <button type="button" class="quiet-button" id="year-clear" hidden>Clear</button>
      </span>
      <span class="year-hint" id="year-hint">A plain number is CE; add BCE or a minus sign for earlier years.</span>
    </form>
    <div class="year-readout" id="year-readout" role="status"></div>
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
    <div class="timeline-frame" id="timeline-frame">
      <div class="lane-cue" id="lane-cue" hidden>
        <button type="button" class="quiet-button" id="lanes-left" hidden></button>
        <button type="button" class="quiet-button" id="lanes-right" hidden></button>
      </div>
      <div class="timeline-scroll" id="timeline-scroll" tabindex="0" role="region" aria-label="Timeline of ${esc(name)}">
        <div class="timeline" id="timeline"></div>
      </div>
    </div>
    <section class="pencil measure" id="computed-list" hidden></section>`;
}

// ── Year cursor ─────────────────────────────────────────────────────────────

/** "1500", "1500 CE", "300 BCE", "-300" → integer year, BCE negative. There is no year 0. */
function parseYear(text) {
  const match = String(text ?? '').trim().match(/^(-?\d{1,5})\s*(bce|bc|ce|ad)?\.?$/i);
  if (!match) return null;
  let year = Number(match[1]);
  if (/^bc/i.test(match[2] || '')) year = -Math.abs(year);
  return year === 0 ? null : year;
}

/** A holding counts in a year when the year falls within it, both ends included. */
const holdsIn = (span, year) => span.start <= year && year <= span.to;

function readoutHtml(spans, year, place) {
  const at = spans.filter(s => holdsIn(s, year));
  const when = formatYear(year);
  if (!at.length) {
    return `<p><b>In ${esc(when)}:</b> no polity is recorded on ${esc(place)}. That means not curated, not that nothing was there.</p>`;
  }
  const item = s => `<span class="year-item"><span class="key-bar${s.whole ? ' whole' : ''}" role="img" aria-label="${s.whole ? 'lifespan only' : 'years curated'}"></span><a href="/polity/?id=${encodeURIComponent(s.id)}">${esc(s.name)}</a></span>`;
  const key = [];
  if (at.some(s => !s.whole)) key.push('<li><span class="key-bar" aria-hidden="true"></span>Solid: years curated for this territory, so recorded here in that year.</li>');
  if (at.some(s => s.whole)) key.push(`<li><span class="key-bar whole" aria-hidden="true"></span>Hollow: lifespan only. The polity was here at some point, not necessarily in ${esc(when)}.</li>`);
  return `<p><b>In ${esc(when)}:</b> ${at.map(item).join(', ')}.</p><ul class="year-key">${key.join('')}</ul>`;
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

function startTimeline(spans, place) {
  const timeline = document.getElementById('timeline');
  const scroller = document.getElementById('timeline-scroll');
  const frame = document.getElementById('timeline-frame');
  const from = spans[0].start;
  const to = Math.max(...spans.map(s => s.to));
  // A long record fills about a thousand pixels; a short one stays short.
  let scale = Math.min(2.5, Math.max(0.4, 1000 / Math.max(to - from, 1)));
  let overlaps = null;
  let year = parseYear(params.get('year'));
  let placed = [], laneWidth = 0, axisWidth = 0;
  const y = value => PAD_TOP + (value - from) * scale;

  function draw() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const style = getComputedStyle(timeline);
    laneWidth = parseFloat(style.getPropertyValue('--lane')) * rem;
    axisWidth = parseFloat(style.getPropertyValue('--axis')) * rem;

    timeline.style.width = '';
    timeline.innerHTML = '<div class="axis-mask" aria-hidden="true"></div>' + axisHtml(from, to, y, scale) +
      '<svg class="timeline-lines" aria-hidden="true"></svg>' +
      spans.map((s, i) => `<a class="span${s.whole ? ' whole' : ''}" data-i="${i}" href="/polity/?id=${encodeURIComponent(s.id)}"
        style="top:${y(s.start)}px;width:${laneWidth}px"
        title="${esc(s.name)}, ${esc(formatDateRange(s.start, s.end))}${s.whole ? ', the polity\'s whole lifespan' : ''}">
        <span class="span-bar" style="height:${Math.max((s.to - s.start) * scale, MIN_BAR)}px"></span>
        <span class="span-name">${esc(s.name)}<span class="span-dates">${esc(formatDateRange(s.start, s.end))}</span></span>
      </a>`).join('');

    // Lanes come from the height each entry really takes, so names never collide.
    const laneBottoms = [];
    placed = [...timeline.querySelectorAll('.span')].map(el => {
      const s = spans[Number(el.dataset.i)];
      const top = y(s.start);
      const bottom = top + Math.max((s.to - s.start) * scale, el.querySelector('.span-name').offsetHeight, MIN_BAR) + 6;
      let lane = laneBottoms.findIndex(end => end <= top);
      if (lane === -1) lane = laneBottoms.length;
      laneBottoms[lane] = bottom;
      const left = axisWidth + lane * laneWidth;
      el.style.left = `${left}px`;
      return { s, el, lane, left, top, bottom: top + (s.to - s.start) * scale };
    });

    const height = Math.max(...laneBottoms, y(to)) + PAD_BOTTOM;
    const width = axisWidth + laneBottoms.length * laneWidth;
    timeline.style.height = `${height}px`;
    timeline.style.width = `${width}px`;
    if (overlaps) drawOverlaps(placed, width, height);
    showYear();
  }

  // ── The year cursor: a rule across the diagram and the bars it crosses ──
  const form = document.getElementById('year-form');
  const input = document.getElementById('year-input');
  const clear = document.getElementById('year-clear');
  const readout = document.getElementById('year-readout');

  function showYear() {
    timeline.querySelector('.year-cursor')?.remove();
    timeline.classList.toggle('has-year', year !== null);
    clear.hidden = year === null;
    for (const p of placed) p.el.classList.toggle('at-year', year !== null && holdsIn(p.s, year));
    if (year === null) {
      readout.innerHTML = '';
    } else {
      readout.innerHTML = readoutHtml(spans, year, place) +
        '<p><button type="button" class="quiet-button" id="year-jump">Show this year on the timeline ↓</button></p>';
      document.getElementById('year-jump').addEventListener('click', () => {
        timeline.querySelector('.year-cursor')?.scrollIntoView({ block: 'center' });
        const first = placed.find(p => holdsIn(p.s, year));
        if (first) scroller.scrollLeft = Math.max(0, first.left - axisWidth);
      });
      timeline.insertAdjacentHTML('beforeend',
        `<div class="year-cursor" style="top:${y(year)}px" aria-hidden="true"><span>${esc(formatYear(year))}</span></div>`);
    }
    updateLaneCue();
  }

  function setYear(value, { fromUrl = false } = {}) {
    year = value;
    if (year !== null) input.value = formatYear(year);
    if (!fromUrl) {
      const url = new URL(location.href);
      if (year === null) url.searchParams.delete('year'); else url.searchParams.set('year', year);
      history.replaceState(null, '', url);
    }
    showYear();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const typed = input.value.trim();
    if (!typed) return setYear(null);
    const value = parseYear(typed);
    if (value === null) {
      readout.innerHTML = `<p class="state-error">“${esc(typed)}” is not a year this page can read. Try 1500, 300 BCE or -300; there is no year 0.</p>`;
      return;
    }
    setYear(value);
  });
  clear.addEventListener('click', () => { input.value = ''; setYear(null); input.focus(); });

  // Selecting empty space on the diagram sets the year there; a bar stays a link.
  timeline.addEventListener('click', e => {
    if (e.target.closest('.span')) return;
    const offset = e.clientY - timeline.getBoundingClientRect().top;
    const value = Math.round(from + (offset - PAD_TOP) / scale);
    setYear(value === 0 ? 1 : value);
  });

  // ── Lanes off screen: a count that stays in view, and a fade on that side ──
  const cue = document.getElementById('lane-cue');
  const toLeft = document.getElementById('lanes-left');
  const toRight = document.getElementById('lanes-right');
  function updateLaneCue() {
    const lanes = new Set(placed.map(p => p.lane)).size;
    const left = scroller.scrollLeft + axisWidth;
    const right = scroller.scrollLeft + scroller.clientWidth;
    const centre = lane => axisWidth + (lane + 0.5) * laneWidth;
    const hiddenLanes = side => [...Array(lanes).keys()].filter(l => (side < 0 ? centre(l) < left : centre(l) > right));
    const crossing = laneList => year === null ? 0
      : new Set(placed.filter(p => laneList.includes(p.lane) && holdsIn(p.s, year)).map(p => p.s.id)).size;
    const words = (list, arrow) => {
      const n = list.length;
      const cross = crossing(list);
      const lane = `${n}${arrow === '→' ? ' more' : ''} ${n === 1 ? 'lane' : 'lanes'}`;
      const extra = year === null ? '' : `, ${cross} ${cross === 1 ? 'polity' : 'polities'} in ${formatYear(year)}`;
      return arrow === '→' ? `${lane}${extra} →` : `← ${lane}${extra}`;
    };
    const before = hiddenLanes(-1), after = hiddenLanes(1);
    toLeft.hidden = !before.length;
    toRight.hidden = !after.length;
    if (before.length) toLeft.textContent = words(before, '←');
    if (after.length) toRight.textContent = words(after, '→');
    cue.hidden = !before.length && !after.length;
    frame.classList.toggle('more-right', after.length > 0);
    frame.classList.toggle('more-left', before.length > 0);
  }
  const stride = () => Math.max(laneWidth, scroller.clientWidth - axisWidth - laneWidth / 3);
  toRight.addEventListener('click', () => scroller.scrollBy({ left: stride(), behavior: 'smooth' }));
  toLeft.addEventListener('click', () => scroller.scrollBy({ left: -stride(), behavior: 'smooth' }));
  scroller.addEventListener('scroll', updateLaneCue, { passive: true });
  addEventListener('resize', updateLaneCue);

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
  const list = document.getElementById('computed-list');
  const nameOf = id => spans.find(s => s.id === id).name;
  document.getElementById('show-computed').addEventListener('change', async e => {
    if (!e.target.checked) {
      overlaps = null;
      list.hidden = true;
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
    status.textContent = `Showing ${overlaps.length} computed ${overlaps.length === 1 ? 'overlap' : 'overlaps'} as dotted pencil lines. A script drew them and nobody has judged them. They include rivals and contemporaries, a line does not mean one led to the other, and none states that succession happened.`;
    list.innerHTML = overlaps.length ? `<h2>Computed overlaps on this territory</h2><ul>${overlaps.map(o => `<li>${esc(nameOf(o.from))} and ${esc(nameOf(o.to))}</li>`).join('')}</ul>` : '';
    list.hidden = !overlaps.length;
  });

  if (year !== null) input.value = formatYear(year);
  else if (params.get('year')) readout.innerHTML = `<p class="state-error">“${esc(params.get('year'))}” in the address is not a year this page can read.</p>`;
  draw();
  // Web fonts can change how names wrap, so lay out again once they arrive.
  document.fonts?.ready.then(draw);
}
