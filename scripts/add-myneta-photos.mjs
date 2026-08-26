#!/usr/bin/env node
// The affidavit photograph, for records that have none.
//
//   node scripts/add-myneta-photos.mjs content/states/telangana/representatives
//
// Andhra already carries 110 of these beside its 64 from Wikimedia, in
// exactly this shape and under this label — a scan of the photograph a
// candidate filed with the Election Commission, republished by ADR. A
// second state gets its photographs the same way and says the same thing
// about where they came from.
//
// Read out of the pages the crawl already cached, so this costs MyNeta
// nothing at all. A page with no photograph — MyNeta prints the frame
// with an empty filename — is left alone rather than pointed at nothing.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/add-myneta-photos.mjs <records dir>'); process.exit(1); }

const IMG = /<img[^>]+src=['"]?(https?:\/\/[^\s'">]+images_candidate\/[^\s'">]+\.(?:jpe?g|png|jfif))/i;

let added = 0;
let none = 0;
let already = 0;

for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, file);
  const rec = JSON.parse(readFileSync(path, 'utf8'));
  if (rec.representative.photo) { already += 1; continue; }

  const url = new URL(rec.source.myneta_url);
  const election = url.pathname.split('/').filter(Boolean)[0];
  const id = url.searchParams.get('candidate_id');
  const cached = `.myneta-src/pages/${election}/${id}.html`;
  if (!existsSync(cached)) { none += 1; continue; }

  const found = readFileSync(cached, 'utf8').match(IMG);
  if (!found) { none += 1; continue; }

  rec.representative.photo = {
    url: found[1],
    credit: 'Election Commission of India via MyNeta',
    license: 'ECI Affidavit Photo',
    source_url: rec.source.myneta_url,
  };
  writeFileSync(path, `${JSON.stringify(rec, null, 2)}\n`);
  added += 1;
}

console.log(`${dir}: ${added} photographs added, ${none} with none published, ${already} already had one`);
