import { severityOf, SEVERITY_LABEL, escapeHtml } from './format.js';

let mapDataCache = null;

export async function loadMapData() {
  if (!mapDataCache) mapDataCache = await fetch('/geo/ap-map.json').then((r) => r.json());
  return mapDataCache;
}

export function renderMap(container, { mapData, records, onSelect }) {
  const byNumber = new Map(records.map((r) => [r.constituency.number, r]));

  const paths = mapData.constituencies.map((c) => {
    const rec = byNumber.get(c.ac_no);
    const sev = severityOf(rec?.representative.declared_cases);
    return `<path class="ac" data-ac-no="${c.ac_no}" d="${c.d}" fill-rule="evenodd"
      data-sev="${sev}" tabindex="0" role="button"
      aria-label="${escapeHtml(c.name)}${rec ? `, ${escapeHtml(rec.representative.name)}` : ''}"></path>`;
  }).join('');

  const districtPaths = mapData.districts.map((d) =>
    `<path class="district-line" d="${d.d}" fill-rule="evenodd"></path>`
  ).join('');

  container.innerHTML = `
    <svg id="ap-svg" viewBox="${mapData.viewBox}" preserveAspectRatio="xMidYMid meet">
      <g id="ac-layer">${paths}</g>
      <g id="district-layer">${districtPaths}</g>
    </svg>
    <div id="map-tooltip" role="status" hidden></div>
  `;

  const svg = container.querySelector('#ap-svg');
  const tooltip = container.querySelector('#map-tooltip');

  const showTooltip = (path, evt) => {
    const acNo = Number(path.dataset.acNo);
    const c = mapData.constituencies.find((x) => x.ac_no === acNo);
    const rec = byNumber.get(acNo);
    const sev = Number(path.dataset.sev);
    tooltip.innerHTML = `
      <b>${escapeHtml(c.name)}</b>
      <span>${escapeHtml(c.district)}</span>
      ${rec ? `<span>${escapeHtml(rec.representative.name)} · ${escapeHtml(rec.representative.current_party ?? 'Independent')}</span>` : ''}
      <span class="sev-tag sev-${sev}">${SEVERITY_LABEL[sev]}</span>
    `;
    tooltip.hidden = false;
    positionTooltip(evt);
  };

  const positionTooltip = (evt) => {
    const rect = container.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    tooltip.style.left = `${Math.min(x + 14, rect.width - 240)}px`;
    tooltip.style.top = `${Math.max(y - 10, 8)}px`;
  };

  const hideTooltip = () => { tooltip.hidden = true; };

  svg.addEventListener('pointermove', (evt) => {
    const path = evt.target.closest('path.ac');
    if (!path) { hideTooltip(); return; }
    showTooltip(path, evt);
  });
  svg.addEventListener('pointerleave', hideTooltip);

  svg.addEventListener('click', (evt) => {
    const path = evt.target.closest('path.ac');
    if (!path) return;
    onSelect(Number(path.dataset.acNo));
  });

  svg.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    const path = evt.target.closest('path.ac');
    if (!path) return;
    evt.preventDefault();
    onSelect(Number(path.dataset.acNo));
  });
}
