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

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
