/**
 * Shared page frame and text helpers.
 * Each page has <div id="site-header"></div>, <main id="main"> and
 * <div id="site-footer"></div>. Load this before the page's own script.
 */
const NAV = [
  ['/polity/', 'Polities'], ['/territory/', 'Territories'], ['/history/', 'History'],
  ['/graph.html', 'Graph'], ['/religion/', 'Religion'], ['/language/', 'Language'],
  ['/ethnicity/', 'Peoples'], ['/about/', 'About'],
];

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function renderFrame() {
  const here = location.pathname;
  const header = document.getElementById('site-header');
  if (header) {
    header.outerHTML = `
      <a class="skip-link" href="#main">Skip to content</a>
      <header class="site-header">
        <a class="site-name" href="/polity/">Anagnosis</a>
        <nav class="site-nav" aria-label="Sections">
          ${NAV.map(([href, label]) => `<a href="${href}"${here === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
        </nav>
        <button type="button" class="theme-toggle" id="theme-toggle"></button>
      </header>`;
    const button = document.getElementById('theme-toggle');
    const label = () => { button.textContent = currentTheme() === 'dark' ? 'Light theme' : 'Dark theme'; };
    label();
    button.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch { /* the choice lasts this page only */ }
      label();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  }
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.outerHTML = `<footer class="site-footer"><p>Coverage is uneven by design: a gap here means not yet curated, not that nothing happened. <a href="/about/">How to read this dataset</a></p></footer>`;
  }
}

try {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch { /* follow the system theme */ }

document.addEventListener('DOMContentLoaded', renderFrame);

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** roman_empire → Roman empire. For ids with no served display name. */
function humanize(id) {
  const words = String(id ?? '').replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** north_africa → North Africa. Territory rows have no display name yet (api.md M3). */
function placeName(id) {
  return String(id ?? '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatYear(y) {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

/** Empty end means ongoing, per the dataset's year convention. */
function formatDateRange(start, end) {
  if (start === null || start === undefined) return 'Dates not recorded';
  return `${formatYear(start)} – ${end === null || end === undefined ? 'present' : formatYear(end)}`;
}

/** Turns a provenance receipt into a link where its prefix is known. */
function provenanceHtml(provenance) {
  return String(provenance ?? '').split('|').map(part => {
    const receipt = part.trim();
    const wp = receipt.match(/^wp:(.+)$/);
    if (wp) return `<a href="https://en.wikipedia.org/wiki/${encodeURIComponent(wp[1])}" rel="noreferrer">Wikipedia: ${esc(wp[1].replace(/_/g, ' '))}</a>`;
    return esc(receipt);
  }).join('; ');
}

/** The failure state every page uses: says what failed and offers a retry. */
function renderLoadError(el, what) {
  el.innerHTML = `<p class="state state-error" role="alert">${esc(what)} could not be loaded from the server.</p>
    <button type="button" class="retry">Try again</button>`;
  el.querySelector('.retry').addEventListener('click', () => location.reload());
}
