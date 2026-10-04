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
