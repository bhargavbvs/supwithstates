const VIEW_WIDTH = 1000;

function ringToPath(ring, project) {
  return ring.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

// Planar shoelace area of a ring, in raw lng/lat degrees^2 - only used to
// compare parts of the same MultiPolygon against each other, so no
// projection is needed.
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

// Source shapefiles for AP's districts/constituencies occasionally carry a
// stray sliver polygon alongside the real body of a MultiPolygon (a
// digitizing artifact, not real disconnected territory - AP has no
// archipelago districts). Left in, it renders as an unexplained gray shape
// with no constituency fill over it. Dropping any part under 1% of the
// MultiPolygon's largest part filters those out without touching genuine
// single-part geometries.
function dropSliverParts(polygons) {
  if (polygons.length < 2) return polygons;
  const areas = polygons.map((rings) => ringArea(rings[0]));
  const maxArea = Math.max(...areas);
  return polygons.filter((_, i) => areas[i] >= maxArea * 0.01);
}

function geometryToPath(geometry, project) {
  const polygons = geometry.type === 'MultiPolygon'
    ? dropSliverParts(geometry.coordinates)
    : [geometry.coordinates];
  return polygons
    .map((rings) => rings.map((ring) => ringToPath(ring, project)).join(' '))
    .join(' ');
}

function collectBounds(featureCollections) {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (coords, depth) => {
    if (depth === 0) {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      for (const c of coords) visit(c, depth - 1);
    }
  };
  for (const fc of featureCollections) {
    for (const f of fc.features ?? []) {
      const g = f.geometry;
      if (!g) continue;
      visit(g.coordinates, g.type === 'MultiPolygon' ? 3 : 2);
    }
  }
  return { minLng, minLat, maxLng, maxLat };
}

// Equirectangular projection with a latitude-correction factor so shapes
// aren't horizontally stretched, scaled to a fixed-width SVG viewBox with
// north pointing up.
export function projectGeo(constituenciesFc, districtsFc) {
  const { minLng, minLat, maxLng, maxLat } = collectBounds([constituenciesFc, districtsFc]);
  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const xScale = Math.cos(midLatRad);

  const rawMinX = minLng * xScale;
  const rawMaxX = maxLng * xScale;
  const scale = VIEW_WIDTH / (rawMaxX - rawMinX);
  const viewHeight = (maxLat - minLat) * scale;

  const project = (lng, lat) => {
    const x = (lng * xScale - rawMinX) * scale;
    const y = viewHeight - (lat - minLat) * scale;
    return [x, y];
  };

  const constituencies = constituenciesFc.features.map((f) => ({
    ac_no: Number(f.properties.AC_NO),
    name: f.properties.AC_NAME,
    district: f.properties.district,
    d: geometryToPath(f.geometry, project)
  }));

  const districts = districtsFc.features.map((f) => ({
    name: f.properties.DISTRICT ?? f.properties.district,
    d: geometryToPath(f.geometry, project)
  }));

  return {
    viewBox: `0 0 ${VIEW_WIDTH.toFixed(2)} ${viewHeight.toFixed(2)}`,
    // The same numbers the paths were drawn with, so a caller can put a
    // longitude and latitude into this picture's own coordinates — which is
    // what "find my seat" needs, and is cheaper than shipping the
    // unprojected geometry a second time to answer one question.
    projection: { xScale, rawMinX, scale, viewHeight, minLat },
    constituencies,
    districts
  };
}
