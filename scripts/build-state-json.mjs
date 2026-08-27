#!/usr/bin/env node
// state.json for a state, from what the build already knows.
//
//   node scripts/build-state-json.mjs kerala
//
// Everything here is derived or copied — nothing is guessed. The assembly
// size and the district count come from the map that was just built; the
// map's centre and zoom come from the geometry's own bounds rather than a
// coordinate typed from memory; the sources are the MyNeta pages the
// records were actually read from.
//
// What is deliberately absent: the month a government took office, where
// only the election year is known, and the government-orders portal for a
// state whose portal we have not confirmed. A month or a URL invented to
// fill a field is a fabricated source, and this file is a citation.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { stateConfig, STATES } from './lib/states.mjs';

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const slugs = only.length ? only : Object.keys(STATES);

// Portals confirmed to exist and to be the state's government-orders site.
// A state absent from here gets no go_portal, and its tracker stays empty.
const GO_PORTAL = {
  telangana: 'https://goir.telangana.gov.in/',
  andhra: 'https://goir.ap.gov.in/',
};

for (const slug of slugs) {
  const cfg = stateConfig(slug);
  if (cfg.blocked) { console.log(`— ${slug}: held back`); continue; }
  const dir = `content/states/${slug}`;
  const geoPath = join(dir, 'geo', 'constituencies.geojson');
  if (!existsSync(geoPath)) { console.log(`— ${slug}: no geometry yet`); continue; }

  const existing = existsSync(join(dir, 'state.json'))
    ? JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8')) : null;
  if (existing) { console.log(`— ${slug}: state.json already written, left alone`); continue; }

  const ac = JSON.parse(readFileSync(geoPath, 'utf8'));
  const districts = JSON.parse(readFileSync(join(dir, 'geo', 'districts.geojson'), 'utf8'));

  // Centre and zoom from the state's own bounds. A wide state needs a
  // wider view than a compact one, so the zoom follows the span.
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  const visit = (c, d) => {
    if (d === 0) {
      minLng = Math.min(minLng, c[0]); maxLng = Math.max(maxLng, c[0]);
      minLat = Math.min(minLat, c[1]); maxLat = Math.max(maxLat, c[1]);
    } else for (const x of c) visit(x, d - 1);
  };
  for (const f of ac.features) visit(f.geometry.coordinates, f.geometry.type === 'MultiPolygon' ? 3 : 2);
  const span = Math.max(maxLng - minLng, maxLat - minLat);
  const zoom = Math.round(Math.log2(360 / span));

  const state = {
    slug,
    name: cfg.name,
    domain: 'ssupwithstates.com',
    assembly_size: cfg.seats,
    district_count: districts.features.length,
    term: { start: String(cfg.year) },
    sources: {
      ...(GO_PORTAL[slug] ? { go_portal: GO_PORTAL[slug] } : {}),
      myneta: `https://www.myneta.info/${cfg.election}/`,
      adr_serious_list: `https://www.myneta.info/${cfg.election}/index.php`
        + '?action=summary&subAction=serious_crime&sort=candidate',
      lok_sabha: 'https://www.myneta.info/LokSabha2024/',
    },
    contact: { corrections: 'corrections@ssupwithstates.com' },
    map: {
      center: [Number(((minLng + maxLng) / 2).toFixed(2)), Number(((minLat + maxLat) / 2).toFixed(2))],
      zoom,
    },
  };
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
  console.log(`✔ ${slug}: ${state.assembly_size} seats, ${state.district_count} districts, `
    + `centre ${state.map.center.join(',')} zoom ${state.map.zoom}`);
}
