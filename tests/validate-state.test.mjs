import { describe, it, expect } from 'vitest';
import { validateState } from '../scripts/lib/validate-state.mjs';

const valid = {
  slug: 'andhra',
  name: 'Andhra Pradesh',
  domain: 'ssupwithandhra.com',
  assembly_size: 175,
  district_count: 26,
  term: { start: '2024-06', end: '2029-06' },
  sources: { go_portal: 'https://goir.ap.gov.in/', myneta: 'https://www.myneta.info/AndhraPradesh2024/' },
  map: { center: [80.0, 15.9], zoom: 6 }
};

describe('validateState', () => {
  it('accepts a valid state config', () => {
    expect(validateState(valid)).toEqual([]);
  });

  it('requires assembly_size to be a positive integer', () => {
    expect(validateState({ ...valid, assembly_size: 0 }))
      .toContain('assembly_size must be a positive integer');
  });

  it('requires a myneta source url', () => {
    const { myneta, ...rest } = valid.sources;
    expect(validateState({ ...valid, sources: rest }))
      .toContain('sources.myneta is required');
  });

  it('requires map.center to be [lng, lat]', () => {
    expect(validateState({ ...valid, map: { center: [80.0], zoom: 6 } }))
      .toContain('map.center must be [lng, lat]');
  });
});
