#!/usr/bin/env node
// WORK IN PROGRESS — extraction is proven, the site wiring is not written yet.
//
// Groundwater, from the Central Ground Water Board's National Compilation on
// Dynamic Ground Water Resources of India.
//
// CGWB assesses every block, mandal and taluk in the country and gives each
// one a one-word verdict: Safe, Semi-critical, Critical, Over-exploited or
// Saline. Annexure III(B) prints those verdicts counted up by district,
// which is the level this site already has boundaries for — so nothing new
// has to be drawn to show it.
//
// Two things about the table decide how it has to be read:
//
//   Blank cells. A district with no critical blocks prints nothing in that
//   column, so the numbers on the line do not say which category they
//   belong to. Bhadrak reads "7 6 85.71 ... 1 1", and taking the numbers in
//   order scores that 1 as Semi-critical when the column it sits under says
//   Saline. Each figure is assigned to the column whose heading it sits
//   nearest instead.
//
//   Headings. The trailing "%" is dropped where the layout ran out of
//   width, so the number of heading tokens is never assumed — only their
//   order along the line.
import { readFileSync } from 'node:fs';
const lines = readFileSync('.gw-src/gw.txt','utf8').split('\n');
const seg = lines.slice(7025, 8282);
const CATS = ['safe','semiCritical','critical','overExploited','saline'];
const nums = (l, off=0) => [...l.matchAll(/\d[\d,]*\.?\d*/g)]
  .map(m => ({ v: Number(m[0].replace(/,/g,'')), c: off + m.index + m[0].length/2 }));

function columnsOf(rows, hi) {
  const h = rows[hi];
  // Take "No." and "%" in the order they appear. A category begins at each
  // "No."; the "%" after it belongs to that category. The last category's
  // "%" is sometimes missing where the layout ran out of width, so the
  // count of tokens is never assumed — only their order.
  const toks = [
    ...[...h.matchAll(/No\./g)].map(m => ({ t:'no', c:m.index + 1.5 })),
    ...[...h.matchAll(/%/g)].map(m => ({ t:'pct', c:m.index + 0.5 })),
  ].sort((a,b) => a.c - b.c);
  let unitsAt = null;
  for (let k = Math.max(0, hi-4); k <= hi+2 && k < rows.length; k++) {
    const at = rows[k].indexOf('Units');
    if (at >= 0) { unitsAt = at + 2.5; break; }
  }
  if (unitsAt == null) return null;
  const cols = [{ k:'units', c:unitsAt }];
  let i = -1;
  for (const t of toks) {
    if (t.t === 'no') { i += 1; if (i > 4) break; cols.push({ k:CATS[i], c:t.c }); }
    else if (i >= 0) cols.push({ k:CATS[i]+'_pct', c:t.c });
  }
  return cols.filter(c => c.k) .length >= 6 ? cols : null;
}

function parseBlock(rows) {
  const hi = rows.findIndex(l => (l.match(/No\./g)||[]).length >= 4);
  if (hi < 0) return null;
  const cols = columnsOf(rows, hi);
  if (!cols) return null;
  const out = [];
  for (const l of rows.slice(hi+1)) {
    const m = l.match(/^\s*(\d+)\s+([A-Za-z][^\d]{1,40}?)\s{2,}/);
    if (!m) continue;
    const name = m[2].trim();
    if (/^total/i.test(name)) continue;
    const off = l.indexOf(m[2]) + m[2].length;
    const rec = { name };
    for (const n of nums(l.slice(off), off)) {
      const best = cols.reduce((a,b)=> Math.abs(b.c-n.c) < Math.abs(a.c-n.c) ? b : a);
      if (rec[best.k] === undefined) rec[best.k] = n.v;
    }
    out.push(rec);
  }
  return out;
}

// A state heading is matched against a list of the names that exist, not
// against a shape. Assam prints its own name as "Assam" while its
// neighbours shout theirs, and an all-capitals rule silently filed 27
// Assam districts under Arunachal Pradesh — rows under the wrong state,
// which no later check would have questioned.
const STATE_NAMES = new Set(['ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHHATISGARH',
  'CHHATTISGARH','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JHARKHAND','KARNATAKA','KERALA',
  'MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','ORISSA',
  'PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND',
  'WEST BENGAL','DELHI','PUDUCHERRY','PONDICHERRY','JAMMU & KASHMIR','LADAKH','CHANDIGARH',
  'ANDAMAN & NICOBAR ISLANDS','DADRA & NAGAR HAVELI','DAMAN & DIU','LAKSHADWEEP']);
const blocks=[]; let cur=null;
for (const l of seg) {
  const t = l.trim().toUpperCase();
  if (STATE_NAMES.has(t)) { cur={state:l.trim().toUpperCase(),rows:[]}; blocks.push(cur); }
  else if (cur) cur.rows.push(l);
}
const byState = new Map();
for (const b of blocks) {
  const r = parseBlock(b.rows);
  if (!r || !r.length) continue;
  if (!byState.has(b.state)) byState.set(b.state, []);
  byState.get(b.state).push(...r);
}
import { readdirSync, existsSync } from 'node:fs';
const norm = (s) => String(s).toUpperCase()
  .replace(/[^A-Z]/g,'')
  .replace(/^DR/,'').replace(/NELLORE$|VALLEY$/,'');
const CGWB_TO_SLUG = { 'ANDHRA PRADESH':'andhra', 'CHHATISGARH':'chhattisgarh',
  'ORISSA':'odisha', 'PONDICHERRY':'puducherry', 'JAMMU & KASHMIR':'jammu-kashmir',
  'DELHI':'delhi', 'UTTARAKHAND':'uttarakhand' };
const slugOf = (st) => CGWB_TO_SLUG[st] ?? st.toLowerCase().replace(/ & /g,'-').replace(/\s+/g,'-');
let tot=0, matched=0; const misses=[];
for (const [st, ds] of byState) {
  const slug = slugOf(st);
  const gj = `content/states/${slug}/geo/districts.geojson`;
  if (!existsSync(gj)) continue;
  const site = JSON.parse(readFileSync(gj,'utf8')).features
    .map(f => f.properties.DISTRICT ?? f.properties.district).filter(Boolean);
  const idx = new Map(site.map(n => [norm(n), n]));
  for (const d of ds) {
    tot++;
    const hit = idx.get(norm(d.name))
      ?? site.find(n => norm(n).startsWith(norm(d.name)) || norm(d.name).startsWith(norm(n)));
    if (hit) matched++; else misses.push(`${slug}/${d.name}`);
  }
}
console.log('states parsed:', byState.size);
console.log(`districts in states we map: ${tot} | matched to site geometry: ${matched} | unmatched: ${misses.length}`);
misses.slice(0,25).forEach(m=>console.log('   miss:', m));
