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
  return { page, pdf: hit[1].startsWith('http') ? hit[1] : `https://prsindia.org${hit[1]}` };
}

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
const headline = {
  totalExpenditure: pick('Total Expenditure', 4),
  netExpenditure: pick('Net Expenditure', 4),
  totalReceipts: pick('Total Receipts', 4),
  netReceipts: pick('Net Receipts', 4),
  borrowings: pick('(-) Borrowings', 4),
  fiscalDeficit: pick('Fiscal Deficit', 4),
  revenueDeficit: pick('Revenue Deficit', 4),
  gsdp: pick('GSDP', 4),
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
const NAME_END = 28;
const FIGURES_END = 90;
const t4 = table('Table 4:');

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
  sectors.push({ name, actuals: figures[0], budgeted: figures[3], changePct: figures[4] ?? null });
}

// The scheme column, read down the page. It is found by its bullet rather
// than by a column number: where a sector's name is short enough to share
// its line with the figures, the bullet starts earlier than usual and a
// fixed column cut it in half, so four separate schemes arrived joined
// into one sentence.
const BULLET = '\u25AA';
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
const receipts = [
  ["State's Own Tax", "State's Own Tax"],
  ["State's Own Non-Tax", "State's Own Non-Tax"],
  ['Share in Central Taxes', 'Share in Central Taxes'],
  ['Grants-in-aid from Centre', 'Grants-in-aid from Centre'],
].map(([label, name]) => ({ name, budgeted: (row(t5, label) ?? [])[4] ?? null }))
  .filter((r) => r.budgeted != null);

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
const dest = `content/states/${SLUG}/budget.json`;
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`✔ ${SLUG} ${YEAR}: ${sectors.length} sectors, `
  + `₹${headline.netExpenditure.toLocaleString('en-IN')} crore net expenditure, `
  + `${namedAllocations.length} named allocations → ${dest}`);
