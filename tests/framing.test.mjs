import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// "criminal" is also part of several standard IPC/legal-code term-of-art
// phrases used when citing what a declared case actually alleges (e.g. IPC
// 406/408/409 = "criminal breach of trust", IPC 120B = "criminal
// conspiracy", IPC 506 = "criminal intimidation", IPC 350/354 = "criminal
// force", Prevention of Corruption Act 13 = "criminal misconduct"). These
// name the statute, not the person, so they're exempted alongside
// "criminal case(s)" rather than forcing every case note to avoid citing
// the actual legal term for the section involved.
const BANNED = [
  /crime rate/i,
  /criminal record/i,
  /\bcrimes\b/i,
  /\bcriminal(?!\s+(case|breach|conspiracy|force|intimidation|misconduct))\b/i,
  /\bcriminals\b/i              // still needed separately — no word boundary between "l" and "s" in "criminals"
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|css|html|json|md)$/.test(entry)) out.push(full);
  }
  return out;
}

describe('framing rules (spec §8)', () => {
  // docs/copy/ is user-facing site copy staged by the Gemini track before being
  // merged into content/. The rest of docs/ (specs, plans) legitimately quotes
  // the banned terms to define the rule itself, so it stays out of scope.
  it('no banned criminal-case terminology anywhere in src/, content/, or docs/copy/', () => {
    const offenders = [];
    for (const file of [...walk('src'), ...walk('content'), ...walk('docs/copy')]) {
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

  it('does not ban standard IPC term-of-art phrases citing what a case alleges', () => {
    const phrases = [
      'IPC 406, criminal breach of trust by a servant',
      'IPC 120B, criminal conspiracy',
      'IPC 506 Part II, criminal intimidation with threat of death',
      'IPC 354, assault or criminal force to a woman',
      'Prevention of Corruption Act 13(2)(b), criminal misconduct',
    ];
    for (const text of phrases) {
      expect(BANNED.some((p) => p.test(text))).toBe(false);
    }
  });

  it('still bans "criminal" immediately before an unrelated word', () => {
    expect(BANNED.some((p) => p.test('a criminal enterprise'))).toBe(true);
  });
});
