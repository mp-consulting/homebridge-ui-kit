#!/usr/bin/env node
// Builds dist/ from src/:
//   kit.css      tokens + Bootstrap overrides + components + Assistant (concatenated)
//   ai.css       tokens + Assistant components only (no Bootstrap overrides)
//   kit.js       classic script exposing window.MpKit (IIFE, readable)
//   kit.mjs      ES module with named exports (readable)
//   *.min.css / kit.min.js  minified, each with an external source map
//   theme-boot.js tiny <head> script that applies the theme before first paint
//   kit.d.ts / kit.d.mts  TypeScript declarations (copied from src/types)
// The package version is stamped into each file.
// `--check` verifies the committed dist/ matches src/ without writing.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import * as esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const check = process.argv.includes('--check');

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const bannerText = `/* @mp-consulting/homebridge-ui-kit v${version} */`;
const banner = `${bannerText}\n\n`;
const read = rel => readFileSync(join(src, rel), 'utf8');

const CSS_BUNDLES = {
  kit: ['tokens.css', 'overrides.css', 'components.css', 'ai.css'],
  ai: ['tokens.css', 'ai.css'],
};

// Readable stylesheets are a plain concatenation, as before.
const outputs = {};
for (const [name, files] of Object.entries(CSS_BUNDLES)) {
  outputs[`${name}.css`] = banner + files.map(read).join('\n');
}

const define = { __VERSION__: JSON.stringify(version) };
const shared = {
  bundle: true,
  write: false,
  logLevel: 'silent',
  legalComments: 'none',
  charset: 'utf8',
  target: ['es2019', 'chrome90', 'firefox88', 'safari14'],
  define,
};

async function collect(result, outdir = dist) {
  for (const file of result.outputFiles) {
    let text = file.text;
    // esbuild names source map sources relative to the output file; keep them
    // stable and readable (../src/…).
    if (file.path.endsWith('.map')) {
      const map = JSON.parse(text);
      map.sourceRoot = '';
      text = `${JSON.stringify(map)}\n`;
    }
    outputs[file.path.slice(outdir.length + 1)] = text;
  }
}

// Minified stylesheets: bundle @imports of the sources so maps point at src/.
for (const [name, files] of Object.entries(CSS_BUNDLES)) {
  await collect(await esbuild.build({
    ...shared,
    stdin: {
      contents: files.map(f => `@import "./${f}";`).join('\n'),
      resolveDir: src,
      sourcefile: `${name}-bundle.css`,
      loader: 'css',
    },
    target: ['chrome100', 'firefox100', 'safari15'],
    minify: true,
    sourcemap: 'linked',
    banner: { css: bannerText },
    outfile: join(dist, `${name}.min.css`),
  }));
}

// Scripts.
const jsBanner = { js: `${bannerText.slice(0, -3)}\n   Brand design system for Homebridge plugins\n   https://github.com/mp-consulting/homebridge-ui-kit */` };
await collect(await esbuild.build({
  ...shared,
  entryPoints: [join(src, 'js', 'global.js')],
  format: 'iife',
  banner: jsBanner,
  outfile: join(dist, 'kit.js'),
}));
await collect(await esbuild.build({
  ...shared,
  entryPoints: [join(src, 'js', 'global.js')],
  format: 'iife',
  minify: true,
  sourcemap: 'linked',
  banner: { js: bannerText },
  outfile: join(dist, 'kit.min.js'),
}));
await collect(await esbuild.build({
  ...shared,
  entryPoints: [join(src, 'js', 'index.js')],
  format: 'esm',
  banner: jsBanner,
  outfile: join(dist, 'kit.mjs'),
}));

// Optional extra entries (added by later features) are picked up when present.
const extras = [
  ['js/theme-boot.js', 'theme-boot.js'],
];
for (const [from, to] of extras) {
  if (!existsSync(join(src, from))) { continue; }
  await collect(await esbuild.build({
    ...shared,
    entryPoints: [join(src, from)],
    format: 'iife',
    minify: true,
    banner: { js: bannerText },
    outfile: join(dist, to),
  }));
}
for (const name of ['kit.d.ts', 'kit.d.mts']) {
  const file = join(src, 'types', name);
  if (existsSync(file)) {
    outputs[name] = readFileSync(file, 'utf8').replaceAll('__VERSION__', version);
  }
}

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
    console.log(`✓ dist/${basename(name)}`);
  }
}
