// DeviceList — a searchable list of .mp-device-card items with loading
// (skeleton), empty and no-results states and keyboard activation.
// Skeleton — shimmer placeholders.

import { escapeHtml, textOf, toElement, uid } from './util.js';
import { EmptyState, StatusBadge } from './core.js';

/** Skeleton.render(opts) → HTML for shimmer placeholder lines (hidden from AT). */
export const Skeleton = {
  /** opts: { lines = 3, avatar = false, className } */
  render(opts) {
    opts = opts || {};
    const lines = Math.max(1, opts.lines || 3);
    let html = '';
    for (let i = 0; i < lines; i += 1) {
      html += '<span class="mp-skeleton mp-skeleton-text"' + (i === lines - 1 && lines > 1 ? ' style="width:60%"' : '') + '></span>';
    }
    return '<div class="mp-skeleton-group' + (opts.className ? ' ' + escapeHtml(opts.className) : '') + '" aria-hidden="true">'
      + (opts.avatar ? '<span class="mp-skeleton mp-skeleton-circle"></span>' : '')
      + '<span class="mp-skeleton-lines">' + html + '</span></div>';
  },
};

const STATUS = {
  online: StatusBadge.online,
  offline: StatusBadge.offline,
  checking: StatusBadge.checking,
  disabled: StatusBadge.disabled,
};

function defaultItem(item, index, interactive) {
  const name = item.name || item.displayName || item.id || 'Device ' + (index + 1);
  const status = STATUS[item.status] ? STATUS[item.status](item.statusLabel) : '';
  return '<div class="card mp-device-card"' + (interactive ? ' role="button" tabindex="0"' : '') + '>'
    + '<div class="card-body mp-device-card-body">'
    + (item.iconClass ? '<i class="' + escapeHtml(item.iconClass) + ' mp-device-card-icon" aria-hidden="true"></i>' : '')
    + '<div class="mp-device-card-text"><div class="mp-device-card-name">' + escapeHtml(name) + '</div>'
    + (item.subtitle ? '<div class="mp-device-card-subtitle">' + escapeHtml(item.subtitle) + '</div>' : '')
    + '</div>' + status + '</div></div>';
}

function defaultFilter(keys) {
  return (item, query) => keys.some(k => {
    const v = item && item[k];
    return v != null && String(v).toLowerCase().indexOf(query) >= 0;
  });
}

export const DeviceList = {
  /**
   * Renders a device list into el and returns a controller.
   * opts: { items = [], loading = false, label = 'Devices',
   *   renderItem(item, index) → HTML (default: an .mp-device-card with
   *     name/displayName, subtitle, iconClass and status badge),
   *   search = true | { placeholder, label }, keys = ['name', 'subtitle', 'id'],
   *   filter(item, query), onActivate(item, index, event),
   *   empty: { iconClass, title, hint }, noResults: { title, hint },
   *   skeletonCount = 3 }
   * With onActivate the default cards are role="button" (Enter / Space work).
   * Returns { setItems(items), setLoading(bool), setQuery(q), items(), visible(), destroy() }.
   */
  render(el, opts) {
    opts = opts || {};
    el = toElement(el);
    const label = opts.label || 'Devices';
    const searchOpts = opts.search === false ? null : (typeof opts.search === 'object' ? opts.search : {});
    const searchId = uid('mp-device-search');
    const filter = typeof opts.filter === 'function' ? opts.filter : defaultFilter(opts.keys || ['name', 'displayName', 'subtitle', 'id']);
    const interactive = typeof opts.onActivate === 'function';
    let items = Array.isArray(opts.items) ? opts.items.slice() : [];
    let loading = !!opts.loading;
    let query = '';
    let visible = [];

    el.innerHTML = '<div class="mp-device-list">'
      + (searchOpts ? '<div class="mp-device-list-search">'
        + '<label class="mp-sr-only" for="' + searchId + '">' + escapeHtml(searchOpts.label || 'Search ' + label.toLowerCase()) + '</label>'
        + '<input type="search" class="form-control" id="' + searchId + '" autocomplete="off" placeholder="'
        + escapeHtml(searchOpts.placeholder || 'Search…') + '">'
        + '</div>' : '')
      + '<p class="mp-sr-only" role="status" aria-live="polite" aria-atomic="true"></p>'
      + '<div class="mp-device-list-items" role="list" aria-label="' + escapeHtml(label) + '"></div>'
      + '</div>';
    const list = el.querySelector('.mp-device-list-items');
    const status = el.querySelector('.mp-device-list [role="status"]');
    const input = searchOpts ? el.querySelector('input[type="search"]') : null;

    function announce(text) {
      if (status.textContent !== text) { status.textContent = text; }
    }

    function paint() {
      list.setAttribute('aria-busy', loading ? 'true' : 'false');
      if (input) { input.disabled = loading && !items.length; }
      if (loading && !items.length) {
        const n = opts.skeletonCount || 3;
        let html = '';
        for (let i = 0; i < n; i += 1) {
          html += '<div class="card mp-device-card mp-device-card-skeleton" role="listitem"><div class="card-body">'
            + Skeleton.render({ lines: 2, avatar: true }) + '</div></div>';
        }
        list.innerHTML = html;
        announce('Loading ' + label.toLowerCase() + '…');
        visible = [];
        return;
      }
      visible = query ? items.filter(item => filter(item, query)) : items.slice();
      if (!items.length) {
        list.innerHTML = '<div role="listitem">' + EmptyState.render(Object.assign({ title: 'No ' + label.toLowerCase() + ' found' }, opts.empty)) + '</div>';
        announce('No ' + label.toLowerCase());
        return;
      }
      if (!visible.length) {
        const nr = opts.noResults || {};
        list.innerHTML = '<div role="listitem">' + EmptyState.render({
          iconClass: nr.iconClass || 'bi bi-search',
          title: nr.title || 'No matches for “' + query + '”',
          hint: nr.hint || 'Try a different search',
        }) + '</div>';
        announce('No matches');
        return;
      }
      list.innerHTML = visible.map(item => {
        const index = items.indexOf(item);
        const html = typeof opts.renderItem === 'function' ? opts.renderItem(item, index) : defaultItem(item, index, interactive);
        return '<div role="listitem" class="mp-device-list-item" data-mp-index="' + index + '">' + html + '</div>';
      }).join('');
      announce(query ? visible.length + ' of ' + items.length + ' ' + label.toLowerCase() : '');
    }

    function onInput() {
      query = input.value.trim().toLowerCase();
      paint();
    }

    function onClick(ev) {
      if (!interactive) { return; }
      const row = ev.target.closest('[data-mp-index]');
      if (!row || !list.contains(row)) { return; }
      // Let nested controls (buttons, links, inputs) do their own thing.
      const control = ev.target.closest('a, button, input, select, textarea, label, [role="button"]');
      if (control && row.contains(control) && !control.classList.contains('mp-device-card')) { return; }
      const index = Number(row.getAttribute('data-mp-index'));
      opts.onActivate(items[index], index, ev);
    }

    if (input) { input.addEventListener('input', onInput); }
    list.addEventListener('click', onClick);
    paint();

    return {
      setItems(next) {
        items = Array.isArray(next) ? next.slice() : [];
        loading = false;
        paint();
      },
      setLoading(next) {
        loading = !!next;
        paint();
      },
      setQuery(q) {
        query = String(q == null ? '' : q).trim().toLowerCase();
        if (input) { input.value = q == null ? '' : String(q); }
        paint();
      },
      items: () => items.slice(),
      visible: () => visible.slice(),
      /** Text announced to screen readers for the current state. */
      status: () => textOf(status),
      destroy() {
        if (input) { input.removeEventListener('input', onInput); }
        list.removeEventListener('click', onClick);
        el.innerHTML = '';
      },
    };
  },
};
