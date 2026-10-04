import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadDom, fakeMedia } from './dom.js';

const html = d => d.documentElement;

describe('MpKit.Theme helpers', () => {
  const { MpKit } = loadDom();
  const { Theme } = MpKit;

  test('normalize accepts host spellings', () => {
    assert.equal(Theme.normalize('Dark'), 'dark');
    assert.equal(Theme.normalize('dark-mode'), 'dark');
    assert.equal(Theme.normalize('light'), 'light');
    assert.equal(Theme.normalize('system'), 'auto');
    assert.equal(Theme.normalize('auto'), 'auto');
    assert.equal(Theme.normalize('deep-purple'), null);
    assert.equal(Theme.normalize(undefined), null);
  });

  test('resolve combines preference and system', () => {
    assert.equal(Theme.resolve('auto', true), 'dark');
    assert.equal(Theme.resolve('auto', false), 'light');
    assert.equal(Theme.resolve('light', true), 'light');
    assert.equal(Theme.resolve('dark', false), 'dark');
  });

  test('fromSettings reads colorScheme, then theme', () => {
    assert.equal(Theme.fromSettings({ colorScheme: 'dark' }), 'dark');
    assert.equal(Theme.fromSettings({ theme: 'auto' }), 'auto');
    assert.equal(Theme.fromSettings({ colorScheme: 'auto', theme: 'dark' }), 'auto');
    assert.equal(Theme.fromSettings(null), null);
  });
});

describe('MpKit.Theme.init', () => {
  test('applies the system preference synchronously and follows changes', async () => {
    const media = fakeMedia(true);
    const { MpKit, document } = loadDom({ media });
    const changes = [];
    const theme = MpKit.Theme.init({ onChange: (r, p) => changes.push([r, p]) });
    assert.equal(html(document).getAttribute('data-bs-theme'), 'dark');
    assert.equal(html(document).classList.contains('mp-theme-dark'), true);
    assert.equal(await theme.ready, 'dark');
    media.set(false);
    assert.equal(html(document).getAttribute('data-bs-theme'), 'light');
    assert.equal(html(document).classList.contains('mp-theme-dark'), false);
    assert.deepEqual(changes, [['light', 'auto']]);
    theme.destroy();
    assert.equal(media.listenerCount(), 0);
  });

  test('the Homebridge user setting wins over the system preference', async () => {
    const media = fakeMedia(false);
    const homebridge = { getUserSettings: async () => ({ colorScheme: 'dark' }) };
    const { MpKit, document, window } = loadDom({ media, homebridge });
    const theme = MpKit.Theme.init();
    assert.equal(html(document).getAttribute('data-bs-theme'), 'light');
    assert.equal(await theme.ready, 'dark');
    assert.equal(html(document).getAttribute('data-bs-theme'), 'dark');
    assert.equal(window.localStorage.getItem('mp-kit-theme'), 'dark');
    media.set(true);
    media.set(false);
    assert.equal(html(document).getAttribute('data-bs-theme'), 'dark', 'a fixed preference ignores the system');
  });

  test('a Homebridge "auto" setting follows the system live', async () => {
    const media = fakeMedia(false);
    const homebridge = { getUserSettings: async () => ({ colorScheme: 'auto' }) };
    const { MpKit, document } = loadDom({ media, homebridge, storage: { 'mp-kit-theme': 'light' } });
    const theme = MpKit.Theme.init();
    await theme.ready;
    assert.equal(theme.preference(), 'auto');
    media.set(true);
    assert.equal(html(document).getAttribute('data-bs-theme'), 'dark');
  });

  test('falls back to userCurrentLightingMode() and tolerates failures', async () => {
    const homebridge = {
      getUserSettings: async () => { throw new Error('not supported'); },
      userCurrentLightingMode: async () => 'dark',
    };
    const { MpKit } = loadDom({ homebridge });
    assert.equal(await MpKit.Theme.init().ready, 'dark');
  });

  test('works without Homebridge and uses the stored preference', async () => {
    const { MpKit, document } = loadDom({ media: fakeMedia(true), storage: { 'mp-kit-theme': 'light' } });
    const theme = MpKit.Theme.init();
    assert.equal(html(document).getAttribute('data-bs-theme'), 'light');
    assert.equal(await theme.ready, 'light');
  });

  test('set() pins a preference; options control target and outputs', async () => {
    const homebridge = { getUserSettings: () => new Promise(r => setTimeout(() => r({ colorScheme: 'light' }), 5)) };
    const { MpKit, document } = loadDom({ homebridge, html: '<div id="t"></div>' });
    const target = document.getElementById('t');
    const theme = MpKit.Theme.init({ target, className: false, storageKey: false });
    theme.set('dark');
    await theme.ready;
    assert.equal(target.getAttribute('data-bs-theme'), 'dark', 'set() beats the late Homebridge answer');
    assert.equal(target.classList.contains('mp-theme-dark'), false);
    assert.equal(html(document).hasAttribute('data-bs-theme'), false);
    assert.equal(theme.set('bogus'), 'light');
    assert.equal(theme.preference(), 'auto');
  });

  test('opts.theme skips Homebridge', async () => {
    let asked = false;
    const homebridge = { getUserSettings: async () => { asked = true; return { colorScheme: 'dark' }; } };
    const { MpKit } = loadDom({ homebridge });
    assert.equal(await MpKit.Theme.init({ theme: 'light' }).ready, 'light');
    assert.equal(asked, false);
  });
});

describe('dist/theme-boot.js', () => {
  const boot = (opts) => loadDom({ ...opts, script: 'theme-boot.js' }).document;

  test('applies the system preference before paint', () => {
    const d = boot({ media: fakeMedia(true) });
    assert.equal(html(d).getAttribute('data-bs-theme'), 'dark');
    assert.equal(html(d).classList.contains('mp-theme-dark'), true);
    assert.equal(html(boot({ media: fakeMedia(false) })).getAttribute('data-bs-theme'), 'light');
  });

  test('a remembered preference wins over the system', () => {
    assert.equal(html(boot({ media: fakeMedia(true), storage: { 'mp-kit-theme': 'light' } })).getAttribute('data-bs-theme'), 'light');
    assert.equal(html(boot({ media: fakeMedia(false), storage: { 'mp-kit-theme': 'dark' } })).getAttribute('data-bs-theme'), 'dark');
    assert.equal(html(boot({ media: fakeMedia(true), storage: { 'mp-kit-theme': 'auto' } })).getAttribute('data-bs-theme'), 'dark');
  });

  test('is tiny', async () => {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const { root } = await import('./dom.js');
    assert.ok(readFileSync(join(root, 'dist', 'theme-boot.js')).length < 600);
  });
});
