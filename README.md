# @mp-consulting/homebridge-ui-kit

Brand design system for [@mp-consulting](https://github.com/mp-consulting) Homebridge plugins.

Provides shared CSS tokens, Bootstrap 5 overrides, and vanilla JS UI components used across all `@mp-consulting` Homebridge plugin config UIs.

## Contents

| File | Description |
|------|-------------|
| `dist/kit.css` | CSS tokens, Bootstrap overrides, and shared component styles |
| `dist/kit.js` | Vanilla JS helpers exposed as `window.MpKit` |

## Integration

### 1. Install as a dev dependency

```bash
npm install --save-dev @mp-consulting/homebridge-ui-kit
```

### 2. Add the copy script to `package.json`

```json
{
  "scripts": {
    "copy:ui-kit": "cp node_modules/@mp-consulting/homebridge-ui-kit/dist/kit.css homebridge-ui/public/ && cp node_modules/@mp-consulting/homebridge-ui-kit/dist/kit.js homebridge-ui/public/",
    "build": "npm run copy:ui-kit && ..."
  }
}
```

> **Note:** Copying to the `homebridge-ui/public/` root is the simplest approach and is recommended.
> `homebridge-config-ui-x` does support subdirectories (it resolves `dirname` dynamically per request), but keeping assets at the root avoids extra path nesting in HTML references.

### 3. Reference in `index.html`

The plugin's `homebridge-ui/public/index.html` must be a full HTML document. Load Bootstrap 5.3 from CDN, then `kit.css` and your styles in `<head>`, and Bootstrap JS + `kit.js` + your app script at the end of `<body>`:

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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="kit.css">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- your UI here -->

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  <script src="kit.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

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
# Generated UI kit assets (copied from node_modules by copy:ui-kit script)
homebridge-ui/public/kit.css
homebridge-ui/public/kit.js
```

### 5. Update `eslint.config.js`

Add `kit.js` to the ignore list (it is a minified third-party bundle) and expose `MpKit` as a browser global:

```js
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'homebridge-ui/public/kit.js'],
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
```

## Dark Mode

Dark mode is handled entirely by Bootstrap's `data-bs-theme="dark"` attribute on `<html>`. Do **not** use `@media (prefers-color-scheme: dark)` blocks, `.dark-mode` CSS classes, or custom CSS variable overrides — Bootstrap handles all of this automatically. Use Bootstrap CSS variables (`var(--bs-body-bg)`, `var(--bs-primary)`, etc.) in your custom CSS instead of hardcoded hex values.

## Development

```bash
npm install
npm run build   # outputs to dist/
```

## License

MIT © MP Consulting
