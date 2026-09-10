# Changelog

All notable changes to this project will be documented in this file.

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
