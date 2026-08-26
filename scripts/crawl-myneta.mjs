#!/usr/bin/env node
// The affidavit page behind every winner, and ADR's own list of who has
// declared a serious case.
//
//   node scripts/crawl-myneta.mjs Telangana2023
//   node scripts/crawl-myneta.mjs LokSabha2024 --state TELANGANA
//
// The constituency crawl in the shaala project already holds every
// winner's name, party and case count; what it does not hold is the
// affidavit detail — assets split into movable and immovable,
// liabilities, education, age, profession, convictions — which is what
// an Andhra record carries and therefore what any other state has to.
//
// Three at a time with a pause, the same courtesy every crawl in these
// two projects keeps: MyNeta is run by a small non-profit as a public
// service, and there is no version of this worth degrading it for.
// Resumable: a candidate already written is never fetched again.
import { readFileSync, appendFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { parseCandidateDetail, textOf } from './lib/myneta-detail.mjs';

const SLUG = process.argv[2];
if (!SLUG) { console.error('usage: node scripts/crawl-myneta.mjs <MyNetaSlug> [--state NAME] [--conc 3]'); process.exit(1); }
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
const ONLY_STATE = arg('state', null);
const CONC = Number(arg('conc', 3));

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36' };
const OUT_DIR = '.myneta-src';
const CACHE = `${OUT_DIR}/pages/${SLUG}`;
mkdirSync(CACHE, { recursive: true });
const DETAIL = `${OUT_DIR}/detail-${SLUG}${ONLY_STATE ? `-${ONLY_STATE.replace(/\s+/g, '')}` : ''}.ndjson`;
const SERIOUS = `${OUT_DIR}/serious-${SLUG}.json`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (url) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(25000) });
      if (r.status >= 500 || r.status === 429) { await sleep(4000 * (attempt + 1)); continue; }
      return await r.text();
    } catch { await sleep(2000 * (attempt + 1)); }
  }
  return null;
};

const full = JSON.parse(readFileSync('content/representatives-full.json', 'utf8'));
const seats = full.constituencies.filter((c) => c.election === SLUG && c.winner?.candidateId
  && (!ONLY_STATE || c.state === ONLY_STATE));
console.log(`${SLUG}${ONLY_STATE ? ` / ${ONLY_STATE}` : ''}: ${seats.length} winners`);

// --- ADR's serious list -------------------------------------------------
// MyNeta publishes who has declared a case ADR counts as serious, but not
// how many each of them has. So this records the fact and not a number:
// a count we cannot see is not a count we may print.
if (!existsSync(SERIOUS)) {
  const ids = new Set();
  for (let page = 1; page <= 40; page += 1) {
    const html = await get(`https://www.myneta.info/${SLUG}/index.php`
      + `?action=summary&subAction=serious_crime&sort=candidate&page=${page}`);
    if (!html) break;
    const found = [...html.matchAll(/candidate_id=(\d+)/g)].map((m) => Number(m[1]));
    const fresh = found.filter((id) => !ids.has(id));
    found.forEach((id) => ids.add(id));
    if (!fresh.length) break;
    await sleep(300);
  }
  writeFileSync(SERIOUS, JSON.stringify([...ids]));
  console.log(`  serious list: ${ids.size} candidates ADR lists with a serious case`);
}

// --- the affidavit pages -----------------------------------------------
const done = new Set();
if (existsSync(DETAIL)) for (const line of readFileSync(DETAIL, 'utf8').split('\n')) {
  if (line) try { done.add(JSON.parse(line).candidateId); } catch { /* torn line */ }
}
const todo = seats.filter((s) => !done.has(s.winner.candidateId));
console.log(`  ${done.size} already held, ${todo.length} to fetch at concurrency ${CONC}`);

let i = 0;
let ok = 0;
let bad = 0;
async function worker() {
  while (i < todo.length) {
    const seat = todo[i++];
    const id = seat.winner.candidateId;
    // Kept on disk. Every parser mistake found later — and there has
    // been one, a conviction count that read the wrong table — is then
    // re-read from here rather than re-asked of a donated server.
    const cached = `${CACHE}/${id}.html`;
    let html = existsSync(cached) ? readFileSync(cached, 'utf8') : null;
    if (!html) {
      html = await get(`https://www.myneta.info/${SLUG}/candidate.php?candidate_id=${id}`);
      if (html) writeFileSync(cached, html);
      await sleep(300);
    }
    if (!html || !textOf(html).includes('Criminal Cases')) { bad += 1; continue; }
    appendFileSync(DETAIL, `${JSON.stringify({
      candidateId: id, constituency: seat.name, ...parseCandidateDetail(html),
    })}\n`);
    ok += 1;
    if (ok % 25 === 0) console.log(`  ${ok}/${todo.length}`);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
console.log(`done: ${ok} affidavits written to ${DETAIL}${bad ? `, ${bad} unreadable` : ''}`);
