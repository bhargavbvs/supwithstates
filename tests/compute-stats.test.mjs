import { describe, it, expect } from 'vitest';
import { computeStats } from '../scripts/lib/compute-stats.mjs';

const rec = (total, serious, assets) => ({
  representative: {
    declared_cases: { total, serious, convicted: 0 },
    assets: { total: assets, movable: 0, immovable: 0, liabilities: 0 }
  }
});

describe('computeStats', () => {
  it('counts profiled records', () => {
    expect(computeStats([rec(0, 0, 100), rec(1, 1, 200)]).profiled).toBe(2);
  });

  it('counts records with at least one declared case', () => {
    expect(computeStats([rec(0, 0, 0), rec(3, 1, 0), rec(1, 0, 0)]).withDeclaredCases).toBe(2);
  });

  it('counts serious separately', () => {
    expect(computeStats([rec(3, 0, 0), rec(2, 1, 0)]).withSeriousCases).toBe(1);
  });

  it('sums total declared assets', () => {
    expect(computeStats([rec(0, 0, 1000), rec(0, 0, 2500)]).totalAssets).toBe(3500);
  });

  it('rounds the declared-case percentage to a whole number', () => {
    expect(computeStats([rec(1, 0, 0), rec(0, 0, 0), rec(1, 0, 0), rec(1, 0, 0)])
      .pctWithDeclaredCases).toBe(75);
  });

  it('returns zeroes for an empty set without dividing by zero', () => {
    expect(computeStats([])).toEqual({
      profiled: 0, withDeclaredCases: 0, withSeriousCases: 0,
      totalAssets: 0, pctWithDeclaredCases: 0
    });
  });
});
