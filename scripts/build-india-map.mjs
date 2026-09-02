#!/usr/bin/env node
// The national map: every parliamentary constituency in one picture.
//
//   node scripts/build-india-map.mjs
//
// A parliamentary constituency IS a group of assembly constituencies, and
// every state's assembly geometry already carries the PC each seat belongs
// to. So the country's 500-odd PC boundaries are not fetched from anywhere
// — they are the state maps already here, dissolved along the lines the
// source files already draw. Nothing new is downloaded and nothing is
// traced by hand.
//
// The states are dissolved separately and merged before simplifying, so
// that mapshaper builds one topology over the whole country: a border
// simplified twice from two files drifts apart and leaves a hairline gap
// between neighbours.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { buildable, stateConfig } from './lib/states.mjs';
import { projectIndia } from './lib/project-india.mjs';

const mapshaper = (args) => execFileSync('npx', ['-y', 'mapshaper', ...args], { stdio: 'pipe' });
const TMP = '.india-build';
// Written into content/, like every state's geometry, and projected at
// build time. public/geo is generated and never committed, so a map only
// living there would 404 on the next deploy.
const OUT = 'content/india';
const BUDGET = 320_000; // bytes gzipped — what a reader actually downloads

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

// ---- 1. Dissolve each state's assembly seats into its parliamentary ones
const pcParts = [];
const stParts = [];
const skipped = [];
for (const slug of buildable()) {
  const src = `content/states/${slug}/geo/constituencies.geojson`;
  if (!existsSync(src)) { skipped.push([slug, 'no geometry']); continue; }
  const fc = JSON.parse(readFileSync(src, 'utf8'));
  const withPc = fc.features.filter((f) => f.properties?.PC_NO !== undefined
    && f.properties.PC_NO !== null && String(f.properties.PC_NO) !== '');
  if (!withPc.length) { skipped.push([slug, 'assembly seats carry no PC number']); continue; }

  const tagged = {
    type: 'FeatureCollection',
    features: withPc.map((f) => ({
      ...f,
      properties: {
        state: slug,
        state_name: stateConfig(slug).name,
        pc_no: Number(f.properties.PC_NO),
        pc_name: f.properties.PC_NAME ?? '',
      },
    })),
  };
  const inFile = `${TMP}/${slug}.json`;
  writeFileSync(inFile, JSON.stringify(tagged));

  // copy-fields keeps the name and state alongside the key being dissolved on
  mapshaper([inFile, '-dissolve', 'pc_no,state',
    'copy-fields=state_name,pc_name', '-o', `${TMP}/${slug}-pc.json`]);
  mapshaper([inFile, '-dissolve', 'state',
    'copy-fields=state_name', '-o', `${TMP}/${slug}-outline.json`]);

  pcParts.push(...JSON.parse(readFileSync(`${TMP}/${slug}-pc.json`, 'utf8')).features);
  stParts.push(...JSON.parse(readFileSync(`${TMP}/${slug}-outline.json`, 'utf8')).features);
}

// A PC has to be identifiable in one number on a national map, because two
// states both have a seat numbered 1. Sorted first so the id is stable
// between builds — it is what the map and the records agree on.
pcParts.sort((a, b) => (a.properties.state < b.properties.state ? -1
  : a.properties.state > b.properties.state ? 1
    : a.properties.pc_no - b.properties.pc_no));
pcParts.forEach((f, i) => { f.properties.id = i + 1; });

writeFileSync(`${TMP}/pc-all.json`, JSON.stringify({ type: 'FeatureCollection', features: pcParts }));
writeFileSync(`${TMP}/st-all.json`, JSON.stringify({ type: 'FeatureCollection', features: stParts }));

// ---- 2. Simplify until it fits what a reader should have to download
// Highest fidelity first: the budget is what a reader downloads, so the
// question is how much detail fits inside it, not how little will do.
const STEPS = ['100%', '85%', '70%', '55%', '40%', '28%', '20%', '14%', '10%', '6%', '3%'];
let chosen = null;
for (const pct of STEPS) {
  mapshaper([`${TMP}/pc-all.json`, '-simplify', pct, 'keep-shapes', '-clean',
    '-o', `${TMP}/pc-s.json`]);
  mapshaper([`${TMP}/st-all.json`, '-simplify', pct, 'keep-shapes', '-clean',
    '-o', `${TMP}/st-s.json`]);
  const pc = JSON.parse(readFileSync(`${TMP}/pc-s.json`, 'utf8'));
  const st = JSON.parse(readFileSync(`${TMP}/st-s.json`, 'utf8'));

  const projected = projectIndia(pc, st);
  const bytes = gzipSync(Buffer.from(JSON.stringify(projected))).length;
  console.log(`  ${pct.padStart(5)} -> ${(bytes / 1024).toFixed(0)} KB gzipped`);
  if (bytes <= BUDGET) { chosen = { pct, pc, st, projected, bytes }; break; }
}
if (!chosen) throw new Error(`even ${STEPS[STEPS.length - 1]} did not fit ${BUDGET} bytes`);

mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/pc.geojson`, JSON.stringify(chosen.pc));
writeFileSync(`${OUT}/state-outlines.geojson`, JSON.stringify(chosen.st));
rmSync(TMP, { recursive: true, force: true });
console.log(`\n✔ ${OUT}/: ${chosen.projected.constituencies.length} constituencies, `
  + `${chosen.projected.districts.length} state outlines, simplified to ${chosen.pct}, `
  + `${(chosen.bytes / 1024).toFixed(0)} KB gzipped once projected`);
for (const [slug, why] of skipped) console.log(`  — ${slug} left out: ${why}`);
