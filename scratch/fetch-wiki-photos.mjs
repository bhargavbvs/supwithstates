/**
 * Fetch freely-licensed photos for AP MLAs via Wikipedia / Wikimedia Commons API.
 * 
 * Strategy:
 *  1. For each MLA without a photo, derive a Wikipedia slug from their name
 *  2. Call Wikipedia pageimages API to find their lead image
 *  3. Call Wikimedia Commons imageinfo API to verify license is free (CC/PD)
 *  4. If free, update the representative JSON file
 * 
 * Only freely-licensed images (CC BY, CC BY-SA, CC0, Public Domain) are used.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const FREE_LICENSES = [
  'cc-by-sa', 'cc-by', 'cc0', 'public domain', 'pd', 'cc-pd',
  'attribution', 'creative commons', 'government of india', 'government work'
];

function isFree(license) {
  if (!license) return false;
  const l = license.toLowerCase();
  return FREE_LICENSES.some(f => l.includes(f));
}

// Try multiple Wikipedia name variants for each MLA
function nameVariants(name) {
  const base = name.trim();
  // e.g. "Yarapathineni Srinivasa Rao" → also try "Y. Srinivasa Rao"
  const parts = base.split(/\s+/);
  const variants = [base.replace(/\s+/g, '_')];
  if (parts.length >= 3) {
    variants.push(`${parts[0][0]}._${parts.slice(1).join('_')}`);
  }
  return variants;
}

async function getWikipediaImage(name) {
  for (const slug of nameVariants(name)) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&titles=${encodeURIComponent(slug)}&pithumbsize=400&format=json&piprop=original`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'ssupwithstates/1.0 (civic data project)' } });
      if (!res.ok) continue;
      const data = await res.json();
      const pages = Object.values(data?.query?.pages ?? {});
      const page = pages.find(p => !p.missing && p.original?.source);
      if (page) return page.original.source;
    } catch {}
    await setTimeout(200);
  }
  return null;
}

async function getCommonsLicense(imageUrl) {
  // Extract file name from URL
  const match = imageUrl.match(/commons\/[a-z]\/[a-z]{2}\/(.+?)(?:\?|$)/i) ||
                imageUrl.match(/commons\/thumb\/[a-z]\/[a-z]{2}\/(.+?)\/\d/i);
  if (!match) return null;

  const fileName = decodeURIComponent(match[1]);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fileName)}&prop=imageinfo&iiprop=extmetadata&format=json`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ssupwithstates/1.0 (civic data project)' } });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data?.query?.pages ?? {});
    const page = pages[0];
    const meta = page?.imageinfo?.[0]?.extmetadata;
    if (!meta) return null;

    const license = meta.LicenseShortName?.value || meta.License?.value || meta.LicenseName?.value || '';
    const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '') || '';
    return { license, artist };
  } catch {}
  return null;
}

const repDir = 'content/states/andhra/representatives';
const files = readdirSync(repDir).filter(f => f.endsWith('.json'));

let updated = 0, checked = 0, skipped = 0;

for (const file of files) {
  const filePath = join(repDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  if (data.representative.photo !== null) continue; // already has a photo

  const name = data.representative.name;
  checked++;
  console.log(`[${checked}] Looking up: ${name}...`);

  const imgUrl = await getWikipediaImage(name);
  if (!imgUrl) {
    console.log(`  → No Wikipedia image found`);
    skipped++;
    await setTimeout(150);
    continue;
  }

  console.log(`  → Found: ${imgUrl.slice(0, 80)}...`);
  const licenseInfo = await getCommonsLicense(imgUrl);

  if (!licenseInfo || !isFree(licenseInfo.license)) {
    console.log(`  → License not free: ${licenseInfo?.license ?? 'unknown'}`);
    skipped++;
    await setTimeout(150);
    continue;
  }

  // Strip tracking params from URL
  const cleanUrl = imgUrl.split('?')[0];

  data.representative.photo = {
    url: cleanUrl,
    credit: licenseInfo.artist || 'Wikimedia Commons',
    license: licenseInfo.license,
    source_url: `https://en.wikipedia.org/wiki/${nameVariants(name)[0]}`
  };

  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  updated++;
  console.log(`  ✓ Saved (${licenseInfo.license})`);
  await setTimeout(300);
}

console.log(`\nDone. Checked: ${checked}, Updated: ${updated}, No free photo: ${skipped}`);
