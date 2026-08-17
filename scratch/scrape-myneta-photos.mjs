import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';

const repDir = 'content/states/andhra/representatives';
const files = readdirSync(repDir).filter(f => f.endsWith('.json'));

async function run() {
  let updated = 0;
  
  for (const file of files) {
    const filePath = join(repDir, file);
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    
    if (data.representative.photo === null) {
      const mynetaUrl = data.source.myneta_url;
      if (!mynetaUrl) continue;
      
      console.log(`Fetching photo for ${file}...`);
      try {
        const response = await fetch(mynetaUrl);
        if (!response.ok) {
          console.error(`Failed to fetch ${mynetaUrl}: ${response.status}`);
          continue;
        }
        
        const html = await response.text();
        // Look for the candidate image URL, which might not be quoted!
        // e.g. <img src=https://myneta.info/images_candidate/... alt='profile image'>
        const match = html.match(/<img[^>]+src=['"]?(https?:\/\/[^\s'">]+images_candidate[^\s'">]+)['"]?/i);
        
        if (match && match[1]) {
          const fullUrl = match[1];
          
          data.representative.photo = {
            url: fullUrl,
            credit: "MyNeta / Election Commission of India",
            license: "Fair Use (Educational)",
            source_url: mynetaUrl
          };
          
          writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
          updated++;
          console.log(` -> Found: ${fullUrl}`);
        } else {
          console.log(` -> No photo found on page.`);
        }
        
        // Polite delay
        await setTimeout(200);
      } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
      }
    }
  }
  
  console.log(`Updated ${updated} records with MyNeta photos.`);
}

run();
