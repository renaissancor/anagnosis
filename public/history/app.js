/**
 * History panels: parallel regional columns read side by side, era by era.
 * The panel list comes from /api/panel, and ?panel=<region>/<name> names the one shown.
 * A cell links to a polity only when that polity has an entry; about half of the
 * panel references do not (api.md 2.9), and they read as plain text.
 */

const page = document.getElementById('page');
const DEFAULT_PANEL = 'east_asia/china';

// Readable group names where the panel folder name would not read well.
const GROUP_OF_REGION = { central_asia: 'Central Asia & Persia', persia_central_asia: 'Central Asia & Persia' };
const GROUP_OF_PANEL = { 'middle_east/morocco': 'North Africa' };

let polityNames = new Map();
let shownPanel = null;
let columnWatch = null;
addEventListener('resize', () => columnWatch?.());

init();

async function init() {
  let panels, polities;
  try {
    [panels, polities] = await Promise.all([cachedFetch('/api/panel'), cachedFetch('/api/polity')]);
  } catch {
    page.innerHTML = `<h1>History</h1><div></div>`;
    renderLoadError(page.lastElementChild, 'The history panels');
    return;
  }
  polityNames = new Map(polities.map(p => [p.id, p.name]));

  page.innerHTML = `
    <h1 id="panel-title">History</h1>
    <label class="filter">Choose a region
      <select id="panel-picker">${pickerHtml(panels)}</select>
    </label>
    <p class="panel-legend measure">Underlined names link to a polity entry. Plain names are labels: peoples, cultures, periods, events and names with no polity entry yet. A wide table scrolls sideways; the column heads say how many columns are off screen.</p>
    <div id="panel-body"><p class="state">Loading…</p></div>`;

  const picker = document.getElementById('panel-picker');
  const current = () => new URLSearchParams(location.search).get('panel') ||
    (panels.some(p => p.id === DEFAULT_PANEL) ? DEFAULT_PANEL : panels[0]?.id);
  const show = () => {
    const id = current();
    picker.value = id;
    showPanel(id, panels);
  };
  picker.addEventListener('change', () => {
    history.pushState(null, '', `/history/?panel=${picker.value}`);
    show();
  });
  addEventListener('popstate', show);
  show();
}

function groupName(panel) {
  return GROUP_OF_PANEL[panel.id] || GROUP_OF_REGION[panel.region] || placeName(panel.region);
}

/** "History of the Baltic States (Estonia · Latvia)" → "Baltic States". */
function shortTitle(title) {
  return title.replace(/^History of (the )?/, '').replace(/\s*\(.*\)\s*$/, '') || title;
}

function pickerHtml(panels) {
  const groups = new Map();
  for (const panel of panels) {
    const name = groupName(panel);
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push({ id: panel.id, label: shortTitle(panel.title) });
  }
  return [...groups.keys()].sort().map(name => `<optgroup label="${esc(name)}">${
    groups.get(name).sort((a, b) => a.label.localeCompare(b.label))
      .map(p => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('')
  }</optgroup>`).join('');
}

async function showPanel(id, panels) {
  const body = document.getElementById('panel-body');
  const title = document.getElementById('panel-title');
  shownPanel = id;
  body.innerHTML = '<p class="state">Loading…</p>';

  if (!panels.some(p => p.id === id)) {
    title.textContent = 'Panel not found';
    document.title = 'Panel not found — Anagnosis';
    body.innerHTML = `<p>No history panel has the id “${esc(id)}”. Choose one above, or <a href="/history/">open the first panel</a>.</p>`;
    return;
  }

  let panel;
  try {
    const [region, name] = id.split('/');
    panel = await cachedFetch(`/api/panel/${encodeURIComponent(region)}/${encodeURIComponent(name)}`);
  } catch {
    title.textContent = 'History';
    document.title = 'History — Anagnosis';
    renderLoadError(body, 'This panel');
    return;
  }
  if (shownPanel !== id) return; // a later choice has taken over
  title.textContent = panel.title;
  document.title = `${panel.title} — Anagnosis`;
  body.innerHTML = panelHtml(panel);
  watchColumns(body.querySelector('.panel-frame'), panel.title);
}

/**
 * The table flows at full page height and scrolls only sideways. The head strip
 * follows the sideways scroll, and a note in it counts the columns still off
 * screen, so a narrow screen never reads as the whole table.
 */
function watchColumns(frame, title) {
  const scroller = frame.querySelector('.panel-scroll');
  const headScroll = frame.querySelector('.panel-head-scroll');
  const more = frame.querySelector('.panel-more');
  const heads = [...headScroll.querySelectorAll('.panel-head:not(.era-head)')];
  const update = () => {
    headScroll.scrollLeft = scroller.scrollLeft;
    const box = scroller.getBoundingClientRect();
    const eraWidth = headScroll.querySelector('.era-head')?.offsetWidth || 0;
    frame.style.setProperty('--era-edge', `${eraWidth}px`);
    const before = heads.filter(h => h.getBoundingClientRect().left < box.left + eraWidth - 2).length;
    const after = heads.filter(h => h.getBoundingClientRect().right > box.right + 2).length;
    frame.classList.toggle('more-right', after > 0);
    frame.classList.toggle('more-left', before > 0);
    more.hidden = !after && !before;
    const parts = [];
    if (before) parts.push(`← ${before} ${before === 1 ? 'column' : 'columns'}`);
    if (after) parts.push(`${after} more ${after === 1 ? 'column' : 'columns'} →`);
    more.textContent = parts.join(' · ');
    scroller.setAttribute('aria-label', after || before
      ? `${title}, ${heads.length} columns, scrolls sideways` : `${title}, ${heads.length} columns`);
  };
  scroller.addEventListener('scroll', update, { passive: true });
  columnWatch = update;
  update();
  document.fonts?.ready.then(update);
  watchEra(frame);
}

/** The era head names the era at the top of the window, since era cells can be taller than it. */
let eraWatch = null;
function watchEra(frame) {
  const label = frame.querySelector('.era-head .cell-text');
  if (eraWatch) removeEventListener('scroll', eraWatch);
  if (!label) return;
  const heading = label.textContent;
  const strip = frame.querySelector('.panel-head-strip');
  const eras = [...frame.querySelectorAll('.panel-scroll .era-cell')];
  let queued = false;
  eraWatch = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const line = strip.getBoundingClientRect().bottom;
      const era = eras.find(cell => {
        const box = cell.getBoundingClientRect();
        return box.top < line && box.bottom > line;
      });
      const hidden = era && era.getBoundingClientRect().top < line - 4;
      label.textContent = hidden ? era.textContent : heading;
      label.parentElement.classList.toggle('era-current', Boolean(hidden));
    });
  };
  addEventListener('scroll', eraWatch, { passive: true });
  eraWatch();
}

function itemHtml(item) {
  const entry = item.polity ? polityNames.get(item.polity) : undefined;
  const label = item.label || entry || humanize(item.polity);
  const text = entry
    ? `<a href="/polity/?id=${encodeURIComponent(item.polity)}">${esc(label)}</a>`
    : esc(label || '—');
  return `<div class="cell-text">${text}${item.note ? `<span class="cell-note">${esc(item.note)}</span>` : ''}</div>`;
}

/** Panels are hand-written; only a positive whole number reaches a style attribute. */
const whole = value => (Number.isInteger(value) && value > 0 ? value : 1);

const linkedClass = item => (item.polity && polityNames.has(item.polity) ? 'linked' : '');

function panelHtml(panel) {
  const eraColumn = panel.columns.find(c => c.type === 'era');
  const columns = panel.columns.filter(c => c.type !== 'era');
  const slots = columns.reduce((sum, c) => sum + whole(c.slots), 0);
  const eraOffset = eraColumn ? 1 : 0;

  // A row starts a new era when its era label differs from the one before.
  const eraStarts = new Set();
  let previousEra = null;
  panel.rows.forEach((row, i) => {
    if (row.era?.label && row.era.label !== previousEra) {
      if (previousEra !== null) eraStarts.add(i);
      previousEra = row.era.label;
    }
  });

  // taken[row][slot] marks a slot already owned by a cell spanning down from above.
  const taken = {};
  const take = (row, slot, rowSpan, colSpan) => {
    for (let r = row; r < row + rowSpan; r++) {
      taken[r] ??= {};
      for (let c = slot; c < slot + colSpan; c++) taken[r][c] = true;
    }
  };

  // The column heads are their own grid, so they can stay in view while the page scrolls.
  let head = '';
  if (eraColumn) head += `<div class="panel-head era-head" style="grid-column:1;grid-row:1"><span class="cell-text">${esc(eraColumn.name)}</span></div>`;
  let at = 1 + eraOffset;
  for (const column of columns) {
    head += `<div class="panel-head" style="grid-column:${at}/span ${whole(column.slots)};grid-row:1"><span class="cell-text">${esc(column.name)}</span></div>`;
    at += whole(column.slots);
  }

  let html = '';

  panel.rows.forEach((row, rowIndex) => {
    const gridRow = rowIndex + 1;
    const start = eraStarts.has(rowIndex) ? 'era-start' : '';

    if (eraColumn && row.era?.label) {
      html += `<div class="era-cell ${start}" style="grid-column:1;grid-row:${gridRow}/span ${whole(row.era.rowspan)}"><span class="cell-text">${esc(row.era.label)}</span></div>`;
    }

    let slot = 0;
    for (const cell of row.cells || []) {
      while (taken[rowIndex]?.[slot]) slot++;
      const colSpan = whole(cell.span);
      const rowSpan = whole(cell.rowspan);
      const position = `grid-column:${slot + 1 + eraOffset}/span ${colSpan};grid-row:${gridRow}/span ${rowSpan}`;
      take(rowIndex, slot, rowSpan, colSpan);
      slot += colSpan;

      if (cell.stack) {
        html += `<div class="cell cell-stack ${start}" style="${position}">${cell.stack.map(item => `<div class="${linkedClass(item)}">${itemHtml(item)}</div>`).join('')}</div>`;
      } else if (cell.split) {
        html += `<div class="cell cell-split ${start}" style="${position}">${cell.split.map(item => `<div class="${linkedClass(item)}">${itemHtml(item)}</div>`).join('')}</div>`;
      } else {
        html += `<div class="cell ${linkedClass(cell)} ${start}" style="${position}">${itemHtml(cell)}</div>`;
      }
    }
  });

  const eraTrack = eraColumn ? 'var(--era) ' : '';
  const minWidth = `calc(${eraColumn ? 'var(--era) + ' : ''}${slots} * var(--slot))`;
  const notes = panel.footnotes?.length
    ? `<h2>Notes</h2><ul class="panel-notes measure">${panel.footnotes.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : '';

  const grid = `grid-template-columns:${eraTrack}repeat(${slots},minmax(var(--slot),1fr));min-width:${minWidth}`;
  return `<div class="panel-frame">
      <div class="panel-head-strip">
        <div class="panel-head-scroll"><div class="panel-grid" style="${grid}">${head}</div></div>
        <p class="panel-more" hidden></p>
      </div>
      <div class="panel-scroll" tabindex="0" role="region" aria-label="${esc(panel.title)}">
        <div class="panel-grid" style="${grid}">${html}</div>
      </div>
    </div>${notes}`;
}
