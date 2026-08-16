import { Map as MaplibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BASEMAP = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO'
    }
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
};

export function initMap(container, { center, zoom }) {
  return new MaplibreMap({ container, style: BASEMAP, center, zoom, attributionControl: true });
}

export function addDistrictLayer(map, geojson, onSelect) {
  map.addSource('districts', { type: 'geojson', data: geojson });
  map.addLayer({
    id: 'districts-fill', type: 'fill', source: 'districts',
    paint: { 'fill-color': '#2a6ef2', 'fill-opacity': 0.18 }
  });
  map.addLayer({
    id: 'districts-line', type: 'line', source: 'districts',
    paint: { 'line-color': '#2a6ef2', 'line-width': 1 }
  });
  map.on('click', 'districts-fill', (e) => onSelect(e.features[0].properties));
  map.on('mouseenter', 'districts-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', 'districts-fill', () => { map.getCanvas().style.cursor = ''; });
}

export function addDistrictOutline(map, geojson) {
  map.addSource('district-outline', { type: 'geojson', data: geojson });
  map.addLayer({
    id: 'district-outline-line', type: 'line', source: 'district-outline',
    paint: { 'line-color': '#8a94a6', 'line-width': 1.4 }
  });
}

export function addConstituencyLayer(map, geojson, onSelect) {
  map.addSource('constituencies', { type: 'geojson', data: geojson, generateId: true });
  map.addLayer({
    id: 'constituencies-fill', type: 'fill', source: 'constituencies',
    paint: {
      'fill-color': '#2a6ef2',
      'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.42, 0.14]
    }
  });
  map.addLayer({
    id: 'constituencies-line', type: 'line', source: 'constituencies',
    paint: { 'line-color': '#2a6ef2', 'line-width': 0.6, 'line-opacity': 0.6 }
  });

  let hoveredId = null;
  map.on('mousemove', 'constituencies-fill', (e) => {
    if (!e.features.length) return;
    const id = e.features[0].id;
    if (hoveredId === id) return;
    if (hoveredId !== null) map.setFeatureState({ source: 'constituencies', id: hoveredId }, { hover: false });
    hoveredId = id;
    map.setFeatureState({ source: 'constituencies', id: hoveredId }, { hover: true });
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'constituencies-fill', () => {
    if (hoveredId !== null) map.setFeatureState({ source: 'constituencies', id: hoveredId }, { hover: false });
    hoveredId = null;
    map.getCanvas().style.cursor = '';
  });
  map.on('click', 'constituencies-fill', (e) => onSelect(e.features[0].properties));
}
