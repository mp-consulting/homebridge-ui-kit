// Preview options from the URL, applied before first paint:
//   ?theme=light|dark  ?dir=rtl
(function () {
  var params = new URLSearchParams(location.search);
  var el = document.documentElement;
  if (params.get('dir') === 'rtl') { el.setAttribute('dir', 'rtl'); el.setAttribute('lang', 'ar'); }
  var theme = params.get('theme');
  if (theme === 'dark' || theme === 'light') {
    el.setAttribute('data-bs-theme', theme);
    el.classList.toggle('mp-theme-dark', theme === 'dark');
  }
})();
