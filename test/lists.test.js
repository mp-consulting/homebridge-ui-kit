import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadDom, root } from './dom.js';

const XSS = '<img src=x onerror=alert(1)>';
const DEVICES = [
  { id: 'a1', name: 'Kitchen Lamp', subtitle: '192.168.1.40', status: 'online', iconClass: 'bi bi-lightbulb' },
  { id: 'b2', name: 'Bedroom Fan', subtitle: 'Cloud', status: 'offline' },
  { id: 'c3', name: XSS, status: 'checking' },
];

function setup(opts = {}) {
  const env = loadDom({ html: '<div id="list"></div>' });
  const list = env.MpKit.DeviceList.render('#list', { items: DEVICES, ...opts });
  const input = env.document.querySelector('#list input[type="search"]');
  const search = q => {
    input.value = q;
    input.dispatchEvent(new env.window.Event('input', { bubbles: true }));
  };
  return { ...env, list, input, search };
}

describe('DeviceList.render', () => {
  test('renders escaped cards in a labelled list with a labelled search field', () => {
    const { document, input } = setup({ label: 'Lights' });
    const items = document.querySelector('.mp-device-list-items');
    assert.equal(items.getAttribute('role'), 'list');
    assert.equal(items.getAttribute('aria-label'), 'Lights');
    assert.equal(items.querySelectorAll('[role="listitem"]').length, 3);
    assert.equal(document.querySelector(`label[for="${input.id}"]`).textContent, 'Search lights');
    assert.equal(document.querySelector('img'), null);
    assert.match(items.innerHTML, /mp-status-online/);
    assert.match(items.innerHTML, /bi bi-lightbulb mp-device-card-icon/);
    assert.equal(items.querySelector('.mp-device-card').hasAttribute('role'), false, 'not a button without onActivate');
  });

  test('search filters by name, subtitle or id and announces the count', () => {
    const { document, search, list } = setup();
    search('LAMP');
    assert.deepEqual(list.visible().map(d => d.id), ['a1']);
    assert.equal(list.status(), '1 of 3 devices');
    search('cloud');
    assert.deepEqual(list.visible().map(d => d.id), ['b2']);
    search('zzz');
    assert.match(document.querySelector('.mp-device-list-items').textContent, /No matches for “zzz”/);
    assert.equal(list.status(), 'No matches');
    list.setQuery('');
    assert.equal(list.visible().length, 3);
  });

  test('loading shows skeletons and aria-busy; empty shows the empty state', () => {
    const { document, list } = setup({ items: [], loading: true, empty: { title: 'Nothing yet', hint: 'Click Discover' } });
    const items = document.querySelector('.mp-device-list-items');
    assert.equal(items.getAttribute('aria-busy'), 'true');
    assert.equal(items.querySelectorAll('.mp-skeleton-group[aria-hidden="true"]').length, 3);
    assert.equal(list.status(), 'Loading devices…');
    list.setLoading(false);
    assert.equal(items.getAttribute('aria-busy'), 'false');
    assert.match(items.textContent, /Nothing yet/);
    assert.match(items.textContent, /Click Discover/);
    list.setItems(DEVICES.slice(0, 1));
    assert.equal(items.querySelectorAll('.mp-device-card').length, 1);
  });

  test('onActivate makes cards buttons activated by click, Enter and Space', () => {
    const activated = [];
    const { document, window } = setup({ onActivate: (item, i) => activated.push([item.id, i]) });
    const cards = document.querySelectorAll('.mp-device-card');
    assert.equal(cards[1].getAttribute('role'), 'button');
    assert.equal(cards[1].getAttribute('tabindex'), '0');
    cards[1].click();
    cards[0].dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    const space = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    cards[2].dispatchEvent(space);
    assert.equal(space.defaultPrevented, true, 'Space does not scroll');
    assert.deepEqual(activated, [['b2', 1], ['a1', 0], ['c3', 2]]);
  });

  test('custom renderItem and filter; nested controls do not activate the row', () => {
    const activated = [];
    const { document, search } = setup({
      renderItem: d => `<div class="x">${d.id}<button class="inner">Edit</button></div>`,
      filter: (d, q) => d.id === q,
      onActivate: d => activated.push(d.id),
      search: { placeholder: 'Find', label: 'Find a device' },
    });
    assert.equal(document.querySelector('input[type="search"]').placeholder, 'Find');
    document.querySelector('.inner').click();
    document.querySelector('.x').click();
    assert.deepEqual(activated, ['a1']);
    search('b2');
    assert.equal(document.querySelectorAll('.x').length, 1);
  });

  test('search: false omits the field; destroy empties the element', () => {
    const { document, list } = setup({ search: false });
    assert.equal(document.querySelector('#list input'), null);
    list.destroy();
    assert.equal(document.getElementById('list').innerHTML, '');
  });
});

describe('Skeleton', () => {
  test('renders hidden shimmer lines, honouring reduced motion in CSS', () => {
    const { MpKit } = loadDom();
    const html = MpKit.Skeleton.render({ lines: 2, avatar: true });
    assert.match(html, /^<div class="mp-skeleton-group" aria-hidden="true"><span class="mp-skeleton mp-skeleton-circle">/);
    assert.equal(html.match(/mp-skeleton-text/g).length, 2);
    const css = readFileSync(join(root, 'dist', 'kit.css'), 'utf8');
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n  \.mp-skeleton,\n[^}]*\{\n    animation: none;/);
  });
});

describe('LogViewer', () => {
  function scrollable(el, { scrollHeight, clientHeight }) {
    let top = 0;
    Object.defineProperty(el, 'scrollHeight', { get: () => scrollHeight(), configurable: true });
    Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
    Object.defineProperty(el, 'scrollTop', { get: () => top, set: v => { top = Math.max(0, Math.min(v, scrollHeight() - clientHeight)); }, configurable: true });
  }

  test('strips ANSI codes and renders text safely in a role="log" region', () => {
    const { MpKit, document } = loadDom({ html: '<div id="log"></div>' });
    const log = MpKit.LogViewer.create('#log', { label: 'Plugin log' });
    log.append('\u001b[32m[info]\u001b[0m started\n\u001b[1;31mERROR\u001b[0m ' + XSS + '\n');
    const body = document.querySelector('.mp-log-body');
    assert.equal(body.getAttribute('role'), 'log');
    assert.equal(body.getAttribute('aria-label'), 'Plugin log');
    assert.equal(body.getAttribute('aria-live'), 'off');
    assert.equal(body.getAttribute('tabindex'), '0');
    assert.deepEqual([...log.lines()], ['[info] started', 'ERROR ' + XSS]);
    assert.equal(document.querySelector('img'), null);
    assert.equal(MpKit.stripAnsi('\u001b]0;title\u0007\u001b[2Kx'), 'x');
  });

  test('caps the number of lines', () => {
    const { MpKit, document } = loadDom({ html: '<div id="log"></div>' });
    const log = MpKit.LogViewer.create('#log', { maxLines: 3, live: 'polite', lineClass: l => (l.includes('E') ? 'is-error' : '') });
    log.append(['1', '2']);
    log.append('3\n4\nE5');
    assert.deepEqual([...log.lines()], ['3', '4', 'E5']);
    assert.equal(document.querySelectorAll('.mp-log-line').length, 3);
    assert.equal(document.querySelector('.mp-log-line.is-error').textContent, 'E5');
    assert.equal(document.querySelector('.mp-log-body').getAttribute('aria-live'), 'polite');
    log.clear();
    assert.deepEqual([...log.lines()], []);
  });

  test('auto-scrolls unless the user scrolled up, then offers a jump button', () => {
    const { MpKit, document, window } = loadDom({ html: '<div id="log"></div>' });
    const log = MpKit.LogViewer.create('#log');
    const body = document.querySelector('.mp-log-body');
    const jump = document.querySelector('.mp-log-jump');
    scrollable(body, { scrollHeight: () => body.children.length * 20, clientHeight: 100 });
    log.append(Array.from({ length: 10 }, (_, i) => `line ${i}`));
    assert.equal(body.scrollTop, 100, 'followed to the bottom');
    body.scrollTop = 20;
    body.dispatchEvent(new window.Event('scroll'));
    assert.equal(log.isFollowing(), false);
    log.append('more');
    assert.equal(body.scrollTop, 20, 'stays where the user is reading');
    assert.equal(jump.hidden, false);
    jump.click();
    assert.equal(body.scrollTop, 120);
    assert.equal(jump.hidden, true);
    assert.equal(log.isFollowing(), true);
    log.append('next');
    assert.equal(body.scrollTop, 140);
  });
});
