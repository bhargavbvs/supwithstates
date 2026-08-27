#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { assertBudget } from './lib/budget.mjs';
import { stateConfig } from './lib/states.mjs';
import { projectGeo } from './lib/project-geo.mjs';

const STATE = process.env.STATE ?? 'andhra';
const CONF = stateConfig(STATE);
if (CONF.blocked) {
  console.error(`${STATE} is held back: ${CONF.note}`);
  process.exit(1);
}
const OUT = new URL(`../content/states/${STATE}/geo/`, import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const mapshaper = (args) => execFileSync('npx', ['-y', 'mapshaper', ...args], { stdio: 'inherit' });

// District outlines are cut from the constituencies, not from the district
// shapefile — even though we hold that shapefile and use it to decide which
// district each constituency is in.
//
// The two sets are different surveys of the same ground, drawn at different
// times to different tolerances, and simplifying each on its own moves their
// coastlines and borders apart by a little more. Measured on the committed
// files, Telangana's constituencies covered 2,943 km² that its districts did
// not, and Andhra's districts covered 3,102 km² that its constituencies did
// not — so the outline drawn over the fills landed inside the colour in one
// state and outside it in the other, and district lines cut through the
// middle of constituencies that in fact sit wholly inside one district.
//
// Dissolving the finished, already-simplified constituencies by the district
// they were joined to makes every district border a run of constituency
// borders by construction. The two layers cannot drift, because they are the
// same lines. What it costs: a district's edge is now the edge of the seats
// in it, which is what this map is actually about — you click a
// constituency, and the darker line tells you where its district ends.
function districtsFromConstituencies(out) {
  mapshaper([
    `${out}constituencies.geojson`,
    '-dissolve', 'district',
    '-filter-fields', 'district',
    '-o', 'format=geojson', 'precision=0.0001', `${out}districts.geojson`,
  ]);
}

/** Every constituency must have landed in a district before the dissolve:
 *  one that did not would come out as a district named `undefined`. */
function assertPlaced(path) {
  const fc = JSON.parse(readFileSync(path, 'utf8'));
  const orphans = fc.features.filter((f) => !f.properties.district);
  if (orphans.length) {
    throw new Error(`no district for ${orphans.map((f) => `${f.properties.AC_NO} ${f.properties.AC_NAME}`).join(', ')}`);
  }
}

// DISTRICTS_ONLY=1 re-cuts the district outlines from the constituencies
// already on disk and stops.
//
// Worth having because rebuilding a state's constituencies is not free:
// mapshaper's simplification is not stable across versions, so a rebuild
// today moves vertices on a file that has been checked seat by seat against
// the records — and Andhra's carries PC_NO/PC_NAME patched on afterwards,
// which the rebuild's field filter would drop. When the only thing that
// needs to change is the district layer, changing only the district layer
// is the smaller and safer act.
if (process.env.DISTRICTS_ONLY) {
  assertPlaced(`${OUT}constituencies.geojson`);
  districtsFromConstituencies(OUT);
  console.log('districts.geojson     ', assertBudget(`${OUT}districts.geojson`, 200 * 1024), 'bytes');
  process.exit(0);
}

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

  assertPlaced(acPath);
  districtsFromConstituencies(OUT);

  console.log('districts.geojson     ', assertBudget(`${OUT}districts.geojson`, 200 * 1024), 'bytes');
  console.log('constituencies.geojson', assertBudget(`${OUT}constituencies.geojson`, 500 * 1024), 'bytes');
  process.exit(0);
}

// Every state but the two Andhras is cut from the national assembly layer
// the same way, so there is one path for all of them.
//
// Two things in that layer need handling before a join. Some states carry
// placeholder features with AC_NO 0 and no name — Maharashtra has 14 of
// them — which are not constituencies and are dropped. Others store a
// single constituency as several polygons: Manipur files Andro three
// times, Kerala files Kothamangalam twice. Those are one seat each, so
// they are dissolved back together by their number before anything is
// asked of them. Dropping the duplicates instead would quietly delete
// territory; leaving them would put one seat on the map three times.
//
// The dissolve has to come before the district join, or the parts of one
// constituency can be placed in different districts.
if (CONF.geoSource !== 'ap-ac' && CONF.geoSource !== 'undivided-andhra') {
  // How hard to simplify is not one number for the whole country. Five per
  // cent suits a state the size of Andhra and leaves Madhya Pradesh at 1.4MB
  // of geometry, which is a map nobody on a phone waits for. So the build
  // tries the gentlest setting first and steps down until the state fits the
  // same payload every other state ships in. What a reader loses at 1% on a
  // large state is detail far below the size of one pixel at the zoom the
  // whole state is shown at.
  // The gate is the file the browser actually downloads. constituencies.geojson
  // is an intermediate: projectGeo turns it into SVG path strings on a
  // 1000-unit viewBox at two decimals, which is a good deal smaller than
  // lng/lat at four. Measuring the geojson instead was measuring the wrong
  // thing and simplified large states far harder than they needed.
  // Two passes, not one.
  //
  // `combine-files` puts the districts and the constituencies in a single
  // dataset with one shared arc pool, and a `-simplify` percentage is a
  // proportion of that whole pool. With the districts in it, the
  // constituencies came out barely simplified: Madhya Pradesh kept 31,811
  // vertices where the same 5% applied to the layer on its own leaves
  // 3,074. Filtering does not help — a filtered-out shape's arcs stay in
  // the dataset until it is written. So the join is written out first, and
  // the simplification reads that file back on its own.
  // Most states are cut out of the national layer. A state whose election
  // that layer predates names its own file instead — see `acFile` in
  // scripts/lib/states.mjs for where each came from and what it lacks.
  const acFile = CONF.acFile ?? '.geo-src/national-ac.geojson';
  const acFilter = CONF.acFile
    ? '+AC_NO > 0'
    : `ST_NAME===${JSON.stringify(CONF.geoState)} && +AC_NO > 0`;

  // Some states store one constituency as several polygons — Manipur files
  // Andro three times, Kerala files Kothamangalam twice — and those have to
  // be dissolved back into one seat before anything is asked of them.
  //
  // But only those. A dissolve rebuilds the topology and splits arcs, which
  // adds vertices rather than removing them: on Jammu & Kashmir, whose
  // ninety numbers are already unique, dissolving took a 5% simplification
  // from 31,243 vertices to 48,869. So it runs only where there is
  // something to merge.
  const source = JSON.parse(readFileSync(acFile, 'utf8'));
  const field = Object.entries(CONF.acFields ?? {}).find(([, to]) => to === 'AC_NO')?.[0] ?? 'AC_NO';
  const acNumbers = source.features
    .filter((f) => (CONF.acFile ? true : f.properties.ST_NAME === CONF.geoState))
    .map((f) => Number(f.properties[field]))
    .filter((n) => n > 0);
  const needsDissolve = new Set(acNumbers).size !== acNumbers.length;

  // Not every layer carries the parliamentary seat. The national one does,
  // which is where the link from an MLA to their MP comes from; the
  // Election Commission's per-election files do not. Asking mapshaper to
  // keep a field that is not there is an error, so the list is built from
  // what the source actually has.
  const pcField = Object.entries(CONF.acFields ?? {}).find(([, to]) => to === 'PC_NO')?.[0] ?? 'PC_NO';
  const hasPc = source.features.some((f) => f.properties[pcField] != null);
  const keepFields = ['AC_NO', 'AC_NAME', 'district', ...(hasPc ? ['PC_NO', 'PC_NAME'] : [])].join(',');
  const dissolveCopy = ['AC_NAME', ...(hasPc ? ['PC_NO', 'PC_NAME'] : [])].join(',');

  // The district each constituency sits in is a lookup, not a geometry
  // operation, so it is worked out once on the full-resolution shapes and
  // then carried across as a property.
  //
  // It cannot be done the obvious way — join first, simplify after —
  // because putting both layers in one dataset gives them a shared arc
  // pool and mapshaper splits arcs where the two sets of boundaries
  // cross, which densified Jammu & Kashmir from 178,943 vertices to
  // 227,645 before a single point had been removed. It cannot be done the
  // other way either: simplifying first moves a constituency's interior
  // point, and at 5% that pushed Yanam, Pathankot, Cuddalore and
  // Dimapur-II far enough to fall outside the district that contains
  // them. So the join runs on the untouched geometry and only its answer
  // travels.
  const LOOKUP = `${OUT}.districts.csv`;
  mapshaper([
    '-i', '.geo-src/india-districts.geojson', acFile, 'combine-files',
    '-rename-layers', 'districts,ac',
    ...(CONF.acFields
      ? ['-rename-fields', 'target=ac',
        Object.entries(CONF.acFields).map(([from, to]) => `${to}=${from}`).join(',')]
      : []),
    '-filter', 'target=districts', `state===${JSON.stringify(CONF.districtState)}`,
    '-filter', 'target=ac', acFilter,
    ...(needsDissolve ? ['-dissolve', 'target=ac', 'AC_NO', `copy-fields=${dissolveCopy}`] : []),
    '-join', 'target=ac', 'source=districts', 'point-method', 'fields=district',
    '-filter-fields', 'target=ac', 'fields=AC_NO,district',
    '-o', 'target=ac', 'format=csv', LOOKUP,
  ]);
  const districtOf = new Map();
  const rows = readFileSync(LOOKUP, 'utf8').trim().split('\n').slice(1);
  for (const row of rows) {
    const [no, ...rest] = row.split(',');
    districtOf.set(Number(no), rest.join(',').replace(/^"|"$/g, '').trim());
  }
  rmSync(LOOKUP, { force: true });

  const MAP_BUDGET = 400 * 1024;
  const STEPS = ['5%', '3%', '2%', '1.5%', '1%', '0.6%', '0.3%'];
  let used = null;
  let mapBytes = 0;
  for (const pct of STEPS) {
    mapshaper([
      acFile,
      ...(CONF.acFields
        ? ['-rename-fields', Object.entries(CONF.acFields).map(([from, to]) => `${to}=${from}`).join(',')]
        : []),
      '-filter', acFilter,
      ...(needsDissolve ? ['-dissolve', 'AC_NO', `copy-fields=${dissolveCopy}`] : []),
      '-simplify', pct, 'keep-shapes',
      '-filter-fields', `fields=${keepFields.replace(',district', '')}`,
      '-o', 'format=geojson', 'precision=0.0001', `${OUT}constituencies.geojson`,
    ]);

    const built = JSON.parse(readFileSync(`${OUT}constituencies.geojson`, 'utf8'));
    for (const f of built.features) f.properties.district = districtOf.get(Number(f.properties.AC_NO));
    writeFileSync(`${OUT}constituencies.geojson`, JSON.stringify(built));

    used = pct;
    assertPlaced(`${OUT}constituencies.geojson`);
    districtsFromConstituencies(OUT);
    mapBytes = Buffer.byteLength(JSON.stringify(projectGeo(
      built, JSON.parse(readFileSync(`${OUT}districts.geojson`, 'utf8')),
    )));
    if (mapBytes <= MAP_BUDGET) break;
  }

  const fc = JSON.parse(readFileSync(`${OUT}constituencies.geojson`, 'utf8'));
  const numbers = fc.features.map((f) => Number(f.properties.AC_NO));
  console.log(`${STATE}: ${fc.features.length} constituencies, numbered 1-${Math.max(...numbers)}, `
    + `${new Set(fc.features.map((f) => f.properties.district)).size} districts, `
    + `simplified to ${used}, map ${Math.round(mapBytes / 1024)}KB`);
  if (mapBytes > 400 * 1024) {
    throw new Error(`${STATE}: map is ${mapBytes} bytes even at ${used} — too heavy to serve`);
  }
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

// The Andhra source carries the assembly seat and nothing above it, so the
// parliamentary seat is patched on afterwards from the national set. It has
// to run here: the pass above keeps only the fields it names, so a rebuild
// that skipped this would quietly drop every constituency's MP.
execFileSync('node', ['scripts/add-pc-fields.mjs'], { stdio: 'inherit' });

assertPlaced(`${OUT}constituencies.geojson`);
districtsFromConstituencies(OUT);

console.log('districts.geojson     ', assertBudget(`${OUT}districts.geojson`, 150 * 1024), 'bytes');
console.log('constituencies.geojson', assertBudget(`${OUT}constituencies.geojson`, 500 * 1024), 'bytes');
