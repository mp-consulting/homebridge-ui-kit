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
| `dist/kit.mjs` | ES module: `MpKit` (default export) plus named exports (`escapeHtml`, `markdown`, `diffLines`, `StatusBadge`, …); it does not set a global |

Package entry points: `@mp-consulting/homebridge-ui-kit` (the ES module), `@mp-consulting/homebridge-ui-kit/dist/*`
and the shortcuts `/kit.css`, `/kit.min.css`, `/kit.js`, `/kit.min.js`, `/kit.mjs`, `/ai.css`, `/ai.min.css`.

```js
// In a bundled app (e.g. the Glass UI) — pure helpers, no global, tree-shakeable
import { markdown, diffLines, escapeHtml } from '@mp-consulting/homebridge-ui-kit';
```

## Integration

> **Serve everything from the plugin.** The Homebridge UI loads a plugin's custom UI under a
> content-security policy that only allows **same-origin** scripts and styles, so CDN `<script>` /
> `<link>` tags are blocked. Install the kit *and* Bootstrap as dev dependencies and let
> `mp-ui-kit-copy --vendor` copy them into `homebridge-ui/public/lib/`, then reference the local
> `lib/` paths as shown below.

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
| *(none)* | Copies the kit's browser files (`kit.css`, `kit.js`, `ai.css`, their `.min` variants, …) into `homebridge-ui/public/lib/` |
| `--dest <dir>` | Copies into `<dir>` instead (relative to the current directory) |
| `--vendor` | Also copies `bootstrap.min.css`, `bootstrap.bundle.min.js`, `bootstrap-icons.min.css` and `fonts/bootstrap-icons.woff(2)` from the plugin's own `node_modules` (packages that are not installed are skipped) and strips their `sourceMappingURL` comments, producing the same `lib/` layout as the plugins' previous `copy:ui-assets` scripts |

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
  <script>
    (function() {
      try {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.dataset.bsTheme = 'dark';
        }
      } catch(e) {}
    })();
  </script>
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

The early inline script applies `data-bs-theme="dark"` from the system preference before any CSS loads, preventing a flash of wrong theme. In your app script, also apply the Homebridge user's saved theme setting:

```js
try {
  const settings = await homebridge.getUserSettings?.();
  if (settings?.theme === 'dark') {
    document.documentElement.dataset.bsTheme = 'dark';
  } else if (settings?.theme === 'light') {
    document.documentElement.dataset.bsTheme = 'light';
  }
} catch (e) {}
```

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

// View switching (.mp-view elements)
MpKit.View.show('viewId')

// Support footer (only http/https URLs are rendered; icons are inline SVG,
// so the Bootstrap Icons font is not required)
MpKit.Footer.render({ github, npm, changelog, target: '.mp-footer' })

// Escape untrusted text before interpolating it into your own HTML
MpKit.escapeHtml(device.name)
```

All text passed to the helpers is HTML-escaped, so it is safe to pass device names or other
values that came from the network. To include markup, build the element yourself.

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

`MpKit.ai.markdown(text)` and `MpKit.ai.diffLines(before, after)` are exported too.
Outside Homebridge (e.g. the Glass UI) load only `dist/ai.css` and use the CSS
classes directly.

`examples/ai-preview.html` (repository only) previews every component in light and
dark mode with a mocked `homebridge` object: run `npm run build` and serve the repo
root with any static server.

## Dark Mode

Dark mode is handled entirely by Bootstrap's `data-bs-theme="dark"` attribute on `<html>`. Do **not** use `@media (prefers-color-scheme: dark)` blocks, `.dark-mode` CSS classes, or custom CSS variable overrides — Bootstrap handles all of this automatically. Use Bootstrap CSS variables (`var(--bs-body-bg)`, `var(--bs-primary)`, etc.) in your custom CSS instead of hardcoded hex values.

## Development

```bash
npm install
npm run build        # outputs to dist/ (commit the result)
npm run build:check  # fails if dist/ is out of date (run in CI)
npm test
```

Use the `--mp-*` tokens for brand colors. For text in the brand color use `--mp-primary-text`,
which switches to a lighter shade in dark mode so it keeps WCAG AA contrast.

## License

MIT © MP Consulting
