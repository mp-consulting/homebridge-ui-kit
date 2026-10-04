/* @mp-consulting/homebridge-ui-kit v__VERSION__ — declarations for the ES module (dist/kit.mjs).
   The ES module does not set the MpKit global. */

import type { MpKitApi } from './kit.js';

export type * from './kit.js';

export declare const MpKit: MpKitApi;
export default MpKit;

export declare const version: MpKitApi['version'];
export declare const escapeHtml: MpKitApi['escapeHtml'];
export declare function safeUrl(url: unknown): string | null;
export declare const announce: MpKitApi['announce'];
export declare const StatusBadge: MpKitApi['StatusBadge'];
export declare const EmptyState: MpKitApi['EmptyState'];
export declare const Loading: MpKitApi['Loading'];
export declare const View: MpKitApi['View'];
export declare const Footer: MpKitApi['Footer'];
export declare const Tabs: MpKitApi['Tabs'];
export declare const Theme: MpKitApi['Theme'];
export declare const Toast: MpKitApi['Toast'];
export declare const confirm: MpKitApi['confirm'];
export declare const Form: MpKitApi['Form'];
export declare const CopyButton: MpKitApi['CopyButton'];
export declare const copy: MpKitApi['copy'];
export declare const DeviceList: MpKitApi['DeviceList'];
export declare const Skeleton: MpKitApi['Skeleton'];
export declare const LogViewer: MpKitApi['LogViewer'];
export declare const stripAnsi: MpKitApi['stripAnsi'];
export declare const Pairing: MpKitApi['Pairing'];
export declare const Auth: MpKitApi['Auth'];
export declare const Steps: MpKitApi['Steps'];
export declare const formatPin: MpKitApi['Pairing']['formatPin'];
export declare const ai: MpKitApi['ai'];
export declare const markdown: MpKitApi['ai']['markdown'];
export declare const diffLines: MpKitApi['ai']['diffLines'];
