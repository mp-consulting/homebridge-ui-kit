import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadDom, tick } from './dom.js';

const XSS = '<img src=x onerror=alert(1)>';
const wait = ms => new Promise(r => setTimeout(r, ms));

describe('MpKit.Toast', () => {
  test('uses homebridge.toast when available', () => {
    const calls = [];
    const toast = {};
    for (const t of ['success', 'error', 'warning', 'info']) { toast[t] = (m, title) => calls.push([t, m, title]); }
    const { MpKit, document } = loadDom({ homebridge: { toast } });
    const handle = MpKit.Toast.success('Saved', 'Config');
    MpKit.Toast.error('Failed');
    MpKit.Toast.warning('Careful', { title: 'Heads up' });
    assert.equal(handle.native, true);
    assert.deepEqual(calls, [['success', 'Saved', 'Config'], ['error', 'Failed', undefined], ['warning', 'Careful', 'Heads up']]);
    assert.equal(document.querySelector('.mp-toast'), null);
  });

  test('falls back to an escaped, accessible local toast', () => {
    const { MpKit, document } = loadDom();
    const handle = MpKit.Toast.info(XSS, { title: XSS, duration: 0 });
    assert.equal(handle.native, false);
    const el = document.querySelector('.mp-toast-container > .mp-toast.mp-toast-info');
    assert.ok(el);
    assert.equal(el.getAttribute('role'), 'status');
    assert.ok(!el.innerHTML.includes('<img'));
    assert.equal(el.querySelector('.mp-toast-message').textContent, XSS);
    assert.equal(MpKit.Toast.error('x', { duration: 0 }).element.getAttribute('role'), 'alert');
    assert.equal(el.querySelector('.mp-toast-close').getAttribute('aria-label'), 'Close');
    el.querySelector('.mp-toast-close').click();
    assert.equal(el.isConnected, false);
  });

  test('local toasts auto-dismiss, pausing on hover; { local: true } skips Homebridge', async () => {
    const { MpKit, window } = loadDom({ homebridge: { toast: { info: () => assert.fail('should be local') } } });
    const handle = MpKit.Toast.show('info', 'bye', { duration: 30, local: true });
    handle.element.dispatchEvent(new window.Event('mouseenter'));
    await wait(60);
    assert.equal(handle.element.isConnected, true, 'paused while hovered');
    handle.element.dispatchEvent(new window.Event('mouseleave'));
    await wait(60);
    assert.equal(handle.element.isConnected, false);
    assert.equal(MpKit.Toast.show('bogus', 'x', { duration: 0, local: true }).element.className, 'mp-toast mp-toast-info');
  });
});

describe('MpKit.confirm', () => {
  const key = (document, k, opts = {}) => document.activeElement.dispatchEvent(
    new document.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));

  test('renders an accessible alertdialog and resolves true on confirm', async () => {
    const { MpKit, document } = loadDom({ html: '<main><button id="opener">Delete</button></main>' });
    const opener = document.getElementById('opener');
    opener.focus();
    const result = MpKit.confirm({ title: XSS, message: 'This cannot be undone', confirmLabel: 'Delete it' });
    const dialog = document.querySelector('.mp-dialog');
    assert.equal(dialog.getAttribute('role'), 'alertdialog');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, XSS);
    assert.equal(document.getElementById(dialog.getAttribute('aria-describedby')).textContent, 'This cannot be undone');
    assert.ok(!dialog.innerHTML.includes('<img'));
    assert.ok(document.querySelector('main').hasAttribute('inert'), 'the page behind is inert');
    assert.equal(document.activeElement.textContent, 'Delete it');
    document.activeElement.click();
    assert.equal(await result, true);
    assert.equal(document.querySelector('.mp-dialog'), null);
    assert.equal(document.querySelector('main').hasAttribute('inert'), false);
    assert.equal(document.activeElement, opener, 'focus returns to the opener');
  });

  test('danger variant focuses Cancel; Escape resolves false', async () => {
    const { MpKit, document } = loadDom();
    const result = MpKit.confirm({ message: 'Remove device?', danger: true });
    assert.ok(document.querySelector('.btn-danger[data-mp-dialog="confirm"]'));
    assert.equal(document.activeElement.getAttribute('data-mp-dialog'), 'cancel');
    key(document, 'Escape');
    assert.equal(await result, false);
  });

  test('Tab is trapped inside the dialog; backdrop click cancels', async () => {
    const { MpKit, document } = loadDom();
    const result = MpKit.confirm('Proceed?');
    const [cancel, ok] = document.querySelectorAll('.mp-dialog button');
    assert.equal(document.activeElement, ok);
    key(document, 'Tab');
    assert.equal(document.activeElement, cancel);
    key(document, 'Tab', { shiftKey: true });
    assert.equal(document.activeElement, ok);
    document.querySelector('.mp-dialog-backdrop').click();
    assert.equal(await result, false);
    await tick();
  });
});
