#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { computeStats } from './lib/compute-stats.mjs';
import { assertBudget } from './lib/budget.mjs';
import { projectGeo } from './lib/project-geo.mjs';

const STATE = process.env.STATE ?? 'andhra';
const stateDir = new URL(`../content/states/${STATE}/`, import.meta.url).pathname;
const publicDir = new URL('../public/', import.meta.url).pathname;
mkdirSync(publicDir, { recursive: true });

const state = JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf8'));

const repDir = join(stateDir, 'representatives');
const constituencies = existsSync(repDir)
  ? readdirSync(repDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(repDir, f), 'utf8')))
      .sort((a, b) => a.constituency.number - b.constituency.number)
  : [];

const out = join(publicDir, 'data.json');
writeFileSync(out, JSON.stringify({
  state,
  stats: computeStats(constituencies),
  constituencies
}));

cpSync(join(stateDir, 'geo'), join(publicDir, 'geo'), { recursive: true });

const constituenciesFc = JSON.parse(readFileSync(join(stateDir, 'geo', 'constituencies.geojson'), 'utf8'));
const districtsFc = JSON.parse(readFileSync(join(stateDir, 'geo', 'districts.geojson'), 'utf8'));
const mapOut = join(publicDir, 'geo', 'ap-map.json');
writeFileSync(mapOut, JSON.stringify(projectGeo(constituenciesFc, districtsFc)));

console.log(`✔ data.json: ${constituencies.length} constituencies, ${assertBudget(out, 300 * 1024)} bytes`);
console.log(`✔ ap-map.json: ${assertBudget(mapOut, 400 * 1024)} bytes`);
