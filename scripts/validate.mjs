#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateState } from './lib/validate-state.mjs';
import { validateRepresentative } from './lib/validate-representative.mjs';
import { validatePromise, validatePromiseSet } from './lib/validate-promise.mjs';

export function validateContent(stateDir) {
  const errors = [];
  const statePath = join(stateDir, 'state.json');

  if (!existsSync(statePath)) return { errors: [`missing ${statePath}`], count: 0 };

  let state;
  try {
    state = JSON.parse(readFileSync(statePath, 'utf8'));
  } catch (err) {
    return { errors: [`state.json: ${err.message}`], count: 0 };
  }
  for (const m of validateState(state)) errors.push(`state.json: ${m}`);

  const repDir = join(stateDir, 'representatives');
  if (!existsSync(repDir)) return { errors, count: 0 };

  const files = readdirSync(repDir).filter((f) => f.endsWith('.json'));
  const seen = new Map();

  for (const file of files) {
    let rec;
    try {
      rec = JSON.parse(readFileSync(join(repDir, file), 'utf8'));
    } catch (err) {
      errors.push(`${file}: invalid JSON — ${err.message}`);
      continue;
    }
    for (const m of validateRepresentative(rec, { assemblySize: state.assembly_size })) {
      errors.push(`${file}: ${m}`);
    }
    const n = rec?.constituency?.number;
    if (Number.isInteger(n)) {
      if (seen.has(n)) errors.push(`${file}: duplicate constituency number ${n} (also in ${seen.get(n)})`);
      else seen.set(n, file);
    }
  }

  const promiseSetsDir = join(stateDir, 'promise-sets');
  let promiseSetsCount = 0;
  if (existsSync(promiseSetsDir)) {
    const pFiles = readdirSync(promiseSetsDir).filter((f) => f.endsWith('.json'));
    promiseSetsCount = pFiles.length;
    for (const file of pFiles) {
      let rec;
      try {
        rec = JSON.parse(readFileSync(join(promiseSetsDir, file), 'utf8'));
      } catch (err) {
        errors.push(`${file}: invalid JSON — ${err.message}`);
        continue;
      }
      for (const m of validatePromiseSet(rec)) errors.push(`promise-sets/${file}: ${m}`);
    }
  }

  const promisesDir = join(stateDir, 'promises');
  let promisesCount = 0;
  if (existsSync(promisesDir)) {
    const pFiles = readdirSync(promisesDir).filter((f) => f.endsWith('.json'));
    promisesCount = pFiles.length;
    for (const file of pFiles) {
      let rec;
      try {
        rec = JSON.parse(readFileSync(join(promisesDir, file), 'utf8'));
      } catch (err) {
        errors.push(`${file}: invalid JSON — ${err.message}`);
        continue;
      }
      for (const m of validatePromise(rec)) errors.push(`promises/${file}: ${m}`);
    }
  }

  return { errors, count: files.length, promisesCount, promiseSetsCount };
}

const stateSlug = process.env.STATE ?? 'andhra';
const dir = new URL(`../content/states/${stateSlug}/`, import.meta.url).pathname;

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, count, promisesCount } = validateContent(dir);
  if (errors.length) {
    console.error(`\n✖ ${errors.length} problem(s) in ${stateSlug}:\n`);
    for (const m of errors) console.error(`  ${m}`);
    process.exit(1);
  }
  console.log(`✔ ${stateSlug}: ${count} representative record(s), ${promisesCount ?? 0} promise(s) valid`);
}
