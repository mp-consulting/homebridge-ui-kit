# @mp-consulting/homebridge-ui-kit

Brand design system for [@mp-consulting](https://github.com/mp-consulting) Homebridge plugins.

Provides shared CSS tokens, Bootstrap 5 overrides, and vanilla JS UI components used across all `@mp-consulting` Homebridge plugin config UIs.

## Contents

| File | Description |
|------|-------------|
| `dist/kit.css` | CSS tokens, Bootstrap overrides, and shared component styles |
| `dist/kit.js` | Vanilla JS helpers exposed as `window.MpKit` |

## Usage

Copy the built assets into your plugin's `homebridge-ui/public/lib/` directory and reference them in `index.html`:

```html
<link rel="stylesheet" href="lib/kit.css">
<!-- after your app scripts: -->
<script src="lib/kit.js"></script>
```

### MpKit API

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

## Development

```bash
npm install
npm run build   # outputs to dist/
```

## License

MIT © MP Consulting
