import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
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
    writeFileSync(f, 'x'.repeat(2000));
    expect(() => assertBudget(f, 1000)).toThrow(/big\.json.*2000.*1000/s);
  });
});
