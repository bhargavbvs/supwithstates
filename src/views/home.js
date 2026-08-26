import { store } from '../store.js';
import { renderMap, loadMapData } from '../svg-map.js';
import { formatRupeesCompact, CASE_DISCLAIMER, severityOf, partyColor, escapeHtml } from '../format.js';
import { searchConstituencies } from '../search.js';
import { findFeatureAt } from '../geo-lookup.js';

const LEGEND_LABELS = { '-1': 'Not yet profiled', 0: 'No cases', 1: 'Declared', 2: 'Serious', 3: 'Convicted' };
const EDUCATION_ORDER = ['5th Pass', '8th Pass', '10th Pass', '12th Pass', 'Graduate', 'Graduate Professional', 'Post Graduate', 'Doctorate', 'Others'];
const RESERVED_ORDER = ['General', 'SC', 'ST'];

function severityCounts(state) {
  const counts = { '-1': 0, 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const r of store.all) counts[severityOf(r.representative.declared_cases)]++;
  counts['-1'] = state.assembly_size - store.all.length;
  return counts;
}

// Real values in the data, not a fixed guess - a new party (or education
// level, if ADR ever adds one) shows up automatically. Party is sorted
// largest-first since there's no natural order; education/reserved have a
// real ordinal order worth preserving instead.
function partyCounts() {
  const counts = new Map();
  for (const r of store.all) {
    const p = r.representative.current_party;
    if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function orderedCounts(values, order) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return order.filter((k) => counts.has(k)).map((k) => [k, counts.get(k)]);
}

function educationCounts() {
  return orderedCounts(store.all.map((r) => r.representative.education.level), EDUCATION_ORDER);
}

function reservedCounts() {
  return orderedCounts(store.all.map((r) => r.constituency.reserved ?? 'General'), RESERVED_ORDER);
}

// Party chips carry their own brand color via inline custom properties;
// education/reserved chips have no inherent color, so they fall back to the
// theme accent (see .filter-chip.active in style.css).
function chipsMarkup(dim, entries, { colored = false } = {}) {
  return entries.map(([value, n]) => {
    const style = colored ? (() => {
      const { bg, text } = partyColor(value);
      return ` style="--chip-bg:${bg};--chip-text:${text}"`;
    })() : '';
    return `<button type="button" class="filter-chip" data-dim="${dim}" data-value="${escapeHtml(value)}"
      aria-pressed="false"${style}>${escapeHtml(value)} <span class="count">(${n})</span></button>`;
  }).join('');
}

export function renderHome(el) {
  const { state, stats } = store;
  const counts = severityCounts(state);

  el.innerHTML = `
    <div id="map"></div>
    <div id="map-overlay">
      <section id="stats">
        <div class="stat"><b>${state.assembly_size}</b><span>constituencies</span></div>
        <div class="stat"><b>${stats.pctWithDeclaredCases}%</b><span>with declared criminal cases</span></div>
        <div class="stat"><b>${formatRupeesCompact(stats.totalAssets)}</b><span>total declared assets</span></div>
      </section>
      <p class="disclaimer">${CASE_DISCLAIMER}</p>
      <div id="filter-panel">
        <button type="button" id="filters-toggle" aria-expanded="false">Filters<span id="filters-count" hidden></span></button>
        <div id="filter-groups" hidden>
          <div class="filter-group">
            <h3>Party</h3>
            <div class="chip-row">${chipsMarkup('party', partyCounts(), { colored: true })}</div>
          </div>
          <div class="filter-group">
            <h3>Education</h3>
            <div class="chip-row">${chipsMarkup('education', educationCounts())}</div>
          </div>
          <div class="filter-group">
            <h3>Reserved status</h3>
            <div class="chip-row">${chipsMarkup('reserved', reservedCounts())}</div>
          </div>
          <button type="button" id="filters-clear" hidden>Clear filters</button>
        </div>
      </div>
      <div id="search-slot"></div>
    </div>
  `;

  // The severity legend is built detached and only appended into #map once
  // renderMap() has populated it (renderMap replaces #map's innerHTML,
  // which would wipe this out if it were there first). #map is the
  // positioned ancestor #zoom-controls and this legend both need - #app
  // grows taller than the visible map on mobile (the overlay panel sits
  // below it in normal flow there), so anchoring to #app instead of #map
  // put the legend near the bottom of the whole scrollable page rather
  // than pinned to the map's own corner.
  const legend = document.createElement('div');
  legend.id = 'map-legend';
  legend.innerHTML = [0, 1, 2, 3, -1].map((sev) => `
    <button type="button" class="dot d${sev === -1 ? '--1' : `-${sev}`}" data-sev="${sev}" aria-pressed="false">
      ${LEGEND_LABELS[sev]} <span class="count">(${counts[sev]})</span>
    </button>`).join('');

  const filters = { severity: new Set(), party: new Set(), education: new Set(), reserved: new Set() };
  let map = null;

  const filtersToggle = el.querySelector('#filters-toggle');
  const filtersCount = el.querySelector('#filters-count');
  const filterGroups = el.querySelector('#filter-groups');
  const filtersClear = el.querySelector('#filters-clear');
  const filterPanel = el.querySelector('#filter-panel');

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

    const total = filters.severity.size + filters.party.size + filters.education.size + filters.reserved.size;
    filtersCount.hidden = total === 0;
    filtersCount.textContent = ` (${total})`;
    filtersClear.hidden = total === 0;
  }

  legend.querySelectorAll('.dot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sev = Number(btn.dataset.sev);
      if (filters.severity.has(sev)) filters.severity.delete(sev);
      else filters.severity.add(sev);
      applyFilters();
    });
  });

  filterPanel.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dim = filters[btn.dataset.dim];
      const value = btn.dataset.value;
      if (dim.has(value)) dim.delete(value);
      else dim.add(value);
      applyFilters();
    });
  });

  filtersToggle.addEventListener('click', () => {
    const open = filterGroups.hidden;
    filterGroups.hidden = !open;
    filtersToggle.setAttribute('aria-expanded', String(open));
  });

  filtersClear.addEventListener('click', () => {
    filters.severity.clear();
    filters.party.clear();
    filters.education.clear();
    filters.reserved.clear();
    applyFilters();
  });

  loadMapData().then((mapData) => {
    const mapEl = el.querySelector('#map');
    map = renderMap(mapEl, {
      mapData,
      records: store.all,
      onSelect: (acNo) => { window.location.hash = store.href(`c/${acNo}`); }
    });
    mapEl.appendChild(legend);
    applyFilters();
  });

  const slot = el.querySelector('#search-slot');
  slot.innerHTML = `
    <div class="search-box">
      <input id="q" type="search" placeholder="Find your constituency, district or MLA"
             autocomplete="off" aria-label="Find your constituency" />
      <ul id="results" role="listbox"></ul>
    </div>
    <button id="locate" type="button">Use my location</button>
    <p id="locate-status" role="status"></p>
  `;
  const input = slot.querySelector('#q');
  const results = slot.querySelector('#results');

  input.addEventListener('input', () => {
    if (!input.value.trim()) {
      results.innerHTML = '';
      return;
    }
    if (!store.all.length) {
      results.innerHTML = `<li class="no-data">No constituency data loaded yet.</li>`;
      return;
    }
    const hits = searchConstituencies(input.value, store.all);
    results.innerHTML = hits.length
      ? hits.map((c) => `
          <li role="option"><a href="${store.href(`c/${c.constituency.number}`)}">
            <b>${escapeHtml(c.constituency.name)}</b>
            <span>${escapeHtml(c.constituency.district)} · ${escapeHtml(c.representative.name)}</span>
          </a></li>`).join('')
      : `<li class="no-data">No matches.</li>`;
  });

  const status = slot.querySelector('#locate-status');
  slot.querySelector('#locate').addEventListener('click', () => {
    if (!navigator.geolocation) {
      status.textContent = 'Location is not available in this browser.';
      return;
    }
    status.textContent = 'Finding your constituency…';
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const geo = await fetch(`/geo/${store.slug}/constituencies.geojson`).then((r) => r.json());
        const hit = findFeatureAt([coords.longitude, coords.latitude], geo);
        if (!hit) {
          status.textContent = 'You appear to be outside this state. Try searching instead.';
          return;
        }
        status.textContent = '';
        window.location.hash = store.href(`c/${hit.properties.AC_NO}`);
      },
      () => { status.textContent = 'Location permission denied. Try searching instead.'; },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
