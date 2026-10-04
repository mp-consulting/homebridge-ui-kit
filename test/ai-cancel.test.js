import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'dist', 'kit.js'), 'utf8');

function fakeHomebridge(handler) {
  const listeners = {};
  const hb = {
    calls: [],
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(f => f !== fn); },
    push(type, data) { (listeners[type] || []).slice().forEach(fn => fn({ type, data })); },
    listenerCount: () => Object.values(listeners).reduce((n, l) => n + l.length, 0),
    request(path, body) {
      hb.calls.push({ path, body });
      return handler(path, body, hb);
    },
  };
  return hb;
}

function loadKit(homebridge) {
  const window = { homebridge };
  vm.runInNewContext(source, { window, AbortController, DOMException });
  return window.MpKit;
}

const never = () => new Promise(() => {});

describe('MpKit.ai cancellation', () => {
  test('cancel() rejects with AbortError, removes listeners and notifies the server', async () => {
    const hb = fakeHomebridge(path => (path === '/ai/cancel' ? Promise.resolve({ ok: true }) : never()));
    const { ai } = loadKit(hb);
    const chunks = [];
    const req = ai.ask({ prompt: 'x' }, { onChunk: d => chunks.push(d) });
    assert.match(req.requestId, /^mpai-/);
    hb.push('ai:chunk', { requestId: req.requestId, delta: 'a' });
    assert.equal(req.cancel(), true);
    assert.equal(req.cancel(), false, 'second cancel is a no-op');
    await assert.rejects(req, err => err.name === 'AbortError');
    hb.push('ai:chunk', { requestId: req.requestId, delta: 'late' });
    assert.deepEqual(chunks, ['a']);
    assert.equal(hb.listenerCount(), 0);
    assert.deepEqual(hb.calls.map(c => c.path), ['/ai/ask', '/ai/cancel']);
    assert.equal(hb.calls[1].body.requestId, req.requestId);
  });

  test('an AbortSignal cancels, using its reason', async () => {
    const hb = fakeHomebridge(path => (path === '/ai/cancel' ? Promise.reject(new Error('no route')) : never()));
    const { ai } = loadKit(hb);
    const ctl = new AbortController();
    const req = ai.explain({ error: 'E' }, { signal: ctl.signal, onDone() {} });
    ctl.abort(new Error('user left'));
    await assert.rejects(req, /user left/);
    assert.equal(hb.listenerCount(), 0);
    await new Promise(r => setImmediate(r)); // the failing /ai/cancel is swallowed
  });

  test('an already-aborted signal rejects without sending anything', async () => {
    const hb = fakeHomebridge(() => assert.fail('must not send'));
    const { ai } = loadKit(hb);
    const ctl = new AbortController();
    ctl.abort();
    await assert.rejects(ai.config({ schema: {}, request: 'x' }, { signal: ctl.signal }), err => err.name === 'AbortError');
    assert.equal(hb.calls.length, 0);
  });

  test('notifyServer: false skips /ai/cancel; settled requests ignore cancel()', async () => {
    const hb = fakeHomebridge(() => never());
    const { ai } = loadKit(hb);
    const req = ai.ask({ prompt: 'x' }, { notifyServer: false });
    req.cancel();
    await assert.rejects(req);
    assert.deepEqual(hb.calls.map(c => c.path), ['/ai/ask']);

    const ok = loadKit(fakeHomebridge(() => Promise.resolve({ text: 'hi' }))).ai.ask({ prompt: 'y' });
    assert.equal((await ok).text, 'hi');
    assert.equal(ok.cancel(), false);
  });

  test('the abort listener is removed once the request settles', async () => {
    const hb = fakeHomebridge(() => Promise.resolve({ text: 'ok' }));
    const { ai } = loadKit(hb);
    const ctl = new AbortController();
    let added = 0;
    let removed = 0;
    const signal = {
      aborted: false,
      addEventListener: (t, fn) => { added += 1; ctl.signal.addEventListener(t, fn); },
      removeEventListener: (t, fn) => { removed += 1; ctl.signal.removeEventListener(t, fn); },
    };
    await ai.ask({ prompt: 'x' }, { signal });
    assert.equal(added, 1);
    assert.ok(removed >= 1);
    ctl.abort();
    assert.equal(hb.calls.length, 1, 'aborting later does not send /ai/cancel');
  });

  test('chat.cancel() stops the reply and keeps the partial text', async () => {
    const hb = fakeHomebridge((path, body, h) => {
      if (path === '/ai/cancel') { return Promise.resolve(); }
      h.push('ai:chunk', { requestId: body.requestId, delta: 'Partial' });
      return never();
    });
    const { ai } = loadKit(hb);
    const nodes = new Map();
    const node = () => ({
      innerHTML: '', value: '', disabled: false, scrollTop: 0, scrollHeight: 0,
      setAttribute() {}, addEventListener() {}, removeEventListener() {},
    });
    const el = { ...node(), querySelector: sel => (nodes.has(sel) ? nodes.get(sel) : nodes.set(sel, node()).get(sel)) };
    const chat = ai.renderChat(el);
    assert.equal(chat.cancel(), false);
    const sent = chat.send('hello');
    await new Promise(r => setImmediate(r));
    assert.equal(chat.cancel(), true);
    assert.equal(await sent, null);
    const log = el.querySelector('.mp-ai-chat-log').innerHTML;
    assert.match(log, /<p>Partial<\/p><p class="mp-ai-panel-note">Stopped<\/p>/);
    assert.deepEqual(hb.calls.map(c => c.path), ['/ai/ask', '/ai/cancel']);
  });
});
