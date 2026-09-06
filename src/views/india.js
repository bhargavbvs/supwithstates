// Every parliamentary seat in the country, on one map.
//
// The boundaries are not a new source. A parliamentary constituency is a
// group of assembly constituencies, and each state's assembly geometry
// already records which one each seat belongs to — so the national map is
// the state maps dissolved along a line they already draw. See
// scripts/build-india-map.mjs.
import { store } from '../store.js';
import { mountMapHero } from './map-hero.js';
import { formatRupeesCompact, CASE_DISCLAIMER, escapeHtml } from '../format.js';

let cache = null;

/** The map names a seat by its state and its number within that state, and
 *  so do the records. They are joined on that pair rather than on the map's
 *  own running id, which is an artefact of how the file was built and which
 *  nothing outside it knows. */
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
    if (mp) records.push({ ...mp, constituency: { ...mp.constituency, number: c.ac_no } });
  }
  cache = { mapData, records, seatOf, seats: mapData.constituencies.length };
  return cache;
}

export function renderIndia(el) {
  el.innerHTML = '<div id="map" class="panel-inset"></div><p class="loading">Loading the national map…</p>';

  loadIndia().then(({ mapData, records, seatOf, seats }) => {
    const withCases = records.filter((r) => (r.representative.declared_cases?.total ?? 0) > 0).length;
    const assets = records.reduce((a, r) => a + (r.representative.assets?.total ?? 0), 0);
    const noRecord = seats - records.length;
    const hasRecord = new Set(records.map((r) => r.constituency.number));
    const seatHref = (id) => {
      const s = seatOf.get(id);
      return hasRecord.has(id) && s ? `#/${s.state}/mps/${s.pc_no}` : null;
    };

    const hero = mountMapHero(el, {
      mapData,
      records,
      seats,
      title: 'Every MP in India',
      panelInset: true,
      stats: [
        { value: seats, label: 'seats on the map' },
        { value: `${Math.round((withCases / records.length) * 100)}%`, label: 'with declared criminal cases' },
        { value: formatRupeesCompact(assets), label: 'total declared assets' },
      ],
      hrefFor: seatHref,
      missingText: (id) => {
        const s = seatOf.get(id);
        return s ? `${s.name} (${s.stateName}): no member's record has been read for this seat yet.`
          : 'No record for that seat yet.';
      },
      note: `${CASE_DISCLAIMER} A seat's boundary is its assembly segments joined together.
        ${noRecord > 0 ? `${noRecord} seat${noRecord === 1 ? '' : 's'} here
        ${noRecord === 1 ? 'has' : 'have'} no member's record read yet.` : ''}
        ${!(mapData.notCovered ?? []).length ? '' : `${
  mapData.notCovered.map(escapeHtml).join(' and ')} ${mapData.notCovered.length === 1 ? 'is' : 'are'}
        drawn in grey: their boundary files carry no parliamentary seat, so the seats inside
        ${mapData.notCovered.length === 1 ? 'it' : 'them'} cannot be drawn from what is here.`}`,
      search: {
        placeholder: 'Find an MP or a Lok Sabha seat',
        run: (q) => {
          const t = q.toLowerCase();
          return records.filter((r) => r.representative.name.toLowerCase().includes(t)
            || r.constituency.name.toLowerCase().includes(t)
            || (seatOf.get(r.constituency.number)?.stateName ?? '').toLowerCase().includes(t))
            .slice(0, 12)
            .map((r) => ({
              href: seatHref(r.constituency.number) ?? '#/india',
              title: r.constituency.name,
              sub: `${seatOf.get(r.constituency.number)?.stateName ?? ''} · ${r.representative.name}`,
            }));
        },
      },
    });

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

    const locate = document.createElement('button');
    locate.id = 'locate';
    locate.type = 'button';
    locate.textContent = 'Find my MP';
    hero.status.before(locate);
    locate.addEventListener('click', () => {
      if (!navigator.geolocation) {
        hero.status.textContent = 'Location is not available in this browser.';
        return;
      }
      hero.status.textContent = 'Finding your seat…';
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        const id = seatAtPoint(coords.longitude, coords.latitude);
        if (id == null) {
          hero.status.textContent = 'That point is not inside a seat on this map. Assam and '
            + 'Jammu & Kashmir are not drawn here. Try searching instead.';
          return;
        }
        hero.status.textContent = '';
        hero.open(id);
      }, () => {
        hero.status.textContent = 'Location permission denied. Try searching instead.';
      }, { enableHighAccuracy: false, timeout: 10000 });
    });
  }).catch(() => {
    el.innerHTML = `<p class="empty">The national map could not be loaded.
      <a href="${store.href()}">Back to your state</a></p>`;
  });
}
