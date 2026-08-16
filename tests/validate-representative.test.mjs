import { describe, it, expect } from 'vitest';
import { validateRepresentative } from '../scripts/lib/validate-representative.mjs';

const opts = { assemblySize: 175 };

const valid = {
  id: 'ap-ac-123-penukonda',
  constituency: { number: 123, name: 'Penukonda', district: 'Sri Sathya Sai', reserved: null },
  representative: {
    name: 'S. Savitha',
    election: '2024',
    elected_party: 'TDP',
    current_party: 'TDP',
    party_changed: null,
    term_start: '2024-06',
    age_at_election: 46,
    profession: 'Agriculture',
    photo: null,
    education: { level: 'Graduate', detail: 'B.A., Sri Krishnadevaraya University, 1998' },
    declared_cases: { total: 3, serious: 1, convicted: 0, note: null },
    assets: { movable: 12300000, immovable: 45000000, total: 57300000, liabilities: 8000000 }
  },
  result: { votes: 89234, margin: 12045, runner_up: 'X', runner_up_party: 'YSRCP' },
  source: {
    myneta_url: 'https://www.myneta.info/AndhraPradesh2024/candidate.php?candidate_id=84',
    eci_url: 'https://affidavit.eci.gov.in/x',
    affidavit_filed: '2024-04',
    retrieved: '2026-08-15'
  }
};

const without = (obj, path) => {
  const clone = structuredClone(obj);
  const parts = path.split('.');
  const last = parts.pop();
  let cur = clone;
  for (const p of parts) cur = cur[p];
  delete cur[last];
  return clone;
};

describe('validateRepresentative', () => {
  it('accepts a valid record', () => {
    expect(validateRepresentative(valid, opts)).toEqual([]);
  });

  it('requires source.myneta_url', () => {
    expect(validateRepresentative(without(valid, 'source.myneta_url'), opts))
      .toContain('source.myneta_url is required and must be a URL');
  });

  it('requires declared_cases.convicted even when zero', () => {
    expect(validateRepresentative(without(valid, 'representative.declared_cases.convicted'), opts))
      .toContain('representative.declared_cases.convicted must be an explicit number');
  });

  it('accepts an explicit zero for convicted', () => {
    const zero = structuredClone(valid);
    zero.representative.declared_cases.convicted = 0;
    expect(validateRepresentative(zero, opts)).toEqual([]);
  });

  it('rejects a constituency number outside the assembly size', () => {
    const bad = structuredClone(valid);
    bad.constituency.number = 176;
    expect(validateRepresentative(bad, opts))
      .toContain('constituency.number must be between 1 and 175');
  });

  it('rejects non-numeric asset figures', () => {
    const bad = structuredClone(valid);
    bad.representative.assets.total = '5.7 crore';
    expect(validateRepresentative(bad, opts))
      .toContain('representative.assets.total must be a number');
  });

  it('rejects a photo without a license', () => {
    const bad = structuredClone(valid);
    bad.representative.photo = { url: 'https://x/y.jpg', credit: 'Someone' };
    expect(validateRepresentative(bad, opts))
      .toContain('representative.photo.license is required when a photo is present');
  });

  it('accepts a photo with a license', () => {
    const ok = structuredClone(valid);
    ok.representative.photo = { url: 'https://x/y.jpg', credit: 'Someone', license: 'CC BY-SA 4.0' };
    expect(validateRepresentative(ok, opts)).toEqual([]);
  });

  it('requires a source_url when party_changed is set', () => {
    const bad = structuredClone(valid);
    bad.representative.party_changed = { date: '2025-03-01', from: 'YSRCP' };
    expect(validateRepresentative(bad, opts))
      .toContain('representative.party_changed.source_url is required');
  });

  it('rejects serious exceeding total declared cases', () => {
    const bad = structuredClone(valid);
    bad.representative.declared_cases = { total: 1, serious: 3, convicted: 0, note: null };
    expect(validateRepresentative(bad, opts))
      .toContain('representative.declared_cases.serious cannot exceed total');
  });

  it('requires election to be a four-digit year', () => {
    const bad = structuredClone(valid);
    bad.representative.election = '24';
    expect(validateRepresentative(bad, opts))
      .toContain('representative.election must be a four-digit year');
  });
});
