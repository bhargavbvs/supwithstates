export const CASE_DISCLAIMER =
  'Self-declared in a sworn affidavit to the Election Commission of India. ' +
  'Pending cases are allegations, not convictions.';

export function formatRupees(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} lakh`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// A whole-crore, comma-separated form for large aggregate totals (e.g. the
// home page's statewide sum) - "₹11415.28 crore" is needless precision at
// that scale and wraps to two lines in a narrow stat card; "₹11,415 Cr"
// doesn't.
export function formatRupeesCompact(n) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1e7) return `₹${Math.round(n / 1e7).toLocaleString('en-IN')} Cr`;
  return formatRupees(n);
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function formatDeclaredCases({ total, serious, serious_declared: seriousDeclared, convicted }) {
  return {
    headline: total === 0
      ? 'No declared criminal cases'
      : plural(total, 'declared criminal case'),
    // ADR publishes a count for some elections and, for others, only the
    // list of who has declared such a case. Where the count is not
    // published this says so instead of printing a number nobody stated.
    serious: Number.isFinite(serious)
      ? `${serious} serious`
      : (seriousDeclared === true ? 'serious case declared' : 'none serious'),
    seriousKnown: Number.isFinite(serious),
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
  const { total, serious, serious_declared: seriousDeclared, convicted } = declaredCases;
  if (convicted > 0) return 3;
  // ADR publishes a per-member count for some elections and only the list
  // of names for others. Both say the same thing about this member.
  if (serious > 0 || seriousDeclared === true) return 2;
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

// Verified against each party's brand color and WCAG 2.1 contrast
// (docs/design/references.md, Part 2 — minimum 4.5:1 for normal text).
const PARTY_COLORS = {
  TDP: { bg: '#FFED00', text: '#111827' },
  YSRCP: { bg: '#1569C7', text: '#FFFFFF' },
  JSP: { bg: '#D81E24', text: '#FFFFFF' },
  BJP: { bg: '#FF9933', text: '#111827' },
  INC: { bg: '#00BFFF', text: '#0F172A' }
};
const OTHER_PARTY_COLOR = { bg: '#475569', text: '#FFFFFF' };

export function partyColor(party) {
  return PARTY_COLORS[party] ?? OTHER_PARTY_COLOR;
}

export function initials(name) {
  return String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
