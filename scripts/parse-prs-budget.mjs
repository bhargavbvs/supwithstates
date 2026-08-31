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
  // 2022-23.pdf" — which fetch will not send unencoded.
  return { page, pdf: href.replace(/ /g, '%20') };
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
function table(caption) {
  const start = lines.findIndex((l) => l.trim().startsWith(caption));
  if (start < 0) throw new Error(`${SLUG}: "${caption}" not in the PDF`);
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
  return (line.slice(at + label.length).match(/-?[\d,]+\.?\d*%?/g) ?? []).map(num);
}

// ---- Table 1: what the state takes in and what it spends ---------------
const t1 = table('Table 1:');
const pick = (label, i) => (row(t1, label) ?? [])[i] ?? null;
const series = (label) => {
  const r = row(t1, label) ?? [];
  return { actuals: r[0] ?? null, budgetedPrev: r[1] ?? null, revisedPrev: r[2] ?? null, budgeted: r[4] ?? null };
};
const headline = {
  totalExpenditure: pick('Total Expenditure', 4),
  netExpenditure: pick('Net Expenditure', 4),
  totalReceipts: pick('Total Receipts', 4),
  netReceipts: pick('Net Receipts', 4),
  borrowings: pick('(-) Borrowings', 4),
  fiscalDeficit: pick('Fiscal Deficit', 4),
  revenueDeficit: pick('Revenue Deficit', 4),
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
  const figures = (next.match(/[\d.]+%/g) ?? []).map((v) => Number(v.replace('%', '')));
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

const fiscal = {
  fiscalDeficit: pctUnder('Fiscal Deficit'),
  revenueDeficit: pctUnder('Revenue Deficit'),
  outstandingDebtPctGsdp: Number.isFinite(outstandingDebtPctGsdp) ? outstandingDebtPctGsdp : null,
  fiscalDeficitCeilingPctGsdp: Number.isFinite(fiscalDeficitCeilingPctGsdp)
    ? fiscalDeficitCeilingPctGsdp : null,
};

// The same three lines across the years the table covers, so the page can
// show a direction and not only a destination.
const overYears = {
  netExpenditure: series('Net Expenditure'),
  netReceipts: series('Net Receipts'),
  fiscalDeficit: series('Fiscal Deficit'),
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
const t4 = table('Table 4:');

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
// The layout truncates its own headings — "Actuals" arrives as "Actua" —
// so these match on the stem rather than the whole word.
const HEADER = /^(sector|actua|budget|% of total|expenditure on all|items?$)/i;
const nameAt = (l) => (l ?? '').slice(0, NAME_END).trim();
const figuresAt = (l) => ((l ?? '').slice(NAME_END, FIGURES_END).match(/-?[\d,]+%?/g) ?? []).map(num);

const sectors = [];
let pending = [];
for (let i = 0; i < t4.length; i += 1) {
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
  const next = nameAt(t4[i + 1]);
  if (next && !HEADER.test(next)) { parts.push(next); i += 1; }
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
const t5 = table('Table 5:');
// The grants row is "Grants-in-aid from Centre" in one year and "Grants
// from Centre" in another, so each source is found by the shortest form
// that identifies it and keeps whichever wording the document used.
const RECEIPT_ROWS = ["State's Own Tax", "State's Own Non-Tax", 'Share in Central Taxes', 'Grants'];
const receipts = RECEIPT_ROWS.map((label) => {
  const line = t5.find((l) => l.trim().toLowerCase().startsWith(label.toLowerCase()));
  if (!line) return null;
  const name = line.trim().split(/\s{2,}/)[0].trim();
  return { name, budgeted: (row(t5, label) ?? [])[4] ?? null };
}).filter((r) => r && r.budgeted != null);

// ---- Refuse to write something that does not add up --------------------
const problems = [];
for (const [k, v] of Object.entries(headline)) if (v == null) problems.push(`headline.${k} missing`);
if (sectors.length < 6) problems.push(`only ${sectors.length} sectors parsed`);
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
if (fiscal.fiscalDeficit?.budgeted != null) {
  const implied = (headline.fiscalDeficit / headline.gsdp) * 100;
  if (Math.abs(implied - fiscal.fiscalDeficit.budgeted) > 0.3) {
    problems.push(`fiscal deficit is ${fiscal.fiscalDeficit.budgeted}% of GSDP in the table but `
      + `${implied.toFixed(1)}% by its own figures`);
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
