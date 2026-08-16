import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const BANNED = [
  /crime rate/i,
  /criminal record/i,
  /\bcrimes\b/i,
  /\bcriminal(?!\s+case)\b/i,   // bans "criminal" everywhere EXCEPT immediately before "case"/"cases"
  /\bcriminals\b/i              // still needed separately — no word boundary between "l" and "s" in "criminals"
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|css|html|json)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('framing rules (spec §8)', () => {
  it('no banned criminal-case terminology anywhere in src/ or content/', () => {
    const offenders = [];
    for (const file of [...walk('src'), ...walk('content')]) {
      const text = readFileSync(file, 'utf8');
      for (const pattern of BANNED) {
        if (pattern.test(text)) offenders.push(`${file} matches ${pattern}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('does not ban the required phrase "declared criminal case(s)"', () => {
    const text = 'The representative has 3 declared criminal cases on record.';
    expect(BANNED.some((p) => p.test(text))).toBe(false);
  });

  it('bans the singular word "criminal" used to describe a person', () => {
    expect(BANNED.some((p) => p.test('He is a criminal.'))).toBe(true);
  });
});
