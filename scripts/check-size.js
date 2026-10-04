#!/usr/bin/env node
// Fails when a minified dist/ file exceeds its size budget (bytes, gzip).
// Raise a budget deliberately, in the same change that needs it.
import { readFileSync } from 'fs';
import { gzipSync } from 'zlib';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

export const BUDGETS = {
  'kit.min.js': 20 * 1024,
  'kit.min.css': 7 * 1024,
  'ai.min.css': 4 * 1024,
  'theme-boot.js': 512,
};

const kb = n => `${(n / 1024).toFixed(1)} kB`;
let failed = false;
for (const [name, budget] of Object.entries(BUDGETS)) {
  const raw = readFileSync(join(dist, name));
  const gz = gzipSync(raw, { level: 9 }).length;
  const ok = gz <= budget;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(14)} ${kb(gz).padStart(8)} gzip / ${kb(budget)} budget  (${kb(raw.length)} raw)`);
}
if (failed) {
  console.error('✗ size budget exceeded — trim the change or raise the budget in scripts/check-size.js');
  process.exit(1);
}
