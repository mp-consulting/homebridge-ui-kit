import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadDom } from './dom.js';

const XSS = '"><img src=x onerror=alert(1)>';
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, timeout = 2000) {
  const end = Date.now() + timeout;
  while (!fn()) {
    if (Date.now() > end) { throw new Error('timed out'); }
    await wait(5);
  }
}

describe('Pairing.pin', () => {
  const { MpKit, document } = loadDom({ html: '<div id="p"></div>' });

  test('formats 8-digit HomeKit codes as XXX-XX-XXX', () => {
    assert.equal(MpKit.Pairing.formatPin('03145154'), '031-45-154');
    assert.equal(MpKit.Pairing.formatPin('031-45-154'), '031-45-154');
    assert.equal(MpKit.Pairing.formatPin(12345), '');
  });

  test('renders the code for sighted and screen-reader users, with copy and QR image', () => {
    const el = document.getElementById('p');
    el.innerHTML = MpKit.Pairing.pin({ pin: '03145154', qrSrc: 'qr.png', qrAlt: 'Scan me' });
    assert.equal(el.querySelector('.mp-pin-code').textContent, '031-45-154');
    assert.equal(el.querySelector('.mp-pin-code').getAttribute('aria-hidden'), 'true');
    assert.equal(el.querySelector('.mp-sr-only').textContent, '0 3 1 4 5 1 5 4');
    assert.equal(el.querySelector('img.mp-pin-qr').getAttribute('src'), 'qr.png');
    assert.equal(el.querySelector('img.mp-pin-qr').alt, 'Scan me');
    assert.equal(el.querySelector('[data-mp-copy]').getAttribute('data-mp-copy'), '031-45-154');
    const fig = el.querySelector('figure');
    assert.equal(document.getElementById(fig.getAttribute('aria-labelledby')).textContent, 'HomeKit setup code');
  });

  test('only accepts safe image sources and escapes everything', () => {
    for (const bad of ['javascript:alert(1)', 'vbscript:x', 'data:text/html,<b>']) {
      assert.doesNotMatch(MpKit.Pairing.pin({ pin: '12345678', qrSrc: bad }), /<img/);
    }
    for (const good of ['https://x/qr.png', '/qr.svg', './qr.png', 'data:image/png;base64,AAAA']) {
      assert.match(MpKit.Pairing.pin({ pin: '12345678', qrSrc: good }), /<img class="mp-pin-qr"/);
    }
    const html = MpKit.Pairing.pin({ pin: XSS, label: XSS, copy: false });
    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /data-mp-copy/);
  });

  test('renderPin mounts an SVG element as an accessible image', () => {
    const el = document.getElementById('p');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    MpKit.Pairing.renderPin(el, { pin: '11122333', qr: svg });
    assert.equal(el.querySelector('.mp-pin-qr-slot > svg'), svg);
    assert.equal(svg.getAttribute('role'), 'img');
    assert.equal(svg.getAttribute('aria-label'), 'QR code for HomeKit setup code');
    MpKit.Pairing.renderPin(el, { pin: '11122333', qr: '/qr.png' });
    assert.ok(el.querySelector('img.mp-pin-qr'));
  });
});

describe('Auth.deviceCode', () => {
  test('renders the steps with a safe link and a copyable code', () => {
    const { MpKit, document } = loadDom({ html: '<div id="a"></div>' });
    const card = MpKit.Auth.deviceCode('#a', { url: 'https://example.com/device', code: 'ABCD-1234', title: XSS });
    const link = document.querySelector('.mp-auth-open');
    assert.equal(link.getAttribute('href'), 'https://example.com/device');
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(link.target, '_blank');
    assert.equal(document.querySelector('.mp-auth-code').textContent, 'ABCD-1234');
    assert.equal(document.querySelector('[data-mp-copy]').getAttribute('data-mp-copy'), 'ABCD-1234');
    assert.equal(document.querySelector('img'), null);
    assert.equal(card.state(), 'waiting');
    assert.equal(document.querySelector('.mp-auth-status').getAttribute('role'), 'status');
    assert.equal(MpKit.Auth.deviceCode('#a', { url: 'javascript:alert(1)', code: 'x' }).element.querySelector('a'), null);
  });

  test('polls until done, then shows success', async () => {
    const { MpKit, document } = loadDom({ html: '<div id="a"></div>' });
    let n = 0;
    let ok = null;
    const card = MpKit.Auth.deviceCode('#a', {
      code: 'X', interval: 5, poll: () => { n += 1; return n >= 3 ? { done: true, token: 't' } : false; },
      onSuccess: r => { ok = r.token; }, successMessage: 'Connected to your account',
    });
    assert.equal(card.state(), 'polling');
    assert.ok(document.querySelector('.mp-auth-card').classList.contains('is-polling'));
    await until(() => card.state() === 'success');
    assert.equal(ok, 't');
    assert.equal(document.querySelector('.mp-auth-status-text').textContent, 'Connected to your account');
    const calls = n;
    await wait(30);
    assert.equal(n, calls, 'polling stopped');
  });

  test('errors show an alert and a retry button; expiry stops polling', async () => {
    const { MpKit, document } = loadDom({ html: '<div id="a"></div>' });
    let retried = 0;
    const errors = [];
    const card = MpKit.Auth.deviceCode('#a', {
      code: 'X', interval: 5, poll: () => Promise.reject(new Error('access_denied')),
      onError: e => errors.push(e.message), onRetry: () => { retried += 1; },
    });
    await until(() => card.state() === 'error');
    assert.equal(document.querySelector('.mp-auth-status').getAttribute('role'), 'alert');
    assert.equal(document.querySelector('.mp-auth-status-text').textContent, 'access_denied');
    assert.deepEqual(errors, ['access_denied']);
    const retry = document.querySelector('.mp-auth-retry');
    assert.equal(retry.hidden, false);
    retry.click();
    assert.equal(retried, 1);
    assert.equal(card.state(), 'waiting');

    const exp = MpKit.Auth.deviceCode('#a', { code: 'Y', interval: 1000, expiresIn: 0.02, poll: () => false });
    await until(() => exp.state() === 'expired');
    exp.setState('success', 'Done manually');
    assert.equal(document.querySelector('.mp-auth-status-text').textContent, 'Done manually');
    exp.destroy();
    assert.equal(document.getElementById('a').innerHTML, '');
  });

  test('{ error } results and interval changes are honoured', async () => {
    const { MpKit } = loadDom({ html: '<div id="a"></div>' });
    let n = 0;
    const card = MpKit.Auth.deviceCode('#a', {
      interval: 5, poll: () => { n += 1; return n === 1 ? { interval: 5 } : { error: 'expired_token' }; },
    });
    await until(() => card.state() === 'error');
    assert.equal(n, 2);
  });
});

describe('Steps', () => {
  const html = `<div id="s"></div>
    <section id="p1"><h2>Account</h2></section><section id="p2"><h2>Devices</h2></section><section id="p3"><h2>Done</h2></section>`;

  test('marks current and completed steps and shows one panel', async () => {
    const { MpKit, document } = loadDom({ html });
    const changes = [];
    const steps = MpKit.Steps.create('#s', {
      steps: [{ title: 'Account', panel: '#p1' }, { title: 'Devices', panel: '#p2' }, { title: 'Done', panel: '#p3' }],
      onChange: i => changes.push(i),
    });
    const items = () => [...document.querySelectorAll('.mp-step')];
    assert.equal(document.querySelector('ol.mp-steps').getAttribute('aria-label'), 'Progress');
    assert.equal(items()[0].getAttribute('aria-current'), 'step');
    assert.deepEqual(['p1', 'p2', 'p3'].map(id => document.getElementById(id).hidden), [false, true, true]);
    assert.equal(document.activeElement, document.body, 'no focus move on creation');

    steps.next();
    assert.equal(steps.current(), 1);
    assert.match(items()[0].className, /is-complete/);
    assert.match(items()[0].textContent, /\(completed\)/);
    assert.equal(items()[1].getAttribute('aria-current'), 'step');
    assert.match(items()[2].className, /is-upcoming/);
    assert.deepEqual(['p1', 'p2', 'p3'].map(id => document.getElementById(id).hidden), [true, false, true]);
    assert.equal(document.activeElement, document.querySelector('#p2 h2'));
    await wait(50);
    assert.equal(document.querySelector('[data-mp-live]').textContent, 'Step 2 of 3: Devices');

    steps.prev();
    steps.go(2);
    steps.go(5);
    steps.next();
    assert.equal(steps.current(), 2);
    assert.deepEqual(changes, [1, 0, 2]);
  });

  test('accepts string steps and a starting index', () => {
    const { MpKit, document } = loadDom({ html });
    const steps = MpKit.Steps.create('#s', { steps: ['One', 'Two'], current: 1 });
    assert.equal(steps.current(), 1);
    assert.equal(document.querySelectorAll('.mp-step.is-complete').length, 1);
  });
});
