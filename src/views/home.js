import { store } from '../store.js';
import { renderMap, loadMapData } from '../svg-map.js';
import { formatRupees, CASE_DISCLAIMER, escapeHtml } from '../format.js';
import { searchConstituencies } from '../search.js';
import { findFeatureAt } from '../geo-lookup.js';

export function renderHome(el) {
  const { state, stats } = store;

  el.innerHTML = `
    <div id="map"></div>
    <div id="map-legend">
      <button type="button" class="dot d-0" data-sev="0" aria-pressed="false">No cases</button>
      <button type="button" class="dot d-1" data-sev="1" aria-pressed="false">Declared</button>
      <button type="button" class="dot d-2" data-sev="2" aria-pressed="false">Serious</button>
      <button type="button" class="dot d-3" data-sev="3" aria-pressed="false">Convicted</button>
      <button type="button" class="dot d--1" data-sev="-1" aria-pressed="false">Not yet profiled</button>
    </div>
    <div id="map-overlay">
      <section id="stats">
        <div class="stat"><b>${state.assembly_size}</b><span>constituencies</span></div>
        <div class="stat"><b>${stats.pctWithDeclaredCases}%</b><span>with declared criminal cases</span></div>
        <div class="stat"><b>${formatRupees(stats.totalAssets)}</b><span>total declared assets</span></div>
      </section>
      <p class="disclaimer">${CASE_DISCLAIMER}</p>
      <div id="search-slot"></div>
    </div>
  `;

  const legend = el.querySelector('#map-legend');
  const activeFilters = new Set();
  let map = null;

  function applyFilter() {
    map?.setFilter(activeFilters);
    legend.classList.toggle('filtering', activeFilters.size > 0);
    legend.querySelectorAll('.dot').forEach((btn) => {
      const on = activeFilters.has(Number(btn.dataset.sev));
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  legend.querySelectorAll('.dot').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sev = Number(btn.dataset.sev);
      if (activeFilters.has(sev)) activeFilters.delete(sev);
      else activeFilters.add(sev);
      applyFilter();
    });
  });

  loadMapData().then((mapData) => {
    map = renderMap(el.querySelector('#map'), {
      mapData,
      records: store.all,
      onSelect: (acNo) => { window.location.hash = `#/c/${acNo}`; }
    });
    applyFilter();
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
          <li role="option"><a href="#/c/${c.constituency.number}">
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
        const geo = await fetch('/geo/constituencies.geojson').then((r) => r.json());
        const hit = findFeatureAt([coords.longitude, coords.latitude], geo);
        if (!hit) {
          status.textContent = 'You appear to be outside this state. Try searching instead.';
          return;
        }
        status.textContent = '';
        window.location.hash = `#/c/${hit.properties.AC_NO}`;
      },
      () => { status.textContent = 'Location permission denied. Try searching instead.'; },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });
}
