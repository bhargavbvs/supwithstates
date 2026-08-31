#!/usr/bin/env node
// A state's budget, from PRS Legislative Research's analysis of it.
//
//   node scripts/parse-prs-budget.mjs andhra 2025-26
//
// PRS publishes one of these for every state every year, and it is the
// only place the numbers exist in a form anybody can read: the states
// publish budgets as scanned demand-for-grants volumes, and neither
// data.gov.in nor Open Budgets India serves them as data. So this reads
// the PDF — which is a real cost, and the reason it is worth paying is
// that PRS uses the same template for all thirty-one states, so a parser
// tuned to that template is a parser for the country.
//
// Nothing here is re-derived or estimated. Every figure is copied out of
// a table, and the checks at the end refuse to write a file whose numbers
// do not agree with the totals PRS states elsewhere in the same document.
//
// The PDF is cached in .budget-src/ so a parser fix never re-fetches it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { stateConfig } from './lib/states.mjs';

const SLUG = process.argv[2];
const YEAR = process.argv[3] ?? '2025-26';
if (!SLUG) { console.error('usage: node scripts/parse-prs-budget.mjs <state> [year]'); process.exit(1); }
const cfg = stateConfig(SLUG);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const CACHE = '.budget-src';
mkdirSync(CACHE, { recursive: true });

/** Indian-grouped digits: 2,53,557 -> 253557. Blank and "NA" stay null. */
const num = (s) => {
  const t = String(s ?? '').replace(/[^\d.-]/g, '');
  if (!t || t === '-' || t === '.') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

/** The PDF's own address, found on the state's analysis page rather than
 *  guessed from a pattern — PRS's file names are not uniform. */
async function pdfUrl() {
  const prsSlug = cfg.name.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and');
  const page = `https://prsindia.org/budgets/states/${prsSlug}-budget-analysis-${YEAR}`;
  const html = await fetch(page, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  const hit = html.match(/href="(https:\/\/prsindia\.org\/files\/budget\/[^"]+\.pdf)"/i)
    ?? html.match(/href="(\/files\/budget\/[^"]+\.pdf)"/i);
  if (!hit) throw new Error(`no PDF linked on ${page}`);
  const href = hit[1].startsWith('http') ? hit[1] : `https://prsindia.org${hit[1]}`;
  // Some of these filenames carry a space — "Andhra Pradesh_Budget_Analysis
  // 2022-23.pdf" — which fetch will not send unencoded. And the href comes
  // out of HTML, so its entities are still escaped: Jammu & Kashmir's file
  // is linked as "J&amp;K_Budget_Analysis_2025-26.pdf", and fetching that
  // literally returned a 404 page that then got cached as if it were the
  // PDF — pdftotext called it "may not be a PDF file" a step later.
  const decoded = href.replace(/&amp;/g, '&').replace(/&#0?39;/g, "'");
  return { page, pdf: decoded.replace(/ /g, '%20') };
}

// "2025-26" -> the three columns the table carries, oldest first.
const endYear = Number(YEAR.slice(0, 4));
const label = (start) => `${start}-${String(start + 1).slice(2)}`;
const YEAR_LABELS = [
  { key: 'actuals', label: label(endYear - 2), kind: 'spent' },
  { key: 'revisedPrev', label: label(endYear - 1), kind: 'revised' },
  { key: 'budgeted', label: label(endYear), kind: 'budgeted' },
];

const { page, pdf } = await pdfUrl();
const file = `${CACHE}/${SLUG}-${YEAR}.pdf`;
if (!existsSync(file)) {
  const buf = Buffer.from(await fetch(pdf, { headers: { 'User-Agent': UA } }).then((r) => r.arrayBuffer()));
  writeFileSync(file, buf);
  console.log(`fetched ${pdf} (${buf.length} bytes)`);
}
const text = execFileSync('pdftotext', ['-layout', file, '-']).toString();
const lines = text.split('\n');

/** The lines of one table, from its caption to its Sources: footer. */
// Found by what a table is called, not by its number. Jammu & Kashmir
// carries an extra "Committed Expenditure" table ahead of the others, so
// its sectors are Table 5 and its receipts Table 6 where every other state
// has them at 4 and 5 — reading by number there read the wrong tables and
// still produced figures, which is the worst kind of wrong.
function table(caption) {
  const want = caption instanceof RegExp ? caption : null;
  const start = want
    ? lines.findIndex((l) => /^\s*Table \d+:/.test(l) && want.test(l))
    : lines.findIndex((l) => l.trim().startsWith(caption));
  if (start < 0) throw new Error(`${SLUG}: no table captioned ${caption} in the PDF`);
  const end = lines.findIndex((l, i) => i > start && /^\s*(Sources?|Note):/i.test(l));
  return lines.slice(start + 1, end < 0 ? start + 40 : end);
}

/** A row whose label is in the left column and whose figures follow it.
 *  Matching on the label rather than splitting on whitespace, because a
 *  label can be several words and a figure can be blank. */
function row(rows, label) {
  const line = rows.find((l) => l.trim().toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return null;
  // Everything after the label, so a number inside the label — "(-)
  // Repayment of debt" has none, but "Share in Central Taxes" could — can
  // never be mistaken for a figure.
  const at = line.toLowerCase().indexOf(label.toLowerCase());
  // A dash is an empty cell, and it has to be counted as one. Dropping it
  // collapsed the row and shifted every later figure a column left: Sikkim
  // writes "-" where the other states write a percentage, so its GSDP came
  // back as 8 — the trailing growth figure — instead of 57,000, and the
  // deficit check caught it as 41,287% of GSDP. Matched as a placeholder,
  // num() turns it into the null it is and the columns stay put.
  return (line.slice(at + label.length)
    .match(/-?[\d,]+\.?\d*%?|(?<=\s)-(?=\s|$)/g) ?? []).map(num);
}

// ---- Table 1: what the state takes in and what it spends ---------------
const t1 = table(/key figures/i);
const pick = (label, i) => (row(t1, label) ?? [])[i] ?? null;
const series = (label) => {
  const r = row(t1, label) ?? [];
  return { actuals: r[0] ?? null, budgetedPrev: r[1] ?? null, revisedPrev: r[2] ?? null, budgeted: r[4] ?? null };
};
// This row is labelled three different ways across the states, and the
// third states its meaning in the sign rather than in the word. Andhra has
// a "Revenue Deficit", Odisha a "Revenue Surplus", and Bihar, Chhattisgarh,
// Mizoram and Assam a signed "Revenue Balance" — where Chhattisgarh's own
// footnote reads "Negative revenue balance indicates revenue deficit,
// positive indicates surplus".
//
// So the label alone cannot be trusted to say which way a state is
// running. Reading a Revenue Balance row as a deficit would have printed
// Bihar's Rs 8,831 crore surplus as a shortfall of the same size — an
// inversion, not a rounding error. The kind is taken from the sign where
// the sign is what carries it, and the magnitude is kept unsigned.
// The deficit row carries a sign convention in its label, and the two
// conventions are opposites. Most states write "Fiscal Deficit (E-R)",
// where a positive figure is a deficit; Delhi writes "Fiscal Balance
// (R-E)", where a deficit is negative. Reading the figure without its
// formula turned Delhi's Rs 6,565 crore shortfall into a surplus of the
// same size, so the formula printed in the label decides the sign.
const fiscalRow = ['Fiscal Deficit', 'Fiscal Balance', 'Fiscal Surplus'].find((l) => row(t1, l)) ?? null;
const fiscalLine = fiscalRow
  ? (t1.find((l) => l.trim().toLowerCase().startsWith(fiscalRow.toLowerCase())) ?? '') : '';
const deficitSign = /\(\s*R\s*-\s*E\s*\)/i.test(fiscalLine) ? -1 : 1;
const signed = (v) => (v == null ? null : v * deficitSign);

const revenueRow = ['Revenue Deficit', 'Revenue Surplus', 'Revenue Balance']
  .find((l) => row(t1, l)) ?? null;
const revenueRaw = revenueRow ? (row(t1, revenueRow) ?? [])[4] ?? null : null;
const revenueKind = !revenueRow ? null
  : revenueRow === 'Revenue Deficit' ? 'deficit'
    : revenueRow === 'Revenue Surplus' ? 'surplus'
      : revenueRaw == null ? null
        : revenueRaw > 0 ? 'surplus' : revenueRaw < 0 ? 'deficit' : 'balance';

const headline = {
  totalExpenditure: pick('Total Expenditure', 4),
  netExpenditure: pick('Net Expenditure', 4),
  totalReceipts: pick('Total Receipts', 4),
  netReceipts: pick('Net Receipts', 4),
  borrowings: pick('(-) Borrowings', 4),
  fiscalDeficit: fiscalRow ? signed((row(t1, fiscalRow) ?? [])[4] ?? null) : null,
  revenueBalance: !revenueRow ? null
    : { kind: revenueKind, amount: revenueRaw == null ? null : Math.abs(revenueRaw) },
  // A row in the recent template, a sentence in the older one.
  gsdp: pick('GSDP', 4) ?? (() => {
    const m = text.replace(/\s+/g, ' ')
      .match(/GSDP\)? of [^.]*?is (?:projected|estimated) to be [^\d]*([\d,]+) crore/i);
    return m ? num(m[1]) : null;
  })(),
};

// The "as % of GSDP" line sits directly under the deficit it belongs to,
// and there is one under each — so they are read by position rather than
// by label, which would match whichever came first.
function pctUnder(label) {
  const i = t1.findIndex((l) => l.trim().toLowerCase().startsWith(label.toLowerCase()));
  if (i < 0) return null;
  const next = t1[i + 1] ?? '';
  if (!/as % of GSDP/i.test(next)) return null;
  const figures = (next.match(/-?[\d.]+%/g) ?? []).map((v) => Number(v.replace('%', '')));
  return { revisedPrev: figures[2] ?? null, budgeted: figures[3] ?? null };
}

// Outstanding debt and the borrowing ceiling are written in prose, not in
// any table. Read as stated and never converted to rupees: "35% of GSDP"
// is one significant figure, and multiplying it out would manufacture a
// precision the document does not have.
const prose = text.replace(/\s+/g, ' ');
const outstandingDebtPctGsdp = Number(
  prose.match(/outstanding debt is estimated to be ([\d.]+)% of GSDP/i)?.[1] ?? NaN,
);
const fiscalDeficitCeilingPctGsdp = Number(
  prose.match(/permitted fiscal deficit of up to ([\d.]+)% of GSDP/i)?.[1] ?? NaN,
);

const revenuePct = (() => {
  const fromTable = revenueRow ? pctUnder(revenueRow) : null;
  if (fromTable?.budgeted != null) return fromTable;
  if (revenueKind === 'balance') return { revisedPrev: null, budgeted: 0 };
  const m = prose.match(new RegExp(
    `revenue (?:surplus|deficit) in ${YEAR} is estimated to be ([\\d.]+)% of GSDP`, 'i'))
    ?? prose.match(new RegExp(
      `estimates? a revenue (?:surplus|deficit) of ([\\d.]+)% of GSDP[^.]*?in ${YEAR}`, 'i'));
  return m ? { revisedPrev: null, budgeted: Number(m[1]) } : {};
})();

const fiscal = {
  fiscalDeficit: !fiscalRow ? null : (() => {
    const p = pctUnder(fiscalRow);
    return p && { revisedPrev: signed(p.revisedPrev), budgeted: signed(p.budgeted) };
  })(),
  revenueBalance: !revenueRow ? null : { kind: revenueKind, ...revenuePct },
  outstandingDebtPctGsdp: Number.isFinite(outstandingDebtPctGsdp) ? outstandingDebtPctGsdp : null,
  fiscalDeficitCeilingPctGsdp: Number.isFinite(fiscalDeficitCeilingPctGsdp)
    ? fiscalDeficitCeilingPctGsdp : null,
};

// The same three lines across the years the table covers, so the page can
// show a direction and not only a destination.
const overYears = {
  netExpenditure: series('Net Expenditure'),
  netReceipts: series('Net Receipts'),
  fiscalDeficit: !fiscalRow ? { actuals: null, budgetedPrev: null, revisedPrev: null, budgeted: null }
    : Object.fromEntries(Object.entries(series(fiscalRow)).map(([k, v]) => [k, signed(v)])),
};

// ---- Table 4: where it goes -------------------------------------------
//
// The table lays three things across each line: the sector's name in the
// left column, its figures in the middle, and a running list of named
// schemes on the right. A sector occupies a block of lines and the blocks
// are separated by blank ones, so each block is read whole: the name is
// its name-column fragments joined, and the figures are the one line in it
// that carries them.
//
// The schemes are NOT read as belonging to the sector they sit beside.
// PRS lets that column run on past its row — Andhra's Rs 4,000 crore for
// the Dr NTR Vaidya Seva trust, which is a health scheme, is printed
// alongside the education block — so aligning them by eye would attach
// money to the wrong purpose. They are collected as what they are: the
// named allocations this budget makes, in the order the document gives
// them.
const t4 = table(/sector-wise expenditure/i);

// The columns move between years. In the 2025-26 template the sector name
// runs to column 28 and the scheme bullets start at 90; in 2023-24 both
// sit several characters left, and hardcoding either produced a table read
// down the wrong lines. So the boundaries are measured from the table:
// where its own figures begin, and where its own bullets do.
const BULLET = '\u25AA';
const figureLines = t4.filter((l) => (l.match(/[\d,]{3,}/g) ?? []).length >= 4);
const NAME_END = Math.min(
  ...figureLines.map((l) => l.search(/\d/)).filter((i) => i > 0),
  40,
);
const bulletAts = t4.map((l) => l.indexOf(BULLET)).filter((i) => i > NAME_END);
const FIGURES_END = bulletAts.length ? Math.min(...bulletAts) : 200;

// A sector is delimited by its own figures row, not by blank lines — the
// scheme column runs on past every gap, so no line in the table is ever
// truly blank. A long name wraps once, and the wrap lands on the line
// straight after the figures rather than before them:
//
//   Welfare of SC, ST,
//                        36,185  47,277  38,475  52,047  35%
//   OBC, and Minorities
//
// So the name is whatever has accumulated in the left column since the
// last sector, plus the fragment on the following line when there is one.
// Where the name is short enough to share its line with the figures, the
// next line's left column is empty and nothing is taken from it.
// The layout truncates its own headings at whatever column the name box
// ends, so "Actuals" arrives as "Actua" in one state and "Ac" in another,
// and the footer label wraps so its tail "on all sectors" lands in the
// name column looking like a sector carrying 57 where a sector carries
// crore. Rather than guess at stems, anything that is a prefix of one of
// the table's own headings — or begins with one — is treated as heading.
const HEAD_WORDS = ['sectors', 'sector', 'actuals', 'budgeted', 'revised', 'items', 'item',
  'demand', '% of total', 'expenditure on all', 'on all sectors', 'on all'];
const HEADER = {
  test(t) {
    const v = String(t ?? '').trim().toLowerCase();
    if (!v) return false;
    return HEAD_WORDS.some((w) => w.startsWith(v) || v.startsWith(w));
  },
};
const nameAt = (l) => (l ?? '').slice(0, NAME_END).trim();
const figuresAt = (l) => ((l ?? '').slice(NAME_END, FIGURES_END).match(/-?[\d,]+%?/g) ?? []).map(num);

// A name that breaks off mid-phrase — on a comma, or on "and"/"of"/"&" —
// is still waiting for its next line.
const INCOMPLETE = /(?:,|\band|\bof|&|-)\s*$/i;

const sectors = [];
const consumed = new Set();
let pending = [];
for (let i = 0; i < t4.length; i += 1) {
  if (consumed.has(i)) continue;
  const figures = figuresAt(t4[i]);
  const here = nameAt(t4[i]);
  if (figures.length < 4) {
    // The table's own headings sit in the same column as the sector
    // names. Left in, they joined the first sector's name and the digits
    // in "2023-24 Actuals" then disqualified it — which quietly dropped
    // Andhra's largest head of spending.
    if (here && !HEADER.test(here) && !/\d/.test(here)) pending.push(here);
    continue;
  }
  const parts = [...pending, here];
  // The tail of a wrapped name is not reliably on the next line. Kerala
  // prints the scheme column between the two halves —
  //
  //   Education,
  //                     ▪ Rs 3,149 crore has been …
  //   Sports, Arts,     22,373  24,256  23,597  26,398  12%
  //                     ▪ Rs 644 crore has been …
  //   and Culture
  //
  // — so looking only one line down lost "and Culture" and published a
  // sector called "Education, Sports, Arts,". Looking further down without
  // a stopping rule does the opposite: the smaller states write each
  // sector complete on its own line, and the next non-empty line there is
  // the NEXT sector, which is how Nagaland ended up with "Education,
  // Sports, Arts, and Culture Police" and lost Police's money entirely.
  //
  // So a tail is only sought when the name is visibly unfinished: it began
  // on an earlier line, or it breaks off on a comma or a conjunction. A
  // name that reads as complete takes nothing from below it.
  const joined = (ps) => ps.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  // What separates a tail from the next sector is the blank line. Kerala
  // prints the scheme column between the halves of a name, so the line
  // between them is not empty — it carries a bullet. Uttarakhand ends a
  // sector's block with genuinely empty lines before the next one starts.
  // So the scan steps over a line that still has scheme text on it and
  // stops dead at one with nothing on it at all. Neither test alone was
  // enough: requiring an unfinished-looking name truncated "Health and
  // Family" (its "Welfare" reads as complete), and allowing any wrapped
  // name to look downwards walked Uttarakhand into the next sector.
  let want = pending.length > 0 || INCOMPLETE.test(joined(parts));
  // And no further than two lines. Uttarakhand's scheme column prints on
  // every line between sectors, so "stop at a blank line" never fired
  // there and the scan reached the next sector's name four lines down —
  // which put Social Welfare's money under a label reading "and Nutrition
  // Health and". A real tail sits directly under its figures, one line
  // down, or two when the scheme column takes the line between.
  for (let j = i + 1; want && j < t4.length && j <= i + 2; j += 1) {
    if (figuresAt(t4[j]).length >= 4) break;
    const tail = nameAt(t4[j]);
    if (!tail) {
      if (!t4[j].trim()) break;
      continue;
    }
    if (HEADER.test(tail) || /\d/.test(tail)) break;
    parts.push(tail);
    consumed.add(j);
    want = INCOMPLETE.test(joined(parts));
  }
  pending = [];

  const name = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  if (!name || /\d/.test(name) || HEADER.test(name)) continue;
  // All four columns, not two. The table gives what was actually spent
  // two years ago, what was budgeted last year, what last year's figure
  // was revised to, and what is budgeted now — which is the difference
  // between a number and a direction of travel.
  sectors.push({
    name,
    actuals: figures[0],
    budgetedPrev: figures[1],
    revisedPrev: figures[2],
    budgeted: figures[3],
    changePct: figures[4] ?? null,
  });
}

// The scheme column, read down the page. It is found by its bullet rather
// than by a column number: where a sector's name is short enough to share
// its line with the figures, the bullet starts earlier than usual and a
// fixed column cut it in half, so four separate schemes arrived joined
// into one sentence.
const provisions = [];
for (const line of t4) {
  const at = line.indexOf(BULLET);
  if (at >= 0) {
    const text = line.slice(at + 1).trim();
    if (text && !/budget provisions/i.test(text)) provisions.push(text);
  } else {
    const tail = line.slice(FIGURES_END).trim();
    if (tail && provisions.length && !/budget provisions/i.test(tail)) {
      provisions[provisions.length - 1] += ` ${tail}`;
    }
  }
}
const namedAllocations = provisions
  .map((p) => p.replace(/\s+/g, ' ').trim())
  .filter((p) => /^Rs [\d,]+ crore/.test(p))
  .map((p) => ({
    amount: num(p.match(/^Rs ([\d,]+) crore/)[1]),
    text: p.replace(/^Rs [\d,]+ crore (allocated )?(towards |for )?/, '').replace(/\.$/, '').trim(),
  }));

// ---- Table 5: where the money comes from -------------------------------
const t5 = table(/break-?up of the state/i);
// The grants row is "Grants-in-aid from Centre" in one year and "Grants
// from Centre" in another, so each source is found by the shortest form
// that identifies it and keeps whichever wording the document used.
//
// Non-debt capital receipts belong here too. The four revenue rows sum to
// Revenue Receipts, not to Net Receipts, and the difference is whatever the
// state raises by selling assets or recovering loans. For Andhra that is
// Rs 26 crore and the check passed on its 5% tolerance; for Gujarat it is
// Rs 22,000 crore of disinvestment — 8% of the state's money, which the
// page would have shown as coming from nowhere. Carried, so the sources
// add up to the "money it has" side of the bar.
const RECEIPT_ROWS = ["State's Own Tax", "State's Own Non-Tax", 'Share in Central Taxes', 'Grants',
  'Non-debt Capital Receipts'];
const receipts = RECEIPT_ROWS.map((label) => {
  const line = t5.find((l) => l.trim().toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return null;
  const name = line.trim().split(/\s{2,}/)[0].trim();
  return { name, budgeted: (row(t5, label) ?? [])[4] ?? null };
}).filter((r) => r && r.budgeted != null);

// ---- Refuse to write something that does not add up --------------------
const problems = [];
const OPTIONAL_HEADLINE = new Set(['gsdp']);
for (const [k, v] of Object.entries(headline)) {
  if (v == null && !OPTIONAL_HEADLINE.has(k)) problems.push(`headline.${k} missing`);
}
if (sectors.length < 6) problems.push(`only ${sectors.length} sectors parsed`);
if (headline.fiscalDeficit != null && headline.fiscalDeficit < 0) {
  problems.push(`fiscal deficit is negative (${headline.fiscalDeficit}) — a budgeted surplus, `
    + 'which the "money it has / borrowed" bar cannot show');
}
if (headline.revenueBalance && headline.revenueBalance.amount == null) {
  problems.push('headline.revenueBalance has no figure');
}
for (const s of sectors) {
  if (s.budgeted == null) problems.push(`${s.name} has no ${YEAR} figure`);
  if (s.name.split(' ').length > 8) problems.push(`"${s.name}" reads like two sectors run together`);
  if (HEADER.test(s.name)) problems.push(`"${s.name}" starts with one of the table's own headings`);
}
if (new Set(sectors.map((s) => s.name)).size !== sectors.length) problems.push('a sector name repeats');
const sectorSum = sectors.reduce((a, s) => a + (s.budgeted ?? 0), 0);
const share = sectorSum / headline.netExpenditure;
// PRS says these sectors are around two-thirds of expenditure on sectors.
// Far outside that and something has been read from the wrong column.
if (!(share > 0.4 && share < 0.95)) {
  problems.push(`sectors sum to ${Math.round(share * 100)}% of net expenditure — expected 40-95%`);
}
if (fiscal.fiscalDeficit?.budgeted != null && headline.gsdp != null) {
  const implied = (headline.fiscalDeficit / headline.gsdp) * 100;
  if (Math.abs(implied - fiscal.fiscalDeficit.budgeted) > 0.3) {
    problems.push(`fiscal deficit is ${fiscal.fiscalDeficit.budgeted}% of GSDP in the table but `
      + `${implied.toFixed(1)}% by its own figures`);
  }
}
// What it spends is what it has plus what it borrows — but only where the
// document defines the deficit that way. The label prints its own formula
// and three appear across the states: "(E-R)" and Delhi's "(R-E)" are the
// identity, while Chhattisgarh's "(E-R-F)" subtracts a third term and does
// not balance against two. Tamil Nadu's does not balance either, for the
// reason its own footnote gives — borrowings there include the back-to-back
// GST compensation loan, which the deficit excludes. Checked where it is
// meant to hold, skipped where the document says it will not.
const identityHolds = ['E-R', 'R-E'].includes(
  (fiscalLine.match(/\(([ERF\s+-]+)\)/i)?.[1] ?? '').replace(/\s/g, '').toUpperCase(),
) && !/back-to-back loan in lieu of GST compensation/i.test(prose);
if (identityHolds && headline.netReceipts != null && headline.fiscalDeficit != null) {
  const gap = Math.abs(headline.netReceipts + headline.fiscalDeficit - headline.netExpenditure);
  if (gap / headline.netExpenditure > 0.01) {
    problems.push(`net receipts ${headline.netReceipts} + fiscal deficit ${headline.fiscalDeficit} `
      + `= ${headline.netReceipts + headline.fiscalDeficit}, but net expenditure is `
      + `${headline.netExpenditure}`);
  }
}

const receiptSum = receipts.reduce((a, r) => a + r.budgeted, 0);
if (Math.abs(receiptSum - headline.netReceipts) / headline.netReceipts > 0.05) {
  problems.push(`receipts sum to ${receiptSum} against net receipts ${headline.netReceipts}`);
}
if (problems.length) {
  console.error(`${SLUG}: refusing to write —`);
  problems.forEach((p) => console.error(`  ${p}`));
  process.exit(1);
}

const out = {
  year: YEAR,
  unit: 'rupees crore',
  headline,
  fiscal,
  overYears,
  // The three years the table carries, oldest first, each labelled with
  // what kind of figure it is — spent, revised, or budgeted. They are not
  // the same kind of number and the page must not draw them as if they
  // were.
  years: YEAR_LABELS,
  sectors,
  namedAllocations,
  receipts,
  source: {
    name: 'PRS Legislative Research',
    analysis: page,
    pdf,
    note: 'PRS compiles these from the state\'s own Annual Financial Statement and budget documents.',
    retrieved: new Date().toISOString().slice(0, 10),
  },
};
// One file per year, so a reader can go back through them and a parser
// fix to one year never touches another.
const dir = `content/states/${SLUG}/budget`;
mkdirSync(dir, { recursive: true });
const dest = `${dir}/${YEAR}.json`;
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`✔ ${SLUG} ${YEAR}: ${sectors.length} sectors, `
  + `₹${headline.netExpenditure.toLocaleString('en-IN')} crore net expenditure, `
  + `${namedAllocations.length} named allocations → ${dest}`);
