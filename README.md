# @mp-consulting/homebridge-ui-kit

Brand design system for [@mp-consulting](https://github.com/mp-consulting) Homebridge plugins.

Provides shared CSS tokens, Bootstrap 5 overrides, and vanilla JS UI components used across all `@mp-consulting` Homebridge plugin config UIs.

## Contents

| File | Description |
|------|-------------|
| `dist/kit.css` | CSS tokens, Bootstrap overrides, shared component styles and the Assistant (AI) components |
| `dist/kit.js` | Vanilla JS helpers exposed as `window.MpKit` (including `MpKit.ai`) — a classic script |
| `dist/ai.css` | Standalone build: tokens + Assistant components only, no Bootstrap overrides (for non-plugin apps such as the Glass UI) |
| `dist/kit.min.css`, `dist/kit.min.js`, `dist/ai.min.css` | Minified builds of the above, each with a `.map` source map |
| `dist/theme-boot.js` | ~0.4 kB `<head>` script that applies the light/dark theme before first paint (see [Theme](#theme)) |
| `dist/kit.d.ts`, `dist/kit.d.mts` | TypeScript declarations for the global and the ES module |
| `dist/kit.mjs` | ES module: `MpKit` (default export) plus named exports (`escapeHtml`, `markdown`, `diffLines`, `StatusBadge`, …); it does not set a global |

Package entry points: `@mp-consulting/homebridge-ui-kit` (the ES module), `@mp-consulting/homebridge-ui-kit/dist/*`
and the shortcuts `/kit.css`, `/kit.min.css`, `/kit.js`, `/kit.min.js`, `/kit.mjs`, `/ai.css`, `/ai.min.css`.

```js
// In a bundled app (e.g. the Glass UI) — pure helpers, no global, tree-shakeable
import { markdown, diffLines, escapeHtml } from '@mp-consulting/homebridge-ui-kit';
```

## Integration

> **Serve everything from the plugin.** The Homebridge UI serves a plugin's custom UI with a
> content-security policy that only allows **same-origin** scripts and styles
> (`script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`), so CDN `<script>` /
> `<link>` tags are blocked (a plugin's `customUiCspDomains` can only widen `script-src`, never
> `style-src`). Install the kit *and* Bootstrap as dev dependencies and let `mp-ui-kit-copy --vendor`
> copy them into `homebridge-ui/public/lib/`, then reference the local `lib/` paths as shown below.

### 1. Install as dev dependencies

```bash
npm install --save-dev @mp-consulting/homebridge-ui-kit bootstrap@5.3 bootstrap-icons@1.11
```

### 2. Add the copy script to `package.json`

The package ships a zero-dependency CLI, `mp-ui-kit-copy`, that copies the kit's browser files into
`homebridge-ui/public/lib/` of the plugin it runs in. With `--vendor` it also copies Bootstrap and
Bootstrap Icons from your `node_modules`, so the UI needs nothing from a CDN:

```json
{
  "scripts": {
    "copy:ui-kit": "mp-ui-kit-copy --vendor",
    "build": "npm run copy:ui-kit && ..."
  }
}
```

| Option | Effect |
|--------|--------|
| *(none)* | Copies the kit's browser files (`kit.css`, `kit.js`, `ai.css`, their `.min` variants, `kit.mjs`, `theme-boot.js`) into `homebridge-ui/public/lib/`. Source maps and `.d.ts` files are not copied, and the `sourceMappingURL` comments are stripped |
| `--dest <dir>` | Copies into `<dir>` instead (relative to the current directory) |
| `--only <files>` | Copies only these dist files (comma-separated, repeatable), e.g. `--only kit.min.css,kit.min.js,theme-boot.js` |
| `--vendor` | Also copies `bootstrap.min.css`, `bootstrap.bundle.min.js`, `bootstrap-icons.min.css` and `fonts/bootstrap-icons.woff(2)` from the plugin's own `node_modules` (packages that are not installed are skipped) and strips their `sourceMappingURL` comments, producing the same `lib/` layout as the plugins' previous `copy:ui-assets` scripts |

> **Load `kit.css` *or* `ai.css`, never both.** `kit.css` already contains everything in `ai.css`
> (tokens + Assistant components); loading both duplicates ~20 kB of CSS and can reorder overrides.
> Plugin UIs load `kit.css`; `ai.css` is for apps that do not use the plugin kit (the Glass UI).
> The CLI warns when an `.html` page next to the destination folder links both.

Without the CLI, the equivalent is:

```bash
mkdir -p homebridge-ui/public/lib && cp node_modules/@mp-consulting/homebridge-ui-kit/dist/*.{css,js} homebridge-ui/public/lib/
```

### 3. Reference in `index.html`

The plugin's `homebridge-ui/public/index.html` must be a full HTML document. Load Bootstrap, then
`lib/kit.css` and your styles in `<head>`, and Bootstrap JS + `kit.js` + your app script at the end
of `<body>` — all from `lib/`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="lib/theme-boot.js"></script>
  <link rel="stylesheet" href="lib/bootstrap.min.css">
  <link rel="stylesheet" href="lib/bootstrap-icons.min.css">
  <link rel="stylesheet" href="lib/kit.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- your UI here -->

  <script src="lib/bootstrap.bundle.min.js"></script>
  <script src="lib/kit.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

> **Outside Homebridge** (a standalone page or a prototype without that CSP) you can load Bootstrap
> from a CDN instead. Pin the files with SRI hashes, and update them if you change a version
> (jsDelivr shows the hash for each file):
>
> ```html
> <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
> <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" integrity="sha384-XGjxtQfXaH2tnPFa9x+ruJTuLE3Aa6LhHSWRr1XeTyhezb4abCG4ccI5AkVDxqC+" crossorigin="anonymous">
> <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
> ```

#### Theme

`lib/theme-boot.js` is a tiny, same-origin script (inline scripts are not needed) that sets
`data-bs-theme` (and the `.mp-theme-dark` class) on `<html>` before the stylesheets paint, from the
preference remembered by `MpKit.Theme` or else the system preference — no flash of the wrong theme.
Then, in your app script, let the kit apply the Homebridge user's setting and follow changes:

```js
const theme = MpKit.Theme.init();   // system preference now; Homebridge setting when it arrives
await theme.ready;                  // optional: resolves with 'light' | 'dark'
```

`MpKit.Theme.init(opts)` reads `homebridge.getUserSettings()` (`colorScheme`/`theme`: `light`,
`dark` or `auto`) and falls back to `homebridge.userCurrentLightingMode()`; with `auto` (or outside
Homebridge) it follows `prefers-color-scheme` live through a `matchMedia` listener. It remembers the
preference in `localStorage` (`mp-kit-theme`) for `theme-boot.js`.

| Option | Default | Effect |
|--------|---------|--------|
| `target` | `<html>` | Element that gets `data-bs-theme` / `.mp-theme-dark` |
| `theme` | — | Force `'light'`, `'dark'` or `'auto'` and skip the Homebridge lookup |
| `homebridge` | `true` | `false` skips the Homebridge lookup |
| `attribute` / `className` | `true` | Set `data-bs-theme` / toggle `.mp-theme-dark` |
| `storageKey` | `'mp-kit-theme'` | `localStorage` key (`false` disables it) |
| `onChange(resolved, preference)` | — | Called when the resolved theme changes |

The controller has `ready`, `preference()`, `resolved()`, `set('light' | 'dark' | 'auto')` and
`destroy()`. Pure helpers: `MpKit.Theme.resolve(preference, systemDark)`, `.normalize(value)`,
`.fromSettings(settings)` and `.apply(resolved, opts)`.

### 4. Update `.gitignore`

```gitignore
# Generated UI kit assets (copied from node_modules by the copy:ui-kit script)
homebridge-ui/public/lib/
```

### 5. Update `eslint.config.js`

Add the vendored `lib/` folder to the ignore list (it is a generated, vendored file) and expose `MpKit` as a browser global:

```js
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'homebridge-ui/public/lib/**'],
  },
  // ...
  {
    files: ['homebridge-ui/public/**/*.js'],
    languageOptions: {
      globals: {
        // ... other globals
        MpKit: 'readonly',
      },
    },
  },
);
```

### 6. TypeScript (optional)

The package ships declarations for both builds. For the classic script (`lib/kit.js`), add a
reference once (e.g. in a `globals.d.ts`) to type the `MpKit` global and `window.MpKit`:

```ts
/// <reference types="@mp-consulting/homebridge-ui-kit/kit.js" />
// or: import type {} from '@mp-consulting/homebridge-ui-kit/kit.js';
```

The ES module entry is typed automatically (`import { markdown } from '@mp-consulting/homebridge-ui-kit'`).
Option and handle types are exported too, e.g. `import type { AiRequestOptions, ThemeController,
DeviceItem } from '@mp-consulting/homebridge-ui-kit'`. In JavaScript files, `// @ts-check` plus the
reference above gives editor completion for every helper.

## MpKit API

```js
// Status badges
MpKit.StatusBadge.online()    // → HTML string
MpKit.StatusBadge.offline()
MpKit.StatusBadge.checking()
MpKit.StatusBadge.disabled()

// Empty state
MpKit.EmptyState.render({ iconClass, title, hint })

// Loading placeholder
MpKit.Loading.render('Loading...')

// View switching (.mp-view elements). When switching from another view, focus
// moves to the new view's heading (or [data-mp-focus], or the view) and its
// aria-label / heading is announced politely. Returns the shown element.
MpKit.View.show('viewId')
MpKit.View.show('viewId', { focus: false, announce: 'Custom message' })

// Accessible tabs for a .mp-tabs nav: roles, aria-selected, roving tabindex,
// Arrow keys / Home / End (mirrored in RTL). Panels come from data-mp-view
// (an .mp-view id), aria-controls, data-bs-target or href="#id".
const tabs = MpKit.Tabs.init('#tabs', { activation: 'auto', onChange: (tab, index, panel) => {} });
tabs.select(1);

// Toasts: Homebridge's own toasts inside the plugin UI, a Bootstrap-style
// fallback (.mp-toast, escaped text, role="status"/"alert") elsewhere
MpKit.Toast.success('Config saved');            // also .error / .warning / .info
MpKit.Toast.error('Login failed', 'Account');   // optional title
MpKit.Toast.info('Local only', { title, duration: 0, local: true }); // 0 = until closed

// Accessible confirmation dialog → Promise<boolean> (Escape/backdrop = false;
// focus is trapped and restored; the danger variant focuses Cancel first)
if (await MpKit.confirm({ title: 'Remove device?', message: 'This cannot be undone.',
  confirmLabel: 'Remove', danger: true })) { /* … */ }

// Screen-reader announcement through a shared, visually hidden live region
MpKit.announce('Settings saved');          // polite
MpKit.announce('Connection lost', 'assertive');

// Support footer (only http/https URLs are rendered; icons are inline SVG,
// so the Bootstrap Icons font is not required)
MpKit.Footer.render({ github, npm, changelog, target: '.mp-footer' })

// Escape untrusted text before interpolating it into your own HTML
MpKit.escapeHtml(device.name)
```

### Forms

```js
// Labelled Bootstrap controls (escaped; help/error wired with aria-describedby)
form.innerHTML = MpKit.Form.field({ name: 'host', label: 'Host', help: 'IP or hostname', required: true })
  + MpKit.Form.field({ name: 'pollInterval', label: 'Poll interval (s)', type: 'number', min: 10, value: 30 })
  + MpKit.Form.field({ name: 'mode', label: 'Mode', type: 'select', options: ['cloud', 'lan'], value: 'lan' })
  + MpKit.Form.field({ name: 'debug', label: 'Debug logging', type: 'switch' })
  // Secret with Show/Hide (aria-pressed) and Copy buttons
  + MpKit.Form.secret({ name: 'auth.token', label: 'API token', value: token });

// Copy button for literal text or another element's value/text
MpKit.CopyButton.render({ text: code, label: 'Copy code' });
MpKit.CopyButton.render({ target: '#deviceId', size: 'sm' });
await MpKit.copy('text');           // → true/false (Clipboard API, execCommand fallback)

// Read / write named controls (dotted names nest: "auth.token" → { auth: { token } })
MpKit.Form.fill(form, config);
const values = MpKit.Form.values(form);

// Dirty tracking + sticky Save bar → homebridge.updatePluginConfig + savePluginConfig
const tracker = MpKit.Form.track(form, {
  // optional: build the config blocks (default: merge values into the first block)
  toConfig: (values, blocks) => [{ ...blocks[0], ...values, platform: 'MyPlatform' }],
  // persist: false → only updatePluginConfig (the user clicks Homebridge's Save)
});
tracker.isDirty(); tracker.save(); tracker.discard(); tracker.reset(); tracker.destroy();
```

The copy and reveal buttons work through document-level delegated listeners the kit installs once,
so the HTML strings need no extra wiring. Saving shows `MpKit.Toast` feedback (`toast: false` turns
it off), re-enables the bar on failure and keeps the form dirty. Outside Homebridge (and without a
custom `save(values)`), saving only resets the dirty state and resolves `false`.

### Device lists, skeletons and logs

```js
// Searchable device list with loading (skeleton), empty and no-results states.
const list = MpKit.DeviceList.render('#devices', {
  loading: true,                         // skeleton cards + aria-busy until setItems()
  label: 'Devices',                      // list name; search label "Search devices"
  empty: { title: 'No devices found', hint: 'Click Discover to scan your network' },
  onActivate: (device, index) => openDevice(device), // cards become role="button" (Enter/Space)
  // renderItem: (device) => `<div class="card mp-device-card" role="button" tabindex="0">…</div>`,
  // keys: ['name', 'subtitle', 'id'], filter: (device, query) => …, search: false,
});
list.setItems([{ id, name, subtitle: '192.168.1.40', status: 'online', iconClass: 'bi bi-lightbulb' }]);
list.setQuery('lamp'); list.setLoading(true);

// Shimmer placeholders (static with prefers-reduced-motion)
el.innerHTML = MpKit.Skeleton.render({ lines: 3, avatar: true });

// Plain-text log: ANSI codes stripped, capped, auto-scrolls unless the user
// scrolled up (then shows "Jump to latest"); role="log", keyboard scrollable.
const log = MpKit.LogViewer.create('#log', { maxLines: 1000, label: 'Plugin log' });
log.append('\u001b[32m[info]\u001b[0m Connected\nSecond line');
MpKit.stripAnsi(text);
```

Default device cards show `name` (or `displayName`), `subtitle`, `iconClass` and a `status` badge
(`online` / `offline` / `checking` / `disabled`). Any `.mp-device-card[role="button"]` on the page —
yours included — is activated by Enter and Space. The log's live region is off by default
(a busy log would flood screen readers); pass `live: 'polite'` for low-volume logs.

### Pairing and sign-in

```js
// HomeKit setup code: XXX-XX-XXX, read digit by digit by screen readers, with
// a Copy button. The kit does not generate QR codes — pass an image or SVG.
el.innerHTML = MpKit.Pairing.pin({ pin: '03145154', qrSrc: 'qr.png' }); // http(s), path or data:image/*
MpKit.Pairing.renderPin(el, { pin, qr: svgElementFromYourServer });       // or mount an <svg>/<img>
MpKit.Pairing.formatPin('03145154');                                      // '031-45-154'

// OAuth device-code step card: open URL, code with Copy, polling state, success/error
const signIn = MpKit.Auth.deviceCode('#signin', {
  url: res.verificationUri, code: res.userCode, expiresIn: res.expiresIn,
  poll: () => homebridge.request('/auth/poll'),  // true | { done } | { error } | { interval }
  interval: 5000,
  onSuccess: () => MpKit.Steps /* … */, onRetry: () => startAgain(),
});
signIn.setState('error', 'Access denied');       // or drive the state yourself (no poll)

// Multi-step wizard: .mp-steps progress (aria-current="step") + one visible panel;
// focus moves to the new panel's heading and "Step 2 of 3: Devices" is announced.
const wizard = MpKit.Steps.create('#steps', {
  steps: [{ title: 'Account', panel: '#step-login' }, { title: 'Devices', panel: '#step-devices' },
    { title: 'Done', panel: '#step-done' }],
  onChange: (index, step) => {},
});
wizard.next(); wizard.prev(); wizard.go(2);
```

All text passed to the helpers is HTML-escaped, so it is safe to pass device names or other
values that came from the network. To include markup, build the element yourself.

### Accessibility and RTL

- `--mp-text-subtle` (secondary hints, ≥ 6:1 in both themes) and `--mp-focus-ring` (focus outlines;
  the brand indigo in light mode, `#818cf8` in dark mode where the indigo is only 2.5:1) are the
  contrast-safe tokens the components use. `.mp-sr-only` hides content visually only.
- The component styles use logical properties (`margin-inline-start`, `padding-inline-end`, …), so
  `dir="rtl"` pages lay out correctly with the regular (LTR) Bootstrap build. Code blocks and diffs
  stay left-to-right.

## Assistant (AI)

The Assistant components give AI features one recognisable look: a rotating
halo gradient used **only** for rings, glows and dots. Text always sits on a
neutral surface, so contrast is the normal body contrast. With
`prefers-reduced-motion` the gradient is static and nothing pulses.

### CSS classes

| Class | Use |
|-------|-----|
| `.mp-ai-halo` | Container with a rotating gradient ring and soft glow |
| `.mp-ai-button` (`-sm`, `-lg`) | Pill button; ring spins and glows on hover/focus or with `aria-busy="true"` |
| `.mp-ai-badge` | Small "Assistant" pill |
| `.mp-ai-thinking` | Pulsing orb + label; on a halo/button/panel it pulses the glow |
| `.mp-ai-panel` | Answer card (`.is-streaming` spins the ring); `.mp-ai-prose` styles rendered text; `.mp-ai-caret` is the streaming caret |
| `.mp-ai-chat` | Chat log, bubbles and input |
| `.mp-ai-diff` | Line diff (`.is-add` / `.is-del`) with Apply / Reject actions |
| `.mp-ai-edge-glow` | Fixed, click-through glow around the viewport |

Tokens (`src/tokens.css`): `--mp-ai-1` … `--mp-ai-6` (halo palette), `--mp-ai-stops`,
`--mp-ai-gradient`, `--mp-ai-angle` (registered with `@property`), `--mp-ai-text`
(accessible accent text), `--mp-ai-surface`, `--mp-ai-border-width`,
`--mp-ai-glow-blur`, `--mp-ai-glow-opacity`, `--mp-ai-edge-glow-opacity`,
`--mp-ai-duration`, `--mp-ai-edge-width` and the `--mp-ai-diff-*` colours. Glows are
stronger under `[data-bs-theme="dark"]`.

### `MpKit.ai`

`MpKit.ai` calls the routes that `registerAiRoutes(server)` from `@mp-consulting/homebridge-ai-core/plugin`
(also re-exported by `@mp-consulting/homebridge-ai-kit`) adds to the plugin's `homebridge-ui/server.js`, through the
`homebridge` global of `@homebridge/plugin-ui-utils`. Each request gets a generated
`requestId`; the server's `ai:chunk` / `ai:done` / `ai:error` events for that id are
forwarded to your callbacks while it runs.

```js
// Is the Assistant configured?  → { enabled, provider, model, capabilities }
const status = await MpKit.ai.status();

// Requests (all accept { onChunk(delta), onDone(), onError(message) })
await MpKit.ai.explain({ error, context, device }, { onChunk }); // → { text, usage }
await MpKit.ai.ask({ prompt, context }, { onChunk });            // → { text, usage }
await MpKit.ai.config({ schema, request, current }, { onChunk }); // → { config, explanation, usage }
```

Render helpers (all text is HTML-escaped; answers support a safe markdown subset:
paragraphs, `**bold**`, `` `code` ``, fenced code blocks, lists and `#` headings — no
links or raw HTML):

```js
// Button / badge / thinking indicator → HTML strings
el.innerHTML = MpKit.ai.renderButton({ label: 'Explain', id: 'explainBtn', size: 'sm' });
MpKit.ai.renderBadge();            // "Assistant" pill
MpKit.ai.renderThinking('Thinking…');

// Streaming answer panel
const answer = MpKit.ai.renderAnswer(document.getElementById('answer'), {
  title: 'Why is the device offline?', // optional
  note: 'Generated by the Assistant…', // optional footnote ('' hides it)
});
MpKit.ai.edgeGlow();                    // optional page-edge glow while working
try {
  const res = await MpKit.ai.explain({ error: err.message }, { onChunk: answer.append });
  answer.done(res);                     // final text replaces the streamed text
} catch (e) {
  answer.error(e);                      // shown as escaped text
} finally {
  MpKit.ai.edgeGlow(false);
}

// Suggested config change
const { config } = await MpKit.ai.config({ schema, request: 'Add my kitchen lamp', current });
MpKit.ai.renderDiff(document.getElementById('diff'), {
  before: current,                      // strings or objects (pretty-printed JSON)
  after: config,
  onApply: async ({ after }) => {       // a rejected promise re-enables the buttons
    await homebridge.updatePluginConfig([after]);
    await homebridge.savePluginConfig();
  },
  onReject: () => {},
});

// Chat (uses MpKit.ai.ask with the recent conversation as context)
const chat = MpKit.ai.renderChat(document.getElementById('chat'), {
  context: 'Plugin: homebridge-example',
  placeholder: 'Ask about your devices…',
  // onSend: (prompt, { onChunk, history }) => myTransport(prompt), // optional
});
```

#### Cancelling a request

Every request accepts an `AbortSignal` and returns a promise with `.cancel()` (and `.requestId`).
Cancelling rejects the promise with an `AbortError` (or the signal's reason), removes the event
listeners — late chunks are ignored — and sends a best-effort `/ai/cancel` request with the
`requestId` so a server that supports it can stop generating (failures are ignored; pass
`notifyServer: false` to skip it).

```js
const controller = new AbortController();
stopBtn.onclick = () => controller.abort();
try {
  await MpKit.ai.ask({ prompt }, { onChunk: answer.append, signal: controller.signal });
} catch (e) {
  if (e.name !== 'AbortError') { answer.error(e); }
}

const req = MpKit.ai.explain({ error });  // or keep the promise…
req.cancel();                             // …and cancel it directly
```

`renderChat()` returns `cancel()` too (the partial reply stays, marked "Stopped"), and passes
`ctx.signal` to a custom `onSend`.

`MpKit.ai.markdown(text)` and `MpKit.ai.diffLines(before, after)` are exported too.
Outside Homebridge (e.g. the Glass UI) load only `dist/ai.css` and use the CSS
classes directly.

`examples/index.html` (repository only; published to GitHub Pages) is a gallery of every
component — core, forms, feedback, pairing, logs and Assistant — with light/dark and RTL toggles
and a mocked `homebridge` object; `examples/ai-preview.html` focuses on the Assistant components.
See [Development](#development) to run them.

## Dark Mode

Plugins use Bootstrap's `data-bs-theme="dark"` attribute on `<html>`: Bootstrap and the kit's
`--mp-*` tokens both follow it. Use Bootstrap CSS variables (`var(--bs-body-bg)`, `var(--bs-primary)`, …)
and the `--mp-*` tokens in your own CSS instead of hard-coded colours.

Hosts whose dark mode is not Bootstrap's attribute (for example an app that toggles `body.dark-mode`,
such as the Glass UI) add the **`mp-theme-dark`** class to the same element instead of copying the
kit's dark values:

```js
document.body.classList.toggle('dark-mode', dark);
document.body.classList.toggle('mp-theme-dark', dark); // kit tokens follow
```

Under `.mp-theme-dark` alone the host colours (`--mp-ai-surface`, `--mp-ai-fg`, …) are plain values
from Bootstrap's dark palette, because the host does not switch Bootstrap's variables; override just
the ones that differ (e.g. `--mp-ai-surface` for a different card colour). When an element has both
`data-bs-theme="dark"` and `.mp-theme-dark`, the Bootstrap-variable values win.

The kit's CSS is intentionally **not** wrapped in a cascade layer: unlayered styles beat every layered
style, so with unlayered Bootstrap a `@layer mp-kit` would make Bootstrap override the kit's
`.btn-primary` and `.mp-tabs` remaps.

## Development

```bash
npm install
npm run build        # outputs to dist/ (commit the result)
npm run build:check  # fails if dist/ is out of date (run in CI)
npm test             # node:test unit tests (jsdom) against dist/
npm run test:types   # type-checks the .d.ts files
```

Use the `--mp-*` tokens for brand colors. For text in the brand color use `--mp-primary-text`,
which switches to a lighter shade in dark mode so it keeps WCAG AA contrast.

### Gallery and visual tests

```bash
npm run examples              # copies dist/ + Bootstrap into examples/lib/ (git-ignored)
npm run serve                 # http://localhost:4173/ with the Homebridge UI's CSP
npx playwright install chromium
npm run test:visual           # screenshots (light, dark, narrow, rtl) + axe-core + keyboard checks
npm run test:visual:update    # refresh the baselines after an intentional visual change
```

Screenshot baselines live in `e2e/__screenshots__/<platform>/<project>/` because font rendering
differs per OS. CI (Linux) writes missing Linux baselines instead of failing and uploads them as
the `linux-screenshots` artifact; commit them to start comparing on CI. The axe-core (WCAG 2.2 AA)
and keyboard checks always run. Append `?static&theme=dark&dir=rtl` to the gallery URL to preview a
combination.

### Releases

`npm run size` checks the gzip size of the minified files against the budgets in
`scripts/check-size.js` (CI and the publish workflow run it), and CI checks the `npm pack`
contents. Releases are prepared by release-please (`release-please-config.json`,
`.release-please-manifest.json`): it keeps a release PR with the next version and changelog from
conventional commits; merging it creates the GitHub release, which runs `publish.yml` (npm trusted
publishing, which adds provenance automatically). Set a `RELEASE_PLEASE_TOKEN` secret, because
releases created with the default `GITHUB_TOKEN` do not trigger other workflows.

## License

MIT © MP Consulting
