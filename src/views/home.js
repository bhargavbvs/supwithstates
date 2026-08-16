import { store } from '../store.js';
import { initMap, addDistrictLayer } from '../map.js';
import { formatRupees, CASE_DISCLAIMER } from '../format.js';

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
}
