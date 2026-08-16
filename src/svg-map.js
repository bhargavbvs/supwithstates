import { severityOf, SEVERITY_LABEL, escapeHtml } from './format.js';

let mapDataCache = null;

export async function loadMapData() {
  if (!mapDataCache) mapDataCache = await fetch('/geo/ap-map.json').then((r) => r.json());
  return mapDataCache;
}

const DRAG_THRESHOLD = 6; // px of pointer movement before a press counts as a pan, not a tap
const MAX_ZOOM = 8; // how far past the fit-to-state view a user can zoom in

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
    <div id="zoom-controls">
      <button type="button" id="zoom-in" aria-label="Zoom in">+</button>
      <button type="button" id="zoom-out" aria-label="Zoom out">−</button>
      <button type="button" id="zoom-reset" aria-label="Reset zoom">⤢</button>
    </div>
  `;

  const svg = container.querySelector('#ap-svg');
  const tooltip = container.querySelector('#map-tooltip');

  // ---- Zoom/pan state, driven entirely by rewriting the SVG viewBox ----
  const [baseX, baseY, baseW, baseH] = mapData.viewBox.trim().split(/\s+/).map(Number);
  let vb = { x: baseX, y: baseY, w: baseW, h: baseH };
  const minW = baseW / MAX_ZOOM;

  function applyViewBox() {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  function clampPan() {
    const maxX = Math.max(baseX, baseX + baseW - vb.w);
    const maxY = Math.max(baseY, baseY + baseH - vb.h);
    vb.x = Math.min(Math.max(vb.x, baseX), maxX);
    vb.y = Math.min(Math.max(vb.y, baseY), maxY);
  }

  function clientToSvgPoint(clientX, clientY) {
    const rect = svg.getBoundingClientRect();
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.w,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.h
    };
  }

  function zoomAt(clientX, clientY, factor) {
    const pt = clientToSvgPoint(clientX, clientY);
    const newW = Math.min(baseW, Math.max(minW, vb.w * factor));
    const actual = newW / vb.w;
    vb.x = pt.x - (pt.x - vb.x) * actual;
    vb.y = pt.y - (pt.y - vb.y) * actual;
    vb.w = newW;
    vb.h = vb.h * actual;
    clampPan();
    applyViewBox();
  }

  function resetZoom() {
    vb = { x: baseX, y: baseY, w: baseW, h: baseH };
    applyViewBox();
  }

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

  // ---- Pan (drag) and pinch-zoom via Pointer Events ----
  const activePointers = new Map(); // pointerId -> {x, y}
  let dragStart = null; // {x, y, vbx, vby}
  let dragMoved = false;
  let pinchStartDist = null;
  let pinchStartW = null;

  svg.addEventListener('pointerdown', (evt) => {
    activePointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    svg.setPointerCapture(evt.pointerId);
    if (activePointers.size === 1) {
      dragStart = { x: evt.clientX, y: evt.clientY, vbx: vb.x, vby: vb.y };
      dragMoved = false;
    } else if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      pinchStartW = vb.w;
      dragStart = null;
    }
  });

  svg.addEventListener('pointermove', (evt) => {
    if (activePointers.has(evt.pointerId)) {
      activePointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    }

    if (activePointers.size === 2 && pinchStartDist) {
      const [a, b] = [...activePointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const targetW = Math.min(baseW, Math.max(minW, pinchStartW * (pinchStartDist / dist)));
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, targetW / vb.w);
      hideTooltip();
      return;
    }

    if (dragStart) {
      const dx = evt.clientX - dragStart.x;
      const dy = evt.clientY - dragStart.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMoved = true;
      if (dragMoved) {
        const rect = svg.getBoundingClientRect();
        vb.x = dragStart.vbx - dx * (vb.w / rect.width);
        vb.y = dragStart.vby - dy * (vb.h / rect.height);
        clampPan();
        applyViewBox();
        hideTooltip();
        return;
      }
    }

    const path = evt.target.closest('path.ac');
    if (!path) { hideTooltip(); return; }
    showTooltip(path, evt);
  });

  const endPointer = (evt) => {
    activePointers.delete(evt.pointerId);
    if (activePointers.size < 2) pinchStartDist = null;
    if (activePointers.size === 0) dragStart = null;
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', hideTooltip);

  svg.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    zoomAt(evt.clientX, evt.clientY, evt.deltaY > 0 ? 1.15 : 1 / 1.15);
    hideTooltip();
  }, { passive: false });

  svg.addEventListener('click', (evt) => {
    if (dragMoved) { dragMoved = false; return; } // a pan/pinch just ended - don't also select
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

  const zoomStep = (factor) => {
    const rect = svg.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };
  container.querySelector('#zoom-in').addEventListener('click', () => zoomStep(1 / 1.4));
  container.querySelector('#zoom-out').addEventListener('click', () => zoomStep(1.4));
  container.querySelector('#zoom-reset').addEventListener('click', resetZoom);
}
