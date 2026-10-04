import { doc } from './env.js';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' };

/** Escapes a value for safe use in HTML text and quoted attributes. */
export function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ESCAPES[c]);
}

/** Returns the URL if it uses http(s), otherwise null (blocks javascript:, data:, …). */
export function safeUrl(url) {
  if (typeof url !== 'string') { return null; }
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

let uidSeq = 0;

/** Returns a unique id with the given prefix (for label/aria wiring). */
export function uid(prefix) {
  uidSeq += 1;
  return (prefix || 'mp') + '-' + uidSeq;
}

/** Resolves a selector or element to an element (or null). */
export function toElement(target) {
  if (!target) { return null; }
  if (typeof target === 'string') {
    const d = doc();
    return d ? d.querySelector(target) : null;
  }
  return target;
}

export function errorMessage(err, fallback) {
  if (typeof err === 'string' && err) { return err; }
  return (err && err.message) || fallback;
}

let liveRegion = null;

/**
 * Announces a message to screen readers through a shared, visually hidden
 * live region (polite by default; 'assertive' for urgent messages).
 */
export function announce(message, politeness) {
  const d = doc();
  if (!d || !d.body || typeof d.createElement !== 'function') { return; }
  if (!liveRegion || !liveRegion.isConnected) {
    liveRegion = d.createElement('div');
    liveRegion.className = 'mp-sr-only';
    liveRegion.setAttribute('data-mp-live', '');
    liveRegion.setAttribute('aria-atomic', 'true');
    d.body.appendChild(liveRegion);
  }
  liveRegion.setAttribute('aria-live', politeness === 'assertive' ? 'assertive' : 'polite');
  // Clear first so repeating the same message is announced again.
  liveRegion.textContent = '';
  const text = String(message == null ? '' : message);
  setTimeout(() => { liveRegion.textContent = text; }, 30);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), '
  + 'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focusable descendants of el, in DOM order (visible ones only when layout is known). */
export function focusables(el) {
  return Array.from(el.querySelectorAll(FOCUSABLE)).filter(n => !n.hidden && !n.closest('[hidden]'));
}

/** Focuses el without scrolling, making it programmatically focusable if needed. */
export function focusElement(el) {
  if (!el || typeof el.focus !== 'function') { return; }
  if (!el.matches(FOCUSABLE) && !el.hasAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    el.classList.add('mp-focus-target');
  }
  try { el.focus({ preventScroll: true }); } catch { el.focus(); }
}

/** Visible text of an element, collapsed. */
export function textOf(el) {
  return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : '';
}
