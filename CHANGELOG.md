# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-10-04

### Added

- **AI colour tokens** `--mp-ai-fg`, `--mp-ai-fg-muted`, `--mp-ai-bg`, `--mp-ai-border-color`, `--mp-ai-success-text` and `--mp-ai-danger-text`. The AI components read their text, border and status colours from these instead of Bootstrap's variables directly, so a host whose dark mode does not switch Bootstrap's colours (such as Homebridge Glass UI) can map them. They default to Bootstrap's values.
- **Assistant (AI) components.** Halo design tokens in `tokens.css` (`--mp-ai-1` … `--mp-ai-6`, `--mp-ai-stops`, `--mp-ai-gradient`, `@property --mp-ai-angle`, accent text, surface, glow strengths with stronger dark-mode values) and a new `ai.css`: `.mp-ai-halo`, `.mp-ai-button`, `.mp-ai-badge`, `.mp-ai-thinking`, `.mp-ai-panel` (streaming caret), `.mp-ai-chat`, `.mp-ai-diff` (Apply / Reject) and `.mp-ai-edge-glow`. Text never sits on the gradient; `prefers-reduced-motion` gives a static gradient with no pulse, and forced-colours mode falls back to plain outlines.
- **`MpKit.ai`**: `status()`, `explain()`, `ask()` and `config()` call the plugin's `/ai/*` routes (from `@mp-consulting/homebridge-ai-kit`) with a generated `requestId` and stream `ai:chunk` events to `onChunk`; render helpers `renderButton`, `renderBadge`, `renderThinking`, `renderAnswer` (streaming, safe markdown subset), `renderDiff` (LCS line diff), `renderChat` and `edgeGlow`, plus `markdown()` and `diffLines()`. All text is HTML-escaped.
- **`dist/ai.css`**: tokens + Assistant components without Bootstrap overrides, for apps that do not use the plugin kit (e.g. the Glass UI). `dist/kit.css` still contains everything.
- **`mp-ui-kit-copy` CLI** copies `dist/` into `homebridge-ui/public/lib/` (or `--dest <dir>`); `--vendor` also copies Bootstrap and Bootstrap Icons from the plugin's `node_modules` in the layout the plugins' `copy:ui-assets` scripts use, so they can switch to it.
- `exports` map: `@mp-consulting/homebridge-ui-kit/dist/*` plus `/kit.css`, `/kit.js`, `/ai.css` shortcuts.
- `examples/ai-preview.html` (not published) previews the Assistant components in light and dark mode.

### Fixed
- README told plugins to copy the kit into `homebridge-ui/public/` while every plugin (and the 1.0.1 notes) use `homebridge-ui/public/lib/`; the integration guide, `.gitignore` and ESLint snippets now use `lib/`.

## [1.1.1] - 2026-10-03

### Changed

- **Dependabot is enabled.** It opens pull requests for outdated npm dependencies (weekly) and GitHub Actions (monthly), and GitHub now alerts on and fixes vulnerable dependencies. The plugin itself is unchanged.

## [1.1.0] - 2026-10-03

### Security
- All `MpKit` helpers now HTML-escape their text arguments; `Footer.render` only renders `http(s)` URLs and adds `rel="noreferrer"`
- New `MpKit.escapeHtml()` helper for plugin code
- README CDN tags now carry SRI `integrity` hashes
- CI: GitHub Actions pinned to commit SHAs; npm publishing uses trusted publishing (OIDC) instead of a long-lived `NPM_TOKEN`

### Fixed
- `--mp-surface` / `--mp-border` were white-only and invisible in light mode; they now have light defaults with dark values under `[data-bs-theme="dark"]`
- Active tab and footer link hover used `--mp-primary` as text color (2.45:1 contrast in dark mode); added `--mp-primary-text` token
- Active tab no longer grows by 2px when selected
- Disabled `.btn-primary` showed Bootstrap blue instead of the brand color
- `dist/kit.js` version header was hardcoded; the build now stamps the package version

### Changed
- `Footer.render` uses inline SVG icons, so it no longer depends on the Bootstrap Icons font

### Removed
- Unused `--mp-primary-subtle` token
- Redundant `.npmignore` (the `files` field already controls the package contents)

### Accessibility
- Status dots, empty-state icons and footer separators are hidden from screen readers
- `Loading` exposes a single `role="status"` live region (the spinner was `role="status"` and `aria-hidden` at the same time)
- Keyboard focus ring for `.mp-device-card`; animations respect `prefers-reduced-motion`

### Development
- Added a `node:test` suite (`npm test`) and `npm run build:check`; CI runs both with read-only permissions and no longer runs `npm audit fix`

## [1.0.1] - 2026-07-25

A packaging and documentation release. The built assets are unchanged: `dist/kit.js` is
byte-for-byte identical to 1.0.0, and `dist/kit.css` differs only in the version number
stamped into its banner comment. Plugins upgrading from 1.0.0 get the same CSS and JS.

### Added

- GitHub Actions workflows for CI and for publishing to npm (the CodeQL analysis workflow was removed).
- `package-lock.json` is now tracked, so builds resolve the same dependency tree everywhere.

### Changed

- **README rewritten as an integration guide**: how to add the kit as a dependency, copy `dist/` into a plugin's `homebridge-ui/public/lib/`, and reference it from the config UI. The previous version documented the design tokens without saying how to consume them. It also corrects the note on subdirectory serving — `homebridge-config-ui-x` does support subdirectories.
- Added an `.npmignore` covering sources and tooling config. This has no effect on what is published: `files: ["dist"]` in `package.json` already limited the tarball to the built assets, in 1.0.0 as well.

## [1.0.0] - 2026-03-04

### Added
- Initial release
- CSS design tokens (`--mp-primary`, status colors, surface/border variables)
- Bootstrap 5 overrides for brand color
- Shared component styles: `.mp-header`, `.mp-view`, `.mp-device-card`, `.mp-settings-card`, `.mp-tabs`, `.mp-label`, `.mp-status`, `.mp-empty-state`, `.mp-loading`, `.mp-footer`
- `MpKit` JS helpers: `StatusBadge`, `EmptyState`, `Loading`, `View`
- Build script concatenating CSS sources into `dist/kit.css`
