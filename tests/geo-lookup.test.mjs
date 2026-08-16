import { describe, it, expect } from 'vitest';
import { findFeatureAt } from '../src/geo-lookup.js';

const square = (name, x0, y0, x1, y1) => ({
  type: 'Feature',
  properties: { AC_NAME: name },
  geometry: { type: 'Polygon', coordinates: [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]] }
});

const donut = {
  type: 'Feature',
  properties: { AC_NAME: 'Donut' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
    ]
  }
};

const fc = (features) => ({ type: 'FeatureCollection', features });

describe('findFeatureAt', () => {
  it('finds the containing polygon', () => {
    const out = findFeatureAt([1, 1], fc([square('A', 0, 0, 2, 2), square('B', 5, 5, 7, 7)]));
    expect(out.properties.AC_NAME).toBe('A');
  });

  it('returns null outside every polygon', () => {
    expect(findFeatureAt([100, 100], fc([square('A', 0, 0, 2, 2)]))).toBeNull();
  });

  it('excludes points inside a hole', () => {
    expect(findFeatureAt([5, 5], fc([donut]))).toBeNull();
  });

  it('includes points in the ring outside a hole', () => {
    expect(findFeatureAt([1, 1], fc([donut])).properties.AC_NAME).toBe('Donut');
  });

  it('handles MultiPolygon geometry', () => {
    const multi = {
      type: 'Feature', properties: { AC_NAME: 'M' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          [[[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]]
        ]
      }
    };
    expect(findFeatureAt([5.5, 5.5], fc([multi])).properties.AC_NAME).toBe('M');
  });
});
