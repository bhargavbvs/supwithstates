#!/usr/bin/env node
// One state, end to end.
//
//   node scripts/build-state.mjs kerala
//   node scripts/build-state.mjs            # every buildable state
//
// The steps have to run in this order and all of them have to run. Two of
// them were easy to forget while this was five separate commands, and both
// omissions were silent: a state built without the photograph steps looks
// finished and ships four thousand members with no faces, and a state
// built without build-data does not reach the site at all.
//
// Nothing here re-crawls. Photographs come out of the pages the affidavit
// crawl already cached, and the Wikipedia step only runs for members ADR
// published no photograph for — see scripts/fetch-wiki-photos.mjs for why
// those exist and how identity is proved before a face is attached to a
// name.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { buildable, STATES } from './lib/states.mjs';

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const slugs = only.length ? only : buildable();
const skipGeo = process.argv.includes('--no-geo');

const run = (cmd, args, env = {}) => {
  try {
    execFileSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
    return true;
  } catch { return false; }
};

for (const slug of slugs) {
  const cfg = STATES[slug];
  if (!cfg) { console.error(`unknown state: ${slug}`); process.exitCode = 1; continue; }
  if (cfg.blocked) { console.log(`— ${slug}: held back — ${cfg.note}`); continue; }
  console.log(`\n=== ${cfg.name} ===`);

  // Andhra's constituencies were built from a source of their own and
  // checked seat by seat; rebuilding them moves vertices for no gain, so
  // its geometry is only ever re-cut into districts.
  if (!skipGeo) {
    run('node', ['scripts/simplify-geo.mjs'],
      slug === 'andhra' ? { STATE: slug, DISTRICTS_ONLY: '1' } : { STATE: slug });
  }
  run('node', ['scripts/build-state-json.mjs', slug]);
  if (!run('node', ['scripts/build-state-records.mjs', slug])) {
    console.error(`  ${slug}: records failed — stopping here for this state`);
    process.exitCode = 1;
    continue;
  }
  run('node', ['scripts/build-state-records.mjs', slug, '--mps']);

  for (const kind of ['representatives', 'mps']) {
    const dir = `content/states/${slug}/${kind}`;
    if (!existsSync(dir)) continue;
    run('node', ['scripts/add-myneta-photos.mjs', dir]);
    run('node', ['scripts/fetch-wiki-photos.mjs', dir]);
  }
}

console.log('\n=== bundles ===');
run('node', ['scripts/build-data.mjs']);
