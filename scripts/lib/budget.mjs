import { readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { basename } from 'node:path';

// What a reader pays is the compressed size. Everything here is served
// over a CDN that gzips or brotlis on the way out, so measuring the bytes
// on disk measured the wrong thing: Uttar Pradesh's bundle is 512KB as
// JSON and 70KB gzipped, and it was the 512 that failed the budget.
//
// gzip rather than brotli because gzip is the floor — every client gets at
// least this, and the ones that negotiate brotli do better still.
export function assertBudget(filePath, maxBytes) {
  const onDisk = statSync(filePath).size;
  const actual = gzipSync(readFileSync(filePath)).length;
  if (actual > maxBytes) {
    throw new Error(
      `Budget exceeded: ${basename(filePath)} is ${actual} bytes gzipped (${onDisk} raw), `
      + `limit is ${maxBytes} bytes. Simplify further (raise mapshaper -simplify percentage) `
      + 'or trim properties.'
    );
  }
  return actual;
}
