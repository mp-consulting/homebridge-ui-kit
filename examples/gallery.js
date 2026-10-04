/* global MpKit */
// Component gallery: renders every kit component with sample data. A small
// mock of @homebridge/plugin-ui-utils streams Assistant answers.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var staticMode = params.has('static'); // screenshots: no timers, no streaming

  // ── Mock homebridge (Assistant routes only; no toast, so the kit's own toasts show) ──
  var target = new EventTarget();
  var ANSWER = 'The plugin could not reach the device (**ETIMEDOUT**).\n\n'
    + '- Check the device is powered and on the same network\n'
    + '- Confirm the IP address in `config.json`\n\n'
    + '```json\n{ "host": "192.168.1.40" }\n```';
  window.homebridge = {
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    request: function (path, body) {
      if (path === '/ai/status') { return Promise.resolve({ enabled: true, provider: 'demo' }); }
      if (path === '/ai/cancel') { return Promise.resolve({ ok: true }); }
      var parts = ANSWER.match(/[\s\S]{1,8}/g);
      return new Promise(function (resolve) {
        var i = 0;
        (function next() {
          if (i < parts.length) {
            target.dispatchEvent(new MessageEvent('ai:chunk', { data: { requestId: body.requestId, delta: parts[i] } }));
            i += 1;
            setTimeout(next, 25);
          } else {
            resolve({ text: ANSWER, usage: {} });
          }
        })();
      });
    },
  };

  // ── Theme and direction ──
  var forced = params.get('theme');
  var theme = MpKit.Theme.init({ theme: forced === 'dark' || forced === 'light' ? forced : undefined, homebridge: false, storageKey: false });
  $('themeToggle').addEventListener('click', function () {
    theme.set(theme.resolved() === 'dark' ? 'light' : 'dark');
  });
  $('dirToggle').addEventListener('click', function () {
    var el = document.documentElement;
    el.setAttribute('dir', el.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl');
  });

  // ── Status, empty, loading, skeleton ──
  $('badges').innerHTML = MpKit.StatusBadge.online() + MpKit.StatusBadge.offline()
    + MpKit.StatusBadge.checking() + MpKit.StatusBadge.disabled()
    + '<span class="mp-label">Metadata label</span>';
  $('emptyState').innerHTML = MpKit.EmptyState.render({
    iconClass: 'bi bi-lightbulb', title: 'No devices found', hint: 'Click Discover to scan your network',
  });
  $('loadingState').innerHTML = MpKit.Loading.render('Loading device information…');
  $('skeleton').innerHTML = MpKit.Skeleton.render({ lines: 3, avatar: true });

  // ── Tabs, views, device list ──
  MpKit.Tabs.init('#tabs');
  var DEVICES = [
    { id: 'lamp-1', name: 'Kitchen Lamp', subtitle: '192.168.1.40 · LAN', status: 'online', iconClass: 'bi bi-lightbulb' },
    { id: 'fan-2', name: 'Bedroom Fan', subtitle: 'Cloud', status: 'offline', iconClass: 'bi bi-fan' },
    { id: 'plug-3', name: 'Garden Plug', subtitle: 'Checking connection', status: 'checking', iconClass: 'bi bi-plug' },
    { id: 'blind-4', name: 'Living Room Blind', subtitle: 'Excluded', status: 'disabled', iconClass: 'bi bi-window' },
  ];
  MpKit.DeviceList.render('#deviceList', {
    items: DEVICES,
    onActivate: function (d) { MpKit.Toast.info(d.name + ' selected', { duration: 2500 }); },
  });
  MpKit.DeviceList.render('#deviceListLoading', { loading: true, skeletonCount: 2, search: false, label: 'Cameras' });

  // ── Forms ──
  var form = $('settingsForm');
  form.innerHTML = '<div class="row"><div class="col-md-6">'
    + MpKit.Form.field({ name: 'name', label: 'Platform name', value: 'Demo', required: true })
    + MpKit.Form.field({ name: 'host', label: 'Host', value: '192.168.1.40', help: 'IP address or hostname of the bridge' })
    + MpKit.Form.field({ name: 'pollInterval', label: 'Poll interval (seconds)', type: 'number', min: 10, value: 30 })
    + '</div><div class="col-md-6">'
    + MpKit.Form.field({ name: 'mode', label: 'Connection', type: 'select', value: 'lan',
      options: [{ value: 'cloud', label: 'Cloud' }, { value: 'lan', label: 'Local network' }] })
    + MpKit.Form.secret({ name: 'auth.token', label: 'API token', value: 'sk-demo-1234567890' })
    + MpKit.Form.field({ name: 'email', label: 'Account email', type: 'email', value: 'not-an-email', error: 'Enter a valid email address' })
    + '</div></div>'
    + MpKit.Form.field({ name: 'debug', label: 'Debug logging', type: 'switch', checked: false })
    + '<div class="d-flex align-items-center gap-2"><span class="mp-label">Device ID</span>'
    + '<code id="deviceId" class="text-body">1000abcdef</code>' + MpKit.CopyButton.render({ target: '#deviceId', size: 'sm', ariaLabel: 'Copy device ID' })
    + '</div>';
  MpKit.Form.track(form, { bar: '#saveBarHost', savedMessage: 'Settings saved (demo — nothing is written)' });
  // Show the Save bar in the gallery by making a change.
  form.querySelector('[name="pollInterval"]').value = '60';
  form.querySelector('[name="pollInterval"]').dispatchEvent(new Event('input', { bubbles: true }));

  // ── Toasts and confirm ──
  $('toastBtn').addEventListener('click', function () {
    MpKit.Toast.success('Device paired', 'Kitchen Lamp');
  });
  $('confirmBtn').addEventListener('click', function () {
    MpKit.confirm({
      title: 'Remove Bedroom Fan?', message: 'It will disappear from HomeKit, with its automations.',
      confirmLabel: 'Remove', danger: true,
    }).then(function (ok) { $('confirmResult').textContent = ok ? 'Removed' : 'Kept'; });
  });
  // Static samples of the fallback toast styles (the live ones are fixed bottom-end).
  $('toastSamples').innerHTML = ['success', 'warning', 'error', 'info'].map(function (type) {
    var text = { success: 'Settings saved', warning: 'Firmware update available', error: 'Could not reach the bridge', info: 'Discovery started' }[type];
    var icon = { success: '✓', warning: '!', error: '✕', info: 'i' }[type];
    return '<div class="mp-toast mp-toast-' + type + '"><span class="mp-toast-icon" aria-hidden="true">' + icon + '</span>'
      + '<div class="mp-toast-body"><p class="mp-toast-title">' + type.charAt(0).toUpperCase() + type.slice(1) + '</p>'
      + '<p class="mp-toast-message">' + text + '</p></div></div>';
  }).join('');

  // ── Pairing ──
  // A decorative stand-in for a QR code: the kit never generates QR codes, the
  // plugin passes its own image or SVG.
  var svgNs = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(svgNs, 'svg');
  svg.setAttribute('viewBox', '0 0 21 21');
  var cells = '';
  for (var y = 0; y < 21; y += 1) {
    for (var x = 0; x < 21; x += 1) {
      var finder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
      var on = finder ? (x % 6 === 0 || y % 6 === 0 || (x % 7 > 1 && x % 7 < 5 && y % 7 > 1 && y % 7 < 5) || x === 20 || y === 20)
        : ((x * 7 + y * 13 + x * y) % 5 < 2);
      if (on) { cells += 'M' + x + ' ' + y + 'h1v1h-1z'; }
    }
  }
  var path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', cells);
  svg.appendChild(path);
  MpKit.Pairing.renderPin('#pin', { pin: '03145154', qr: svg, qrAlt: 'Sample QR code (not scannable)' });

  var auth = MpKit.Auth.deviceCode('#deviceCode', {
    title: 'Connect your account',
    url: 'https://example.com/device',
    code: 'WDJB-MJHT',
    instructions: 'Sign in on the provider\'s site and enter the code to link Homebridge.',
  });
  auth.setState('polling');

  var steps = MpKit.Steps.create('#steps', {
    steps: [{ title: 'Sign in', panel: '#step-1' }, { title: 'Choose devices', panel: '#step-2' }, { title: 'Done', panel: '#step-3' }],
    current: 1,
  });
  $('stepPrev').addEventListener('click', function () { steps.prev(); });
  $('stepNext').addEventListener('click', function () { steps.next(); });

  // ── Log ──
  var log = MpKit.LogViewer.create('#log', {
    label: 'Plugin log', maxLines: 200,
    lineClass: function (l) { return /error/i.test(l) ? 'text-danger-emphasis' : ''; },
  });
  log.append([
    '\u001b[37m[10/4/2026, 10:00:00]\u001b[0m \u001b[36m[Demo]\u001b[0m Initializing platform…',
    '\u001b[37m[10/4/2026, 10:00:01]\u001b[0m \u001b[36m[Demo]\u001b[0m Discovered 4 devices',
    '\u001b[37m[10/4/2026, 10:00:02]\u001b[0m \u001b[36m[Demo]\u001b[0m \u001b[31mError: Bedroom Fan did not respond (ETIMEDOUT)\u001b[0m',
    '\u001b[37m[10/4/2026, 10:00:03]\u001b[0m \u001b[36m[Demo]\u001b[0m Kitchen Lamp → on',
  ]);
  if (!staticMode) {
    var n = 0;
    setInterval(function () { n += 1; log.append('[Demo] heartbeat ' + n); }, 4000);
  }

  // ── Assistant ──
  $('aiButtons').innerHTML = MpKit.ai.renderButton({ id: 'askBtn', label: 'Explain this error' })
    + MpKit.ai.renderButton({ label: 'Small', size: 'sm' })
    + '<button type="button" class="mp-ai-button mp-ai-thinking" aria-busy="true" disabled>Working…</button>'
    + MpKit.ai.renderBadge() + MpKit.ai.renderThinking();
  var answer = MpKit.ai.renderAnswer($('aiAnswer'), {
    title: 'Why is Bedroom Fan offline?', streaming: false, text: ANSWER,
  });
  $('askBtn').addEventListener('click', function () {
    answer = MpKit.ai.renderAnswer($('aiAnswer'), { title: 'Why is Bedroom Fan offline?' });
    MpKit.ai.edgeGlow();
    MpKit.ai.explain({ error: 'ETIMEDOUT' }, { onChunk: answer.append })
      .then(answer.done, answer.error)
      .then(function () { MpKit.ai.edgeGlow(false); });
  });
  MpKit.ai.renderDiff($('aiDiff'), {
    title: 'Suggested configuration change',
    before: { platform: 'Demo', pollInterval: 30, devices: [] },
    after: { platform: 'Demo', pollInterval: 60, devices: [{ id: 'lamp-1', host: '192.168.1.40' }] },
    onApply: function () { return new Promise(function (r) { setTimeout(r, 400); }); },
    onReject: function () {},
  });
  var chat = MpKit.ai.renderChat($('aiChat'), {
    context: 'Plugin: demo',
    onSend: staticMode ? function () { return 'Open **Settings** and raise the poll interval to `60`.'; } : undefined,
  });
  var ready = staticMode ? chat.send('How do I poll less often?') : Promise.resolve();

  MpKit.Footer.render({
    github: 'https://github.com/mp-consulting/homebridge-ui-kit',
    npm: 'https://www.npmjs.com/package/@mp-consulting/homebridge-ui-kit',
    changelog: 'https://github.com/mp-consulting/homebridge-ui-kit/blob/main/CHANGELOG.md',
  });

  Promise.resolve(ready).then(function () {
    document.documentElement.setAttribute('data-gallery-ready', '');
  });
})();
