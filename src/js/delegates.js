// Document-level delegated listeners, installed once when the kit loads, so
// HTML returned by the render helpers works without extra wiring:
//   [data-mp-copy] / [data-mp-copy-target]  copy buttons
//   [data-mp-reveal]                         show/hide a secret input
//   .mp-device-card[role="button"]           Enter / Space activate (click)

import { doc } from './env.js';
import { copyFromButton, toggleReveal } from './form.js';

const ACTIVATABLE = '.mp-device-card[role="button"], [data-mp-activate][role="button"]';

function onClick(ev) {
  const t = ev.target;
  if (!t || typeof t.closest !== 'function') { return; }
  const copy = t.closest('[data-mp-copy], [data-mp-copy-target]');
  if (copy) {
    copyFromButton(copy);
    return;
  }
  const reveal = t.closest('[data-mp-reveal]');
  if (reveal) { toggleReveal(reveal); }
}

function onKeydown(ev) {
  if (ev.defaultPrevented || (ev.key !== 'Enter' && ev.key !== ' ')) { return; }
  const t = ev.target;
  if (!t || typeof t.matches !== 'function' || !t.matches(ACTIVATABLE)) { return; }
  ev.preventDefault(); // Space would scroll the page
  t.click();
}

export function installDelegates() {
  const d = doc();
  if (!d || typeof d.addEventListener !== 'function' || d.__mpKitDelegates) { return; }
  d.__mpKitDelegates = true;
  d.addEventListener('click', onClick);
  d.addEventListener('keydown', onKeydown);
}
