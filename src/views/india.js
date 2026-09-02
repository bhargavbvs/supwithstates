// Every parliamentary seat in the country, on one map.
//
// The boundaries are not a new source. A parliamentary constituency is a
// group of assembly constituencies, and each state's assembly geometry
// already records which one each seat belongs to — so the national map is
// the state maps dissolved along a line they already draw. See
// scripts/build-india-map.mjs.
import { renderMap } from '../svg-map.js';
import { store } from '../store.js';
import {
  formatRupeesCompact, CASE_DISCLAIMER, severityOf, partyColor, escapeHtml,
} from '../format.js';

const LEGEND_LABELS = { '-1': 'No record yet', 0: 'No cases', 1: 'Declared', 2: 'Serious', 3: 'Convicted' };
const EDUCATION_ORDER = ['5th Pass', '8th Pass', '10th Pass', '12th Pass', 'Graduate',
  'Graduate Professional', 'Post Graduate', 'Doctorate', 'Others'];
const RESERVED_ORDER = ['General', 'SC', 'ST'];

let cache = null;

/** The map names a seat by its state and its number within that state, and
 *  so do the records. They are joined on that pair rather than on the
 *  map's own running id, which is an artefact of how the file was built
 *  and which nothing outside it knows. */
async function loadIndia() {
  if (cache) return cache;
  const [mapData, data] = await Promise.all([
    fetch('/geo/india-map.json').then((r) => r.json()),
    fetch('/data/india.json').then((r) => r.json()),
  ]);
  const byKey = new Map(data.mps.map((m) => [`${m.state}:${m.pc_no}`, m]));
  const seatOf = new Map();
  const records = [];
  for (const c of mapData.constituencies) {
    seatOf.set(c.ac_no, { state: c.state, pc_no: c.pc_no, name: c.name, stateName: c.state_name });
    const mp = byKey.get(`${c.state}:${c.pc_no}`);
    // renderMap keys records by constituency.number, so each record is
    // given the map's id for the seat it sits in.
    if (mp) records.push({ ...mp, constituency: { ...mp.constituency, number: c.ac_no } });
  }
  cache = { mapData, records, seatOf, seats: mapData.constituencies.length };
  return cache;
}

const chips = (dim, entries, colored = false) => entries.map(([value, n]) => {
  const style = colored ? (() => {
    const { bg, text } = partyColor(value);
    return ` style="--chip-bg:${bg};--chip-text:${text}"`;
  })() : '';
  return `<button type="button" class="filter-chip" data-dim="${dim}" data-value="${escapeHtml(value)}"
    aria-pressed="false"${style}>${escapeHtml(value)} <span class="count">(${n})</span></button>`;
}).join('');

const tally = (values) => {
  const m = new Map();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};
const ordered = (values, order) => {
  const m = tally(values);
  return order.filter((k) => m.has(k)).map((k) => [k, m.get(k)]);
};

export function renderIndia(el) {
  el.innerHTML = '<div id="map" class="panel-inset"></div><p class="loading">Loading the national map…</p>';

  loadIndia().then(({ mapData, records, seatOf, seats }) => {
    const withCases = records.filter((r) => (r.representative.declared_cases?.total ?? 0) > 0).length;
    const assets = records.reduce((a, r) => a + (r.representative.assets?.total ?? 0), 0);
    const counts = { '-1': seats - records.length, 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const r of records) counts[severityOf(r.representative.declared_cases)] += 1;

    const parties = [...tally(records.map((r) => r.representative.current_party))
      .entries()].sort((a, b) => b[1] - a[1]);

    el.innerHTML = `
      <div id="map" class="panel-inset"></div>
      <div id="map-overlay">
        <button type="button" id="panel-toggle" aria-expanded="true" aria-controls="panel-body">
          <span class="panel-toggle-text">Hide</span>
        </button>
        <div id="panel-body">
        <h1 class="sr-only">Every MP in India</h1>
        <section id="stats">
          <div class="stat"><b>${seats}</b><span>seats on the map</span></div>
          <div class="stat"><b>${Math.round((withCases / records.length) * 100)}%</b>
            <span>with declared criminal cases</span></div>
          <div class="stat"><b>${formatRupeesCompact(assets)}</b><span>total declared assets</span></div>
        </section>
        <p class="disclaimer">${CASE_DISCLAIMER}</p>
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
            <input id="q" type="search" placeholder="Find an MP or a Lok Sabha seat"
                   autocomplete="off" aria-label="Find an MP or a Lok Sabha seat" />
            <ul id="results" role="listbox"></ul>
          </div>
          <button id="locate" type="button">Find my MP</button>
          <p id="locate-status" role="status"></p>
        </div>
        <p class="map-note">A seat's boundary is its assembly segments joined together.
          ${counts['-1'] > 0 ? `${counts['-1']} seat${counts['-1'] === 1 ? '' : 's'} on this map
          ${counts['-1'] === 1 ? 'has' : 'have'} no member's record read yet.` : ''}
          Assam and Jammu &amp; Kashmir are missing: the boundary files for those two carry no
          parliamentary seat, so their seats cannot be drawn from what is here.</p>
        </div>
      </div>`;

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

    const status = el.querySelector('#locate-status');

    const seatHref = (id) => {
      const s = seatOf.get(id);
      return s ? `#/${s.state}/mps/${s.pc_no}` : '#/india';
    };

    // Two seats are drawn with no member's record read yet. Sending a
    // reader to their page produced "No such seat", which is not true — the
    // seat is real and it is the record that is missing. So the map says
    // that instead of navigating anywhere.
    const hasRecord = new Set(records.map((r) => r.constituency.number));
    const openSeat = (id) => {
      if (hasRecord.has(id)) { window.location.hash = seatHref(id); return; }
      const s = seatOf.get(id);
      status.textContent = s
        ? `${s.name} (${s.stateName}) — no member's record has been read for this seat yet.`
        : 'No record for that seat yet.';
    };

    const mapEl = el.querySelector('#map');
    map = renderMap(mapEl, {
      mapData,
      records,
      onSelect: openSeat,
    });
    mapEl.appendChild(legend);
    applyFilters();

    // Which seat a point falls in, asked of the shapes already on screen.
    //
    // The alternative was to serve the unprojected geometry a second time —
    // another 430KB for one question — when the browser can already test a
    // point against a path it has drawn. The map file carries the numbers
    // its paths were projected with, so a longitude and latitude can be put
    // into the picture's own coordinates and handed to isPointInFill.
    //
    // Zoom and pan live on a transform above these paths, and a path's local
    // coordinate system is the one its "d" is written in, so the answer does
    // not change with the view.
    function seatAtPoint(lng, lat) {
      const svg = el.querySelector('#ap-svg');
      const pr = mapData.projection;
      if (!svg || !pr || typeof DOMPoint === 'undefined') return null;
      const pt = new DOMPoint(
        (lng * pr.xScale - pr.rawMinX) * pr.scale,
        pr.viewHeight - (lat - pr.minLat) * pr.scale,
      );
      for (const path of svg.querySelectorAll('path.ac')) {
        if (typeof path.isPointInFill === 'function' && path.isPointInFill(pt)) {
          return Number(path.dataset.acNo);
        }
      }
      return null;
    }
    el.__seatAtPoint = seatAtPoint; // exercised by the browser check in CI

    el.querySelector('#locate').addEventListener('click', () => {
      if (!navigator.geolocation) {
        status.textContent = 'Location is not available in this browser.';
        return;
      }
      status.textContent = 'Finding your seat…';
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const id = seatAtPoint(coords.longitude, coords.latitude);
        if (id == null) {
          const s = seatOf.size;
          status.textContent = s
            ? 'That point is not inside a seat on this map — Assam and Jammu & Kashmir are '
              + 'not drawn here. Try searching instead.'
            : 'Could not work that out. Try searching instead.';
          return;
        }
        status.textContent = '';
        openSeat(id);
      }, () => {
        status.textContent = 'Location permission denied. Try searching instead.';
      }, { enableHighAccuracy: false, timeout: 10000 });
    });

    const input = el.querySelector('#q');
    const results = el.querySelector('#results');
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { results.innerHTML = ''; return; }
      const hits = records.filter((r) => r.representative.name.toLowerCase().includes(q)
        || r.constituency.name.toLowerCase().includes(q)
        || (seatOf.get(r.constituency.number)?.stateName ?? '').toLowerCase().includes(q)).slice(0, 12);
      results.innerHTML = hits.length
        ? hits.map((r) => {
          const s = seatOf.get(r.constituency.number);
          return `<li role="option"><a href="${seatHref(r.constituency.number)}">
            <b>${escapeHtml(r.constituency.name)}</b>
            <span>${escapeHtml(s?.stateName ?? '')} · ${escapeHtml(r.representative.name)}</span>
          </a></li>`;
        }).join('')
        : '<li class="no-data">No matches.</li>';
    });
  }).catch(() => {
    el.innerHTML = `<p class="empty">The national map could not be loaded.
      <a href="${store.href()}">Back to your state</a></p>`;
  });
}
