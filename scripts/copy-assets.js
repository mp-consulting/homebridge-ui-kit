#!/usr/bin/env node
// mp-ui-kit-copy — copies the UI kit's browser files from dist/ (kit.css,
// kit.js, ai.css, their .min variants, theme-boot.js, …) into a plugin's
// custom UI folder. Zero dependencies.
//
//   mp-ui-kit-copy                     → <cwd>/homebridge-ui/public/lib/
//   mp-ui-kit-copy --dest <dir>        → <dir> (relative to the current directory)
//   mp-ui-kit-copy --only a,b          → only these dist files (e.g. kit.min.css,kit.min.js)
//   mp-ui-kit-copy --vendor            → also Bootstrap / Bootstrap Icons from the
//                                        plugin's node_modules (lib/ + lib/fonts/)

import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync,
} from 'fs';
import { createRequire } from 'module';
import { basename, dirname, join, relative, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');

export const DEFAULT_DEST = join('homebridge-ui', 'public', 'lib');

// Same layout the plugins' former `copy:ui-assets` scripts produced.
const VENDOR = [
  {
    pkg: 'bootstrap',
    files: [
      ['dist/css/bootstrap.min.css', '.'],
      ['dist/js/bootstrap.bundle.min.js', '.'],
    ],
  },
  {
    pkg: 'bootstrap-icons',
    files: [
      ['font/bootstrap-icons.min.css', '.'],
      ['font/fonts/bootstrap-icons.woff', 'fonts'],
      ['font/fonts/bootstrap-icons.woff2', 'fonts'],
    ],
  },
];

// The plugin UI does not serve source maps, so drop the references to them.
const SOURCE_MAP = /^\s*\/[*/]# sourceMappingURL=.*$/gm;

// Source maps and TypeScript declarations are not served to the browser.
const NOT_FOR_BROWSER = /\.(map|d\.ts|d\.mts)$/;

/** The dist/ files the CLI can copy. */
export function browserFiles() {
  return readdirSync(distDir)
    .filter(name => statSync(join(distDir, name)).isFile() && !NOT_FOR_BROWSER.test(name))
    .sort();
}

const KIT_CSS = /(?:^|\/)kit(?:\.min)?\.css$/;
const AI_CSS = /(?:^|\/)ai(?:\.min)?\.css$/;
const STYLESHEET_HREF = /<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;

/**
 * True when an HTML document links both kit.css and ai.css (or their .min
 * variants). kit.css already contains ai.css, so loading both duplicates it.
 */
export function loadsKitAndAi(html) {
  const hrefs = Array.from(String(html).matchAll(STYLESHEET_HREF), m => m[1].split(/[?#]/)[0]);
  return hrefs.some(h => KIT_CSS.test(h)) && hrefs.some(h => AI_CSS.test(h));
}

function findPackage(cwd, pkg) {
  try {
    const require = createRequire(join(cwd, 'package.json'));
    return dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    const local = join(cwd, 'node_modules', pkg);
    return existsSync(local) ? local : null;
  }
}

/**
 * Copies the kit into `dest` (default `<cwd>/homebridge-ui/public/lib`).
 * Returns the list of written file paths.
 */
export function copyAssets({
  cwd = process.cwd(), dest, vendor = false, only, log = () => {},
} = {}) {
  const target = resolve(cwd, dest || DEFAULT_DEST);
  const available = browserFiles();
  let names = available;
  if (only && only.length) {
    const unknown = only.filter(n => !available.includes(n));
    if (unknown.length) {
      throw new Error(`--only: unknown file ${unknown.join(', ')} (available: ${available.join(', ')})`);
    }
    names = available.filter(n => only.includes(n));
  }
  mkdirSync(target, { recursive: true });
  const written = [];

  for (const name of names) {
    const from = join(distDir, name);
    const to = join(target, name);
    if (/\.(css|js|mjs)$/.test(name)) {
      // The .map files are not copied, so drop the references to them.
      writeFileSync(to, readFileSync(from, 'utf8').replace(SOURCE_MAP, ''));
    } else {
      copyFileSync(from, to);
    }
    written.push(to);
  }

  // kit.css already contains ai.css: warn when a page next to lib/ loads both.
  const pageDir = dirname(target);
  if (existsSync(pageDir)) {
    for (const page of readdirSync(pageDir).filter(n => n.endsWith('.html'))) {
      if (loadsKitAndAi(readFileSync(join(pageDir, page), 'utf8'))) {
        log(`! ${relative(cwd, join(pageDir, page))} loads both kit.css and ai.css; `
          + 'kit.css already includes ai.css, so load only one of them');
      }
    }
  }

  if (vendor) {
    for (const { pkg, files } of VENDOR) {
      const root = findPackage(cwd, pkg);
      if (!root) {
        log(`- ${pkg} is not installed; skipped`);
        continue;
      }
      for (const [rel, sub] of files) {
        const from = join(root, rel);
        if (!existsSync(from)) {
          log(`- ${pkg}/${rel} not found; skipped`);
          continue;
        }
        const dir = join(target, sub);
        mkdirSync(dir, { recursive: true });
        const to = join(dir, basename(rel));
        if (/\.(css|js)$/.test(rel)) {
          writeFileSync(to, readFileSync(from, 'utf8').replace(SOURCE_MAP, ''));
        } else {
          copyFileSync(from, to);
        }
        written.push(to);
      }
    }
  }

  return written;
}

function parseArgs(argv) {
  const opts = { vendor: false, help: false, only: [] };
  const addOnly = value => {
    if (!value) { throw new Error('--only needs a comma-separated list of files'); }
    opts.only.push(...value.split(',').map(v => v.trim()).filter(Boolean));
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dest') {
      opts.dest = argv[i + 1];
      i += 1;
      if (!opts.dest) { throw new Error('--dest needs a directory'); }
    } else if (arg.startsWith('--dest=')) {
      opts.dest = arg.slice('--dest='.length);
    } else if (arg === '--only') {
      addOnly(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--only=')) {
      addOnly(arg.slice('--only='.length));
    } else if (arg === '--vendor') {
      opts.vendor = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else {
      throw new Error(`unknown option ${arg}`);
    }
  }
  return opts;
}

const USAGE = `Usage: mp-ui-kit-copy [--dest <dir>] [--only <files>] [--vendor]

Copies @mp-consulting/homebridge-ui-kit's browser files (kit.css, kit.js,
ai.css, their .min variants, theme-boot.js, …) into ${DEFAULT_DEST}/ of the
current directory.

  --dest <dir>     copy into <dir> instead (relative to the current directory)
  --only <files>   copy only these dist files, comma-separated
                   (e.g. --only kit.min.css,kit.min.js,theme-boot.js)
  --vendor         also copy bootstrap.min.css, bootstrap.bundle.min.js,
                   bootstrap-icons.min.css and fonts/ from your node_modules
  -h, --help       show this help

Note: kit.css already contains ai.css. Load one of them, never both.`;

function isMain() {
  if (!process.argv[1]) { return false; }
  try {
    return import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
  } catch {
    return false;
  }
}

if (isMain()) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      console.log(USAGE);
    } else {
      const cwd = process.cwd();
      const written = copyAssets({ ...opts, cwd, log: msg => console.log(msg) });
      for (const file of written) { console.log(`✓ ${relative(cwd, file)}`); }
    }
  } catch (err) {
    console.error(`mp-ui-kit-copy: ${err.message}\n\n${USAGE}`);
    process.exit(1);
  }
}
