import { describe, it, expect } from 'vitest';
import { formatRupees, formatDeclaredCases, escapeHtml, CASE_DISCLAIMER } from '../src/format.js';

describe('formatRupees', () => {
  it('renders crores', () => expect(formatRupees(57300000)).toBe('₹5.73 crore'));
  it('renders lakhs', () => expect(formatRupees(250000)).toBe('₹2.50 lakh'));
  it('renders small amounts in full', () => expect(formatRupees(4500)).toBe('₹4,500'));
  it('renders zero', () => expect(formatRupees(0)).toBe('₹0'));
});

describe('formatDeclaredCases', () => {
  it('uses "declared criminal cases" wording', () => {
    const out = formatDeclaredCases({ total: 3, serious: 1, convicted: 0 });
    expect(out.headline).toBe('3 declared criminal cases');
  });

  it('singularises one case', () => {
    expect(formatDeclaredCases({ total: 1, serious: 0, convicted: 0 }).headline)
      .toBe('1 declared criminal case');
  });

  it('states none explicitly at zero', () => {
    expect(formatDeclaredCases({ total: 0, serious: 0, convicted: 0 }).headline)
      .toBe('No declared criminal cases');
  });

  it('keeps convicted separate from total', () => {
    const out = formatDeclaredCases({ total: 5, serious: 2, convicted: 1 });
    expect(out.serious).toBe('2 serious');
    expect(out.convicted).toBe('1 conviction');
    expect(out.headline).not.toContain('1 conviction');
  });

  it('always attaches the disclaimer', () => {
    expect(formatDeclaredCases({ total: 0, serious: 0, convicted: 0 }).disclaimer)
      .toBe(CASE_DISCLAIMER);
  });
});

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
  it('escapes quotes and ampersands', () => {
    expect(escapeHtml(`O'Brien & "Co"`)).toBe('O&#39;Brien &amp; &quot;Co&quot;');
  });
  it('handles null/undefined safely', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
