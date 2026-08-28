#!/usr/bin/env node
// Freely-licensed photographs from Wikipedia, for members ADR has none for.
//
//   node scripts/fetch-wiki-photos.mjs content/states/punjab/representatives
//
// ADR publishes the photograph a candidate filed with their affidavit, and
// for most elections it has them: 4,181 of 4,614 members here carry one.
// For four state elections — Manipur and Punjab and Himachal in 2022, and
// Gujarat — it published almost none, and its own pages print the picture
// frame with an empty filename. There is nothing further to take from
// them, so those members' photographs have to come from somewhere else.
//
// The rule that matters here is identity. An earlier version of this file
// turned a name into a Wikipedia address and took whatever lead image it
// found, which is safe when a person is checking each one and dangerous at
// four hundred: "Harbhajan Singh" is a Punjab MLA and also a cricketer,
// and the wrong face on a named person is a worse failure than no face at
// all. So a photograph is taken only from an article that proves it is
// about this legislator — by naming the constituency they hold, or by
// naming both their state's legislative assembly and their party. An
// article that proves neither is left alone.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const UA = { 'User-Agent': 'ssupwithstates/1.0 (civic data; https://supwithstates.vercel.app)' };
const API = 'https://en.wikipedia.org/w/api.php';
const COMMONS = 'https://commons.wikimedia.org/w/api.php';

// Only licences that permit republication. A photograph we may not
// republish is the same as no photograph.
const FREE = /cc[ -]?by|cc[ -]?0|public domain|^pd|government open data|godl/i;
const NONFREE = /fair use|non[- ]?free|all rights reserved|copyright/i;

const PARTY = {
  BJP: 'Bharatiya Janata Party', INC: 'Indian National Congress',
  AAP: 'Aam Aadmi Party', SAD: 'Shiromani Akali Dal', BSP: 'Bahujan Samaj Party',
  'CPI(M)': 'Communist Party of India', SP: 'Samajwadi Party',
  NPP: 'National People\'s Party', NPF: 'Naga People\'s Front',
  'JD(U)': 'Janata Dal', RLD: 'Rashtriya Lok Dal', SHS: 'Shiv Sena',
  NCP: 'Nationalist Congress Party', AITC: 'All India Trinamool Congress',
};

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const bare = (s) => String(s ?? '').replace(/\(\s*(SC|ST|GEN|GENERAL)\s*\)?/gi, '').trim();

async function api(base, params) {
  const url = `${base}?${new URLSearchParams({ ...params, format: 'json', origin: '*' })}`;
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/** Candidate articles for a person, searched with the seat beside the name
 *  so the search engine does some of the disambiguating for us. */
async function search(name, constituency, stateName) {
  const queries = [
    `${name} ${bare(constituency)} constituency`,
    `${name} MLA ${stateName}`,
  ];
  const seen = new Map();
  for (const q of queries) {
    const data = await api(API, {
      action: 'query', generator: 'search', gsrsearch: q, gsrlimit: '5',
      prop: 'extracts|categories|pageimages', exintro: '1', explaintext: '1',
      piprop: 'original', cllimit: '50',
    });
    for (const p of Object.values(data?.query?.pages ?? {})) {
      if (!seen.has(p.pageid)) seen.set(p.pageid, p);
    }
    await sleep(200);
    if (seen.size) break;
  }
  return [...seen.values()];
}

/** Is this article about this legislator? The constituency alone is proof;
 *  otherwise the state's assembly and the party together are. */
function identifies(page, { name, constituency, stateName, party }) {
  const text = norm(`${page.title} ${page.extract ?? ''} `
    + (page.categories ?? []).map((c) => c.title).join(' '));
  if (!text.includes(norm(name).split(' ')[0])) return null;

  const seat = norm(bare(constituency));
  if (seat.length > 3 && text.includes(seat)) return 'constituency';

  const assembly = text.includes(norm(`${stateName} legislative assembly`))
    || text.includes(norm(`${stateName} vidhan sabha`));
  const partyName = PARTY[party] ?? party;
  const hasParty = partyName && norm(partyName).length > 3 && text.includes(norm(partyName));
  if (assembly && hasParty) return 'assembly and party';
  return null;
}

async function licenceOf(imageUrl) {
  const m = imageUrl.match(/\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?]+)/i);
  if (!m) return null;
  const file = decodeURIComponent(m[1]);
  const data = await api(COMMONS, {
    action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'extmetadata',
  });
  const meta = Object.values(data?.query?.pages ?? {})[0]?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;
  const licence = meta.LicenseShortName?.value || meta.License?.value || '';
  if (NONFREE.test(licence) || !FREE.test(licence)) return null;
  return { licence, artist: (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim() };
}

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/fetch-wiki-photos.mjs <records dir>'); process.exit(1); }
const stateName = JSON.parse(readFileSync(join(dir, '..', 'state.json'), 'utf8')).name;

let added = 0; let noArticle = 0; let unproven = 0; let notFree = 0; let had = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, file);
  const rec = JSON.parse(readFileSync(path, 'utf8'));
  if (rec.representative.photo) { had += 1; continue; }

  const subject = {
    name: rec.representative.name,
    constituency: rec.constituency.name,
    party: rec.representative.elected_party,
    stateName,
  };
  const pages = await search(subject.name, subject.constituency, stateName);
  const withImage = pages.filter((p) => p.original?.source);
  if (!withImage.length) { noArticle += 1; continue; }

  let taken = null;
  for (const page of withImage) {
    const why = identifies(page, subject);
    if (!why) continue;
    const lic = await licenceOf(page.original.source);
    await sleep(200);
    if (!lic) { notFree += 1; break; }
    taken = { page, why, lic };
    break;
  }
  if (!taken) { unproven += 1; continue; }

  rec.representative.photo = {
    url: taken.page.original.source.split('?')[0],
    credit: taken.lic.artist || 'Wikimedia Commons',
    license: taken.lic.licence,
    source_url: `https://en.wikipedia.org/?curid=${taken.page.pageid}`,
  };
  writeFileSync(path, `${JSON.stringify(rec, null, 2)}\n`);
  added += 1;
  console.log(`  + ${rec.constituency.name}: ${subject.name} (matched on ${taken.why}, ${taken.lic.licence})`);
  await sleep(200);
}

console.log(`${dir}: ${added} added, ${unproven} found but not proven to be the member, `
  + `${notFree} not freely licensed, ${noArticle} with no illustrated article, ${had} already had one`);
