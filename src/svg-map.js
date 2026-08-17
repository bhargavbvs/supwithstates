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
    const party = rec?.representative.current_party ?? '';
    return `<path class="ac" data-ac-no="${c.ac_no}" d="${c.d}" fill-rule="evenodd"
      data-sev="${sev}" data-party="${escapeHtml(party)}" tabindex="0" role="button"
      aria-label="${escapeHtml(c.name)}${rec ? `, ${escapeHtml(rec.representative.name)}` : ''}"></path>`;
  }).join('');

  const districtFills = mapData.districts.map((d) =>
    `<path d="${d.d}" fill-rule="evenodd"></path>`
  ).join('');
  const districtPaths = mapData.districts.map((d) =>
    `<path class="district-line" d="${d.d}" fill-rule="evenodd"></path>`
  ).join('');

  container.innerHTML = `
    <svg id="ap-svg" viewBox="${mapData.viewBox}" preserveAspectRatio="xMidYMid meet">
      <g id="base-layer">${districtFills}</g>
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

  function clampVb(v) {
    const maxX = Math.max(baseX, baseX + baseW - v.w);
    const maxY = Math.max(baseY, baseY + baseH - v.h);
    return { ...v, x: Math.min(Math.max(v.x, baseX), maxX), y: Math.min(Math.max(v.y, baseY), maxY) };
  }

  function clampPan() {
    vb = clampVb(vb);
  }

  // ---- Eased animation (zoom buttons, reset) and momentum (pan release) -
  // both drive the same vb/applyViewBox state as the direct-manipulation
  // gestures below, so only one can run at a time.
  let animFrame = null;
  function cancelAnimation() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  }

  function animateTo(target, duration = 240) {
    cancelAnimation();
    cancelMomentum();
    const start = { ...vb };
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      vb = {
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        w: start.w + (target.w - start.w) * eased,
        h: start.h + (target.h - start.h) * eased
      };
      applyViewBox();
      animFrame = t < 1 ? requestAnimationFrame(step) : null;
    };
    animFrame = requestAnimationFrame(step);
  }

  // Momentum: after a drag release with real velocity, keep panning and
  // decay toward a stop instead of cutting off the instant a finger/button
  // lifts - this is most of what makes a map feel "smooth" versus jerky.
  let momentumFrame = null;
  function cancelMomentum() {
    if (momentumFrame) { cancelAnimationFrame(momentumFrame); momentumFrame = null; }
  }

  function startMomentum(vx, vy) {
    // vx/vy are client px/ms from the last ~80ms of drag movement.
    cancelAnimation();
    let velX = vx, velY = vy, lastT = performance.now();
    const frame = (now) => {
      const dt = Math.min(32, now - lastT); // clamp so a dropped frame can't overshoot
      lastT = now;
      const rect = contentRect();
      vb = clampVb({
        ...vb,
        x: vb.x - velX * dt * (vb.w / rect.width),
        y: vb.y - velY * dt * (vb.h / rect.height)
      });
      applyViewBox();
      velX *= 0.93;
      velY *= 0.93;
      momentumFrame = Math.hypot(velX, velY) > 0.003 ? requestAnimationFrame(frame) : null;
    };
    momentumFrame = requestAnimationFrame(frame);
  }

  // The SVG's own box (from CSS) rarely has the same aspect ratio as the
  // viewBox, so preserveAspectRatio="xMidYMid meet" letterboxes the actual
  // rendered map inside it. Client<->map coordinate conversion has to use
  // that inner content rect, not the full CSS box, or pointer math drifts
  // off-center whenever the two aspect ratios don't match.
  function contentRect() {
    const rect = svg.getBoundingClientRect();
    const boxAspect = rect.width / rect.height;
    const vbAspect = baseW / baseH;
    if (boxAspect > vbAspect) {
      const width = rect.height * vbAspect;
      return { left: rect.left + (rect.width - width) / 2, top: rect.top, width, height: rect.height };
    }
    const height = rect.width / vbAspect;
    return { left: rect.left, top: rect.top + (rect.height - height) / 2, width: rect.width, height };
  }

  function clientToSvgPoint(clientX, clientY) {
    const rect = contentRect();
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.w,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.h
    };
  }

  function zoomTarget(clientX, clientY, factor) {
    const pt = clientToSvgPoint(clientX, clientY);
    const newW = Math.min(baseW, Math.max(minW, vb.w * factor));
    const actual = newW / vb.w;
    return clampVb({
      x: pt.x - (pt.x - vb.x) * actual,
      y: pt.y - (pt.y - vb.y) * actual,
      w: newW,
      h: vb.h * actual
    });
  }

  // Direct-manipulation gestures (wheel, pinch, drag) apply instantly -
  // they're already following the input 1:1, which reads as "smooth" on its
  // own. Only button-triggered jumps (below) get the eased animation.
  function zoomAt(clientX, clientY, factor) {
    vb = zoomTarget(clientX, clientY, factor);
    applyViewBox();
  }

  function resetZoom() {
    animateTo({ x: baseX, y: baseY, w: baseW, h: baseH });
  }

  const showTooltip = (path, evt, { tapHint = false } = {}) => {
    const acNo = Number(path.dataset.acNo);
    const c = mapData.constituencies.find((x) => x.ac_no === acNo);
    const rec = byNumber.get(acNo);
    const sev = Number(path.dataset.sev);
    tooltip.innerHTML = `
      <b>${escapeHtml(c.name)}</b>
      <span>${escapeHtml(c.district)}</span>
      ${rec ? `<span>${escapeHtml(rec.representative.name)} · ${escapeHtml(rec.representative.current_party ?? 'Independent')}</span>` : ''}
      <span class="sev-tag sev-${sev}">${SEVERITY_LABEL[sev]}</span>
      ${tapHint ? `<span class="tap-hint">Tap again to view profile</span>` : ''}
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

  // Once a pointer is captured (below, on every press so drags keep tracking
  // outside the SVG bounds), pointer/mouse events for it are retargeted to
  // the capturing element - evt.target stops being the actual <path> under
  // the cursor and becomes the <svg> itself. Real coordinate hit-testing
  // sidesteps that instead of trusting evt.target.
  const pathAt = (clientX, clientY) => document.elementFromPoint(clientX, clientY)?.closest('path.ac') ?? null;

  // ---- Pan (drag) and pinch-zoom via Pointer Events ----
  const activePointers = new Map(); // pointerId -> {x, y}
  let dragStart = null; // {x, y, vbx, vby}
  let dragMoved = false;
  let pinchStartDist = null;
  let pinchStartW = null;
  let velocitySamples = []; // {x, y, t} from the last ~80ms of drag, for momentum on release
  let lastPointerType = 'mouse';
  let previewedAcNo = null; // touch only: which constituency's tooltip is showing as a tap-preview

  svg.addEventListener('pointerdown', (evt) => {
    lastPointerType = evt.pointerType || 'mouse';
    cancelAnimation();
    cancelMomentum();
    activePointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    svg.setPointerCapture(evt.pointerId);
    if (activePointers.size === 1) {
      dragStart = { x: evt.clientX, y: evt.clientY, vbx: vb.x, vby: vb.y };
      dragMoved = false;
      velocitySamples = [{ x: evt.clientX, y: evt.clientY, t: performance.now() }];
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
        const now = performance.now();
        velocitySamples.push({ x: evt.clientX, y: evt.clientY, t: now });
        while (velocitySamples.length > 1 && now - velocitySamples[0].t > 80) velocitySamples.shift();

        const rect = contentRect();
        vb.x = dragStart.vbx - dx * (vb.w / rect.width);
        vb.y = dragStart.vby - dy * (vb.h / rect.height);
        clampPan();
        applyViewBox();
        hideTooltip();
        return;
      }
    }

    const path = pathAt(evt.clientX, evt.clientY);
    if (!path) { hideTooltip(); return; }
    showTooltip(path, evt);
  });

  const endPointer = (evt) => {
    activePointers.delete(evt.pointerId);
    if (activePointers.size < 2) pinchStartDist = null;
    if (activePointers.size === 0) {
      if (dragMoved && velocitySamples.length > 1) {
        const first = velocitySamples[0];
        const last = velocitySamples[velocitySamples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0) {
          const vx = (last.x - first.x) / dt;
          const vy = (last.y - first.y) / dt;
          if (Math.hypot(vx, vy) > 0.05) startMomentum(vx, vy);
        }
      }
      dragStart = null;
    }
  };
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);
  svg.addEventListener('pointerleave', hideTooltip);

  svg.addEventListener('wheel', (evt) => {
    evt.preventDefault();
    cancelAnimation();
    cancelMomentum();
    zoomAt(evt.clientX, evt.clientY, evt.deltaY > 0 ? 1.15 : 1 / 1.15);
    hideTooltip();
  }, { passive: false });

  svg.addEventListener('click', (evt) => {
    if (dragMoved) { dragMoved = false; return; } // a pan/pinch just ended - don't also select
    const path = pathAt(evt.clientX, evt.clientY);
    if (!path) { previewedAcNo = null; hideTooltip(); return; }
    const acNo = Number(path.dataset.acNo);

    // Touch has no real hover, so a tap would otherwise flash the tooltip
    // for an instant before immediately navigating away - not enough time
    // to actually read it. First tap on a constituency previews it instead
    // (same info a mouse hover would show); tapping that same one again, or
    // the hint inside the tooltip, navigates.
    if (lastPointerType === 'touch' && previewedAcNo !== acNo) {
      previewedAcNo = acNo;
      showTooltip(path, evt, { tapHint: true });
      return;
    }

    previewedAcNo = null;
    onSelect(acNo);
  });

  svg.addEventListener('keydown', (evt) => {
    if (evt.key !== 'Enter' && evt.key !== ' ') return;
    const path = evt.target.closest('path.ac');
    if (!path) return;
    evt.preventDefault();
    onSelect(Number(path.dataset.acNo));
  });

  const zoomStep = (factor) => {
    cancelMomentum();
    const rect = contentRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    animateTo(zoomTarget(cx, cy, factor));
  };
  container.querySelector('#zoom-in').addEventListener('click', () => zoomStep(1 / 1.4));
  container.querySelector('#zoom-out').addEventListener('click', () => zoomStep(1.4));
  container.querySelector('#zoom-reset').addEventListener('click', resetZoom);

  // Dims constituencies whose severity isn't in activeSevs (a Set of -1..3).
  // An empty/falsy set means no filter - everything shows at full opacity.
  // A constituency must match BOTH an active severity filter and an active
  // party filter when both are in use (AND, not OR, across the two
  // dimensions) - e.g. "Serious" + "TDP" shows only TDP seats with a
  // serious declared case, not every TDP seat plus every serious one.
  function setFilter(activeSevs, activeParties) {
    const hasSevFilter = activeSevs && activeSevs.size > 0;
    const hasPartyFilter = activeParties && activeParties.size > 0;
    svg.querySelectorAll('path.ac').forEach((path) => {
      const sevMatch = !hasSevFilter || activeSevs.has(Number(path.dataset.sev));
      const partyMatch = !hasPartyFilter || activeParties.has(path.dataset.party);
      path.classList.toggle('dimmed', !(sevMatch && partyMatch));
    });
  }

  return { setFilter };
}
