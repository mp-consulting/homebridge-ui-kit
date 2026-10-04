import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadDom, tick } from './dom.js';

const XSS = '"><img src=x onerror=alert(1)>';
const plain = v => JSON.parse(JSON.stringify(v));
const wait = ms => new Promise(r => setTimeout(r, ms));

describe('Form.field', () => {
  const { MpKit, document } = loadDom();
  const render = html => { const div = document.createElement('div'); div.innerHTML = html; return div; };

  test('renders a labelled control with help and error wired to aria-describedby', () => {
    const el = render(MpKit.Form.field({
      name: 'host', label: 'Host', id: 'host', value: XSS, help: 'IP or name', error: 'Required', required: true,
    }));
    const input = el.querySelector('input#host');
    assert.equal(el.querySelector('label').getAttribute('for'), 'host');
    assert.equal(input.className, 'form-control is-invalid');
    assert.equal(input.value, XSS);
    assert.equal(input.required, true);
    assert.equal(input.getAttribute('aria-invalid'), 'true');
    assert.equal(input.getAttribute('aria-describedby'), 'host-help host-error');
    assert.equal(el.querySelector('#host-help').textContent, 'IP or name');
    assert.equal(el.querySelector('img'), null);
    assert.match(el.querySelector('label').innerHTML, /mp-required" aria-hidden="true"/);
  });

  test('supports number, select, textarea, checkbox and switch', () => {
    const num = render(MpKit.Form.field({ name: 'port', type: 'number', min: 1, max: 65535, value: 80 })).querySelector('input');
    assert.equal(num.type, 'number');
    assert.equal(num.max, '65535');
    const sel = render(MpKit.Form.field({ name: 'mode', type: 'select', value: 'lan', options: ['cloud', { value: 'lan', label: 'Local <LAN>' }] })).querySelector('select');
    assert.equal(sel.value, 'lan');
    assert.equal(sel.options[1].textContent, 'Local <LAN>');
    const ta = render(MpKit.Form.field({ name: 'notes', type: 'textarea', value: '</textarea><b>' })).querySelector('textarea');
    assert.equal(ta.value, '</textarea><b>');
    const sw = render(MpKit.Form.field({ name: 'debug', type: 'switch', label: 'Debug', checked: true }));
    assert.ok(sw.querySelector('.form-check.form-switch'));
    assert.equal(sw.querySelector('input').getAttribute('role'), 'switch');
    assert.equal(sw.querySelector('input').checked, true);
    assert.equal(sw.querySelector('label').className, 'form-check-label');
  });
});

describe('Form.secret, CopyButton and delegated actions', () => {
  test('reveal toggles the input type and aria-pressed', () => {
    const { MpKit, document } = loadDom();
    document.body.innerHTML = MpKit.Form.secret({ name: 'token', label: 'API token', id: 'tok', value: 's3cret' });
    const input = document.getElementById('tok');
    const reveal = document.querySelector('[data-mp-reveal]');
    assert.equal(input.type, 'password');
    assert.equal(input.getAttribute('autocomplete'), 'off');
    assert.equal(reveal.getAttribute('aria-controls'), 'tok');
    assert.equal(reveal.getAttribute('aria-label'), 'Show API token');
    reveal.click();
    assert.equal(input.type, 'text');
    assert.equal(reveal.getAttribute('aria-pressed'), 'true');
    assert.equal(reveal.textContent, 'Hide');
    reveal.click();
    assert.equal(input.type, 'password');
  });

  test('copy buttons copy the target value or literal text and give feedback', async () => {
    const copied = [];
    const { MpKit, document } = loadDom({
      before(window) {
        Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async t => { copied.push(t); } } });
      },
    });
    document.body.innerHTML = MpKit.Form.secret({ name: 'token', id: 'tok', value: 's3cret' })
      + MpKit.CopyButton.render({ text: XSS, label: 'Copy code' });
    document.querySelector('[data-mp-copy-target]').click();
    const literal = document.querySelector('[data-mp-copy]');
    assert.equal(literal.textContent, 'Copy code');
    literal.click();
    await wait(10);
    assert.deepEqual(copied, ['s3cret', XSS]);
    assert.equal(literal.textContent, 'Copied');
    assert.ok(literal.classList.contains('is-copied'));
    assert.equal(await MpKit.copy('direct'), true);
  });

  test('copy falls back to execCommand and reports failure', async () => {
    const { MpKit, document } = loadDom();
    document.execCommand = () => false;
    assert.equal(await MpKit.copy('x'), false);
    document.execCommand = () => true;
    assert.equal(await MpKit.copy('x'), true);
  });

  test('Enter and Space activate .mp-device-card[role="button"]', () => {
    const { document, window } = loadDom({ html: '<div class="mp-device-card" role="button" tabindex="0" id="c"></div><div class="mp-device-card" id="plain"></div>' });
    let clicks = 0;
    document.getElementById('c').addEventListener('click', () => { clicks += 1; });
    document.getElementById('plain').addEventListener('click', () => { clicks += 100; });
    for (const key of ['Enter', ' ', 'a']) {
      document.getElementById('c').dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
    document.getElementById('plain').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(clicks, 2);
  });
});

describe('Form.values / fill', () => {
  const html = `<form id="f">
    <input name="name" value="Lamp">
    <input name="auth.token" value="t">
    <input name="port" type="number" value="8080">
    <input name="empty" type="number" value="">
    <input name="debug" type="checkbox" checked>
    <input name="tags" type="checkbox" value="a" checked><input name="tags" type="checkbox" value="b">
    <input name="mode" type="radio" value="cloud"><input name="mode" type="radio" value="lan" checked>
    <select name="multi" multiple><option value="x" selected>x</option><option value="y">y</option></select>
    <input name="skip" disabled value="no"><input name="ignored" data-mp-ignore value="no">
    <button name="btn">b</button>
  </form>`;

  test('serialises controls with types and dotted paths', () => {
    const { MpKit } = loadDom({ html });
    assert.deepEqual(JSON.parse(JSON.stringify(MpKit.Form.values('#f'))), {
      name: 'Lamp', auth: { token: 't' }, port: 8080, empty: null, debug: true, tags: ['a'], mode: 'lan', multi: ['x'],
    });
  });

  test('fill sets controls back from an object', () => {
    const { MpKit } = loadDom({ html });
    MpKit.Form.fill('#f', { name: 'Fan', auth: { token: 'u' }, port: 1, debug: false, tags: ['b'], mode: 'cloud', multi: ['y'] });
    assert.deepEqual(JSON.parse(JSON.stringify(MpKit.Form.values('#f'))), {
      name: 'Fan', auth: { token: 'u' }, port: 1, empty: null, debug: false, tags: ['b'], mode: 'cloud', multi: ['y'],
    });
  });
});

describe('Form.track', () => {
  const html = '<form id="f"><input name="name" value="Lamp"><input name="opts.poll" type="number" value="30"></form>';
  const type = (document, name, value) => {
    const el = document.querySelector(`[name="${name}"]`);
    el.value = value;
    el.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }));
  };

  function fakeHb(blocks) {
    const hb = {
      calls: [],
      toast: { success: m => hb.calls.push(['toast', m]), error: m => hb.calls.push(['toastError', m]) },
      getPluginConfig: async () => blocks,
      updatePluginConfig: async c => { hb.calls.push(['update', c]); return c; },
      savePluginConfig: async () => { hb.calls.push(['save']); },
    };
    return hb;
  }

  test('shows the sticky Save bar when dirty and hides it when changes are reverted', () => {
    const { MpKit, document } = loadDom({ html });
    const states = [];
    const tracker = MpKit.Form.track('#f', { onDirtyChange: d => states.push(d) });
    const bar = document.querySelector('.mp-savebar');
    assert.equal(bar.previousElementSibling.id, 'f');
    assert.equal(bar.hidden, true);
    assert.equal(bar.getAttribute('role'), 'region');
    type(document, 'name', 'Fan');
    assert.equal(tracker.isDirty(), true);
    assert.equal(bar.hidden, false);
    type(document, 'name', 'Lamp');
    assert.equal(bar.hidden, true);
    assert.deepEqual(states, [true, false]);
  });

  test('Save merges values into the first block and persists via Homebridge', async () => {
    const hb = fakeHb([{ platform: 'Demo', name: 'Lamp', opts: { poll: 30, keep: true } }, { platform: 'Other' }]);
    const { MpKit, document } = loadDom({ html, homebridge: hb });
    const saved = [];
    const tracker = MpKit.Form.track('#f', { onSaved: c => saved.push(c) });
    type(document, 'opts.poll', '60');
    document.querySelector('[data-mp-save="save"]').click();
    await wait(10);
    assert.deepEqual(plain(hb.calls[0]), ['update', [{ platform: 'Demo', name: 'Lamp', opts: { poll: 60, keep: true } }, { platform: 'Other' }]]);
    assert.deepEqual(hb.calls[1], ['save']);
    assert.deepEqual(hb.calls[2], ['toast', 'Settings saved']);
    assert.equal(tracker.isDirty(), false);
    assert.equal(document.querySelector('.mp-savebar').hidden, true);
    assert.equal(saved.length, 1);
  });

  test('toConfig, persist: false and submit are honoured', async () => {
    const hb = fakeHb([]);
    const { MpKit, document, window } = loadDom({ html, homebridge: hb });
    MpKit.Form.track('#f', { persist: false, toast: false, toConfig: v => ({ platform: 'X', ...v }) });
    type(document, 'name', 'Fan');
    document.getElementById('f').dispatchEvent(new window.Event('submit', { cancelable: true }));
    await wait(10);
    assert.deepEqual(plain(hb.calls), [['update', [{ platform: 'X', name: 'Fan', opts: { poll: 30 } }]]]);
  });

  test('Discard restores the saved values; failures keep the form dirty', async () => {
    const hb = fakeHb([]);
    hb.updatePluginConfig = async () => { throw new Error('disk full'); };
    const { MpKit, document } = loadDom({ html, homebridge: hb });
    const errors = [];
    const tracker = MpKit.Form.track('#f', { onError: e => errors.push(e.message) });
    type(document, 'name', 'Fan');
    await assert.rejects(tracker.save(), /disk full/);
    assert.equal(tracker.isDirty(), true);
    assert.deepEqual(errors, ['disk full']);
    assert.deepEqual(hb.calls, [['toastError', 'disk full']]);
    assert.equal(document.querySelector('[data-mp-save="save"]').disabled, false);
    document.querySelector('[data-mp-save="discard"]').click();
    assert.equal(document.querySelector('[name="name"]').value, 'Lamp');
    assert.equal(tracker.isDirty(), false);
  });

  test('outside Homebridge saving is a graceful no-op that resolves false', async () => {
    const { MpKit, document } = loadDom({ html });
    const tracker = MpKit.Form.track('#f', { toast: false });
    type(document, 'name', 'Fan');
    assert.equal(await tracker.save(), false);
    assert.equal(tracker.isDirty(), false);
    tracker.destroy();
    assert.equal(document.querySelector('.mp-savebar'), null);
    await tick();
  });

  test('a custom save() replaces the Homebridge calls', async () => {
    const { MpKit, document } = loadDom({ html });
    const got = [];
    const tracker = MpKit.Form.track('#f', { toast: false, bar: false, save: v => { got.push(v); } });
    type(document, 'name', 'Fan');
    assert.equal(await tracker.save(), true);
    assert.equal(got[0].name, 'Fan');
    assert.equal(tracker.bar, null);
  });
});
