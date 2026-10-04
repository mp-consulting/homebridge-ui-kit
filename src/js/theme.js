// Theme — light/dark handling for plugin UIs. Combines the system preference,
// the Homebridge user's setting (homebridge.getUserSettings(), including
// "auto") and a live prefers-color-scheme listener, and remembers the
// preference so dist/theme-boot.js can apply it before first paint.

import { root, doc, hbClient } from './env.js';

export const THEME_STORAGE_KEY = 'mp-kit-theme';
const QUERY = '(prefers-color-scheme: dark)';

/** Maps the many spellings hosts use to 'light' | 'dark' | 'auto' (or null). */
export function normalizeTheme(value) {
  if (typeof value !== 'string') { return null; }
  const v = value.trim().toLowerCase();
  if (v === 'dark' || v === 'dark-mode') { return 'dark'; }
  if (v === 'light' || v === 'light-mode') { return 'light'; }
  if (v === 'auto' || v === 'system') { return 'auto'; }
  return null;
}

/** Resolves a preference to 'light' | 'dark' given whether the system is dark. */
export function resolveTheme(preference, systemDark) {
  return preference === 'dark' || (preference !== 'light' && !!systemDark) ? 'dark' : 'light';
}

/** Reads the preference from a homebridge.getUserSettings() result. */
export function themeFromSettings(settings) {
  if (!settings || typeof settings !== 'object') { return null; }
  return normalizeTheme(settings.colorScheme) || normalizeTheme(settings.theme)
    || normalizeTheme(settings.lightingMode);
}

function mediaQuery() {
  try {
    return typeof root.matchMedia === 'function' ? root.matchMedia(QUERY) : null;
  } catch {
    return null;
  }
}

function store(key, value) {
  if (!key) { return; }
  try { root.localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

function stored(key) {
  if (!key) { return null; }
  try { return normalizeTheme(root.localStorage.getItem(key)); } catch { return null; }
}

/** Asks Homebridge for the user's theme: getUserSettings(), then userCurrentLightingMode(). */
export async function homebridgeTheme() {
  const hb = hbClient();
  if (!hb) { return null; }
  if (typeof hb.getUserSettings === 'function') {
    try {
      const pref = themeFromSettings(await hb.getUserSettings());
      if (pref) { return pref; }
    } catch { /* older Homebridge UI */ }
  }
  if (typeof hb.userCurrentLightingMode === 'function') {
    try {
      const pref = normalizeTheme(await hb.userCurrentLightingMode());
      if (pref) { return pref; }
    } catch { /* not available */ }
  }
  return null;
}

/** Applies a resolved theme to an element (data-bs-theme and .mp-theme-dark). */
export function applyTheme(resolved, opts) {
  opts = opts || {};
  const d = doc();
  const target = opts.target || (d && d.documentElement);
  if (!target) { return; }
  const dark = resolved === 'dark';
  if (opts.attribute !== false) { target.setAttribute('data-bs-theme', dark ? 'dark' : 'light'); }
  if (opts.className !== false) { target.classList.toggle('mp-theme-dark', dark); }
}

export const Theme = {
  /**
   * Applies the theme now (stored/system preference), then the Homebridge
   * user's setting once it arrives, and follows system changes while the
   * preference is 'auto'.
   * opts: { target = <html>, theme ('light'|'dark'|'auto': skip Homebridge),
   *         homebridge = true, storageKey = 'mp-kit-theme' (false: none),
   *         attribute = true, className = true, onChange(resolved, preference) }
   */
  init(opts) {
    opts = opts || {};
    const key = opts.storageKey === undefined ? THEME_STORAGE_KEY : opts.storageKey;
    const explicit = normalizeTheme(opts.theme);
    let preference = explicit || stored(key) || 'auto';
    let current = null;
    let pinned = !!explicit;
    let destroyed = false;
    const media = mediaQuery();

    function update() {
      const resolved = resolveTheme(preference, media && media.matches);
      applyTheme(resolved, opts);
      store(key, preference);
      if (resolved !== current) {
        const first = current === null;
        current = resolved;
        if (!first && typeof opts.onChange === 'function') { opts.onChange(resolved, preference); }
      }
    }

    function onMedia() {
      if (!destroyed && preference === 'auto') { update(); }
    }

    if (media) {
      if (typeof media.addEventListener === 'function') { media.addEventListener('change', onMedia); }
      else if (typeof media.addListener === 'function') { media.addListener(onMedia); }
    }
    update();

    const controller = {
      /** Resolves with the resolved theme once the Homebridge setting was applied. */
      ready: null,
      preference: () => preference,
      resolved: () => current,
      /** Overrides the preference ('light' | 'dark' | 'auto'). */
      set(mode) {
        preference = normalizeTheme(mode) || 'auto';
        pinned = true;
        update();
        return current;
      },
      destroy() {
        destroyed = true;
        if (!media) { return; }
        if (typeof media.removeEventListener === 'function') { media.removeEventListener('change', onMedia); }
        else if (typeof media.removeListener === 'function') { media.removeListener(onMedia); }
      },
    };

    controller.ready = (pinned || opts.homebridge === false ? Promise.resolve(null) : homebridgeTheme())
      .then(pref => {
        if (pref && !pinned && !destroyed) {
          preference = pref;
          update();
        }
        return current;
      });
    return controller;
  },

  apply: applyTheme,
  resolve: resolveTheme,
  normalize: normalizeTheme,
  fromSettings: themeFromSettings,
};
