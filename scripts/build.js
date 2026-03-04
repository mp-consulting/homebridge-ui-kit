#!/usr/bin/env node
// Concatenates src/*.css into dist/kit.css and copies src/kit.js to dist/kit.js

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src');
const dist = join(root, 'dist');

mkdirSync(dist, { recursive: true });

const cssFiles = ['tokens.css', 'overrides.css', 'components.css'];
const header = `/* @mp-consulting/homebridge-ui-kit v${JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version} */\n\n`;

const css = header + cssFiles.map(f => readFileSync(join(src, f), 'utf8')).join('\n');
writeFileSync(join(dist, 'kit.css'), css);

const js = readFileSync(join(src, 'kit.js'), 'utf8');
writeFileSync(join(dist, 'kit.js'), js);

console.log('✓ dist/kit.css');
console.log('✓ dist/kit.js');
