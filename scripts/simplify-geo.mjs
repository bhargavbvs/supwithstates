#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { assertBudget } from './lib/budget.mjs';

const STATE = process.env.STATE ?? 'andhra';
const OUT = new URL(`../content/states/${STATE}/geo/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const mapshaper = (args) => execFileSync('npx', ['-y', 'mapshaper', ...args], { stdio: 'inherit' });

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
