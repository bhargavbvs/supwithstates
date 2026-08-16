function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function pointInPolygon(pt, rings) {
  if (!pointInRing(pt, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) if (pointInRing(pt, rings[i])) return false;
  return true;
}

export function findFeatureAt(pt, featureCollection) {
  for (const f of featureCollection.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon' && pointInPolygon(pt, g.coordinates)) return f;
    if (g.type === 'MultiPolygon' && g.coordinates.some((rings) => pointInPolygon(pt, rings))) return f;
  }
  return null;
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

const WORLD_RING = [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]];

export function buildOutsideMask(featureCollection) {
  const outerWinding = Math.sign(ringArea(WORLD_RING));
  const holes = [];
  for (const f of featureCollection.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    const rings = g.type === 'MultiPolygon' ? g.coordinates.flat() : g.coordinates.slice(0, 1);
    for (const ring of rings) {
      const winding = Math.sign(ringArea(ring));
      holes.push(winding === outerWinding ? [...ring].reverse() : ring);
    }
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [WORLD_RING, ...holes] }
  };
}

export function boundsOf(featureCollection) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (coords, depth) => {
    if (depth === 0) {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    } else {
      for (const c of coords) visit(c, depth - 1);
    }
  };
  for (const f of featureCollection.features ?? []) {
    const g = f.geometry;
    if (!g) continue;
    visit(g.coordinates, g.type === 'MultiPolygon' ? 3 : 2);
  }
  return [[minX, minY], [maxX, maxY]];
}
