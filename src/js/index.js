// ESM entry (dist/kit.mjs): named exports for bundlers and <script type="module">.
// The classic-script build (dist/kit.js) exposes the same object as window.MpKit.

import { announce, escapeHtml, safeUrl } from './util.js';
import { StatusBadge, EmptyState, Loading, View, Footer } from './core.js';
import { ai, markdown, diffLines } from './ai.js';
import { Theme } from './theme.js';
import { Tabs } from './tabs.js';

export const version = __VERSION__;

export const MpKit = {
  version,
  escapeHtml,
  announce,
  StatusBadge,
  EmptyState,
  Loading,
  View,
  Footer,
  Tabs,
  Theme,
  ai,
};

export {
  escapeHtml, safeUrl, announce, StatusBadge, EmptyState, Loading, View, Footer, Tabs, Theme, ai,
  markdown, diffLines,
};

export default MpKit;
