import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertBudget } from '../scripts/lib/budget.mjs';

let dir;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'bud-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('assertBudget', () => {
  it('passes when under budget', () => {
    const f = join(dir, 'small.json');
    writeFileSync(f, 'x'.repeat(100));
    expect(() => assertBudget(f, 1000)).not.toThrow();
  });

  it('throws with actual and allowed sizes when over', () => {
    const f = join(dir, 'big.json');
    // Random bytes, because the budget is measured after gzip and a
    // megabyte of the same character compresses to almost nothing.
    writeFileSync(f, randomBytes(200_000));
    expect(() => assertBudget(f, 1000)).toThrow(/big\.json.*gzipped.*1000/s);
  });

  it('measures what a reader downloads, not what sits on disk', () => {
    const f = join(dir, 'repetitive.json');
    // 400KB on disk, a few hundred bytes over the wire. Uttar Pradesh's
    // bundle is this shape — long repeated field names and URLs — and
    // failing it on the raw size was failing it for bytes nobody sends.
    writeFileSync(f, 'x'.repeat(400_000));
    expect(statSync(f).size).toBeGreaterThan(300_000);
    expect(() => assertBudget(f, 10_000)).not.toThrow();
  });
});
