/**
 * Shared page frame and text helpers.
 * Each page has <div id="site-header"></div>, <main id="main"> and
 * <div id="site-footer"></div>. Load this before the page's own script.
 */
const NAV = [
  ['/polity/', 'Polities'], ['/territory/', 'Territories'], ['/history/', 'History'],
  ['/graph.html', 'Graph'], ['/religion/', 'Religions'], ['/language/', 'Languages'],
  ['/ethnicity/', 'Peoples'],
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
        <a class="site-name" href="/">Anagnosis</a>
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
    footer.outerHTML = `<footer class="site-footer"><p>Coverage is uneven by design: a gap here means not yet curated, not that nothing happened. <a href="/#how-to-read">How to read this dataset</a></p></footer>`;
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
  return String(id ?? '').split('_').map(w => (w === 'us' ? 'US' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function formatYear(y) {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}

/** Empty end means ongoing, per the dataset's year convention. */
function formatDateRange(start, end) {
  if (start === null || start === undefined) return 'Dates not recorded';
  return `${formatYear(start)} – ${end === null || end === undefined ? 'present' : formatYear(end)}`;
}

/** A claim's source links to an entry only when it is a polity. */
function claimPartyHtml(id, name, type = 'polity') {
  return type === 'polity' ? `<a href="/polity/?id=${encodeURIComponent(id)}">${esc(name)}</a>` : esc(humanize(name));
}

function claimSentenceHtml(claim) {
  return `${claimPartyHtml(claim.heir_polity_id, claim.heir_name)} inherits from ${claimPartyHtml(claim.source_id, claim.source_name, claim.source_type)}`;
}

const RECOGNITION_WORDS = { recognized: 'Recognized by', partial: 'Partly recognized by', rejected: 'Rejected by' };

/** "A", "A and B", "A, B and C". */
function andList(items) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/** Who at the time recognized or rejected a claim, grouped by degree; silence is said, not left blank. */
function recognitionSummaryHtml(claim) {
  const entries = claim.recognition || [];
  if (!entries.length) return 'No recognition or rejection recorded.';
  const byDegree = new Map();
  for (const r of entries) {
    if (!byDegree.has(r.degree)) byDegree.set(r.degree, []);
    byDegree.get(r.degree).push(claimPartyHtml(r.observer_id, r.observer_name, r.observer_type));
  }
  return [...byDegree].map(([degree, names]) =>
    `${RECOGNITION_WORDS[degree] || esc(humanize(degree))} ${andList(names)}.`).join(' ');
}

/**
 * One decided claim as a small diagram: source, an arrow carrying the
 * mechanism, heir; then legitimacy and gap, recognition, and the cited source.
 * Ink only: this is for claims, never for computed candidates.
 */
function claimRowHtml(claim) {
  const gap = claim.temporal_gap_years > 0 ? `${claim.temporal_gap_years}-year gap` : 'no gap';
  const legitimacy = claim.legitimacy_mode ? `${claim.legitimacy_mode} legitimacy` : 'legitimacy not recorded';
  return `<div class="claim-row">
    <p class="claim-link">
      <span class="claim-end">${claimPartyHtml(claim.source_id, claim.source_name, claim.source_type)}</span>
      <span class="claim-arrow"><span class="claim-mechanism">${esc(humanize(claim.mechanism).toLowerCase())}</span><span class="sr-only">, passed to</span></span>
      <span class="claim-end">${claimPartyHtml(claim.heir_polity_id, claim.heir_name)}</span>
    </p>
    <p class="claim-meta">${esc(humanize(legitimacy))}; ${esc(gap)}.</p>
    <p class="claim-meta">${recognitionSummaryHtml(claim)}</p>
    <p class="claim-meta claim-cited">Source: ${provenanceHtml(claim.provenance)}</p>
  </div>`;
}

/**
 * The one authored wording for claim terms. Each page asks for the parts it
 * shows, so a term is explained wherever it appears and written only here.
 */
const CLAIM_GLOSSARY = {
  topology: 'The first word says what kind of link this is.',
  legitimacy: "Legitimacy is organic when it came with the inheritance itself, claimed when the heir asserted it, and fictive when it was constructed, as with Russia's Third Rome.",
  exclusivity: 'Exclusive means the heir admits no co-heir, though rival heirs can each make that claim; shared means it accepts others.',
  gap: 'No gap means the inheritance was immediate; a gap in years means the heir revived the source after that long.',
  axes: "The bold lines are the parts of an identity that passed along. Affirmed means the heir kept it, transformed that it changed it, and repudiated that it rejected it. Strength is a curator's grade from 1 to 5; the rules for that grade are not settled yet.",
  recognition: 'Recognition is what historical actors did at the time, not a modern verdict.',
};

function claimGlossaryHtml(parts) {
  return `<details class="claim-glossary">
  <summary>What these terms mean</summary>
  ${parts.map(part => `<p>${esc(CLAIM_GLOSSARY[part])}</p>`).join('')}
</details>`;
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
