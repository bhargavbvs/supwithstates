#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateState } from './lib/validate-state.mjs';
import { validateRepresentative } from './lib/validate-representative.mjs';

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

  return { errors, count: files.length };
}

const stateSlug = process.env.STATE ?? 'andhra';
const dir = new URL(`../content/states/${stateSlug}/`, import.meta.url).pathname;

if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, count } = validateContent(dir);
  if (errors.length) {
    console.error(`\n✖ ${errors.length} problem(s) in ${stateSlug}:\n`);
    for (const m of errors) console.error(`  ${m}`);
    process.exit(1);
  }
  console.log(`✔ ${stateSlug}: ${count} representative record(s) valid`);
}
