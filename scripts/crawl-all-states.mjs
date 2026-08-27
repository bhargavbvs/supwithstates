#!/usr/bin/env node
// Every state's assembly affidavits, one state at a time.
//
//   node scripts/crawl-all-states.mjs
//
// Sequential on purpose. Each state's crawl is already three at a time
// with a pause; running several states at once would multiply that by the
// number of states and turn a courtesy into a flood. MyNeta is run by a
// small non-profit as a public service and there is no version of this
// worth degrading it for. Measured on Goa: 38 affidavits in 22 seconds,
// so the whole country is well under an hour at this rate.
//
// Resumable at both levels: a state whose detail file is complete is
// skipped, and within a state a candidate already written is never
// fetched again.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const full = JSON.parse(readFileSync('content/representatives-full.json', 'utf8'));
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));

const elections = Object.entries(full.elections)
  .filter(([, e]) => e.house === 'assembly')
  .map(([slug, e]) => ({ slug, ...e }))
  .filter((e) => !only.length || only.includes(e.slug) || only.includes(e.state))
  .sort((a, b) => a.constituencies - b.constituencies);

const started = Date.now();
let done = 0;
for (const e of elections) {
  const detail = `.myneta-src/detail-${e.slug}.ndjson`;
  const held = existsSync(detail)
    ? readFileSync(detail, 'utf8').split('\n').filter(Boolean).length : 0;
  const winners = full.constituencies.filter((c) => c.election === e.slug && c.winner?.candidateId).length;
  if (held >= winners) { console.log(`— ${e.slug}: ${held}/${winners} already held`); done += 1; continue; }
  console.log(`\n▸ ${e.slug} (${e.state}, ${winners} winners, ${held} held)`);
  try {
    execFileSync('node', ['scripts/crawl-myneta.mjs', e.slug], { stdio: 'inherit' });
    done += 1;
  } catch {
    console.error(`  ${e.slug} failed — moving on, rerun to resume`);
  }
}
console.log(`\n${done}/${elections.length} states in ${Math.round((Date.now() - started) / 1000)}s`);
