import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repDir = 'content/states/andhra/representatives';
const files = readdirSync(repDir).filter(f => f.endsWith('.json'));

let updated = 0;

for (const file of files) {
  const filePath = join(repDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));
  
  if (data.representative.photo && data.representative.photo.url) {
    const url = data.representative.photo.url;
    if (url.includes('myneta.info') && url.includes('andhrapradesh2024')) {
      // Fix the case sensitivity issue
      data.representative.photo.url = url.replace('andhrapradesh2024', 'AndhraPradesh2024');
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      updated++;
    }
  }
}

console.log(`Fixed URLs in ${updated} records.`);
