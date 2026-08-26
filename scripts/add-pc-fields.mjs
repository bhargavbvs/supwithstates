#!/usr/bin/env node
// Adds the parliamentary seat to each of Andhra's constituencies.
//
//   node scripts/add-pc-fields.mjs
//
// Andhra's map was built from a source that carries the assembly seat and
// nothing above it, so there was no way to get from an MLA to an MP.
// The national set has PC_NO and PC_NAME on every constituency, and its
// Andhra side is the same 175 seats offset by the 119 Telangana kept at
// the 2014 bifurcation — checked here against the committed records, all
// 174 of them, rather than taken on trust.
//
// Geometry is not touched: this patches properties onto the file that is
// already committed, so nothing re-simplifies and nothing moves.
import { readFileSync, writeFileSync } from 'node:fs';

const AC_OFFSET = 119;   // undivided Andhra numbered Telangana's seats first
const PC_OFFSET = 17;    // and its parliamentary seats likewise

const target = 'content/states/andhra/geo/constituencies.geojson';
const fc = JSON.parse(readFileSync(target, 'utf8'));
const national = JSON.parse(readFileSync('.geo-src/national-ac.geojson', 'utf8'));

const byNumber = new Map();
for (const f of national.features) {
  const p = f.properties;
  if (p.ST_NAME !== 'ANDHRA PRADESH' || Number(p.AC_NO) <= AC_OFFSET) continue;
  byNumber.set(Number(p.AC_NO) - AC_OFFSET, {
    pcNumber: Number(p.PC_NO) - PC_OFFSET,
    pcName: p.PC_NAME,
    name: p.AC_NAME,
  });
}

const key = (s) => String(s ?? '').toUpperCase()
  .replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/g, ' ').replace(/[^A-Z]/g, '');

let matched = 0;
const mismatched = [];
for (const f of fc.features) {
  const hit = byNumber.get(Number(f.properties.AC_NO));
  if (!hit) { mismatched.push(`${f.properties.AC_NO} ${f.properties.AC_NAME} — not in the national set`); continue; }
  // The number is the join; the name is the check on it. A silent
  // off-by-one here would file every constituency under its neighbour's
  // member of parliament.
  if (key(hit.name) !== key(f.properties.AC_NAME)) {
    mismatched.push(`${f.properties.AC_NO} ${f.properties.AC_NAME} ≠ ${hit.name}`);
    continue;
  }
  f.properties.PC_NO = hit.pcNumber;
  f.properties.PC_NAME = hit.pcName;
  matched += 1;
}

if (mismatched.length) {
  console.error(`refusing to write: ${mismatched.length} constituencies did not line up`);
  mismatched.slice(0, 8).forEach((m) => console.error(`  ${m}`));
  process.exit(1);
}

writeFileSync(target, JSON.stringify(fc));
const pcs = new Set(fc.features.map((f) => f.properties.PC_NO));
console.log(`andhra: parliamentary seat added to ${matched} constituencies, ${pcs.size} seats`);
