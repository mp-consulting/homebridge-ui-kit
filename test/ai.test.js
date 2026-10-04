import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'dist', 'kit.js'), 'utf8');

const XSS = '<img src=x onerror=alert(1)>';

// Minimal element stand-in: querySelector hands out one stable child per
// selector, so tests can inspect what the kit wrote into each part.
function fakeNode() {
  const children = new Map();
  const classes = new Set();
  const attrs = {};
  const listeners = {};
  return {
    innerHTML: '',
    textContent: '',
    value: '',
    hidden: false,
    disabled: false,
    scrollTop: 0,
    scrollHeight: 500,
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      contains: c => classes.has(c),
      toggle: (c, force) => ((force ?? !classes.has(c)) ? classes.add(c) : classes.delete(c)),
    },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return k in attrs ? attrs[k] : null; },
    querySelector(sel) {
      if (!children.has(sel)) { children.set(sel, fakeNode()); }
      return children.get(sel);
    },
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(f => f !== fn); },
    fire(type, ev = {}) {
      const event = { preventDefault() { event.defaultPrevented = true; }, ...ev };
      (listeners[type] || []).forEach(fn => fn(event));
      return event;
    },
    listenerCount: type => (listeners[type] || []).length,
  };
}

// Mock of the plugin-ui-utils `homebridge` global: an event target plus a
// request() whose behaviour each test supplies.
function fakeHomebridge(handler) {
  const listeners = {};
  const hb = {
    calls: [],
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) { listeners[type] = (listeners[type] || []).filter(f => f !== fn); },
    // plugin-ui-utils dispatches MessageEvents carrying the payload in .data
    push(type, data) { (listeners[type] || []).slice().forEach(fn => fn({ type, data })); },
    listenerCount: () => Object.values(listeners).reduce((n, l) => n + l.length, 0),
    request(path, body) {
      hb.calls.push({ path, body });
      return handler(path, body, hb);
    },
  };
  return hb;
}

function loadKit({ homebridge, document } = {}) {
  const window = homebridge ? { homebridge } : {};
  vm.runInNewContext(source, { window, document });
  return window.MpKit;
}

const tick = () => new Promise(r => setImmediate(r));

describe('MpKit.ai requests', () => {
  test('status() calls /ai/status', async () => {
    const hb = fakeHomebridge(() => Promise.resolve({ enabled: true, provider: 'anthropic' }));
    const { ai } = loadKit({ homebridge: hb });
    assert.deepEqual(await ai.status(), { enabled: true, provider: 'anthropic' });
    assert.equal(hb.calls[0].path, '/ai/status');
  });

  test('ask() adds a requestId and streams matching chunks only', async () => {
    const hb = fakeHomebridge((path, body, h) => {
      h.push('ai:chunk', { requestId: 'someone-else', delta: 'nope' });
      h.push('ai:chunk', { requestId: body.requestId, delta: 'Hel' });
      h.push('ai:chunk', { requestId: body.requestId, delta: 'lo' });
      h.push('ai:done', { requestId: body.requestId });
      return Promise.resolve({ text: 'Hello', usage: { outputTokens: 2 } });
    });
    const { ai } = loadKit({ homebridge: hb });
    const chunks = [];
    let done = 0;
    const res = await ai.ask({ prompt: 'hi', context: 'ctx' }, {
      onChunk: d => chunks.push(d),
      onDone: () => { done += 1; },
    });
    assert.equal(hb.calls[0].path, '/ai/ask');
    assert.equal(hb.calls[0].body.prompt, 'hi');
    assert.equal(hb.calls[0].body.context, 'ctx');
    assert.match(hb.calls[0].body.requestId, /^mpai-/);
    assert.deepEqual(chunks, ['Hel', 'lo']);
    assert.equal(done, 1);
    assert.equal(res.text, 'Hello');
    assert.equal(hb.listenerCount(), 0, 'listeners are removed when the request settles');
  });

  test('does not mutate the caller body and uses unique requestIds', async () => {
    const hb = fakeHomebridge(() => Promise.resolve({}));
    const { ai } = loadKit({ homebridge: hb });
    const body = { error: 'E', device: { id: 1 } };
    await ai.explain(body);
    await ai.config({ schema: {}, request: 'x' });
    assert.deepEqual(body, { error: 'E', device: { id: 1 } });
    assert.deepEqual(hb.calls.map(c => c.path), ['/ai/explain', '/ai/config']);
    assert.notEqual(hb.calls[0].body.requestId, hb.calls[1].body.requestId);
  });

  test('reports ai:error, rejects and cleans up', async () => {
    const hb = fakeHomebridge((path, body, h) => {
      h.push('ai:error', { requestId: body.requestId, message: 'quota exceeded' });
      return Promise.reject(new Error('quota exceeded'));
    });
    const { ai } = loadKit({ homebridge: hb });
    const errors = [];
    await assert.rejects(ai.ask({ prompt: 'x' }, { onChunk() {}, onError: m => errors.push(m) }), /quota/);
    assert.deepEqual(errors, ['quota exceeded']);
    assert.equal(hb.listenerCount(), 0);
  });

  test('rejects without the homebridge global', async () => {
    const { ai } = loadKit();
    await assert.rejects(ai.ask({ prompt: 'x' }), /window\.homebridge/);
    await assert.rejects(ai.status(), /window\.homebridge/);
  });
});

describe('MpKit.ai.markdown', () => {
  const { ai } = loadKit();

  test('renders paragraphs, bold, inline code and line breaks', () => {
    assert.equal(ai.markdown('Hello **world**\nnext `x<y`\n\nTwo'),
      '<p>Hello <strong>world</strong><br>next <code>x&lt;y</code></p><p>Two</p>');
  });

  test('renders lists, headings and fenced code', () => {
    assert.equal(ai.markdown('# Fix\n- one\n- **two**\n1. a\n2) b'),
      '<p><strong>Fix</strong></p><ul><li>one</li><li><strong>two</strong></li></ul><ol><li>a</li><li>b</li></ol>');
    assert.equal(ai.markdown('```json\n{"a": "<b>"}\n```\nafter'),
      '<pre><code>{&quot;a&quot;: &quot;&lt;b&gt;&quot;}</code></pre><p>after</p>');
  });

  test('renders an unterminated code fence while streaming', () => {
    assert.equal(ai.markdown('```\nline'), '<pre><code>line</code></pre>');
  });

  test('escapes everything, including inside bold and code', () => {
    const html = ai.markdown(`${XSS}\n**${XSS}**\n\`${XSS}\`\n- ${XSS}\n\`\`\`\n${XSS}\n\`\`\``);
    assert.ok(!html.includes('<img'), html);
    assert.ok(!/<(script|a|img)\b/.test(html));
    assert.equal(ai.markdown('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  });

  test('handles null and empty input', () => {
    assert.equal(ai.markdown(null), '');
    assert.equal(ai.markdown(''), '');
  });
});

describe('MpKit.ai.diffLines', () => {
  const { ai } = loadKit();
  const plain = lines => Array.from(lines, l => ({ type: l.type, text: l.text }));

  test('computes a minimal line diff', () => {
    assert.deepEqual(plain(ai.diffLines('a\nb\nc\nd', 'a\nc\nx\nd\n')), [
      { type: 'same', text: 'a' },
      { type: 'del', text: 'b' },
      { type: 'same', text: 'c' },
      { type: 'add', text: 'x' },
      { type: 'same', text: 'd' },
    ]);
  });

  test('lists removals before additions for a changed line', () => {
    assert.deepEqual(plain(ai.diffLines('x\nold\ny', 'x\nnew\ny')).map(l => l.type),
      ['same', 'del', 'add', 'same']);
  });

  test('pretty-prints objects and handles empty sides', () => {
    const lines = ai.diffLines({ a: 1 }, { a: 2 });
    assert.deepEqual(plain(lines).map(l => `${l.type}:${l.text}`),
      ['same:{', 'del:  "a": 1', 'add:  "a": 2', 'same:}']);
    assert.deepEqual(plain(ai.diffLines('', 'n')), [{ type: 'add', text: 'n' }]);
    assert.deepEqual(plain(ai.diffLines(undefined, undefined)), []);
  });
});

describe('MpKit.ai render helpers', () => {
  const { ai } = loadKit();

  test('renderButton escapes label and attributes', () => {
    const html = ai.renderButton({ label: XSS, id: '"x', className: 'a" onclick="b', size: 'sm' });
    assert.match(html, /^<button type="button" class="mp-ai-button mp-ai-button-sm/);
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('" onclick'));
    assert.match(ai.renderButton(), /<span>Ask Assistant<\/span><\/button>$/);
    assert.match(ai.renderButton(), /<svg class="mp-ai-icon"[^>]*aria-hidden="true"/);
  });

  test('renderBadge and renderThinking escape their labels', () => {
    assert.ok(!ai.renderBadge(XSS).includes('<img'));
    assert.match(ai.renderBadge(), /Assistant<\/span>$/);
    assert.match(ai.renderThinking(), /class="mp-ai-thinking" role="status">Thinking…/);
    assert.ok(!ai.renderThinking(XSS).includes('<img'));
  });

  test('renderAnswer streams chunks with a caret and finishes', () => {
    const el = fakeNode();
    const answer = ai.renderAnswer(el, { title: XSS });
    assert.match(el.innerHTML, /class="mp-ai-panel"/);
    assert.ok(!el.innerHTML.includes('<img'));
    const panel = el.querySelector('.mp-ai-panel');
    const body = el.querySelector('.mp-ai-panel-body');
    assert.match(body.innerHTML, /mp-ai-thinking/);
    assert.equal(panel.getAttribute('aria-busy'), 'true');
    assert.equal(panel.classList.contains('is-streaming'), true);

    answer.append('Use **');
    answer.append('this**');
    assert.equal(body.innerHTML,
      '<p>Use <strong>this</strong><span class="mp-ai-caret" aria-hidden="true"></span></p>');
    answer.append(`\n- ${XSS}`);
    assert.ok(!body.innerHTML.includes('<img'));
    assert.match(body.innerHTML, /mp-ai-caret" aria-hidden="true"><\/span><\/li><\/ul>$/);

    answer.done({ text: 'Final' });
    assert.equal(body.innerHTML, '<p>Final</p>');
    assert.equal(panel.getAttribute('aria-busy'), 'false');
    assert.equal(panel.classList.contains('is-streaming'), false);
    assert.equal(answer.getText(), 'Final');
  });

  test('renderAnswer works as an onChunk callback end to end', async () => {
    const hb = fakeHomebridge((path, body, h) => {
      h.push('ai:chunk', { requestId: body.requestId, delta: 'Restart ' });
      h.push('ai:chunk', { requestId: body.requestId, delta: 'the bridge.' });
      return Promise.resolve({ text: 'Restart the bridge.' });
    });
    const kit = loadKit({ homebridge: hb });
    const el = fakeNode();
    const answer = kit.ai.renderAnswer(el);
    const seen = [];
    await kit.ai.explain({ error: 'ETIMEDOUT' }, {
      onChunk: d => { answer.append(d); seen.push(el.querySelector('.mp-ai-panel-body').innerHTML); },
    });
    assert.match(seen[0], /^<p>Restart <span class="mp-ai-caret"/);
    answer.done();
    assert.equal(el.querySelector('.mp-ai-panel-body').innerHTML, '<p>Restart the bridge.</p>');
  });

  test('renderAnswer shows errors as escaped text', () => {
    const el = fakeNode();
    ai.renderAnswer(el, { note: '' }).error(new Error(XSS));
    const err = el.querySelector('.mp-ai-error');
    assert.equal(err.textContent, XSS);
    assert.equal(err.hidden, false);
    assert.doesNotMatch(el.innerHTML, /mp-ai-panel-note/);
  });

  test('renderDiff colours lines and escapes content', () => {
    const el = fakeNode();
    const res = ai.renderDiff(el, { before: 'a\nb', after: `a\n${XSS}` });
    assert.equal(res.added, 1);
    assert.equal(res.removed, 1);
    assert.match(el.innerHTML, /<span class="mp-ai-diff-line is-same"><span class="mp-ai-diff-sign" aria-hidden="true"> <\/span>a<\/span>/);
    assert.match(el.innerHTML, /is-del"><span class="mp-ai-diff-sign" aria-hidden="true">−<\/span><span class="mp-ai-sr-only">Removed: <\/span>b<\/span>/);
    assert.match(el.innerHTML, /is-add"><span class="mp-ai-diff-sign" aria-hidden="true">\+<\/span><span class="mp-ai-sr-only">Added: <\/span>&lt;img/);
    assert.ok(!el.innerHTML.includes('<img'));
    assert.doesNotMatch(el.innerHTML, /data-mp-ai-action/, 'no buttons without callbacks');
  });

  test('renderDiff shows "No changes" for identical input', () => {
    const el = fakeNode();
    ai.renderDiff(el, { before: 'same', after: 'same' });
    assert.match(el.innerHTML, /No changes/);
  });

  const clickOn = action => ({
    target: { closest: () => ({ getAttribute: () => action }) },
  });

  test('renderDiff Apply calls onApply once and locks the buttons', async () => {
    const el = fakeNode();
    const applied = [];
    ai.renderDiff(el, {
      before: { a: 1 },
      after: { a: 2 },
      onApply: change => applied.push(change),
      onReject: () => assert.fail('reject should not run'),
    });
    assert.match(el.innerHTML, /data-mp-ai-action="reject">Reject<\/button>/);
    assert.match(el.innerHTML, /data-mp-ai-action="apply">Apply<\/button>/);
    el.fire('click', clickOn('apply'));
    el.fire('click', clickOn('apply'));
    await tick();
    assert.equal(applied.length, 1);
    assert.deepEqual(applied[0].after, { a: 2 });
    assert.equal(applied[0].lines.length, 4);
    assert.equal(el.querySelector('[data-mp-ai-action="apply"]').disabled, true);
    assert.equal(el.querySelector('.mp-ai-diff').classList.contains('is-applied'), true);
    assert.equal(el.querySelector('.mp-ai-diff-status').textContent, 'Applied');
    el.fire('click', clickOn('reject'));
    await tick();
    assert.equal(el.querySelector('.mp-ai-diff').classList.contains('is-rejected'), false);
  });

  test('renderDiff re-enables the buttons when onApply fails', async () => {
    const el = fakeNode();
    ai.renderDiff(el, { before: 'a', after: 'b', onApply: () => Promise.reject(new Error('save failed')) });
    el.fire('click', clickOn('apply'));
    await tick();
    assert.equal(el.querySelector('[data-mp-ai-action="apply"]').disabled, false);
    assert.equal(el.querySelector('.mp-ai-diff-status').textContent, 'save failed');
  });

  test('renderDiff Reject and re-render keep a single listener', async () => {
    const el = fakeNode();
    let rejected = 0;
    ai.renderDiff(el, { before: 'a', after: 'b', onReject: () => { rejected += 1; } });
    ai.renderDiff(el, { before: 'a', after: 'b', onReject: () => { rejected += 1; } });
    assert.equal(el.listenerCount('click'), 1);
    el.fire('click', clickOn('reject'));
    await tick();
    assert.equal(rejected, 1);
    assert.equal(el.querySelector('.mp-ai-diff').classList.contains('is-rejected'), true);
  });
});

describe('MpKit.ai.renderChat', () => {
  test('sends via ask() with history and streams the reply', async () => {
    let n = 0;
    const hb = fakeHomebridge((path, body, h) => {
      n += 1;
      h.push('ai:chunk', { requestId: body.requestId, delta: `Answer ${n}` });
      return Promise.resolve({ text: `Answer ${n}` });
    });
    const kit = loadKit({ homebridge: hb });
    const el = fakeNode();
    const chat = kit.ai.renderChat(el, { context: 'Plugin: demo', placeholder: XSS });
    assert.ok(!el.innerHTML.includes('<img'));
    assert.match(el.querySelector('.mp-ai-chat-log').innerHTML, /mp-ai-chat-empty/);

    const input = el.querySelector('.mp-ai-chat-input');
    input.value = '  first <b>question</b> ';
    const submit = el.fire('submit');
    assert.equal(submit.defaultPrevented, true);
    assert.equal(input.value, '');
    const log = el.querySelector('.mp-ai-chat-log');
    assert.match(log.innerHTML, /first &lt;b&gt;question&lt;\/b&gt;/);
    assert.equal(log.getAttribute('aria-busy'), 'true');
    assert.equal(el.querySelector('.mp-ai-chat-form .mp-ai-button').disabled, true);
    await tick();
    await tick();

    assert.equal(hb.calls[0].path, '/ai/ask');
    assert.deepEqual({ prompt: hb.calls[0].body.prompt, context: hb.calls[0].body.context },
      { prompt: 'first <b>question</b>', context: 'Plugin: demo' });
    assert.match(log.innerHTML, /is-assistant.*<p>Answer 1<\/p>/);
    assert.equal(log.getAttribute('aria-busy'), 'false');

    assert.equal(await chat.send('second'), 'Answer 2');
    assert.match(hb.calls[1].body.context,
      /Plugin: demo\n\nConversation so far:\nUser: first <b>question<\/b>\nAssistant: Answer 1$/);
    assert.equal(chat.messages().length, 4);
    chat.clear();
    assert.match(log.innerHTML, /mp-ai-chat-empty/);
  });

  test('Enter sends, Shift+Enter does not', () => {
    const sent = [];
    const { ai } = loadKit();
    const el = fakeNode();
    ai.renderChat(el, { onSend: p => { sent.push(p); return 'ok'; } });
    const input = el.querySelector('.mp-ai-chat-input');
    input.value = 'hi';
    el.fire('keydown', { key: 'Enter', shiftKey: true, target: input });
    assert.deepEqual(sent, []);
    const ev = el.fire('keydown', { key: 'Enter', target: input });
    assert.equal(ev.defaultPrevented, true);
    return tick().then(() => assert.deepEqual(sent, ['hi']));
  });

  test('custom onSend errors are shown, escaped, in the log', async () => {
    const { ai } = loadKit();
    const el = fakeNode();
    const chat = ai.renderChat(el, {
      onSend: (prompt, ctx) => {
        ctx.onChunk('partial');
        return Promise.reject(new Error(XSS));
      },
    });
    assert.equal(await chat.send('q'), null);
    const log = el.querySelector('.mp-ai-chat-log').innerHTML;
    assert.match(log, /<p>partial<\/p><p class="mp-ai-error" role="alert">&lt;img/);
    assert.ok(!log.includes('<img'));
  });

  test('ignores empty input and concurrent sends', async () => {
    let calls = 0;
    const { ai } = loadKit();
    const el = fakeNode();
    let release;
    const chat = ai.renderChat(el, { onSend: () => { calls += 1; return new Promise(r => { release = r; }); } });
    assert.equal(await chat.send('   '), null);
    const first = chat.send('one');
    assert.equal(await chat.send('two'), null);
    await tick();
    release({ text: 'done' });
    assert.equal(await first, 'done');
    assert.equal(calls, 1);
  });
});

describe('MpKit.ai.edgeGlow', () => {
  test('creates one hidden-toggled element on the body', () => {
    const appended = [];
    const document = {
      createElement: () => fakeNode(),
      body: { appendChild: el => appended.push(el) },
    };
    const { ai } = loadKit({ document });
    const el = ai.edgeGlow();
    assert.equal(el.className, 'mp-ai-edge-glow');
    assert.equal(el.getAttribute('aria-hidden'), 'true');
    assert.equal(ai.edgeGlow(false).hidden, true);
    assert.equal(ai.edgeGlow(true).hidden, false);
    assert.equal(appended.length, 1);
  });
});
