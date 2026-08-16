import { describe, it, expect } from 'vitest';
import { parseRoute } from '../src/router.js';

describe('parseRoute', () => {
  it('defaults to home', () => {
    expect(parseRoute('')).toEqual({ view: 'home', param: null });
    expect(parseRoute('#/')).toEqual({ view: 'home', param: null });
  });

  it('parses a district route', () => {
    expect(parseRoute('#/d/sri-sathya-sai')).toEqual({ view: 'district', param: 'sri-sathya-sai' });
  });

  it('parses a constituency route by number', () => {
    expect(parseRoute('#/c/123')).toEqual({ view: 'constituency', param: '123' });
  });

  it('parses static routes', () => {
    expect(parseRoute('#/methodology')).toEqual({ view: 'methodology', param: null });
    expect(parseRoute('#/about')).toEqual({ view: 'about', param: null });
  });

  it('falls back to home for unknown routes', () => {
    expect(parseRoute('#/nonsense/x')).toEqual({ view: 'home', param: null });
  });
});
