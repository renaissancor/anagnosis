/**
 * Polity pages.
 * /polity/ is the index of polities; /polity/?id=<id> is one entry.
 * An entry keeps decided claims (ink) apart from computed candidates (pencil).
 */

const page = document.getElementById('page');
const polityId = new URLSearchParams(location.search).get('id');

const CLAIM_TERMS = {
  topology: { continuation: 'continuation', fission: 'fission', fusion: 'fusion', secession: 'secession', absorption: 'absorption' },
  legitimacy_mode: { organic: 'organic', claimed: 'claimed', fictive: 'fictive' },
  exclusivity: { exclusive: 'exclusive', shared: 'shared with other heirs' },
};
const DEGREE = { recognized: 'recognized this', partial: 'partly recognized this', rejected: 'rejected this' };
const DIRECTION = {
  same: 'about the same territory',
  expansion: 'the later one held more territory',
  contraction: 'the later one held less territory',
  displacement: 'mostly different territory',
  unknown: 'territory unclear',
};

if (polityId) renderEntry(polityId);
else renderIndex();

// ── Index ───────────────────────────────────────────────────────────────────

async function renderIndex() {
  let polities;
  try {
    polities = await cachedFetch('/api/polity');
  } catch {
    renderLoadError(page, 'The list of polities');
    return;
  }

  const sorted = [...polities].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
  page.innerHTML = `
    <h1>Polities</h1>
    <p class="lede">${sorted.length} political entities, earliest first. Each is a people, a territory, an ideology and a span of time.</p>
    <label class="filter">Find a polity by name
      <input type="search" id="polity-search" autocomplete="off" />
    </label>
    <p class="state" id="no-match" role="status" hidden></p>
    <ul class="entry-list" id="polity-list">
      ${sorted.map(p => `<li data-name="${esc(p.name.toLowerCase())}">
        <a href="/polity/?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        <span class="when">${esc(formatDateRange(p.start, p.end))}</span>
      </li>`).join('')}
    </ul>`;

  const items = [...page.querySelectorAll('#polity-list li')];
  const noMatch = document.getElementById('no-match');
  document.getElementById('polity-search').addEventListener('input', e => {
    const query = e.target.value.trim().toLowerCase();
    let shown = 0;
    items.forEach(item => {
      const match = item.dataset.name.includes(query);
      item.hidden = !match;
      if (match) shown++;
    });
    noMatch.hidden = shown > 0;
    noMatch.textContent = shown ? '' : `No polity has “${e.target.value}” in its name.`;
  });
}

// ── Entry ───────────────────────────────────────────────────────────────────

async function renderEntry(id) {
  let polity, claims;
  try {
    [polity, claims] = await Promise.all([
      cachedFetch(`/api/polity/${encodeURIComponent(id)}`),
      cachedFetch(`/api/polity/${encodeURIComponent(id)}/claims`),
    ]);
  } catch (err) {
    if (err.message.startsWith('404')) {
      page.innerHTML = `<h1>Polity not found</h1>
        <p>No polity has the id “${esc(id)}”. <a href="/polity/">Browse all polities</a></p>`;
    } else {
      renderLoadError(page, 'This polity');
    }
    return;
  }

  const names = await displayNames();
  document.title = `${polity.name} — Anagnosis`;

  page.innerHTML = `
    <h1>${esc(polity.name)}</h1>
    <p class="dates">${esc(formatDateRange(polity.start, polity.end))}</p>
    ${factsHtml(polity, names)}
    ${polity.note ? `<p style="margin-top:var(--space-3)">${esc(polity.note)}</p>` : ''}
    ${decidedHtml(polity, claims)}
    ${figuresHtml(polity)}
    ${computedHtml(polity, claims)}`;
}

/** Display names for ids. A failed lookup falls back to the readable id. */
async function displayNames() {
  const table = async (url, key = 'id') => {
    try { return new Map((await cachedFetch(url)).map(n => [n[key], n.name])); }
    catch { return new Map(); }
  };
  const [ethnicity, language, religion, government] = await Promise.all([
    table('/api/taxonomy/ethnicity'), table('/api/taxonomy/language'),
    table('/api/taxonomy/religion'), table('/api/government'),
  ]);
  return { ethnicity, language, religion, government };
}

function factsHtml(polity, names) {
  const named = (map, id) => esc(map.get(id) || humanize(id));
  const rows = [];
  if (polity.ruling_ethnicity) rows.push(['Ruling people', named(names.ethnicity, polity.ruling_ethnicity)]);
  if (polity.cultural_language) rows.push(['Language of rule', named(names.language, polity.cultural_language)]);
  if (polity.ideology?.religion) rows.push(['State religion', named(names.religion, polity.ideology.religion)]);
  if (polity.ideology?.government) rows.push(['Government', named(names.government, polity.ideology.government)]);
  const territories = [...(polity.territories || [])].sort();
  rows.push(['Territories', territories.length
    ? territories.map(t => `<a href="/territory/?id=${encodeURIComponent(t)}">${esc(placeName(t))}</a>`).join(', ')
    : 'None curated yet']);
  if (polity.policies?.length) rows.push(['Policies', polity.policies.map(p => esc(humanize(p))).join(', ')]);
  return `<dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
}

function figuresHtml(polity) {
  if (!polity.figures?.length) return '';
  return `<h2>People</h2><ul class="people">${polity.figures.map(f => `<li>
    <b>${esc(f.name || humanize(f.id))}</b>${f.role ? `, ${esc(humanize(f.role).toLowerCase())}` : ''}${f.years ? ` (${esc(f.years.replace('/', '–'))})` : ''}${f.significance ? `. ${esc(f.significance)}` : ''}
  </li>`).join('')}</ul>`;
}

// ── Ink: decided claims ─────────────────────────────────────────────────────

function polityLink(id, name) {
  return `<a href="/polity/?id=${encodeURIComponent(id)}">${esc(name)}</a>`;
}

function claimHtml(claim, statement) {
  const terms = [
    CLAIM_TERMS.topology[claim.topology] || humanize(claim.topology),
    `by ${humanize(claim.mechanism).toLowerCase()}`,
    `${CLAIM_TERMS.legitimacy_mode[claim.legitimacy_mode] || claim.legitimacy_mode} legitimacy`,
    CLAIM_TERMS.exclusivity[claim.exclusivity] || claim.exclusivity,
  ];
  if (claim.temporal_gap_years > 0) terms.push(`after a gap of ${claim.temporal_gap_years} years`);

  const axes = (claim.axes || []).map(a => `<li>
    <b>${esc(humanize(a.axis))}</b>: ${esc(a.stance || 'no stance')}, strength ${esc(a.strength)} of 5.${a.note ? ` ${esc(a.note)}` : ''}
  </li>`).join('');
  const recognition = (claim.recognition || []).map(r => `<p class="claim-recognition">
    ${r.observer_type === 'polity' ? polityLink(r.observer_id, r.observer_name) : esc(humanize(r.observer_id))} ${DEGREE[r.degree] || esc(r.degree)}${r.note ? `: ${esc(r.note)}` : '.'}
  </p>`).join('');

  return `<article class="claim">
    <h3 class="claim-statement" style="font-weight:400">${statement}</h3>
    <p class="claim-terms">${esc(humanize(terms.join(', ')))}.</p>
    ${claim.note ? `<p>${esc(claim.note)}</p>` : ''}
    ${axes ? `<ul class="claim-axes">${axes}</ul>` : ''}
    ${recognition}
    <p class="claim-source">Source: ${provenanceHtml(claim.provenance)}</p>
  </article>`;
}

function decidedHtml(polity, { as_heir, as_source, termini }) {
  const inherited = as_heir.map(c =>
    claimHtml(c, `Inherits from ${polityLink(c.source_id, c.source_name)}`)).join('');
  const passedOn = as_source.map(c =>
    claimHtml(c, `Passes to ${polityLink(c.heir_polity_id, c.heir_name)}`)).join('');
  const ended = termini.map(t => `<p><b>${esc(humanize(t.axis))}</b> ended in ${esc(formatYear(t.year))}.${t.note ? ` ${esc(t.note)}` : ''}</p>`).join('');

  const body = inherited + passedOn + ended ||
    `<p>No succession has been decided for ${esc(polity.name)} yet. That means it is not curated, not that it had no successor.</p>`;
  return `<section aria-labelledby="decided"><h2 id="decided">Decided succession</h2>${body}</section>`;
}

// ── Pencil: computed candidates ─────────────────────────────────────────────

function candidateHtml(edge, decidedIds) {
  const reasons = [];
  if (edge.shared_territories?.length) reasons.push(`shares ${edge.shared_territories.map(placeName).join(', ')}`);
  if (edge.same_ethnicity) reasons.push('same ruling people');
  if (edge.same_language) reasons.push('same language');
  if (edge.same_religion) reasons.push('same religion');
  reasons.push(DIRECTION[edge.territorial_direction] || DIRECTION.unknown);
  return `<li><a href="/polity/?id=${encodeURIComponent(edge.id)}">${esc(edge.name)}</a>${decidedIds.has(edge.id) ? ' (also decided above)' : ''}: ${esc(reasons.join('; '))}</li>`;
}

function computedHtml(polity, { as_heir, as_source }) {
  const earlier = [...(polity.predecessors || [])].sort((a, b) => b.strength - a.strength);
  const later = [...(polity.successors || [])].sort((a, b) => b.strength - a.strength);
  const total = earlier.length + later.length;
  const decidedIds = new Set([...as_heir.map(c => c.source_id), ...as_source.map(c => c.heir_polity_id)]);
  const list = (title, edges) => edges.length
    ? `<h3>${title} (${edges.length})</h3><ul>${edges.map(e => candidateHtml(e, decidedIds)).join('')}</ul>` : '';

  const body = total
    ? `<details>
        <summary>Show ${total} computed overlaps, strongest first</summary>
        ${list('Computed as earlier', earlier)}
        ${list('Computed as later', later)}
      </details>`
    : '<p>A script found no overlaps for this polity.</p>';

  return `<section class="pencil" aria-labelledby="computed">
    <h2 id="computed">Computed evidence</h2>
    <p>A script lists polities that overlap in territory, language or religion within a time window. Nobody has judged these. They include rivals and contemporaries, and none of them states that succession happened.</p>
    ${body}
  </section>`;
}
