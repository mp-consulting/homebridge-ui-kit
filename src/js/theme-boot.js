// dist/theme-boot.js — load it first in <head> (a same-origin file, so it is
// allowed by the Homebridge UI's CSP) to apply the theme before first paint:
//   <script src="lib/theme-boot.js"></script>
// It reads the preference MpKit.Theme.init() remembered (light/dark/auto) and
// falls back to the system preference. MpKit.Theme.init() then applies the
// Homebridge user's setting and keeps following changes.
(function () {
  try {
    var el = document.documentElement;
    var pref = null;
    try { pref = localStorage.getItem('mp-kit-theme'); } catch (e) { /* blocked */ }
    var dark = pref === 'dark' || (pref !== 'light' && !!window.matchMedia
      && window.matchMedia('(prefers-color-scheme: dark)').matches);
    el.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
    if (dark) { el.classList.add('mp-theme-dark'); } else { el.classList.remove('mp-theme-dark'); }
  } catch (e) { /* never block the page */ }
})();
