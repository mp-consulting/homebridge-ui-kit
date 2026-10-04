import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { loadDom, root } from './dom.js';

const read = name => readFileSync(join(root, 'dist', name), 'utf8');

function interfaceKeys(source, name) {
  const start = source.indexOf(`export interface ${name} {`);
  const end = source.indexOf('\n}', start);
  return [...source.slice(start, end).matchAll(/^ {2}(\w+)[(?:]/gm)].map(m => m[1]).sort();
}

describe('TypeScript declarations', () => {
  const dts = read('kit.d.ts');
  const dmts = read('kit.d.mts');
  const { MpKit } = loadDom();

  test('MpKitApi covers every runtime member of window.MpKit', () => {
    assert.deepEqual(interfaceKeys(dts, 'MpKitApi'), Object.keys(MpKit).sort());
  });

  test('AiApi covers every runtime member of MpKit.ai', () => {
    assert.deepEqual(interfaceKeys(dts, 'AiApi'), Object.keys(MpKit.ai).sort());
  });

  test('kit.d.mts declares every named export of kit.mjs', async () => {
    const mod = await import(pathToFileURL(join(root, 'dist', 'kit.mjs')).href);
    const declared = [...dmts.matchAll(/^export declare (?:const|function) (\w+)/gm)].map(m => m[1]);
    declared.push('default');
    assert.deepEqual(declared.sort(), Object.keys(mod).sort());
  });

  test('declares the global and is stamped with the version', () => {
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.match(dts, /declare global \{\s*\/\/[^\n]*\n\s*var MpKit: MpKitApi;\s*interface Window \{\s*MpKit: MpKitApi;/);
    assert.ok(dts.includes(`v${version}`));
  });

  test('package.json exports carry types conditions', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.exports['.'].types, './dist/kit.d.mts');
    assert.equal(pkg.exports['./kit.js'].types, './dist/kit.d.ts');
    assert.equal(pkg.exports['./kit.mjs'].types, './dist/kit.d.mts');
    assert.equal(Object.keys(pkg.exports['.'])[0], 'types', 'types must come first');
  });
});
