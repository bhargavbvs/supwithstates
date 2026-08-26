#!/usr/bin/env node
// Turns the crawled affidavits into content records, in the shape the
// Andhra ones already have.
//
//   node scripts/build-state-records.mjs telangana
//   node scripts/build-state-records.mjs telangana --mps
//   node scripts/build-state-records.mjs andhra --mps
//
// Three sources meet here: the constituency crawl (who won, for which
// party), the affidavit pages (assets, education, age, profession,
// convictions) and the map (which constituency number and district a name
// belongs to). Nothing is invented at the join — a name that cannot be
// placed is reported and left out, because a record filed under the wrong
// number is worse than a record that is missing.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STATE = process.argv[2];
const MPS = process.argv.includes('--mps');
if (!STATE) { console.error('usage: node scripts/build-state-records.mjs <state> [--mps]'); process.exit(1); }

const CONF = {
  telangana: {
    assembly: 'Telangana2023',
    myNetaState: 'TELANGANA',
    idPrefix: 'tg',
    assemblyUrl: 'https://www.myneta.info/Telangana2023/',
  },
  andhra: {
    assembly: 'AndhraPradesh2024',
    myNetaState: 'ANDHRA PRADESH',
    idPrefix: 'ap',
    assemblyUrl: 'https://www.myneta.info/AndhraPradesh2024/',
  },
}[STATE];
if (!CONF) { console.error(`no configuration for ${STATE}`); process.exit(1); }

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// The reservation marker is metadata and goes; anything else in brackets
// is part of the name and stays. Dropping all of it collapsed Nizamabad
// (Urban) onto Nizamabad (Rural) and lost a sitting member.
const key = (s) => String(s ?? '')
  .toUpperCase()
  .replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/g, ' ')
  .replace(/[^A-Z]/g, '');
const titleCase = (s) => String(s ?? '').toLowerCase()
  .replace(/(^|[\s(\-.])([a-z])/g, (_, a, b) => a + b.toUpperCase());

/** Levenshtein, capped — for the handful of names the two sources spell
 *  differently (Bellampalle/Bellampalli, Jangoan/Jangaon). */
function within(a, b, cap = 2) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > cap) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length] <= cap;
}

const full = JSON.parse(readFileSync('content/representatives-full.json', 'utf8'));
const stateDir = `content/states/${STATE}`;

const election = MPS ? 'LokSabha2024' : CONF.assembly;
const detailFile = MPS
  ? `.myneta-src/detail-LokSabha2024-${CONF.myNetaState.replace(/\s+/g, '')}.ndjson`
  : `.myneta-src/detail-${CONF.assembly}.ndjson`;
if (!existsSync(detailFile)) { console.error(`missing ${detailFile} — run scripts/crawl-myneta.mjs first`); process.exit(1); }

const detail = new Map();
for (const line of readFileSync(detailFile, 'utf8').split('\n')) {
  if (line) { const d = JSON.parse(line); detail.set(d.candidateId, d); }
}
const serious = new Set(JSON.parse(readFileSync(`.myneta-src/serious-${election}.json`, 'utf8')));

// Seats, newest first so a by-election supersedes the general in the same
// constituency rather than sitting beside it.
const seats = full.constituencies
  .filter((c) => c.election === election && c.winner && (!MPS || c.state === CONF.myNetaState))
  .sort((a, b) => a.constituencyId - b.constituencyId);

// Where each name sits: the map is the authority for the number and the
// district, because it is the only source here that holds either.
const geo = JSON.parse(readFileSync(join(stateDir, 'geo', 'constituencies.geojson'), 'utf8'));
const places = geo.features.map((f) => ({
  number: Number(f.properties.AC_NO),
  name: f.properties.AC_NAME,
  district: f.properties.district,
  pcNumber: Number(f.properties.PC_NO),
  pcName: f.properties.PC_NAME,
  key: key(f.properties.AC_NAME),
}));

const reservedOf = (name) => (/\(\s*SC/i.test(name) ? 'SC' : /\(\s*ST/i.test(name) ? 'ST' : null);
const findPlace = (name) => {
  const k = key(name);
  const exact = places.find((p) => p.key === k);
  if (exact) return exact;
  // A near match is only a match when it is the only one. Two names two
  // edits away from what was typed identify nothing.
  const near = places.filter((p) => within(p.key, k));
  return near.length === 1 ? near[0] : null;
};

const missing = [];
const records = [];

if (MPS) {
  // A parliamentary seat's number and its assembly segments both come
  // from the map, which carries PC_NO and PC_NAME on every constituency.
  const byPc = new Map();
  for (const p of places) {
    if (!byPc.has(key(p.pcName))) {
      byPc.set(key(p.pcName), { number: p.pcNumber, name: p.pcName, segments: [] });
    }
    byPc.get(key(p.pcName)).segments.push(p.name);
  }
  for (const seat of seats) {
    const near = [...byPc.values()].filter((v) => within(key(v.name), key(seat.name)));
    const pc = byPc.get(key(seat.name)) ?? (near.length === 1 ? near[0] : null);
    if (!pc) { missing.push(seat.name); continue; }
    records.push({ seat, place: { number: pc.number, name: pc.name, segments: pc.segments } });
  }
} else {
  for (const seat of seats) {
    const place = findPlace(seat.name);
    if (!place) { missing.push(seat.name); continue; }
    records.push({ seat, place });
  }
}

const outDir = join(stateDir, MPS ? 'mps' : 'representatives');
mkdirSync(outDir, { recursive: true });
const retrieved = new Date().toISOString().slice(0, 10);
let written = 0;
const gaps = { assets: 0, education: 0, age: 0 };

for (const { seat, place } of records) {
  const w = seat.winner;
  const d = detail.get(w.candidateId) ?? {};
  const isSerious = serious.has(w.candidateId);
  if (d.assets == null) gaps.assets += 1;
  if (!d.education?.level) gaps.education += 1;
  if (d.age == null) gaps.age += 1;

  const rec = {
    id: `${CONF.idPrefix}-${MPS ? 'pc' : 'ac'}-${place.number}-${slugify(place.name.replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/gi, ''))}`,
    ...(MPS ? { house: 'lok sabha' } : {}),
    constituency: {
      number: place.number,
      name: titleCase(place.name.replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/gi, '').trim()),
      ...(MPS ? {} : { district: titleCase(place.district) }),
      reserved: reservedOf(place.name) ?? reservedOf(seat.name),
      ...(MPS ? { assembly_segments: place.segments.map((s) => titleCase(s.replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/gi, '').trim())) } : {}),
    },
    representative: {
      name: w.name,
      election: String(seat.year),
      elected_party: w.party,
      current_party: w.party,
      party_changed: null,
      term_start: MPS ? '2024-06' : `${seat.year}-12`,
      age_at_election: d.age ?? null,
      profession: d.profession ?? null,
      photo: null,
      education: { level: d.education?.level ?? null, detail: d.education?.detail ?? null },
      declared_cases: {
        total: d.cases ?? w.criminalCases ?? 0,
        // ADR names who has declared a serious case and does not publish
        // how many each has. A count we cannot see is not a count we may
        // print, so this says which of the two things we know.
        serious: null,
        serious_declared: isSerious,
        convicted: d.convicted ?? 0,
        note: isSerious
          ? 'ADR lists this member among those declaring a case it counts as serious. The number of such cases is not published per member.'
          : null,
      },
      assets: {
        movable: d.movable ?? null,
        immovable: d.immovable ?? null,
        total: d.assets ?? null,
        liabilities: d.liabilities ?? null,
      },
    },
    // No result block: no source this project can reach publishes the
    // votes for these elections, and a margin nobody counted is not a
    // margin. The page shows the section only where the figures exist.
    source: {
      myneta_url: `https://www.myneta.info/${election}/candidate.php?candidate_id=${w.candidateId}`,
      retrieved,
    },
  };
  writeFileSync(join(outDir, `${place.number}-${slugify(rec.constituency.name)}.json`),
    `${JSON.stringify(rec, null, 2)}\n`);
  written += 1;
}

console.log(`${STATE}${MPS ? ' MPs' : ''}: ${written} records → ${outDir}`);
if (missing.length) console.log(`  not placed: ${missing.join(', ')}`);
console.log(`  gaps — assets ${gaps.assets}, education ${gaps.education}, age ${gaps.age}`);
console.log(`  ADR serious: ${records.filter(({ seat }) => serious.has(seat.winner.candidateId)).length}`);
