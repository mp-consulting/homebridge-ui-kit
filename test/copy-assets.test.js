import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyAssets } from '../scripts/copy-assets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'copy-assets.js');
const distFiles = readdirSync(join(root, 'dist')).sort();

describe('copy-assets', () => {
  let tmp;
  before(() => { tmp = mkdtempSync(join(tmpdir(), 'mp-ui-kit-')); });
  after(() => rmSync(tmp, { recursive: true, force: true }));

  const fresh = name => {
    const dir = join(tmp, name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{"name":"plugin"}');
    return dir;
  };

  test('copies dist/ into homebridge-ui/public/lib by default', () => {
    const cwd = fresh('default');
    copyAssets({ cwd });
    const lib = join(cwd, 'homebridge-ui', 'public', 'lib');
    assert.deepEqual(readdirSync(lib).sort(), distFiles);
    assert.ok(distFiles.includes('ai.css'));
    assert.equal(readFileSync(join(lib, 'kit.js'), 'utf8'), readFileSync(join(root, 'dist', 'kit.js'), 'utf8'));
  });

  test('--vendor copies Bootstrap and icons in the plugins\' layout, without source maps', () => {
    const cwd = fresh('vendor');
    const nm = join(cwd, 'node_modules');
    const put = (rel, content) => {
      mkdirSync(dirname(join(nm, rel)), { recursive: true });
      writeFileSync(join(nm, rel), content);
    };
    put('bootstrap/package.json', '{"name":"bootstrap"}');
    put('bootstrap/dist/css/bootstrap.min.css', 'a{}\n/*# sourceMappingURL=bootstrap.min.css.map */');
    put('bootstrap/dist/js/bootstrap.bundle.min.js', 'x()\n//# sourceMappingURL=bootstrap.bundle.min.js.map');
    put('bootstrap-icons/package.json', '{"name":"bootstrap-icons"}');
    put('bootstrap-icons/font/bootstrap-icons.min.css', '.bi{}');
    put('bootstrap-icons/font/fonts/bootstrap-icons.woff', 'woff');
    put('bootstrap-icons/font/fonts/bootstrap-icons.woff2', 'woff2');

    copyAssets({ cwd, vendor: true });
    const lib = join(cwd, 'homebridge-ui', 'public', 'lib');
    assert.deepEqual(readdirSync(lib).sort(), [
      ...distFiles, 'bootstrap-icons.min.css', 'bootstrap.bundle.min.js', 'bootstrap.min.css', 'fonts',
    ].sort());
    assert.deepEqual(readdirSync(join(lib, 'fonts')).sort(), ['bootstrap-icons.woff', 'bootstrap-icons.woff2']);
    assert.doesNotMatch(readFileSync(join(lib, 'bootstrap.min.css'), 'utf8'), /sourceMappingURL/);
    assert.doesNotMatch(readFileSync(join(lib, 'bootstrap.bundle.min.js'), 'utf8'), /sourceMappingURL/);
  });

  test('--vendor skips packages that are not installed', () => {
    const cwd = fresh('no-vendor');
    const messages = [];
    copyAssets({ cwd, vendor: true, log: m => messages.push(m) });
    assert.ok(messages.some(m => m.includes('bootstrap is not installed')));
    assert.deepEqual(readdirSync(join(cwd, 'homebridge-ui', 'public', 'lib')).sort(), distFiles);
  });

  test('CLI honours --dest relative to the working directory', () => {
    const cwd = fresh('cli');
    const out = execFileSync(process.execPath, [script, '--dest', 'ui/assets'], { cwd, encoding: 'utf8' });
    assert.match(out, /✓ ui\/assets\/kit\.css/);
    assert.deepEqual(readdirSync(join(cwd, 'ui', 'assets')).sort(), distFiles);
    assert.equal(existsSync(join(cwd, 'homebridge-ui')), false);
  });

  test('CLI rejects unknown options', () => {
    const cwd = fresh('cli-bad');
    assert.throws(
      () => execFileSync(process.execPath, [script, '--nope'], { cwd, stdio: 'pipe' }),
      err => err.status === 1 && /unknown option --nope/.test(err.stderr.toString()),
    );
  });
});
