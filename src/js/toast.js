// Toast — notifications. Inside Homebridge they use the UI's own toasts
// (homebridge.toast.*); elsewhere (or with { local: true }) a Bootstrap-style
// toast is shown in a fixed .mp-toast-container.

import { doc, hbClient } from './env.js';
import { escapeHtml } from './util.js';

const TYPES = ['success', 'error', 'warning', 'info'];
const DURATION = { success: 5000, info: 5000, warning: 7000, error: 8000 };
const ICON = { success: '✓', info: 'i', warning: '!', error: '✕' };

let container = null;

function ensureContainer(d) {
  if (!container || !container.isConnected) {
    container = d.createElement('div');
    container.className = 'mp-toast-container';
    d.body.appendChild(container);
  }
  return container;
}

/**
 * Shows a toast. type: 'success' | 'error' | 'warning' | 'info'.
 * opts (or a title string): { title, duration (ms, 0 = until closed), local }
 * Returns { close(), element, native } — native is true when Homebridge showed it.
 */
function show(type, message, opts) {
  if (TYPES.indexOf(type) < 0) { type = 'info'; }
  opts = typeof opts === 'string' ? { title: opts } : (opts || {});
  const text = String(message == null ? '' : message);
  const hb = hbClient();
  if (!opts.local && hb && hb.toast && typeof hb.toast[type] === 'function') {
    hb.toast[type](text, opts.title);
    return { close() {}, element: null, native: true };
  }
  const d = doc();
  if (!d || !d.body) { return { close() {}, element: null, native: false }; }

  const el = d.createElement('div');
  el.className = 'mp-toast mp-toast-' + type;
  // Errors and warnings interrupt; the rest wait for a pause.
  el.setAttribute('role', type === 'error' || type === 'warning' ? 'alert' : 'status');
  el.setAttribute('aria-atomic', 'true');
  el.innerHTML = '<span class="mp-toast-icon" aria-hidden="true">' + ICON[type] + '</span>'
    + '<div class="mp-toast-body">'
    + (opts.title ? '<p class="mp-toast-title">' + escapeHtml(opts.title) + '</p>' : '')
    + '<p class="mp-toast-message">' + escapeHtml(text) + '</p>'
    + '</div>'
    + '<button type="button" class="mp-toast-close" aria-label="Close">×</button>';
  ensureContainer(d).appendChild(el);

  let timer = null;
  let closed = false;
  const duration = opts.duration === undefined ? DURATION[type] : Number(opts.duration) || 0;

  // Plays the .is-leaving exit transition, then removes the toast. Removal is
  // immediate when there is no transition (reduced motion, kit.css not loaded).
  function close() {
    if (closed) { return; }
    closed = true;
    clearTimeout(timer);
    const win = d.defaultView;
    const reduce = !!(win && typeof win.matchMedia === 'function'
      && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    el.classList.add('is-leaving');
    const seconds = reduce || !win || typeof win.getComputedStyle !== 'function' ? 0
      : Math.max(0, ...String(win.getComputedStyle(el).transitionDuration || '0s').split(',')
        .map(v => (parseFloat(v) || 0) * (/ms\s*$/.test(v) ? 0.001 : 1)));
    if (!seconds) { el.remove(); return; }
    let fallback = null;
    const done = () => {
      clearTimeout(fallback);
      el.removeEventListener('transitionend', onEnd);
      el.remove();
    };
    const onEnd = ev => { if (ev.target === el) { done(); } };
    el.addEventListener('transitionend', onEnd);
    // transitionend never fires if the toast is hidden or the transition is cancelled.
    fallback = setTimeout(done, seconds * 1000 + 50);
  }
  function arm() {
    clearTimeout(timer);
    if (duration > 0) { timer = setTimeout(close, duration); }
  }
  // Pause while the pointer or focus is on the toast, so it can be read.
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', arm);
  el.addEventListener('focusin', () => clearTimeout(timer));
  el.addEventListener('focusout', arm);
  el.querySelector('.mp-toast-close').addEventListener('click', close);
  arm();
  return { close, element: el, native: false };
}

export const Toast = {
  show,
  success: (message, opts) => show('success', message, opts),
  error: (message, opts) => show('error', message, opts),
  warning: (message, opts) => show('warning', message, opts),
  info: (message, opts) => show('info', message, opts),
};
