// Tabs — accessible behaviour for .mp-tabs (Bootstrap .nav markup):
// role="tablist"/"tab"/"tabpanel", aria-selected, roving tabindex and
// arrow-key / Home / End navigation (mirrored on RTL pages).

import { doc } from './env.js';
import { uid } from './util.js';
import { View } from './core.js';

function panelId(tab) {
  const ref = tab.getAttribute('data-mp-view') || tab.getAttribute('aria-controls')
    || tab.getAttribute('data-bs-target') || tab.getAttribute('href') || '';
  const id = ref.charAt(0) === '#' ? ref.slice(1) : ref;
  return /^[A-Za-z][\w:.-]*$/.test(id) ? id : null;
}

function isRtl(el) {
  const holder = el.closest('[dir]');
  if (holder) { return holder.getAttribute('dir').toLowerCase() === 'rtl'; }
  try {
    const view = el.ownerDocument.defaultView;
    return view.getComputedStyle(el).direction === 'rtl';
  } catch {
    return false;
  }
}

export const Tabs = {
  /**
   * Enhances a tab bar. el: .mp-tabs element or selector.
   * opts: { activation: 'auto' | 'manual', onChange(tab, index, panel) }
   * Tabs reference their panel with data-mp-view (an .mp-view id, shown with
   * MpKit.View.show), aria-controls, data-bs-target or href="#id".
   * Returns { select(indexOrTab), selected(), tabs(), destroy() }.
   */
  init(el, opts) {
    opts = opts || {};
    const root = typeof el === 'string' ? doc().querySelector(el) : el;
    if (!root) { return null; }
    const tabs = Array.from(root.querySelectorAll('.nav-link, [role="tab"]'));
    const vertical = root.getAttribute('aria-orientation') === 'vertical';
    root.setAttribute('role', 'tablist');

    tabs.forEach(tab => {
      if (tab.parentElement !== root && tab.parentElement.tagName === 'LI') {
        tab.parentElement.setAttribute('role', 'presentation');
      }
      tab.setAttribute('role', 'tab');
      if (!tab.id) { tab.id = uid('mp-tab'); }
      const id = panelId(tab);
      const panel = id && root.ownerDocument.getElementById(id);
      if (panel) {
        tab.setAttribute('aria-controls', id);
        panel.setAttribute('role', 'tabpanel');
        if (!panel.hasAttribute('aria-labelledby')) { panel.setAttribute('aria-labelledby', tab.id); }
      }
    });

    let current = -1;

    function panelOf(tab) {
      const id = tab.getAttribute('aria-controls');
      return id ? root.ownerDocument.getElementById(id) : null;
    }

    function select(target, fromUser) {
      const index = typeof target === 'number' ? target : tabs.indexOf(target);
      if (index < 0 || index >= tabs.length) { return; }
      const changed = index !== current;
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.setAttribute('tabindex', on ? '0' : '-1');
        tab.classList.toggle('active', on);
        const panel = panelOf(tab);
        if (!panel || panel.classList.contains('mp-view')) { return; }
        if (panel.classList.contains('tab-pane')) {
          panel.classList.toggle('active', on);
          panel.classList.toggle('show', on);
        } else {
          panel.hidden = !on;
        }
      });
      const panel = panelOf(tabs[index]);
      if (panel && panel.classList.contains('mp-view')) {
        View.show(panel.id, { focus: false, announce: false });
      }
      current = index;
      if (changed && fromUser && typeof opts.onChange === 'function') {
        opts.onChange(tabs[index], index, panel);
      }
    }

    function onClick(ev) {
      const tab = ev.target.closest('[role="tab"]');
      if (!tab || !root.contains(tab)) { return; }
      if (tab.tagName === 'A') { ev.preventDefault(); }
      select(tab, true);
    }

    function onKeydown(ev) {
      const tab = ev.target.closest('[role="tab"]');
      if (!tab || !root.contains(tab)) { return; }
      const enabled = tabs.filter(t => !t.disabled && t.getAttribute('aria-disabled') !== 'true');
      const pos = enabled.indexOf(tab);
      const rtl = !vertical && isRtl(root);
      const next = vertical ? 'ArrowDown' : (rtl ? 'ArrowLeft' : 'ArrowRight');
      const prev = vertical ? 'ArrowUp' : (rtl ? 'ArrowRight' : 'ArrowLeft');
      let to = null;
      if (ev.key === next) { to = enabled[(pos + 1) % enabled.length]; }
      else if (ev.key === prev) { to = enabled[(pos - 1 + enabled.length) % enabled.length]; }
      else if (ev.key === 'Home') { to = enabled[0]; }
      else if (ev.key === 'End') { to = enabled[enabled.length - 1]; }
      else if ((ev.key === 'Enter' || ev.key === ' ') && opts.activation === 'manual') {
        ev.preventDefault();
        select(tab, true);
        return;
      }
      if (!to) { return; }
      ev.preventDefault();
      if (opts.activation === 'manual') {
        tabs.forEach(t => t.setAttribute('tabindex', t === to ? '0' : '-1'));
      } else {
        select(to, true);
      }
      to.focus();
    }

    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);

    const initial = tabs.findIndex(t => t.classList.contains('active') || t.getAttribute('aria-selected') === 'true');
    select(initial < 0 ? 0 : initial, false);

    return {
      select: target => select(target, true),
      selected: () => current,
      tabs: () => tabs.slice(),
      destroy() {
        root.removeEventListener('click', onClick);
        root.removeEventListener('keydown', onKeydown);
      },
    };
  },
};
