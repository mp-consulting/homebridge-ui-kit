// Pairing and sign-in components: HomeKit setup-code block, OAuth /
// device-code step card, and a multi-step wizard.

import {
  announce, escapeHtml, focusElement, safeUrl, toElement, uid,
} from './util.js';
import { CopyButton } from './form.js';

// ── HomeKit setup code ──

/** Formats an 8-digit HomeKit setup code as XXX-XX-XXX ('' when it is not 8 digits). */
export function formatPin(code) {
  const digits = String(code == null ? '' : code).replace(/\D/g, '');
  return digits.length === 8 ? digits.slice(0, 3) + '-' + digits.slice(3, 5) + '-' + digits.slice(5) : '';
}

/** Image sources allowed for the QR code: http(s), same-origin paths, data:image/*. */
export function safeImageSrc(src) {
  if (typeof src !== 'string') { return null; }
  const s = src.trim();
  if (safeUrl(s)) { return s; }
  if (/^data:image\/(png|gif|jpeg|webp|svg\+xml)[;,]/i.test(s)) { return s; }
  if (/^(\.{0,2}\/|[\w-]+(\/|\.))/.test(s) && !/^[a-z][\w+.-]*:/i.test(s)) { return s; }
  return null;
}

function pinHtml(opts) {
  opts = opts || {};
  const formatted = formatPin(opts.pin) || escapeHtml(opts.pin || '');
  const spoken = String(opts.pin == null ? '' : opts.pin).replace(/\D/g, '').split('').join(' ');
  const id = uid('mp-pin');
  const src = safeImageSrc(opts.qrSrc);
  const label = opts.label || 'HomeKit setup code';
  return '<figure class="mp-pin" aria-labelledby="' + id + '">'
    + '<div class="mp-pin-label-box">'
    + '<span class="mp-pin-label" id="' + id + '">' + escapeHtml(label) + '</span>'
    + '<span class="mp-pin-code" aria-hidden="true">' + formatted + '</span>'
    + '<span class="mp-sr-only">' + escapeHtml(spoken || formatted) + '</span>'
    + '</div>'
    + (src ? '<img class="mp-pin-qr" src="' + escapeHtml(src) + '" alt="' + escapeHtml(opts.qrAlt || 'QR code for ' + label) + '">' : '')
    + '<span class="mp-pin-qr-slot"></span>'
    + (opts.copy === false ? '' : '<figcaption class="mp-pin-actions">'
      + CopyButton.render({ text: formatted, label: opts.copyLabel || 'Copy code', size: 'sm' }) + '</figcaption>')
    + '</figure>';
}

export const Pairing = {
  formatPin,
  /**
   * HTML for a HomeKit setup-code block (XXX-XX-XXX, read digit by digit by
   * screen readers) with an optional QR image and a Copy button.
   * opts: { pin, label = 'HomeKit setup code', qrSrc (http(s), path or
   *   data:image/*), qrAlt, copy = true, copyLabel }
   * The kit does not generate QR codes: pass an image, or an SVG element to renderPin().
   */
  pin: pinHtml,
  /** Renders pin() into el; opts.qr may be an SVG/IMG element (appended) or an image URL. */
  renderPin(el, opts) {
    opts = opts || {};
    el = toElement(el);
    const qr = opts.qr;
    el.innerHTML = pinHtml(Object.assign({}, opts, { qrSrc: typeof qr === 'string' ? qr : opts.qrSrc }));
    if (qr && typeof qr === 'object' && qr.nodeType === 1) {
      const slot = el.querySelector('.mp-pin-qr-slot');
      if (qr.tagName.toLowerCase() === 'svg') {
        qr.setAttribute('role', 'img');
        if (!qr.getAttribute('aria-label')) { qr.setAttribute('aria-label', opts.qrAlt || 'QR code for ' + (opts.label || 'HomeKit setup code')); }
      }
      qr.classList.add('mp-pin-qr');
      slot.appendChild(qr);
    }
    return el.querySelector('.mp-pin');
  },
};

// ── OAuth / device-code sign-in ──

const STATE_TEXT = {
  waiting: 'Waiting for you to sign in…',
  polling: 'Waiting for authorization…',
  success: 'Signed in.',
  error: 'Sign-in failed.',
  expired: 'The code expired. Start again to get a new one.',
};

export const Auth = {
  /**
   * Renders a device-code / OAuth step card into el:
   *   1. open the sign-in URL, 2. enter the code (with Copy), then a status
   *   line that follows the polling state.
   * opts: { title = 'Sign in', url, code, instructions, openLabel,
   *   poll() → true | { done, error, interval } (called every `interval` ms
   *     until done; a rejection or { error } shows the error),
   *   interval = 5000, expiresIn (seconds), onSuccess(result), onError(err),
   *   onRetry() (shows a Try again button on error/expiry), successMessage }
   * Returns { setState(state, message), state(), start(), stop(), destroy(), element }.
   */
  deviceCode(el, opts) {
    opts = opts || {};
    el = toElement(el);
    const titleId = uid('mp-auth-title');
    const url = safeUrl(opts.url);
    el.innerHTML = '<section class="card mp-auth-card" aria-labelledby="' + titleId + '"><div class="card-body">'
      + '<h3 class="mp-auth-title" id="' + titleId + '">' + escapeHtml(opts.title || 'Sign in') + '</h3>'
      + (opts.instructions ? '<p class="mp-auth-instructions">' + escapeHtml(opts.instructions) + '</p>' : '')
      + '<ol class="mp-auth-steps">'
      + (url ? '<li><span class="mp-auth-step-text">Open the sign-in page</span>'
        + '<a class="btn btn-primary btn-sm mp-auth-open" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">'
        + escapeHtml(opts.openLabel || 'Open sign-in page') + '<span class="mp-sr-only"> (opens in a new tab)</span></a></li>' : '')
      + (opts.code ? '<li><span class="mp-auth-step-text">Enter this code</span>'
        + '<span class="mp-auth-code-row"><code class="mp-auth-code">' + escapeHtml(opts.code) + '</code>'
        + CopyButton.render({ text: opts.code, label: 'Copy', size: 'sm', ariaLabel: 'Copy code' }) + '</span></li>' : '')
      + '</ol>'
      + '<p class="mp-auth-status" role="status" aria-live="polite"><span class="mp-auth-status-icon" aria-hidden="true"></span>'
      + '<span class="mp-auth-status-text"></span></p>'
      + '<button type="button" class="btn btn-outline-secondary btn-sm mp-auth-retry" hidden>Try again</button>'
      + '</div></section>';
    const card = el.querySelector('.mp-auth-card');
    const statusEl = el.querySelector('.mp-auth-status');
    const statusText = el.querySelector('.mp-auth-status-text');
    const retry = el.querySelector('.mp-auth-retry');
    let state = null;
    let timer = null;
    let expiry = null;
    let running = false;
    let interval = opts.interval > 0 ? opts.interval : 5000;

    function setState(next, message) {
      state = STATE_TEXT[next] ? next : 'waiting';
      ['waiting', 'polling', 'success', 'error', 'expired'].forEach(s => card.classList.toggle('is-' + s, s === state));
      statusText.textContent = message || (state === 'success' && opts.successMessage) || STATE_TEXT[state];
      statusEl.setAttribute('role', state === 'error' || state === 'expired' ? 'alert' : 'status');
      retry.hidden = !((state === 'error' || state === 'expired') && typeof opts.onRetry === 'function');
      if (state === 'success' || state === 'error' || state === 'expired') { stop(); }
      return controller;
    }

    function stop() {
      running = false;
      clearTimeout(timer);
      clearTimeout(expiry);
    }

    function schedule() {
      if (!running) { return; }
      timer = setTimeout(tick, interval);
    }

    function tick() {
      if (!running) { return; }
      Promise.resolve().then(() => opts.poll()).then(res => {
        if (!running) { return; }
        if (res && typeof res === 'object' && res.error) { throw res.error; }
        if (res && typeof res === 'object' && res.interval > 0) { interval = res.interval; }
        if (res === true || (res && typeof res === 'object' && res.done)) {
          setState('success');
          if (typeof opts.onSuccess === 'function') { opts.onSuccess(res); }
        } else {
          schedule();
        }
      }).catch(err => {
        if (!running) { return; }
        setState('error', (err && err.message) || (typeof err === 'string' ? err : ''));
        if (typeof opts.onError === 'function') { opts.onError(err); }
      });
    }

    function start() {
      if (typeof opts.poll !== 'function') { return controller; }
      stop();
      running = true;
      setState('polling');
      if (opts.expiresIn > 0) {
        expiry = setTimeout(() => setState('expired'), opts.expiresIn * 1000);
      }
      schedule();
      return controller;
    }

    retry.addEventListener('click', () => {
      setState('waiting');
      opts.onRetry();
    });

    const controller = {
      element: card,
      setState,
      state: () => state,
      start,
      stop,
      destroy() {
        stop();
        el.innerHTML = '';
      },
    };
    setState('waiting');
    if (typeof opts.poll === 'function' && opts.autoStart !== false) { start(); }
    return controller;
  },
};

// ── Multi-step wizard ──

export const Steps = {
  /**
   * Renders an .mp-steps progress list into el and shows one panel at a time.
   * opts: { steps: [{ title, panel (selector/element) }], current = 0,
   *   label = 'Progress', onChange(index, step), focus = true }
   * Returns { go(index), next(), prev(), current(), destroy() }.
   */
  create(el, opts) {
    opts = opts || {};
    el = toElement(el);
    const steps = (opts.steps || []).map(s => (typeof s === 'string' ? { title: s } : s));
    let current = -1;

    function paint() {
      el.innerHTML = '<ol class="mp-steps" aria-label="' + escapeHtml(opts.label || 'Progress') + '">'
        + steps.map((s, i) => {
          const st = i < current ? 'complete' : (i === current ? 'current' : 'upcoming');
          return '<li class="mp-step is-' + st + '"' + (st === 'current' ? ' aria-current="step"' : '') + '>'
            + '<span class="mp-step-marker" aria-hidden="true">' + (st === 'complete' ? '✓' : i + 1) + '</span>'
            + '<span class="mp-step-title">' + escapeHtml(s.title) + '</span>'
            + (st === 'complete' ? '<span class="mp-sr-only"> (completed)</span>' : '')
            + '</li>';
        }).join('') + '</ol>';
    }

    function go(index, initial) {
      if (index < 0 || index >= steps.length || index === current) { return current; }
      current = index;
      paint();
      steps.forEach((s, i) => {
        const panel = toElement(s.panel);
        if (panel) { panel.hidden = i !== index; }
      });
      if (!initial) {
        const panel = toElement(steps[index].panel);
        if (panel && opts.focus !== false) {
          focusElement(panel.querySelector('h1, h2, h3, h4, h5, h6, [data-mp-focus]') || panel);
        }
        announce('Step ' + (index + 1) + ' of ' + steps.length + ': ' + steps[index].title);
        if (typeof opts.onChange === 'function') { opts.onChange(index, steps[index]); }
      }
      return current;
    }

    go(Math.min(Math.max(opts.current || 0, 0), Math.max(steps.length - 1, 0)), true);

    return {
      go: i => go(i),
      next: () => go(current + 1),
      prev: () => go(current - 1),
      current: () => current,
      destroy() { el.innerHTML = ''; },
    };
  },
};
