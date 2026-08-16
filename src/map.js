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
