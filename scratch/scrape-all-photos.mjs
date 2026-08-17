import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const repDir = 'content/states/andhra/representatives';
const files = readdirSync(repDir).filter(f => f.endsWith('.json'));

let updated = 0;

for (const file of files) {
  const filePath = join(repDir, file);
  const data = JSON.parse(readFileSync(filePath, 'utf8'));

  if (data.representative.photo !== null) continue;

  const mynetaUrl = data.source?.myneta_url;
  if (!mynetaUrl) continue;

  try {
    const res = await fetch(mynetaUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36' }
    });
    const html = await res.text();
    const match = html.match(/<img[^>]+src=['"]?(https?:\/\/[^\s'">]+images_candidate[^\s'">]+)['"]?/i);
    if (match?.[1]) {
      // Fix case sensitivity
      const url = match[1].replace('andhrapradesh2024', 'AndhraPradesh2024');
      data.representative.photo = {
        url,
        credit: 'Election Commission of India via MyNeta',
        license: 'ECI Affidavit Photo',
        source_url: mynetaUrl
      };
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      updated++;
      process.stdout.write(`✓ ${file}\n`);
    } else {
      process.stdout.write(`- ${file}: no image\n`);
    }
  } catch (e) {
    process.stdout.write(`✗ ${file}: ${e.message}\n`);
  }

  await setTimeout(200);
}

console.log(`\nUpdated: ${updated}`);
