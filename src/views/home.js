import { store } from '../store.js';
import { initMap, addDistrictLayer } from '../map.js';
import { formatRupees, CASE_DISCLAIMER, escapeHtml } from '../format.js';
import { searchConstituencies } from '../search.js';

export function renderHome(el) {
  const { state, stats } = store;

  el.innerHTML = `
    <section id="stats">
      <div class="stat"><b>${state.assembly_size}</b><span>constituencies</span></div>
      <div class="stat"><b>${stats.profiled}</b><span>profiled</span></div>
      <div class="stat"><b>${stats.pctWithDeclaredCases}%</b><span>with declared criminal cases</span></div>
      <div class="stat"><b>${formatRupees(stats.totalAssets)}</b><span>total declared assets</span></div>
    </section>
    <p class="disclaimer">${CASE_DISCLAIMER}</p>
    <div id="search-slot"></div>
    <div id="map"></div>
  `;

  const map = initMap('map', store.state.map);
  map.on('load', async () => {
    const geo = await fetch('/geo/districts.geojson').then((r) => r.json());
    addDistrictLayer(map, geo, (props) => {
      const name = props.DISTRICT ?? props.district;
      window.location.hash = `#/d/${store.slugify(name)}`;
    });
  });

  const slot = el.querySelector('#search-slot');
  slot.innerHTML = `
    <input id="q" type="search" placeholder="Find your constituency, district or MLA"
           autocomplete="off" aria-label="Find your constituency" />
    <ul id="results" role="listbox"></ul>
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
}
