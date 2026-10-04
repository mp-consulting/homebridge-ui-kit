import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = name => join(root, 'dist', name);
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

describe('minified builds', () => {
  for (const name of ['kit.min.js', 'kit.min.css', 'ai.min.css']) {
    test(`${name} has a banner and an external source map pointing at src/`, () => {
      const text = readFileSync(dist(name), 'utf8');
      assert.ok(text.startsWith(`/* @mp-consulting/homebridge-ui-kit v${version} */`));
      assert.match(text, new RegExp(`sourceMappingURL=${name.replace('.', '\\.')}\\.map`));
      const map = JSON.parse(readFileSync(dist(`${name}.map`), 'utf8'));
      assert.ok(map.sources.length > 0);
      assert.ok(map.sources.every(s => s.startsWith('../src/')), map.sources.join());
    });
  }

  test('kit.min.js exposes the same API as kit.js', () => {
    const load = file => {
      const window = {};
      vm.runInNewContext(readFileSync(dist(file), 'utf8'), { window });
      return window.MpKit;
    };
    const full = load('kit.js');
    const min = load('kit.min.js');
    assert.deepEqual(Object.keys(min).sort(), Object.keys(full).sort());
    assert.deepEqual(Object.keys(min.ai).sort(), Object.keys(full.ai).sort());
    assert.equal(min.version, version);
    assert.equal(min.ai.markdown('**a**'), full.ai.markdown('**a**'));
  });

  test('minified stylesheets keep the key rules', () => {
    const kit = readFileSync(dist('kit.min.css'), 'utf8');
    const ai = readFileSync(dist('ai.min.css'), 'utf8');
    assert.match(kit, /\.btn-primary\{/);
    assert.match(kit, /@property --mp-ai-angle/);
    assert.match(ai, /\.mp-ai-halo/);
    assert.doesNotMatch(ai, /\.btn-primary/);
  });
});

describe('ESM build (kit.mjs)', () => {
  test('exports the helpers and a default MpKit', async () => {
    assert.ok(existsSync(dist('kit.mjs')));
    const mod = await import(pathToFileURL(dist('kit.mjs')).href);
    assert.equal(mod.default, mod.MpKit);
    assert.equal(mod.version, version);
    assert.equal(mod.escapeHtml('<b>'), '&lt;b&gt;');
    assert.equal(mod.markdown('`x`'), '<p><code>x</code></p>');
    assert.equal(mod.diffLines('a', 'b').length, 2);
    assert.equal(mod.safeUrl('javascript:x'), null);
    assert.equal(mod.MpKit.ai, mod.ai);
    assert.equal(typeof mod.StatusBadge.online, 'function');
    assert.equal(globalThis.MpKit, undefined, 'the ES module does not set a global');
  });
});
