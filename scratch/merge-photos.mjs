import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const manifest = JSON.parse(readFileSync('content/states/andhra/photos/manifest.json', 'utf8'));
const photosByAc = new Map(manifest.map(m => [m.ac_no, m]));

const repDir = 'content/states/andhra/representatives';
const files = readdirSync(repDir).filter(f => f.endsWith('.json'));

let updated = 0;

for (const file of files) {
  const filePath = join(repDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  
  const ac_no = data.constituency.number;
  const photoManifest = photosByAc.get(ac_no);
  
  if (photoManifest && photoManifest.url) {
    data.representative.photo = {
      url: photoManifest.url,
      credit: photoManifest.credit || null,
      license: photoManifest.license || 'Public Domain',
      source_url: photoManifest.source_page || null
    };
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    updated++;
  }
}

console.log(`Updated ${updated} representative files with photos.`);
