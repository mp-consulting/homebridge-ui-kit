#!/usr/bin/env node
// Concatenates src/*.css into dist/kit.css, builds the standalone dist/ai.css
// (tokens + Assistant components, no Bootstrap overrides) and copies src/kit.js
// to dist/kit.js, stamping the package version into each.
// `--check` verifies the committed dist/ matches src/ without writing.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const check = process.argv.includes('--check');

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const banner = `/* @mp-consulting/homebridge-ui-kit v${version} */\n\n`;
const css = files => banner + files.map(f => readFileSync(join(src, f), 'utf8')).join('\n');

const outputs = {
  'kit.css': css(['tokens.css', 'overrides.css', 'components.css', 'ai.css']),
  'ai.css': css(['tokens.css', 'ai.css']),
  'kit.js': readFileSync(join(src, 'kit.js'), 'utf8').replaceAll('__VERSION__', version),
};

if (check) {
  const stale = Object.keys(outputs).filter(name => {
    const file = join(dist, name);
    return !existsSync(file) || readFileSync(file, 'utf8') !== outputs[name];
  });
  if (stale.length) {
    console.error(`✗ dist is out of date: ${stale.join(', ')} — run \`npm run build\` and commit`);
    process.exit(1);
  }
  console.log('✓ dist is up to date');
} else {
  mkdirSync(dist, { recursive: true });
  for (const [name, content] of Object.entries(outputs)) {
    writeFileSync(join(dist, name), content);
    console.log(`✓ dist/${name}`);
  }
}
