// confirm() — an accessible modal confirmation dialog returning a promise.

import { doc } from './env.js';
import { escapeHtml, focusables, uid } from './util.js';

/**
 * Opens a modal dialog and resolves with true (confirmed) or false
 * (cancelled, Escape, or a click on the backdrop).
 * opts (or a message string): { title = 'Are you sure?', message,
 *   confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }
 * The danger variant uses a red confirm button and focuses Cancel first.
 */
export function confirm(opts) {
  opts = typeof opts === 'string' ? { message: opts } : (opts || {});
  const d = doc();
  if (!d || !d.body) { return Promise.resolve(false); }
  const titleId = uid('mp-dialog-title');
  const messageId = uid('mp-dialog-message');
  const danger = !!opts.danger;

  const backdrop = d.createElement('div');
  backdrop.className = 'mp-dialog-backdrop';
  backdrop.innerHTML = '<div class="mp-dialog' + (danger ? ' mp-dialog-danger' : '') + '" role="alertdialog"'
    + ' aria-modal="true" aria-labelledby="' + titleId + '"'
    + (opts.message ? ' aria-describedby="' + messageId + '"' : '') + '>'
    + '<h2 class="mp-dialog-title" id="' + titleId + '">' + escapeHtml(opts.title || 'Are you sure?') + '</h2>'
    + (opts.message ? '<p class="mp-dialog-message" id="' + messageId + '">' + escapeHtml(opts.message) + '</p>' : '')
    + '<div class="mp-dialog-actions">'
    + '<button type="button" class="btn btn-outline-secondary" data-mp-dialog="cancel">'
    + escapeHtml(opts.cancelLabel || 'Cancel') + '</button>'
    + '<button type="button" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-mp-dialog="confirm">'
    + escapeHtml(opts.confirmLabel || 'Confirm') + '</button>'
    + '</div></div>';

  const dialog = backdrop.firstChild;
  const previous = d.activeElement;
  // Make the rest of the page inert while the dialog is open.
  const inerted = Array.from(d.body.children).filter(n => !n.hasAttribute('inert')
    && !n.hasAttribute('data-mp-live') && !n.classList.contains('mp-toast-container'));
  inerted.forEach(n => n.setAttribute('inert', ''));
  d.body.appendChild(backdrop);
  d.body.classList.add('mp-dialog-open');

  return new Promise(resolve => {
    function finish(result) {
      d.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      inerted.forEach(n => n.removeAttribute('inert'));
      if (!d.querySelector('.mp-dialog-backdrop')) { d.body.classList.remove('mp-dialog-open'); }
      if (previous && typeof previous.focus === 'function' && previous.isConnected) {
        try { previous.focus({ preventScroll: true }); } catch { previous.focus(); }
      }
      resolve(result);
    }
    function onKey(ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        ev.stopPropagation();
        finish(false);
      } else if (ev.key === 'Tab') {
        const items = focusables(dialog);
        if (!items.length) { return; }
        const first = items[0];
        const last = items[items.length - 1];
        const active = d.activeElement;
        if (ev.shiftKey && (active === first || !dialog.contains(active))) {
          ev.preventDefault();
          last.focus();
        } else if (!ev.shiftKey && (active === last || !dialog.contains(active))) {
          ev.preventDefault();
          first.focus();
        }
      }
    }
    backdrop.addEventListener('click', ev => {
      const action = ev.target.closest && ev.target.closest('[data-mp-dialog]');
      if (action) { finish(action.getAttribute('data-mp-dialog') === 'confirm'); }
      else if (ev.target === backdrop) { finish(false); }
    });
    d.addEventListener('keydown', onKey, true);
    dialog.querySelector('[data-mp-dialog="' + (danger ? 'cancel' : 'confirm') + '"]').focus();
  });
}
