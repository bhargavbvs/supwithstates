import { describe, it, expect } from 'vitest';
import { treemap, shares } from '../src/treemap.js';

describe('treemap', () => {
  it('fills the whole container, one tile per item', () => {
    const items = [{ value: 6 }, { value: 3 }, { value: 1 }];
    const tiles = treemap(items, 300, 200);
    expect(tiles).toHaveLength(3);
    const area = tiles.reduce((a, t) => a + t.w * t.h, 0);
    expect(area).toBeCloseTo(300 * 200, 3);
  });

  it('gives twice the value twice the area', () => {
    const tiles = treemap([{ value: 100 }, { value: 50 }], 400, 300);
    const by = (v) => tiles.find((t) => t.item.value === v);
    expect(by(100).w * by(100).h).toBeCloseTo(2 * by(50).w * by(50).h, 3);
  });

  it('keeps tiles inside the container', () => {
    const items = [52047, 35213, 19589, 18140, 16490, 14138, 13135, 11625, 9071, 8055, 100426]
      .map((value) => ({ value }));
    for (const t of treemap(items, 720, 420)) {
      expect(t.x).toBeGreaterThanOrEqual(-0.001);
      expect(t.y).toBeGreaterThanOrEqual(-0.001);
      expect(t.x + t.w).toBeLessThanOrEqual(720.001);
      expect(t.y + t.h).toBeLessThanOrEqual(420.001);
    }
  });
});

describe('shares', () => {
  it('sums exactly to 100 where naive rounding does not', () => {
    // Andhra's real receipts: naive rounding gives 37+6+19+11+27 = 100 but
    // 36.6 → 37 and 26.8 → 27 both round up; other splits lose a rupee.
    const s = shares([109007, 19119, 57566, 32284, 79927], 100);
    expect(s.reduce((a, v) => a + v, 0)).toBe(100);
  });

  it('keeps order and proportion', () => {
    const s = shares([3, 1], 100);
    expect(s).toEqual([75, 25]);
  });
});
