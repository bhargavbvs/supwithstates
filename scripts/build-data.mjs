#!/usr/bin/env node
// One bundle per state, plus the index the switcher reads.
//
// This built a single data.json for whichever state STATE happened to
// name, and the app fetched it from a fixed path — which is why there was
// only ever one state. Every state under content/states/ is built now,
// and the app asks for the one it is showing.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { computeStats } from './lib/compute-stats.mjs';
import { assertBudget } from './lib/budget.mjs';
import { projectGeo } from './lib/project-geo.mjs';

const contentDir = new URL('../content/states/', import.meta.url).pathname;
const sharedPagesDir = new URL('../content/pages/', import.meta.url).pathname;
const publicDir = new URL('../public/', import.meta.url).pathname;
const dataDir = join(publicDir, 'data');
const geoDir = join(publicDir, 'geo');
mkdirSync(dataDir, { recursive: true });
mkdirSync(geoDir, { recursive: true });

const readAll = (dir) => (existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')))
  : []);

const only = process.env.STATE;
const slugs = readdirSync(contentDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(contentDir, d.name, 'state.json')))
  .map((d) => d.name)
  .filter((slug) => !only || slug === only)
  .sort();

const index = [];

for (const slug of slugs) {
  const stateDir = join(contentDir, slug);
  const state = JSON.parse(readFileSync(join(stateDir, 'state.json'), 'utf8'));

  const constituencies = readAll(join(stateDir, 'representatives'))
    .sort((a, b) => a.constituency.number - b.constituency.number);
  // The members of parliament for the same ground. A constituency knows
  // which parliamentary seat it sits in — the map carries that — so a
  // reader who has found their MLA is one line away from their MP.
  const mps = readAll(join(stateDir, 'mps'))
    .sort((a, b) => a.constituency.number - b.constituency.number);

  // A state with no records yet is a state the switcher must not offer:
  // choosing it would load a map of grey shapes with nothing behind them.
  // It stays in content/ and appears the moment its records are built.
  if (!constituencies.length) {
    console.log(`— ${slug}: no records yet, left out of the index`);
    continue;
  }

  // Methodology and About describe how this site reads affidavits, which is
  // the same work in every state — so they are written once and filled in
  // per state, rather than copied thirty-one times. Two states had their own
  // and twenty-nine had none, which meant the menu linked twenty-nine
  // readers to "Page not found".
  //
  // A state may still keep its own copy: anything in its pages/ directory
  // wins over the shared one.
  const vars = {
    state: state.name,
    year: String(state.term?.start ?? '').slice(0, 4),
    myneta: state.sources?.myneta ?? 'https://www.myneta.info/',
    corrections: state.contact?.corrections ?? '',
    assembly_size: String(state.assembly_size),
    profiled: String(constituencies.length),
    methodology: `#/${slug}/methodology`,
  };
  const fill = (md) => md.replace(/\{\{(\w+)\}\}/g, (whole, key) => {
    if (!(key in vars)) throw new Error(`${slug}: shared page uses {{${key}}}, which nothing sets`);
    return vars[key];
  });

  const sharedPages = existsSync(sharedPagesDir)
    ? Object.fromEntries(readdirSync(sharedPagesDir).filter((f) => f.endsWith('.md'))
        .map((f) => [f.replace(/\.md$/, ''), fill(readFileSync(join(sharedPagesDir, f), 'utf8'))]))
    : {};
  const pagesDir = join(stateDir, 'pages');
  const ownPages = existsSync(pagesDir)
    ? Object.fromEntries(readdirSync(pagesDir).filter((f) => f.endsWith('.md'))
        .map((f) => [f.replace(/\.md$/, ''), readFileSync(join(pagesDir, f), 'utf8')]))
    : {};
  const pages = { ...sharedPages, ...ownPages };

  const promiseSets = readAll(join(stateDir, 'promise-sets'));
  const promises = readAll(join(stateDir, 'promises'));

  // Which parliamentary seat each constituency sits in, straight off the
  // map so the two can never disagree.
  const acFc = JSON.parse(readFileSync(join(stateDir, 'geo', 'constituencies.geojson'), 'utf8'));
  const pcOf = {};
  for (const f of acFc.features) {
    if (f.properties.PC_NO != null) pcOf[Number(f.properties.AC_NO)] = Number(f.properties.PC_NO);
  }

  const out = join(dataDir, `${slug}.json`);
  writeFileSync(out, JSON.stringify({
    state,
    stats: computeStats(constituencies),
    pages,
    constituencies,
    mps,
    pcOf,
    promiseSets,
    promises,
  }));

  cpSync(join(stateDir, 'geo'), join(geoDir, slug), { recursive: true });
  const districtsFc = JSON.parse(readFileSync(join(stateDir, 'geo', 'districts.geojson'), 'utf8'));
  const mapOut = join(geoDir, `${slug}-map.json`);
  writeFileSync(mapOut, JSON.stringify(projectGeo(acFc, districtsFc)));

  index.push({
    slug, name: state.name, assembly_size: state.assembly_size,
    profiled: constituencies.length, mps: mps.length,
  });

  console.log(`✔ ${slug}: ${constituencies.length} constituencies, ${mps.length} MPs, `
    + `${assertBudget(out, 400 * 1024)} bytes; map ${assertBudget(mapOut, 400 * 1024)} bytes`);
}

// Alphabetical, so the switcher does not reorder itself when a state is
// added.
index.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(join(dataDir, 'states.json'), JSON.stringify(index));
console.log(`✔ states.json: ${index.map((s) => s.name).join(', ')}`);
