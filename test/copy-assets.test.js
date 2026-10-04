import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyAssets, browserFiles, loadsKitAndAi } from '../scripts/copy-assets.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts', 'copy-assets.js');
const distFiles = browserFiles();

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

  test('copies browser files only, without source map references', () => {
    assert.ok(distFiles.includes('kit.min.css'));
    assert.ok(distFiles.includes('theme-boot.js'));
    assert.ok(!distFiles.some(f => f.endsWith('.map') || f.endsWith('.d.ts')), distFiles.join());
    const cwd = fresh('nomaps');
    copyAssets({ cwd });
    const lib = join(cwd, 'homebridge-ui', 'public', 'lib');
    assert.doesNotMatch(readFileSync(join(lib, 'kit.min.js'), 'utf8'), /sourceMappingURL/);
    assert.doesNotMatch(readFileSync(join(lib, 'kit.min.css'), 'utf8'), /sourceMappingURL/);
  });

  test('--only copies just the named files', () => {
    const cwd = fresh('only');
    const out = execFileSync(process.execPath, [script, '--only', 'kit.min.css,kit.min.js', '--only=theme-boot.js'],
      { cwd, encoding: 'utf8' });
    assert.match(out, /✓ homebridge-ui\/public\/lib\/kit\.min\.css/);
    assert.deepEqual(readdirSync(join(cwd, 'homebridge-ui', 'public', 'lib')).sort(),
      ['kit.min.css', 'kit.min.js', 'theme-boot.js']);
  });

  test('--only rejects unknown files and lists the available ones', () => {
    const cwd = fresh('only-bad');
    assert.throws(() => copyAssets({ cwd, only: ['kit.css', 'nope.css'] }), /unknown file nope\.css \(available: .*kit\.css/);
    assert.throws(
      () => execFileSync(process.execPath, [script, '--only'], { cwd, stdio: 'pipe' }),
      err => err.status === 1 && /--only needs/.test(err.stderr.toString()),
    );
  });

  test('warns when a page loads both kit.css and ai.css', () => {
    const cwd = fresh('double');
    mkdirSync(join(cwd, 'homebridge-ui', 'public'), { recursive: true });
    writeFileSync(join(cwd, 'homebridge-ui', 'public', 'index.html'),
      '<link rel="stylesheet" href="lib/kit.css"><link rel="stylesheet" href="lib/ai.min.css?v=1">');
    const messages = [];
    copyAssets({ cwd, log: m => messages.push(m) });
    assert.ok(messages.some(m => /index\.html loads both kit\.css and ai\.css/.test(m)), messages.join());
    const out = execFileSync(process.execPath, [script], { cwd, encoding: 'utf8' });
    assert.match(out, /loads both kit\.css and ai\.css/);
  });

  test('loadsKitAndAi only flags real double loads', () => {
    assert.equal(loadsKitAndAi('<link href="lib/kit.css"><link href="lib/ai.css">'), true);
    assert.equal(loadsKitAndAi('<link rel="stylesheet" href="kit.min.css"><link href=\'ai.css\'>'), true);
    assert.equal(loadsKitAndAi('<link href="lib/kit.css">'), false);
    assert.equal(loadsKitAndAi('<link href="lib/ai.css"><link href="glass-ai.css">'), false);
    assert.equal(loadsKitAndAi('<link href="lib/kit.css"><link href="mp-ai.css">'), false);
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
