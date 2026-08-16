import { describe, it, expect } from 'vitest';
import { searchConstituencies } from '../src/search.js';

const recs = [
  { constituency: { number: 123, name: 'Penukonda', district: 'Sri Sathya Sai' },
    representative: { name: 'S. Savitha' } },
  { constituency: { number: 12, name: 'Visakhapatnam East', district: 'Visakhapatnam' },
    representative: { name: 'A. Kumar' } },
  { constituency: { number: 45, name: 'Guntur West', district: 'Guntur' },
    representative: { name: 'B. Rao' } }
];

describe('searchConstituencies', () => {
  it('returns nothing for an empty query', () => {
    expect(searchConstituencies('', recs)).toEqual([]);
  });

  it('matches constituency name case-insensitively', () => {
    expect(searchConstituencies('penu', recs)[0].constituency.name).toBe('Penukonda');
  });

  it('matches district name', () => {
    expect(searchConstituencies('guntur', recs)[0].constituency.number).toBe(45);
  });

  it('matches representative name', () => {
    expect(searchConstituencies('savitha', recs)[0].constituency.number).toBe(123);
  });

  it('ranks prefix matches above substring matches', () => {
    const out = searchConstituencies('visakha', recs);
    expect(out[0].constituency.name).toBe('Visakhapatnam East');
  });

  it('respects the limit', () => {
    expect(searchConstituencies('a', recs, 2).length).toBeLessThanOrEqual(2);
  });
});
