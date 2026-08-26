#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { assertBudget } from './lib/budget.mjs';

const STATE = process.env.STATE ?? 'andhra';
const OUT = new URL(`../content/states/${STATE}/geo/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const mapshaper = (args) => execFileSync('npx', ['-y', 'mapshaper', ...args], { stdio: 'inherit' });

// Telangana's assembly boundaries are not in a file of their own here.
// They are inside the national set, still filed under ANDHRA PRADESH,
// because that set predates the 2014 bifurcation: undivided Andhra's
// constituencies are numbered 1-294, and the first 119 are exactly the
// ones Telangana kept, in the order it still numbers them — 1 Sirpur,
// 2 Chennur, ... 119 Bhadrachalam. Checked against the current list
// before this was written, not assumed from the numbering.
//
// It also carries PC_NO/PC_NAME on every constituency, which is the
// parliamentary seat each one sits in — the link a reader needs to go
// from their MLA to their MP, and one nothing else here holds.
if (STATE === 'telangana') {
  mapshaper([
    '.geo-src/india-districts.geojson',
    '-filter', 'state === "TELANGANA"',
    '-filter-fields', 'district',
    '-simplify', '6%', 'keep-shapes',
    '-o', 'format=geojson', 'precision=0.0001', `${OUT}districts.geojson`,
  ]);

  mapshaper([
    '-i', '.geo-src/india-districts.geojson', '.geo-src/national-ac.geojson', 'combine-files',
    '-rename-layers', 'districts,ac',
    '-filter', 'target=districts', 'state=="TELANGANA"',
    '-filter', 'target=ac', 'ST_NAME=="ANDHRA PRADESH" && +AC_NO >= 1 && +AC_NO <= 119',
    // The district labels in the AC set are the ten of undivided Andhra;
    // Telangana has thirty-three now. Each constituency is placed by
    // where it actually is, exactly as the Andhra build does it.
    '-join', 'target=ac', 'source=districts', 'point-method', 'fields=district',
    '-filter-fields', 'target=ac', 'fields=AC_NO,AC_NAME,district,PC_NO,PC_NAME',
    '-simplify', 'target=ac', '5%', 'keep-shapes',
    '-o', 'target=ac', 'format=geojson', 'precision=0.0001', `${OUT}constituencies.geojson`,
  ]);

  // Bhadrachalam is the one constituency the point method cannot place.
  // Its interior point falls outside Telangana: the 2014 reorganisation
  // moved most of the Bhadrachalam revenue division to Andhra Pradesh and
  // left the town itself as a near-enclave, so the polygon's centre sits
  // in Andhra. It is in Bhadradri Kothagudem — the district named after
  // it — and saying so here is a correction with a reason, not a guess.
  const acPath = `${OUT}constituencies.geojson`;
  const fc = JSON.parse(readFileSync(acPath, 'utf8'));
  const orphans = fc.features.filter((f) => !f.properties.district);
  const PLACED = { 'Bhadrachalam (ST)': 'BHADRADRI KOTHAGUDEM' };
  for (const f of orphans) {
    const known = PLACED[f.properties.AC_NAME];
    if (!known) throw new Error(`no district for ${f.properties.AC_NO} ${f.properties.AC_NAME}`);
    f.properties.district = known;
  }
  if (orphans.length) {
    writeFileSync(acPath, JSON.stringify(fc));
    console.log(`placed by hand: ${orphans.map((f) => f.properties.AC_NAME).join(', ')}`);
  }

  console.log('districts.geojson     ', assertBudget(`${OUT}districts.geojson`, 200 * 1024), 'bytes');
  console.log('constituencies.geojson', assertBudget(`${OUT}constituencies.geojson`, 500 * 1024), 'bytes');
  process.exit(0);
}

// Source data (see .geo-src/, gitignored):
//   .geo-src/india-districts.geojson  — datta07/INDIAN-SHAPEFILES, post-2022 26-district AP boundaries.
//     Real property names: `state` (e.g. "ANDHRA PRADESH"), `district` (e.g. "GUNTUR").
//   .geo-src/ap-ac.geojson             — HindustanTimesLabs/shapefiles state_ut/andhrapradesh/assembly
//     (the brief's primary state/ac/andhra-pradesh_assembly.geojson URL 404s; this is the working
//     equivalent from the same repo). Real property names: `AC_NO`, `AC_NAME`, `DIST_NAME` (stale,
//     pre-2022 13-district labels — NOT used directly, see join below). 177 raw features, 2 of which
//     are junk placeholder records with AC_NO === "0" (empty AC_NAME, visibility: "0") — filtered out
//     to reach the correct 175.

// Districts: filter to the state, keep only name, simplify hard.
mapshaper([
  '.geo-src/india-districts.geojson',
  '-filter', 'state === "ANDHRA PRADESH"',
  '-filter-fields', 'district',
  '-simplify', '6%', 'keep-shapes',
  '-o', 'format=geojson', 'precision=0.0001', `${OUT}districts.geojson`
]);

// Constituencies: the AC source's own DIST_NAME field predates the 2022 district reorganisation
// (13 old districts vs the current 26), so instead of trusting it we spatially join each AC polygon
// against the current district polygons (point-method: match each AC's interior point to the
// district polygon containing it) and keep that as `district`. Also drops the 2 junk AC_NO="0" rows.
mapshaper([
  '-i', '.geo-src/india-districts.geojson', '.geo-src/ap-ac.geojson', 'combine-files',
  '-rename-layers', 'districts,ac',
  '-filter', 'target=districts', 'state=="ANDHRA PRADESH"',
  '-filter', 'target=ac', 'AC_NO!="0"',
  '-join', 'target=ac', 'source=districts', 'point-method', 'fields=district',
  '-filter-fields', 'target=ac', 'fields=AC_NO,AC_NAME,district',
  '-simplify', 'target=ac', '5%', 'keep-shapes',
  '-o', 'target=ac', 'format=geojson', 'precision=0.0001', `${OUT}constituencies.geojson`
]);

console.log('districts.geojson     ', assertBudget(`${OUT}districts.geojson`, 150 * 1024), 'bytes');
console.log('constituencies.geojson', assertBudget(`${OUT}constituencies.geojson`, 500 * 1024), 'bytes');
