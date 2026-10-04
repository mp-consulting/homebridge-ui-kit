#!/usr/bin/env node
// mp-ui-kit-copy — copies the UI kit's dist/ files (kit.css, kit.js, ai.css)
// into a plugin's custom UI folder. Zero dependencies.
//
//   mp-ui-kit-copy                     → <cwd>/homebridge-ui/public/lib/
//   mp-ui-kit-copy --dest <dir>        → <dir> (relative to the current directory)
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
export function copyAssets({ cwd = process.cwd(), dest, vendor = false, log = () => {} } = {}) {
  const target = resolve(cwd, dest || DEFAULT_DEST);
  mkdirSync(target, { recursive: true });
  const written = [];

  for (const name of readdirSync(distDir)) {
    const from = join(distDir, name);
    if (!statSync(from).isFile()) { continue; }
    copyFileSync(from, join(target, name));
    written.push(join(target, name));
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
  const opts = { vendor: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dest') {
      opts.dest = argv[i + 1];
      i += 1;
      if (!opts.dest) { throw new Error('--dest needs a directory'); }
    } else if (arg.startsWith('--dest=')) {
      opts.dest = arg.slice('--dest='.length);
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

const USAGE = `Usage: mp-ui-kit-copy [--dest <dir>] [--vendor]

Copies @mp-consulting/homebridge-ui-kit's dist/ (kit.css, kit.js, ai.css)
into ${DEFAULT_DEST}/ of the current directory.

  --dest <dir>  copy into <dir> instead (relative to the current directory)
  --vendor      also copy bootstrap.min.css, bootstrap.bundle.min.js,
                bootstrap-icons.min.css and fonts/ from your node_modules
  -h, --help    show this help`;

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
