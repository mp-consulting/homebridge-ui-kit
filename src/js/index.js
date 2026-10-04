// ESM entry (dist/kit.mjs): named exports for bundlers and <script type="module">.
// The classic-script build (dist/kit.js) exposes the same object as window.MpKit.

import { escapeHtml, safeUrl } from './util.js';
import { StatusBadge, EmptyState, Loading, View, Footer } from './core.js';
import { ai, markdown, diffLines } from './ai.js';

export const version = __VERSION__;

export const MpKit = {
  version,
  escapeHtml,
  StatusBadge,
  EmptyState,
  Loading,
  View,
  Footer,
  ai,
};

export {
  escapeHtml, safeUrl, StatusBadge, EmptyState, Loading, View, Footer, ai, markdown, diffLines,
};

export default MpKit;
