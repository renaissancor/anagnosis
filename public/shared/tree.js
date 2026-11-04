/**
 * The taxonomy pages (/ethnicity/, /language/, /religion/) share this indented
 * tree and its entry drawer. Each page's app.js passes only what differs.
 * Reads from /api/taxonomy/:type only id, name, parent, description, founded
 * and status (api.md 2.6); the leaf placeholder fields carry no data.
 */
/** Names arrive in display case; this title-cases only a name with no lowercase letter, and none has one today. */
function readableName(name) {
  if (/\p{Ll}/u.test(name)) return name;
  return name.toLowerCase().replace(/(^|[\s\-/])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase());
}

async function renderTaxonomyPage(config) {
  const page = document.getElementById('page');
  let taxonomy, polities;
  try {
    [taxonomy, polities] = await Promise.all([
      cachedFetch(`/api/taxonomy/${config.type}`),
      cachedFetch('/api/polity'),
    ]);
  } catch {
    page.innerHTML = `<h1>${esc(config.heading)}</h1><div></div>`;
    renderLoadError(page.lastElementChild, config.what);
    return;
  }

  const nodes = new Map(taxonomy.map(n => {
    const name = readableName(n.name);
    return [n.id, { ...n, name, children: [], direct: [], lower: name.toLowerCase() }];
  }));
  const roots = [];
  for (const node of nodes.values()) {
    if (node.parent && nodes.has(node.parent)) nodes.get(node.parent).children.push(node);
    else roots.push(node);
  }
  const byName = (a, b) => a.name.localeCompare(b.name);
  roots.sort(byName);
  nodes.forEach(n => n.children.sort(byName));

  for (const polity of polities) {
    nodes.get(config.polityValue(polity))?.direct.push(polity);
  }
  const byStart = (a, b) => (a.start ?? 0) - (b.start ?? 0);
  const countBelow = node => {
    node.below = node.children.flatMap(c => { countBelow(c); return [...c.direct, ...c.below]; }).sort(byStart);
    node.direct.sort(byStart);
    node.descendants = node.children.reduce((sum, c) => sum + 1 + c.descendants, 0);
  };
  roots.forEach(countBelow);

  page.innerHTML = `
    <h1>${esc(config.heading)}</h1>
    <p class="lede">${esc(config.lede)} A count beside a name covers that name alone, and any polities under its ${esc(config.subName)} are counted separately.</p>
    <div class="tree-layout">
      <div>
        <label class="filter">Find a name
          <input type="search" id="tree-search" autocomplete="off" />
        </label>
        <p class="tree-actions">
          <button type="button" class="quiet-button" id="open-all">Open all</button>
          <button type="button" class="quiet-button" id="close-all">Close all</button>
        </p>
        <p class="state" id="tree-status" role="status" hidden></p>
        <ul class="tree" id="tree">${roots.map(nodeHtml).join('')}</ul>
      </div>
      <aside class="drawer empty" id="drawer" tabindex="-1" aria-label="Selected entry">
        <p class="state">Choose a name to read its entry.</p>
      </aside>
    </div>`;

  const tree = document.getElementById('tree');
  const drawer = document.getElementById('drawer');
  const search = document.getElementById('tree-search');
  const status = document.getElementById('tree-status');
  const open = new Set();
  nodes.forEach(n => { n.el = tree.querySelector(`li[data-id="${CSS.escape(n.id)}"]`); });
  let selected = null;

  function countLabel(node) {
    const plural = n => `${n} ${n === 1 ? 'polity' : 'polities'}`;
    const direct = node.direct.length, below = node.below.length;
    if (direct && below) return `${plural(direct)}, ${below} more under ${config.subName}`;
    if (direct) return plural(direct);
    return below ? `${plural(below)} under ${config.subName}` : '';
  }

  function nodeHtml(node) {
    const toggle = node.children.length
      ? `<button type="button" class="tree-toggle" data-toggle aria-expanded="false" aria-label="Show ${esc(config.subName)} of ${esc(node.name)}"></button>`
      : '<span class="tree-leaf"></span>';
    const count = countLabel(node);
    return `<li data-id="${esc(node.id)}">
      <div class="tree-row">
        ${toggle}
        <button type="button" class="tree-name" data-select>${esc(node.name)}</button>
        ${count ? `<span class="tree-count">${esc(count)}</span>` : ''}
      </div>
      ${node.children.length ? `<ul hidden>${node.children.map(nodeHtml).join('')}</ul>` : ''}
    </li>`;
  }

  /** Shows what the open branches and the search allow; returns whether a match lies at or below. */
  function refresh() {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    const visit = (node, ancestorMatched) => {
      const matched = Boolean(query) && node.lower.includes(query);
      if (matched) matches++;
      let matchBelow = false;
      for (const child of node.children) {
        if (visit(child, ancestorMatched || matched)) matchBelow = true;
      }
      node.el.hidden = Boolean(query) && !(matched || matchBelow || ancestorMatched);
      if (node.children.length) {
        const isOpen = open.has(node.id) || matchBelow;
        node.el.querySelector(':scope > ul').hidden = !isOpen;
        const toggle = node.el.querySelector(':scope > .tree-row [data-toggle]');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.setAttribute('aria-label', `${isOpen ? 'Hide' : 'Show'} ${config.subName} of ${node.name}`);
      }
      return matched || matchBelow;
    };
    roots.forEach(root => visit(root, false));
    status.hidden = !query;
    status.textContent = !query ? ''
      : matches ? `${matches} ${matches === 1 ? 'name matches' : 'names match'}.`
      : `No name contains “${search.value}”.`;
  }

  function closeDrawer() {
    if (selected) selected.el.querySelector(':scope > .tree-row [data-select]').removeAttribute('aria-current');
    const returnTo = selected;
    selected = null;
    drawer.classList.add('empty');
    drawer.innerHTML = '<p class="state">Choose a name to read its entry.</p>';
    returnTo?.el.querySelector(':scope > .tree-row [data-select]').focus();
  }

  function polityList(title, list) {
    if (!list.length) return '';
    return `<h3>${esc(title)} (${list.length})</h3>
      <ul class="entry-list">${list.map(p => `<li>
        <a href="/polity/?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        <span class="when">${esc(formatDateRange(p.start, p.end))}</span>
      </li>`).join('')}</ul>`;
  }

  function entryHtml(node) {
    const parent = node.parent ? nodes.get(node.parent) : null;
    const facts = [];
    if (parent) facts.push(['Part of', `<button type="button" class="link-button" data-go="${esc(parent.id)}">${esc(parent.name)}</button>`]);
    // founded is free text in the data today; only a whole number is a year.
    const founded = node.founded === null || node.founded === undefined ? '' : String(node.founded).trim();
    const foundedYear = /^-?\d+$/.test(founded);
    if (foundedYear) facts.push(['Founded', esc(formatYear(Number(founded)))]);
    if (node.status) facts.push(['Status', esc(humanize(node.status))]);
    if (node.descendants) facts.push(['Contains', `${node.descendants} ${node.descendants === 1 ? config.subOne : config.subName}`]);

    const hasAny = node.direct.length || node.below.length;
    return `<p class="drawer-close"><button type="button" class="quiet-button" data-close>Close</button></p>
      <h2 id="drawer-title">${esc(node.name)}</h2>
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
      ${node.description ? `<p>${esc(node.description)}</p>` : ''}
      ${founded && !foundedYear ? `<p>${esc(founded)}</p>` : ''}
      ${polityList(config.directHeading, node.direct)}
      ${polityList(`Under its ${config.subName}`, node.below)}
      ${hasAny ? '' : '<p class="state">No polities are recorded under this name yet.</p>'}`;
  }

  function select(node) {
    if (selected) selected.el.querySelector(':scope > .tree-row [data-select]').removeAttribute('aria-current');
    selected = node;
    for (let up = node.parent && nodes.get(node.parent); up; up = up.parent && nodes.get(up.parent)) open.add(up.id);
    refresh();
    node.el.querySelector(':scope > .tree-row [data-select]').setAttribute('aria-current', 'true');
    drawer.classList.remove('empty');
    drawer.innerHTML = entryHtml(node);
    drawer.scrollTop = 0;
    drawer.focus({ preventScroll: true });
  }

  tree.addEventListener('click', e => {
    const item = e.target.closest('li[data-id]');
    if (!item) return;
    const node = nodes.get(item.dataset.id);
    if (e.target.closest('[data-toggle]')) {
      if (e.target.closest('[data-toggle]').getAttribute('aria-expanded') === 'true') open.delete(node.id);
      else open.add(node.id);
      refresh();
    } else if (e.target.closest('[data-select]')) {
      select(node);
    }
  });
  drawer.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) select(nodes.get(go.dataset.go));
    if (e.target.closest('[data-close]')) closeDrawer();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && selected) closeDrawer();
  });
  search.addEventListener('input', refresh);
  document.getElementById('open-all').addEventListener('click', () => {
    nodes.forEach(n => { if (n.children.length) open.add(n.id); });
    refresh();
  });
  document.getElementById('close-all').addEventListener('click', () => {
    open.clear();
    refresh();
  });
}
