import { store } from '../store.js';
import { initMap, addConstituencyLayer, addDistrictOutline } from '../map.js';
import { formatRupees, CASE_DISCLAIMER, escapeHtml } from '../format.js';
import { searchConstituencies } from '../search.js';
import { findFeatureAt } from '../geo-lookup.js';

export function renderHome(el) {
  const { state, stats } = store;

  el.innerHTML = `
    <div id="map"></div>
    <div id="map-overlay">
      <section id="stats">
        <div class="stat"><b>${state.assembly_size}</b><span>constituencies</span></div>
        <div class="stat"><b>${stats.profiled}</b><span>profiled</span></div>
        <div class="stat"><b>${stats.pctWithDeclaredCases}%</b><span>with declared criminal cases</span></div>
        <div class="stat"><b>${formatRupees(stats.totalAssets)}</b><span>total declared assets</span></div>
      </section>
      <p class="disclaimer">${CASE_DISCLAIMER}</p>
      <div id="search-slot"></div>
    </div>
  `;

  const map = initMap('map', store.state.map);
  map.on('load', async () => {
    const [districts, constituencies] = await Promise.all([
      fetch('/geo/districts.geojson').then((r) => r.json()),
      fetch('/geo/constituencies.geojson').then((r) => r.json())
    ]);
    addDistrictOutline(map, districts);
    addConstituencyLayer(map, constituencies, (props) => {
      window.location.hash = `#/c/${props.AC_NO}`;
    });
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
    const hits = searchConstituencies(input.value, store.all);
    results.innerHTML = hits.map((c) => `
      <li role="option"><a href="#/c/${c.constituency.number}">
        <b>${escapeHtml(c.constituency.name)}</b>
        <span>${escapeHtml(c.constituency.district)} · ${escapeHtml(c.representative.name)}</span>
      </a></li>`).join('');
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
