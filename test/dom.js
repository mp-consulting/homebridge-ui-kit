// Shared jsdom harness: loads a built dist/ script into a fresh window.
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = {};
const read = name => (cache[name] ||= readFileSync(join(root, 'dist', name), 'utf8'));

/** A controllable matchMedia('(prefers-color-scheme: dark)') stub. */
export function fakeMedia(matches = false) {
  const listeners = new Set();
  return {
    get matches() { return matches; },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    set(value) { matches = value; listeners.forEach(fn => fn({ matches })); },
    listenerCount: () => listeners.size,
  };
}

/**
 * Creates a window with `html` in the body and runs dist/kit.js (or `script`).
 * opts: { html, homebridge, media, storage: { key: value }, script, before(window) }
 */
export function loadDom(opts = {}) {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>${opts.html || ''}</body></html>`, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://plugin.local/',
  });
  const { window } = dom;
  const media = opts.media || fakeMedia(false);
  window.matchMedia = () => media;
  for (const [k, v] of Object.entries(opts.storage || {})) { window.localStorage.setItem(k, v); }
  if (opts.homebridge) { window.homebridge = opts.homebridge; }
  if (opts.before) { opts.before(window); }
  for (const name of [].concat(opts.script || 'kit.js')) { window.eval(read(name)); }
  return { window, document: window.document, MpKit: window.MpKit, media, dom };
}

export const tick = () => new Promise(r => setTimeout(r, 0));
