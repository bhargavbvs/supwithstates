import { describe, it, expect } from 'vitest';
import { parseRoute } from '../src/router.js';

// The state leads the address now, and is null when the reader has not
// named one — main.js fills theirs in and rewrites it, so a link written
// before there was more than one state still opens.
const KNOWN = ['andhra', 'telangana'];

describe('parseRoute', () => {
  it('defaults to home', () => {
    expect(parseRoute('')).toEqual({ state: null, view: 'home', param: null });
    expect(parseRoute('#/')).toEqual({ state: null, view: 'home', param: null });
  });

  it('reads a state off the front of the address', () => {
    expect(parseRoute('#/telangana', KNOWN)).toEqual({ state: 'telangana', view: 'home', param: null });
    expect(parseRoute('#/telangana/d/hyderabad', KNOWN))
      .toEqual({ state: 'telangana', view: 'district', param: 'hyderabad' });
    expect(parseRoute('#/telangana/mps/9', KNOWN))
      .toEqual({ state: 'telangana', view: 'mps', param: '9' });
  });

  it('does not mistake a view for a state', () => {
    // "#/d/guntur" is a district in whichever state the reader is in, not
    // a state called "d".
    expect(parseRoute('#/d/guntur', KNOWN))
      .toEqual({ state: null, view: 'district', param: 'guntur' });
    expect(parseRoute('#/mps', KNOWN)).toEqual({ state: null, view: 'mps', param: null });
  });

  it('parses a district route', () => {
    expect(parseRoute('#/d/sri-sathya-sai')).toEqual({ state: null, view: 'district', param: 'sri-sathya-sai' });
  });

  it('parses a constituency route by number', () => {
    expect(parseRoute('#/c/123')).toEqual({ state: null, view: 'constituency', param: '123' });
  });

  it('parses static routes', () => {
    expect(parseRoute('#/methodology')).toEqual({ state: null, view: 'methodology', param: null });
    expect(parseRoute('#/about')).toEqual({ state: null, view: 'about', param: null });
  });

  it('falls back to home for unknown routes', () => {
    expect(parseRoute('#/nonsense/x')).toEqual({ state: null, view: 'home', param: null });
  });
});
