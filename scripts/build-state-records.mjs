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
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { stateConfig } from './lib/states.mjs';

const STATE = process.argv[2];
const MPS = process.argv.includes('--mps');
if (!STATE) { console.error('usage: node scripts/build-state-records.mjs <state> [--mps]'); process.exit(1); }

// Every state is described once, in scripts/lib/states.mjs. What this file
// needs from that is the election to read, the name MyNeta files it under,
// and the two-letter code a record's id starts with.
const cfg = stateConfig(STATE);
if (cfg.blocked) { console.error(`${STATE} is held back: ${cfg.note}`); process.exit(1); }
const CONF = {
  assembly: cfg.election,
  myNetaState: cfg.myNetaState,
  idPrefix: cfg.code,
  assemblyUrl: `https://www.myneta.info/${cfg.election}/`,
};

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// The reservation marker is metadata and goes; anything else in brackets
// is part of the name and stays. Dropping all of it collapsed Nizamabad
// (Urban) onto Nizamabad (Rural) and lost a sitting member.
const key = (s) => String(s ?? '')
  .toUpperCase()
  // The assembly shapefile cuts long names off mid-marker — "Aizawl
  // North-III (S", "Sri Renukaji (SC" — and fifteen names in the country
  // end in a parenthesis that never closes. An unclosed bracket at the end
  // of a name is always that truncation, never part of the name, and
  // leaving it in made Aizawl North-III unmatchable against itself.
  .replace(/\([^)]*$/, ' ')
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
// The Lok Sabha was crawled per state for the first two and then once for
// the whole country, so both file names exist. The per-state file wins
// where it is present; the national one covers everyone else, and the
// seats filter below keeps a state to its own members either way.
const lokSabhaFiles = [
  `.myneta-src/detail-LokSabha2024-${CONF.myNetaState.replace(/\s+/g, '')}.ndjson`,
  '.myneta-src/detail-LokSabha2024.ndjson',
];
const detailFile = MPS
  ? (lokSabhaFiles.find((f) => existsSync(f)) ?? lokSabhaFiles[0])
  : `.myneta-src/detail-${CONF.assembly}.ndjson`;
if (!existsSync(detailFile)) { console.error(`missing ${detailFile} — run scripts/crawl-myneta.mjs first`); process.exit(1); }

const detail = new Map();
for (const line of readFileSync(detailFile, 'utf8').split('\n')) {
  if (line) { const d = JSON.parse(line); detail.set(d.candidateId, d); }
}
const serious = new Set(JSON.parse(readFileSync(`.myneta-src/serious-${election}.json`, 'utf8')));

// A by-election is filed under the same constituency as the general it
// followed, and MyNeta marks it by putting "BYE ELECTION ON" where the
// district would go. That row is the sitting member, so it supersedes the
// general rather than sitting beside it — which is why the two are sorted
// with the by-elections last: the later write wins.
//
// The row ids do not order these reliably (Tripura files Dhanpur's
// by-election below the general it replaced and Boxanagar's above it), so
// the marker is the only signal used. It accounts for 73 of the 74
// constituencies in the country that carry more than one winner; the
// seventy-fourth is Bihar, which has two different seats both named Pipra,
// and those are told apart by district in findPlace below.
const isByeElection = (c) => /BYE\s*ELECTION/i.test(String(c.district ?? ''));

// A by-election row has "BYE ELECTION ON" where its district would be, so
// it arrives with no district to match on — and without one, Uttarakhand's
// MANGLORE could not reach the map's "Manglaur" (three edits) and silently
// failed to place. The general election for the same seat does carry the
// district, so a by-election borrows it. Left unfixed this shipped the
// member Manglaur replaced in July 2024 as though he still held the seat.
const districtOfSeat = new Map();
for (const c of full.constituencies) {
  if (c.election === election && !isByeElection(c) && c.district) {
    districtOfSeat.set(key(c.name), c.district);
  }
}
const districtFor = (c) => (isByeElection(c) ? districtOfSeat.get(key(c.name)) ?? null : c.district);
// The Lok Sabha files three states under a different string than the
// assembly does — see lokSabhaState in scripts/lib/states.mjs.
const houseState = MPS ? (cfg.lokSabhaState ?? CONF.myNetaState) : CONF.myNetaState;
const seats = full.constituencies
  .filter((c) => c.election === election && c.winner && (!MPS || c.state === houseState))
  .sort((a, b) => (isByeElection(a) ? 1 : 0) - (isByeElection(b) ? 1 : 0)
    || a.constituencyId - b.constituencyId);

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
// Where a name lands. The district is the tie-breaker and not the key:
// Bihar has a Pipra in Purba Champaran and another in Supaul, and a name
// alone cannot tell them apart. The two sources spell districts
// differently often enough (PURVI CHAMPARAN against PURBA CHAMPARAN) that
// the tie-break allows the same near-match the names get.
const findPlace = (name, district) => {
  const k = key(name);
  // Seats the join cannot reach on its own. Each was checked against the
  // Election Commission or the state's own district administration before
  // being written down — see the citations in scripts/lib/states.mjs.
  // An alias is either a map number, or a number and the name the map
  // should have carried — Tamil Nadu's AC 70 is labelled "Vandavasi (SC)",
  // its neighbour's name copied onto it, so without correcting the name
  // the site would show two different constituencies both called Vandavasi.
  const alias = cfg.aliases?.[String(name).toUpperCase()];
  if (alias) {
    const number = typeof alias === 'number' ? alias : alias.number;
    const hit = places.find((p) => p.number === number);
    if (!hit) throw new Error(`${STATE}: alias for "${name}" points at AC ${number}, which is not on the map`);
    return typeof alias === 'number' ? hit : { ...hit, name: alias.name ?? hit.name };
  }
  const exact = places.filter((p) => p.key === k);
  if (exact.length === 1) return exact[0];

  // Reservation first when a name is shared. key() strips (SC) and (ST) so
  // that a source which omits the marker still matches, which means that
  // when two seats in a state share a name the marker is exactly what
  // tells them apart: Rajasthan's Shahpura (SC) in Bhilwara against its
  // Shahpura in Jaipur. A truncated marker reads as unknown and is treated
  // as compatible with either, rather than as a mismatch.
  // A name with no marker means the seat is General — that is information,
  // not a gap, and it is what separates Shahpura (SC) from Shahpura. The
  // one exception is a name the shapefile cut off mid-marker, where the
  // reservation is genuinely unknown and must not be read as General.
  const truncated = (n) => /\([^)]*$/.test(String(n));
  const reservation = (n) => (truncated(n) ? undefined : reservedOf(n));
  const r = reservation(name);
  const sameReservation = (p) => {
    const pr = reservation(p.name);
    return pr === undefined || r === undefined || pr === r;
  };
  const districtAgrees = (p) => {
    if (!district) return false;
    const d = key(district);
    const pd = key(p.district);
    // The two sources disagree about district names often enough — PURVI
    // CHAMPARAN against PURBA CHAMPARAN, JAIPUR against JAIPUR(GRAMIN) —
    // that this accepts a near match and a containment, not only equality.
    // Three edits is a lot on a short name: it turns REWA into MORENA,
    // two unrelated districts four hundred kilometres apart, and that
    // false match was one of the candidates blocking Joura. Scale the
    // tolerance to the length of the word so long names keep their
    // latitude and short ones do not get any.
    const cap = Math.min(3, Math.floor(Math.max(pd.length, d.length) / 3));
    return pd === d || (cap > 0 && within(pd, d, cap)) || pd.includes(d) || d.includes(pd);
  };

  // Reservation and district narrow a shortlist; neither is allowed to
  // empty it. Nagaland's map omits the (ST) that MyNeta prints on the same
  // seat, so a reservation used as a filter rather than a tie-break threw
  // away three members who had exactly one candidate each.
  const narrow = (list) => {
    if (list.length <= 1) return list;
    const byReservation = list.filter(sameReservation);
    if (byReservation.length === 1) return byReservation;
    const rest = byReservation.length ? byReservation : list;
    const byDistrict = rest.filter(districtAgrees);
    return byDistrict.length === 1 ? byDistrict : rest;
  };

  if (exact.length > 1) {
    const narrowed = narrow(exact);
    return narrowed.length === 1 ? narrowed[0] : null;
  }

  // No exact match. A near one is accepted only with the district behind
  // it: three edits is enough to turn Joura into Jaora, which is a real
  // and different constituency two hundred kilometres away, so the name
  // alone is not allowed to decide.
  const near = places.filter((p) => within(p.key, k, 3) && districtAgrees(p));
  const narrowed = narrow(near);
  if (narrowed.length === 1) return narrowed[0];

  // District agreement cannot be a requirement, only a help. Karnataka's
  // shapefile lost its non-ASCII characters somewhere upstream and files
  // Bengaluru as "Bengal#ru (Urban)"; Himachal has "K>NGRA" for Kangra.
  // Against those, no district ever agrees. So a close name that is the
  // only close name in the whole state is still a match — that was the
  // rule before districts were consulted at all, and it is sound on its
  // own: what the district adds is the ability to choose between two.
  const solo = places.filter((p) => within(p.key, k, 2));
  if (solo.length === 1) return solo[0];
  return null;
};

const missing = [];
const records = [];

if (MPS) {
  // A parliamentary seat's number and its assembly segments both come
  // from the map, which carries PC_NO and PC_NAME on every constituency.
  // A parliamentary seat's number is whichever number most of its assembly
  // segments carry, not whichever one happens to come first. The national
  // layer labels one of South Delhi's segments with West Delhi's number, so
  // taking the first gave two different seats the number 6 and wrote one
  // over the other. A majority is proof against a single mislabelled
  // segment in a way that a first sighting is not.
  const byPc = new Map();
  for (const p of places) {
    const k = key(p.pcName);
    if (!byPc.has(k)) byPc.set(k, { name: p.pcName, segments: [], votes: new Map() });
    const pc = byPc.get(k);
    pc.segments.push(p.name);
    pc.votes.set(p.pcNumber, (pc.votes.get(p.pcNumber) ?? 0) + 1);
  }
  for (const pc of byPc.values()) {
    pc.number = [...pc.votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  const claimed = new Map();
  for (const pc of byPc.values()) {
    if (claimed.has(pc.number)) {
      throw new Error(`${STATE}: parliamentary seat ${pc.number} is claimed by both `
        + `${claimed.get(pc.number)} and ${pc.name}`);
    }
    claimed.set(pc.number, pc.name);
  }
  for (const seat of seats) {
    const wanted = key(cfg.pcAliases?.[String(seat.name).toUpperCase()] ?? seat.name);
    const near = [...byPc.values()].filter((v) => within(key(v.name), wanted));
    const pc = byPc.get(wanted) ?? (near.length === 1 ? near[0] : null);
    if (!pc) { missing.push(seat.name); continue; }
    records.push({ seat, place: { number: pc.number, name: pc.name, segments: pc.segments } });
  }
} else {
  for (const seat of seats) {
    const place = findPlace(seat.name, districtFor(seat));
    if (!place) { missing.push(seat.name); continue; }
    records.push({ seat, place });
  }
}

// Nothing is written until every winner's affidavit is in hand. A
// candidate the crawl has not reached is simply absent from the detail
// file, and building anyway shipped Bihar at 105 of its 243 seats before
// the run stopped — a half-written state on disk that the next build
// picked up as if it were finished.
const uncrawled = records.filter(({ seat }) => !detail.has(seat.winner.candidateId));
if (uncrawled.length) {
  console.error(`${STATE}: ${uncrawled.length} of ${records.length} winners are not in `
    + `${detailFile} — the crawl is unfinished, nothing written.`);
  console.error(`  run: node scripts/crawl-myneta.mjs ${election}`);
  process.exit(1);
}

// Cleared first. Without this a record that stops being produced — a seat
// renamed, a name that no longer joins — stays on disk from the last run
// and ships as though it were current.
//
// Photographs are the one thing carried across, because they are the one
// thing not derived from the sources this script reads: they are added
// afterwards, some from ADR's cached pages and some from Wikipedia, and a
// rebuild that dropped them would throw away work every time.
//
// They are carried by candidate, not by seat. A by-election gives a
// constituency a new member, and moving the old member's face onto them
// because they sit in the same chair is exactly the error worth being
// careful about — so the key is the MyNeta URL, which names the person.
const outDir = join(stateDir, MPS ? 'mps' : 'representatives');
const heldPhotos = new Map();
if (existsSync(outDir)) {
  for (const f of readdirSync(outDir).filter((n) => n.endsWith('.json'))) {
    const old = JSON.parse(readFileSync(join(outDir, f), 'utf8'));
    if (old.representative?.photo && old.source?.myneta_url) {
      heldPhotos.set(old.source.myneta_url, old.representative.photo);
    }
  }
}
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const retrieved = new Date().toISOString().slice(0, 10);
let written = 0;
const gaps = { assets: 0, education: 0, age: 0 };

const noAffidavit = [];
for (const { seat, place } of records) {
  const w = seat.winner;
  const d = detail.get(w.candidateId) ?? {};
  const isSerious = serious.has(w.candidateId);

  // Two different absences, and conflating them cost Bihar 200 members.
  //
  // A candidate the crawl has not reached yet is simply missing from the
  // detail file. That is an unfinished crawl, not a fact about the member,
  // and building anyway would quietly ship a state at a fifth of its size
  // — so the build stops and says to finish the crawl.
  //
  // A candidate the crawl did reach, whose affidavit page carries nothing
  // — no age, no education, no assets — is what MyNeta serves for an
  // election it has not finished processing. A record built from that
  // would say a member is worth nothing and went to no school, so none is
  // built: the seat reads as not yet profiled, which is what it is.
  if (d.assets == null && d.age == null && !d.education?.level) {
    noAffidavit.push(`${place.number} ${place.name}`);
    continue;
  }
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
      // MyNeta marks a by-election but does not publish its date, so the
      // year here stays the year of the assembly this member sits in. The
      // flag is the part we actually know: that they arrived at a
      // by-election rather than at the general.
      ...(isByeElection(seat) ? { by_election: true } : {}),
      term_start: MPS ? '2024-06' : `${seat.year}-12`,
      age_at_election: d.age ?? null,
      profession: d.profession ?? null,
      photo: heldPhotos.get(`https://www.myneta.info/${election}/candidate.php?candidate_id=${w.candidateId}`) ?? null,
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

const seatsFilled = new Set(records.map(({ place }) => place.number)).size - noAffidavit.length;
console.log(`${STATE}${MPS ? ' MPs' : ''}: ${seatsFilled}${MPS ? '' : ` of ${cfg.seats}`} seats → ${outDir}`
  + (records.length - noAffidavit.length > seatsFilled
    ? ` (${records.length - noAffidavit.length - seatsFilled} superseded by a by-election)` : ''));
if (missing.length) console.log(`  not placed: ${[...new Set(missing)].join(', ')}`);
if (noAffidavit.length) {
  console.log(`  no affidavit published yet: ${noAffidavit.length}`
    + ` (${noAffidavit.slice(0, 3).join(', ')}${noAffidavit.length > 3 ? ', …' : ''})`);
}
console.log(`  gaps — assets ${gaps.assets}, education ${gaps.education}, age ${gaps.age}`);
console.log(`  ADR serious: ${records.filter(({ seat }) => serious.has(seat.winner.candidateId)).length}`);
