import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadDom, root } from './dom.js';

const wait = ms => new Promise(r => setTimeout(r, ms));

describe('View.show focus and announcements', () => {
  const html = `
    <section class="mp-view active" id="list"><h2>Devices</h2><button>x</button></section>
    <section class="mp-view" id="settings" aria-label="Plugin settings"><h2>Settings</h2></section>
    <section class="mp-view" id="bare"><p>No heading</p></section>`;

  test('moves focus to the shown view heading and announces it', async () => {
    const { MpKit, document } = loadDom({ html });
    const shown = MpKit.View.show('settings');
    const heading = document.querySelector('#settings h2');
    assert.equal(shown.id, 'settings');
    assert.equal(document.activeElement, heading);
    assert.equal(heading.getAttribute('tabindex'), '-1');
    assert.ok(heading.classList.contains('mp-focus-target'));
    await wait(50);
    const live = document.querySelector('[data-mp-live]');
    assert.equal(live.getAttribute('aria-live'), 'polite');
    assert.equal(live.textContent, 'Plugin settings', 'aria-label wins over the heading text');
  });

  test('focuses the view itself without a heading; announces heading text otherwise', async () => {
    const { MpKit, document } = loadDom({ html });
    MpKit.View.show('bare');
    assert.equal(document.activeElement, document.getElementById('bare'));
    MpKit.View.show('list');
    assert.equal(document.activeElement, document.querySelector('#list h2'));
    await wait(50);
    assert.equal(document.querySelector('[data-mp-live]').textContent, 'Devices');
    assert.equal(document.querySelectorAll('[data-mp-live]').length, 1);
  });

  test('the first show and re-showing the active view do not move focus', () => {
    const { MpKit, document } = loadDom({ html: html.replace('mp-view active', 'mp-view') });
    MpKit.View.show('list');
    assert.equal(document.activeElement, document.body);
    MpKit.View.show('list');
    assert.equal(document.activeElement, document.body);
  });

  test('focus and announce can be turned off or customised', async () => {
    const { MpKit, document } = loadDom({ html });
    MpKit.View.show('settings', { focus: false, announce: 'Now editing settings' });
    assert.equal(document.activeElement, document.body);
    await wait(50);
    assert.equal(document.querySelector('[data-mp-live]').textContent, 'Now editing settings');
  });

  test('announce() repeats messages and supports assertive', async () => {
    const { MpKit, document } = loadDom();
    MpKit.announce('Saved', 'assertive');
    await wait(50);
    const live = document.querySelector('[data-mp-live]');
    assert.equal(live.getAttribute('aria-live'), 'assertive');
    assert.equal(live.textContent, 'Saved');
    assert.ok(live.classList.contains('mp-sr-only'));
  });
});

describe('Tabs', () => {
  const html = `
    <ul class="nav mp-tabs" id="tabs">
      <li class="nav-item"><a class="nav-link active" href="#one">One</a></li>
      <li class="nav-item"><a class="nav-link" href="#two">Two</a></li>
      <li class="nav-item"><button class="nav-link" data-mp-view="three">Three</button></li>
    </ul>
    <div id="one">1</div><div id="two">2</div>
    <section class="mp-view active" id="other"></section><section class="mp-view" id="three"></section>`;

  const key = (el, k) => el.dispatchEvent(new el.ownerDocument.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true }));

  test('adds roles, aria-selected, aria-controls and a roving tabindex', () => {
    const { MpKit, document } = loadDom({ html });
    const tabs = MpKit.Tabs.init('#tabs');
    const [a, b, c] = tabs.tabs();
    assert.equal(document.getElementById('tabs').getAttribute('role'), 'tablist');
    assert.equal(a.parentElement.getAttribute('role'), 'presentation');
    assert.deepEqual([a, b, c].map(t => t.getAttribute('role')), ['tab', 'tab', 'tab']);
    assert.deepEqual([a, b, c].map(t => t.getAttribute('aria-selected')), ['true', 'false', 'false']);
    assert.deepEqual([a, b, c].map(t => t.getAttribute('tabindex')), ['0', '-1', '-1']);
    assert.equal(a.getAttribute('aria-controls'), 'one');
    assert.equal(document.getElementById('one').getAttribute('role'), 'tabpanel');
    assert.equal(document.getElementById('one').getAttribute('aria-labelledby'), a.id);
    assert.equal(document.getElementById('two').hidden, true);
    assert.equal(tabs.selected(), 0);
  });

  test('arrow keys, Home and End move and select (wrapping)', () => {
    const { MpKit, document } = loadDom({ html });
    const changes = [];
    const tabs = MpKit.Tabs.init(document.getElementById('tabs'), { onChange: (t, i) => changes.push(i) });
    const [a, b, c] = tabs.tabs();
    a.focus();
    key(a, 'ArrowRight');
    assert.equal(document.activeElement, b);
    assert.equal(b.getAttribute('aria-selected'), 'true');
    assert.equal(b.getAttribute('tabindex'), '0');
    assert.equal(a.getAttribute('tabindex'), '-1');
    assert.equal(document.getElementById('two').hidden, false);
    assert.equal(document.getElementById('one').hidden, true);
    key(b, 'ArrowRight');
    assert.equal(document.activeElement, c);
    assert.ok(document.getElementById('three').classList.contains('active'), 'data-mp-view uses View.show');
    key(c, 'ArrowRight');
    assert.equal(document.activeElement, a, 'wraps to the first tab');
    key(a, 'ArrowLeft');
    assert.equal(document.activeElement, c);
    key(c, 'Home');
    assert.equal(document.activeElement, a);
    key(a, 'End');
    assert.equal(document.activeElement, c);
    assert.deepEqual(changes, [1, 2, 0, 2, 0, 2]);
  });

  test('arrow keys are mirrored on RTL pages', () => {
    const { MpKit, document } = loadDom({ html: `<div dir="rtl">${html}</div>` });
    const [a, b] = MpKit.Tabs.init('#tabs').tabs();
    a.focus();
    key(a, 'ArrowLeft');
    assert.equal(document.activeElement, b);
  });

  test('manual activation moves focus only; Enter selects; clicks select', () => {
    const { MpKit, document } = loadDom({ html });
    const tabs = MpKit.Tabs.init('#tabs', { activation: 'manual' });
    const [a, b, c] = tabs.tabs();
    a.focus();
    key(a, 'ArrowRight');
    assert.equal(document.activeElement, b);
    assert.equal(b.getAttribute('aria-selected'), 'false');
    assert.equal(b.getAttribute('tabindex'), '0');
    key(b, 'Enter');
    assert.equal(b.getAttribute('aria-selected'), 'true');
    c.click();
    assert.equal(c.getAttribute('aria-selected'), 'true');
    tabs.destroy();
    a.click();
    assert.equal(a.getAttribute('aria-selected'), 'false');
  });
});

describe('contrast-safe tokens and RTL', () => {
  const kit = readFileSync(join(root, 'dist', 'kit.css'), 'utf8');
  const ai = readFileSync(join(root, 'src', 'ai.css'), 'utf8');
  const components = readFileSync(join(root, 'src', 'components.css'), 'utf8');

  test('empty-state hint uses a token instead of opacity', () => {
    const rule = /\.mp-empty-state-hint \{([^}]*)\}/.exec(kit)[1];
    assert.match(rule, /color: var\(--mp-text-subtle\)/);
    assert.doesNotMatch(rule, /opacity/);
  });

  test('focus rings use --mp-focus-ring, lighter in dark mode', () => {
    assert.match(kit, /\.mp-device-card:focus-visible \{\s*outline: 2px solid var\(--mp-focus-ring\)/);
    assert.match(kit, /\.mp-theme-dark \{[^}]*--mp-focus-ring: #818cf8/);
  });

  test('no physical left/right properties in the component styles', () => {
    for (const css of [ai, components]) {
      assert.doesNotMatch(css, /(margin|padding|border)-(left|right)\b|border-(top|bottom)-(left|right)-radius|(^|[\s;{])(left|right):/m);
    }
  });
});
