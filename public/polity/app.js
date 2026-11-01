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
  let polity;
  try {
    polity = await cachedFetch(`/api/polity/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err.message.startsWith('404')) {
      document.title = 'Polity not found — Anagnosis';
      page.innerHTML = `<h1>Polity not found</h1>
        <p>No polity has the id “${esc(id)}”. <a href="/polity/">Browse all polities</a></p>`;
    } else {
      renderLoadError(page, 'This polity');
    }
    return;
  }

  // Claims failing must not read as "none decided", so that state is kept apart.
  const claims = await cachedFetch(`/api/polity/${encodeURIComponent(id)}/claims`).catch(() => null);
  const names = await displayNames();
  document.title = `${polity.name} — Anagnosis`;

  page.innerHTML = `
    <h1>${esc(polity.name)}</h1>
    <p class="dates">${esc(formatDateRange(polity.start, polity.end))}</p>
    ${factsHtml(polity, names)}
    ${polity.note ? `<p class="entry-note">${esc(polity.note)}</p>` : ''}
    ${decidedHtml(polity, claims)}
    ${figuresHtml(polity)}
    ${computedHtml(polity, claims)}`;
  const claimsError = document.getElementById('claims-error');
  if (claimsError) renderLoadError(claimsError, 'The decided claims');
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

function claimHtml(claim, statement) {
  const terms = [
    CLAIM_TERMS.topology[claim.topology] || humanize(claim.topology),
    `by ${humanize(claim.mechanism).toLowerCase()}`,
  ];
  if (claim.legitimacy_mode) terms.push(`${CLAIM_TERMS.legitimacy_mode[claim.legitimacy_mode] || claim.legitimacy_mode} legitimacy`);
  if (claim.exclusivity) terms.push(CLAIM_TERMS.exclusivity[claim.exclusivity] || claim.exclusivity);
  if (claim.source_temporal_status === 'ongoing') terms.push('from a source that continues');
  if (claim.source_temporal_status === 'abstract') terms.push('from an idea, not a state');
  if (claim.temporal_gap_years > 0) terms.push(`after a gap of ${claim.temporal_gap_years} years`);

  const axes = (claim.axes || []).map(a => `<li>
    <b>${esc(humanize(a.axis))}</b>: ${esc(a.stance || 'no stance')}${a.strength ? `, strength ${esc(a.strength)} of 5` : ''}.${a.note ? ` ${esc(a.note)}` : ''}
  </li>`).join('');
  const recognition = (claim.recognition || []).map(r => `<p class="claim-recognition">
    ${claimPartyHtml(r.observer_id, r.observer_name, r.observer_type)} ${DEGREE[r.degree] || esc(r.degree)}${r.note ? `: ${esc(r.note)}` : '.'}
  </p>`).join('');

  return `<article class="claim">
    <h3 class="claim-statement">${statement}</h3>
    <p class="claim-terms">${esc(humanize(terms.join(', ')))}.</p>
    ${claim.note ? `<p>${esc(claim.note)}</p>` : ''}
    ${axes ? `<ul class="claim-axes">${axes}</ul>` : ''}
    ${recognition}
    <p class="claim-source">Source: ${provenanceHtml(claim.provenance)}</p>
  </article>`;
}

const GLOSSARY = `<details class="claim-glossary">
  <summary>What these terms mean</summary>
  <p>The first word says what kind of link this is. Legitimacy is organic when it grew through continuous practice, claimed when the heir asserted it, and fictive when it was constructed, as with Russia's Third Rome. Exclusive means the heir has no rival for this source.</p>
  <p>The bold lines are the parts of an identity that passed along. Affirmed means the heir kept it, transformed that it changed it, and repudiated that it rejected it. Strength is a curator's grade from 1 to 5; the rules for that grade are not settled yet.</p>
  <p>Recognition is what historical actors did at the time, not a modern verdict.</p>
</details>`;

function decidedHtml(polity, claims) {
  if (!claims) return '<section aria-labelledby="decided"><h2 id="decided">Decided claims</h2><div id="claims-error"></div></section>';
  const { as_heir, as_source, termini } = claims;
  const inherited = as_heir.map(c =>
    claimHtml(c, `Inherits from ${claimPartyHtml(c.source_id, c.source_name, c.source_type)}`)).join('');
  const passedOn = as_source.map(c =>
    claimHtml(c, `Claimed as a source by ${claimPartyHtml(c.heir_polity_id, c.heir_name)}`)).join('');
  const ended = termini.map(t => `<p><b>${esc(humanize(t.axis))}</b> ended in ${esc(formatYear(t.year))}.${t.note ? ` ${esc(t.note)}` : ''}</p>`).join('');

  const body = inherited || passedOn || ended ? inherited + passedOn + ended + GLOSSARY :
    `<p>No succession has been decided for ${esc(polity.name)} yet. That means it is not curated, not that it had no successor.</p>`;
  return `<section aria-labelledby="decided"><h2 id="decided">Decided claims</h2>${body}</section>`;
}

// ── Pencil: computed candidates ─────────────────────────────────────────────

/** Words the generator's own test: territory counts, or no shared territory. */
function directionText(direction, otherIsLater) {
  const subject = otherIsLater ? 'that polity has' : 'this polity has';
  return {
    same: 'same number of recorded territories',
    expansion: `${subject} more recorded territories`,
    contraction: `${subject} fewer recorded territories`,
    displacement: 'no shared territory',
  }[direction] || 'territory data missing';
}

function candidateHtml(edge, decidedIds, otherIsLater) {
  const reasons = [];
  if (edge.shared_territories?.length) reasons.push(`shares ${edge.shared_territories.map(placeName).join(', ')}`);
  if (edge.same_ethnicity) reasons.push('same ruling people');
  if (edge.same_language) reasons.push('same language');
  if (edge.same_religion) reasons.push('same religion');
  reasons.push(directionText(edge.territorial_direction, otherIsLater));
  reasons.push(`score ${edge.strength}`);
  return `<li><a href="/polity/?id=${encodeURIComponent(edge.id)}">${esc(edge.name)}</a>${decidedIds.has(edge.id) ? ' (also decided above)' : ''}: ${esc(reasons.join('; '))}</li>`;
}

function computedHtml(polity, claims) {
  const { as_heir = [], as_source = [] } = claims || {};
  const earlier = [...(polity.predecessors || [])].sort((a, b) => b.strength - a.strength);
  const later = [...(polity.successors || [])].sort((a, b) => b.strength - a.strength);
  const total = earlier.length + later.length;
  const decidedIds = new Set([...as_heir.map(c => c.source_id), ...as_source.map(c => c.heir_polity_id)]);
  const list = (title, edges, otherIsLater) => edges.length
    ? `<h3>${title} (${edges.length})</h3><ul>${edges.map(e => candidateHtml(e, decidedIds, otherIsLater)).join('')}</ul>` : '';

  const body = total
    ? `<details>
        <summary>Show ${total} computed overlaps</summary>
        <p>Sorted by a score that counts matching signals. A high score is not evidence of succession, and the script does not test who came first, so a polity can appear in both lists.</p>
        ${list('Computed as earlier', earlier, false)}
        ${list('Computed as later', later, true)}
      </details>
      <p><a href="/graph.html?id=${encodeURIComponent(polity.id)}&evidence=chosen">See these on the graph</a></p>`
    : '<p>A script found no overlaps for this polity.</p>';

  return `<section class="pencil" aria-labelledby="computed">
    <h2 id="computed">Computed evidence</h2>
    <p>A script lists polities that overlap in territory, language, ruling people or religion within a time window. Nobody has judged these. They include rivals and contemporaries, and none of them states that succession happened.</p>
    ${body}
  </section>`;
}
