export const CASE_DISCLAIMER =
  'Self-declared in a sworn affidavit to the Election Commission of India. ' +
  'Pending cases are allegations, not convictions.';

export function formatRupees(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatDeclaredCases({ total, serious, convicted }) {
  return {
    headline: total === 0
      ? 'No declared criminal cases'
      : plural(total, 'declared criminal case'),
    serious: `${serious} serious`,
    convicted: plural(convicted, 'conviction'),
    disclaimer: CASE_DISCLAIMER
  };
}

// Severity scale for the map/list: color always paired with a text label
// (color-blind safe), never used to describe a person - only their declared
// case record. 3 = has a conviction, 2 = has a serious declared case,
// 1 = has declared cases (none serious), 0 = no declared cases.
export function severityOf(declaredCases) {
  if (!declaredCases) return -1; // no data yet
  const { total, serious, convicted } = declaredCases;
  if (convicted > 0) return 3;
  if (serious > 0) return 2;
  if (total > 0) return 1;
  return 0;
}

export const SEVERITY_LABEL = {
  [-1]: 'Not yet profiled',
  0: 'No declared cases',
  1: 'Declared cases, none serious',
  2: 'Serious declared case',
  3: 'Has a conviction'
};

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
