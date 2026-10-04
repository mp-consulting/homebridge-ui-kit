// ESM entry (dist/kit.mjs): named exports for bundlers and <script type="module">.
// The classic-script build (dist/kit.js) exposes the same object as window.MpKit.

import { announce, escapeHtml, safeUrl } from './util.js';
import { StatusBadge, EmptyState, Loading, View, Footer } from './core.js';
import { ai, markdown, diffLines } from './ai.js';
import { Theme } from './theme.js';
import { Tabs } from './tabs.js';
import { Toast } from './toast.js';
import { confirm } from './dialog.js';
import { Form, CopyButton, copyText } from './form.js';
import { installDelegates } from './delegates.js';
import { DeviceList, Skeleton } from './devices.js';
import { LogViewer, stripAnsi } from './log.js';

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
  Toast,
  confirm,
  Form,
  CopyButton,
  copy: copyText,
  DeviceList,
  Skeleton,
  LogViewer,
  stripAnsi,
  ai,
};

installDelegates();

export {
  escapeHtml, safeUrl, announce, StatusBadge, EmptyState, Loading, View, Footer, Tabs, Theme, Toast, confirm,
  Form, CopyButton, copyText as copy, DeviceList, Skeleton, LogViewer, stripAnsi, ai, markdown, diffLines,
};

export default MpKit;
