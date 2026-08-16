import { statSync } from 'node:fs';
import { basename } from 'node:path';

export function assertBudget(filePath, maxBytes) {
  const actual = statSync(filePath).size;
  if (actual > maxBytes) {
    throw new Error(
      `Budget exceeded: ${basename(filePath)} is ${actual} bytes, limit is ${maxBytes} bytes. ` +
      `Simplify further (raise mapshaper -simplify percentage) or trim properties.`
    );
  }
  return actual;
}
