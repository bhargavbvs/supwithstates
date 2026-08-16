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
