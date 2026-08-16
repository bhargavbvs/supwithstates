import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const STATE = process.env.STATE ?? 'andhra';
const stateDir = new URL(`../content/states/${STATE}/`, import.meta.url).pathname;
const repDir = join(stateDir, 'representatives');
const manifestPath = join(stateDir, 'photos', 'manifest.json');

function stripTracking(url) {
  const u = new URL(url);
  u.search = '';
  return u.toString();
}

function jsonString(s) {
  return JSON.stringify(s);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const byAcNo = new Map(manifest.map((e) => [e.ac_no, e]));

let merged = 0;
let skippedNoPhoto = 0;
let alreadySet = 0;
let skippedNoNullSlot = 0;

for (const file of readdirSync(repDir).filter((f) => f.endsWith('.json'))) {
  const full = join(repDir, file);
  const text = readFileSync(full, 'utf8');
  const record = JSON.parse(text);
  const acNo = record.constituency?.number;
  const entry = byAcNo.get(acNo);

  if (!entry || !entry.url) {
    skippedNoPhoto++;
    continue;
  }
  if (record.representative.photo) {
    alreadySet++;
    continue;
  }
  if (!/"photo":\s*null/.test(text)) {
    skippedNoNullSlot++;
    console.warn(`${file}: expected "photo": null, found something else — skipped`);
    continue;
  }

  const url = stripTracking(entry.url);
  const replacement =
    `"photo": { "url": ${jsonString(url)}, "credit": ${jsonString(entry.credit)}, "license": ${jsonString(entry.license)} }`;
  const updated = text.replace(/"photo":\s*null/, replacement);

  writeFileSync(full, updated);
  merged++;
}

console.log(
  `merged ${merged} photo(s); ${alreadySet} already set; ${skippedNoPhoto} record(s) with no free photo available yet; ${skippedNoNullSlot} skipped (unexpected format)`
);
