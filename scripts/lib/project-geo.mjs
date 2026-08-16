const VIEW_WIDTH = 1000;

function ringToPath(ring, project) {
  return ring.map(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

function geometryToPath(geometry, project) {
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
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
    constituencies,
    districts
  };
}
