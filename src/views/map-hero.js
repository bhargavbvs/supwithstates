// The full-bleed map page: a map, a folding panel of stats, filters and
// search over it, and a severity legend in its corner.
//
// Three pages want this — a state's assembly seats, a state's parliamentary
// seats, and the country's — and they differ only in what they are a map
// of. Keeping one copy means a fix to the panel or the filters is a fix
// everywhere, rather than in whichever copy was remembered.
import { renderMap } from '../svg-map.js';
import { severityOf, partyColor, escapeHtml } from '../format.js';

const LEGEND_LABELS = { '-1': 'No record yet', 0: 'No cases', 1: 'Declared', 2: 'Serious', 3: 'Convicted' };
const EDUCATION_ORDER = ['5th Pass', '8th Pass', '10th Pass', '12th Pass', 'Graduate',
  'Graduate Professional', 'Post Graduate', 'Doctorate', 'Others'];
const RESERVED_ORDER = ['General', 'SC', 'ST'];

const tally = (values) => {
  const m = new Map();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
const ordered = (values, order) => {
  const m = tally(values);
  return order.filter((k) => m.has(k)).map((k) => [k, m.get(k)]);
};
const chips = (dim, entries, colored = false) => entries.map(([value, n]) => {
  const style = colored ? (() => {
    const { bg, text } = partyColor(value);
    return ` style="--chip-bg:${bg};--chip-text:${text}"`;
  })() : '';
  return `<button type="button" class="filter-chip" data-dim="${dim}" data-value="${escapeHtml(value)}"
    aria-pressed="false"${style}>${escapeHtml(value)} <span class="count">(${n})</span></button>`;
}).join('');

/**
 * @param el          the view root
 * @param mapData     projected map: { viewBox, constituencies, districts }
 * @param records     members, keyed to the map by constituency.number
 * @param seats       how many shapes the map draws (may exceed records)
 * @param title       screen-reader heading for the page
 * @param stats       [{ value, label }] for the panel
 * @param hrefFor     (id) => url, or null where there is no record
 * @param missingText (id) => what to say when a shape has no record
 * @param note        html shown under the search box
 * @param search      { placeholder, run: (query) => [{ href, title, sub }] }
 * @param panelInset  true where the panel would otherwise cover the subject
 */
export function mountMapHero(el, {
  mapData, records, seats, title, stats, hrefFor, missingText, note, search, panelInset = false,
}) {
  // The full-bleed layout follows what is actually on the page, not what the
  // route is called: /mps is a map, a list and a profile at different times,
  // and only one of the three wants the page's padding taken away.
  document.body.dataset.hero = 'map';

  const counts = { '-1': seats - records.length, 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const r of records) counts[severityOf(r.representative.declared_cases)] += 1;
  const parties = [...tally(records.map((r) => r.representative.current_party)).entries()]
    .sort((a, b) => b[1] - a[1]);

  el.innerHTML = `
    <div id="map"${panelInset ? ' class="panel-inset"' : ''}></div>
    <div id="map-overlay">
      <button type="button" id="panel-toggle" aria-expanded="true" aria-controls="panel-body">
        <span class="panel-toggle-text">Hide</span>
      </button>
      <div id="panel-body">
      <h1 class="sr-only">${escapeHtml(title)}</h1>
      <section id="stats">
        ${stats.map((s) => `<div class="stat"><b>${s.value}</b><span>${escapeHtml(s.label)}</span></div>`).join('')}
      </section>
      <div id="filter-panel">
        <button type="button" id="filters-toggle" aria-expanded="false">Filters<span id="filters-count" hidden></span></button>
        <div id="filter-groups" hidden>
          <div class="filter-group"><h3>Party</h3>
            <div class="chip-row">${chips('party', parties, true)}</div></div>
          <div class="filter-group"><h3>Education</h3>
            <div class="chip-row">${chips('education',
    ordered(records.map((r) => r.representative.education?.level), EDUCATION_ORDER))}</div></div>
          <div class="filter-group"><h3>Reserved status</h3>
            <div class="chip-row">${chips('reserved',
    ordered(records.map((r) => r.constituency.reserved ?? 'General'), RESERVED_ORDER))}</div></div>
          <button type="button" id="filters-clear" hidden>Clear filters</button>
        </div>
      </div>
      <div id="search-slot">
        <div class="search-box">
          <input id="q" type="search" placeholder="${escapeHtml(search.placeholder)}"
                 autocomplete="off" aria-label="${escapeHtml(search.placeholder)}" />
          <ul id="results" role="listbox"></ul>
        </div>
        <p id="locate-status" role="status"></p>
      </div>
      ${note ? `<p class="map-note">${note}</p>` : ''}
      </div>
    </div>`;

  // The panel covers a good part of the map, which is the point on a
  // desktop and in the way on a phone. The choice is the reader's and it is
  // remembered.
  const overlay = el.querySelector('#map-overlay');
  const panelToggle = el.querySelector('#panel-toggle');
  const panelBody = el.querySelector('#panel-body');
  const PANEL_KEY = 'ssup.panel';
  const setPanel = (open) => {
    overlay.classList.toggle('collapsed', !open);
    panelBody.hidden = !open;
    panelToggle.setAttribute('aria-expanded', String(open));
    panelToggle.querySelector('.panel-toggle-text').textContent = open ? 'Hide' : 'Stats & filters';
    panelToggle.setAttribute('aria-label', open ? 'Hide the panel' : 'Show stats, search and filters');
  };
  try { setPanel(localStorage.getItem(PANEL_KEY) !== 'closed'); } catch { setPanel(true); }
  panelToggle.addEventListener('click', () => {
    const open = panelToggle.getAttribute('aria-expanded') !== 'true';
    setPanel(open);
    try { localStorage.setItem(PANEL_KEY, open ? 'open' : 'closed'); } catch { /* private mode */ }
  });

  const legend = document.createElement('div');
  legend.id = 'map-legend';
  legend.innerHTML = [0, 1, 2, 3, -1].map((sev) => `
    <button type="button" class="dot d${sev === -1 ? '--1' : `-${sev}`}" data-sev="${sev}" aria-pressed="false">
      ${LEGEND_LABELS[sev]} <span class="count">(${counts[sev]})</span>
    </button>`).join('');

  const filters = { severity: new Set(), party: new Set(), education: new Set(), reserved: new Set() };
  const filterPanel = el.querySelector('#filter-panel');
  const filtersCount = el.querySelector('#filters-count');
  const filtersClear = el.querySelector('#filters-clear');
  const status = el.querySelector('#locate-status');
  let map = null;

  function applyFilters() {
    map?.setFilter(filters);
    legend.classList.toggle('sev-filtering', filters.severity.size > 0);
    legend.querySelectorAll('.dot').forEach((btn) => {
      const on = filters.severity.has(Number(btn.dataset.sev));
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    filterPanel.querySelectorAll('.filter-chip').forEach((btn) => {
      const on = filters[btn.dataset.dim].has(btn.dataset.value);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    const total = filters.severity.size + filters.party.size
      + filters.education.size + filters.reserved.size;
    filtersCount.hidden = total === 0;
    filtersCount.textContent = ` (${total})`;
    filtersClear.hidden = total === 0;
  }

  legend.querySelectorAll('.dot').forEach((btn) => btn.addEventListener('click', () => {
    const sev = Number(btn.dataset.sev);
    if (filters.severity.has(sev)) filters.severity.delete(sev); else filters.severity.add(sev);
    applyFilters();
  }));
  filterPanel.querySelectorAll('.filter-chip').forEach((btn) => btn.addEventListener('click', () => {
    const dim = filters[btn.dataset.dim];
    if (dim.has(btn.dataset.value)) dim.delete(btn.dataset.value); else dim.add(btn.dataset.value);
    applyFilters();
  }));
  el.querySelector('#filters-toggle').addEventListener('click', (e) => {
    const groups = el.querySelector('#filter-groups');
    const open = groups.hidden;
    groups.hidden = !open;
    e.currentTarget.setAttribute('aria-expanded', String(open));
  });
  filtersClear.addEventListener('click', () => {
    Object.values(filters).forEach((s) => s.clear());
    applyFilters();
  });

  // A shape the map draws but holds no record for goes nowhere: sending a
  // reader to an empty page says "no such seat", which is untrue — the seat
  // is real and it is the record that is missing.
  const open = (id) => {
    const href = hrefFor(id);
    if (href) { window.location.hash = href; return; }
    status.textContent = missingText ? missingText(id) : 'No record for that seat yet.';
  };

  const mapEl = el.querySelector('#map');
  map = renderMap(mapEl, { mapData, records, onSelect: open });
  mapEl.appendChild(legend);
  applyFilters();

  const input = el.querySelector('#q');
  const results = el.querySelector('#results');
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q) { results.innerHTML = ''; return; }
    const hits = search.run(q);
    results.innerHTML = hits.length
      ? hits.map((h) => `<li role="option"><a href="${h.href}">
          <b>${escapeHtml(h.title)}</b>
          <span>${escapeHtml(h.sub)}</span></a></li>`).join('')
      : '<li class="no-data">No matches.</li>';
  });

  return { el, status, open, mapEl };
}
