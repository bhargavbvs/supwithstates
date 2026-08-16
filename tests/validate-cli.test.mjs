import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateContent } from '../scripts/validate.mjs';

let dir;
const state = {
  slug: 'x', name: 'X', domain: 'x.com', assembly_size: 175, district_count: 26,
  term: { start: '2024-06', end: '2029-06' },
  sources: { go_portal: 'https://a.b/', myneta: 'https://c.d/' },
  map: { center: [80, 16], zoom: 6 }
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ssw-'));
  mkdirSync(join(dir, 'representatives'), { recursive: true });
  writeFileSync(join(dir, 'state.json'), JSON.stringify(state));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('validateContent', () => {
  it('passes with no representative files', () => {
    expect(validateContent(dir).errors).toEqual([]);
  });

  it('reports the filename alongside each error', () => {
    writeFileSync(join(dir, 'representatives', '1-a.json'), JSON.stringify({ id: 'a' }));
    const { errors } = validateContent(dir);
    expect(errors.some((m) => m.includes('1-a.json'))).toBe(true);
  });

  it('detects duplicate constituency numbers', () => {
    const rep = (n) => ({
      id: `ap-ac-${n}`, constituency: { number: n, name: 'N', district: 'D', reserved: null },
      representative: {
        name: 'P', elected_party: 'TDP', photo: null,
        declared_cases: { total: 0, serious: 0, convicted: 0 },
        assets: { movable: 0, immovable: 0, total: 0, liabilities: 0 }
      },
      source: { myneta_url: 'https://m/', retrieved: '2026-08-15' }
    });
    writeFileSync(join(dir, 'representatives', '5-a.json'), JSON.stringify(rep(5)));
    writeFileSync(join(dir, 'representatives', '5-b.json'), JSON.stringify(rep(5)));
    expect(validateContent(dir).errors.some((m) => m.includes('duplicate constituency number 5')))
      .toBe(true);
  });

  it('reports malformed JSON without throwing', () => {
    writeFileSync(join(dir, 'representatives', 'bad.json'), '{ not json');
    expect(validateContent(dir).errors.some((m) => m.includes('bad.json'))).toBe(true);
  });
});
