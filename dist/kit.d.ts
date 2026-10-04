/* @mp-consulting/homebridge-ui-kit v1.2.2 — TypeScript declarations.
   Classic script (dist/kit.js): `MpKit` is a global (also `window.MpKit`).
   Reference it with:  /// <reference types="@mp-consulting/homebridge-ui-kit/kit.js" />
   or:                 import type {} from '@mp-consulting/homebridge-ui-kit/kit.js';
   ES module (dist/kit.mjs): see kit.d.mts. */

export type Target = string | Element;
export type ResolvedTheme = 'light' | 'dark';
export type ThemePreference = ResolvedTheme | 'auto';

// ── Core ──

export interface StatusBadgeApi {
  online(label?: string): string;
  offline(label?: string): string;
  checking(label?: string): string;
  disabled(label?: string): string;
}

export interface EmptyStateOptions {
  iconClass?: string;
  title?: string;
  hint?: string;
}

export interface ViewShowOptions {
  /** Move focus to the view's heading. Default: only when switching from another view. */
  focus?: boolean;
  /** Announce the view (true/false or a custom message). Default as for focus. */
  announce?: boolean | string;
}

export interface FooterOptions {
  github?: string;
  npm?: string;
  changelog?: string;
  target?: Target;
}

// ── Theme ──

export interface ThemeOptions {
  target?: Element;
  theme?: ThemePreference;
  homebridge?: boolean;
  storageKey?: string | false;
  attribute?: boolean;
  className?: boolean;
  onChange?(resolved: ResolvedTheme, preference: ThemePreference): void;
}

export interface ThemeController {
  /** Resolves with the resolved theme once the Homebridge setting was applied. */
  ready: Promise<ResolvedTheme | null>;
  preference(): ThemePreference;
  resolved(): ResolvedTheme;
  set(mode: ThemePreference): ResolvedTheme;
  destroy(): void;
}

export interface ThemeApi {
  init(opts?: ThemeOptions): ThemeController;
  apply(resolved: ResolvedTheme, opts?: Pick<ThemeOptions, 'target' | 'attribute' | 'className'>): void;
  resolve(preference: ThemePreference | null | undefined, systemDark: boolean): ResolvedTheme;
  normalize(value: unknown): ThemePreference | null;
  fromSettings(settings: unknown): ThemePreference | null;
}

// ── Tabs ──

export interface TabsOptions {
  activation?: 'auto' | 'manual';
  onChange?(tab: HTMLElement, index: number, panel: HTMLElement | null): void;
}

export interface TabsController {
  select(target: number | HTMLElement): void;
  selected(): number;
  tabs(): HTMLElement[];
  destroy(): void;
}

// ── Feedback ──

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  /** Milliseconds; 0 keeps the toast until it is closed. */
  duration?: number;
  /** Always use the kit's toast, even inside Homebridge. */
  local?: boolean;
}

export interface ToastHandle {
  close(): void;
  element: HTMLElement | null;
  /** True when Homebridge's own toast was used. */
  native: boolean;
}

export interface ToastApi {
  show(type: ToastType, message: string, opts?: ToastOptions | string): ToastHandle;
  success(message: string, opts?: ToastOptions | string): ToastHandle;
  error(message: string, opts?: ToastOptions | string): ToastHandle;
  warning(message: string, opts?: ToastOptions | string): ToastHandle;
  info(message: string, opts?: ToastOptions | string): ToastHandle;
}

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

// ── Forms ──

export interface FieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FieldOptions {
  name?: string;
  label?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'url' | 'tel' | 'search' | 'date' | 'time' | 'color' | 'range'
    | 'textarea' | 'select' | 'checkbox' | 'switch' | (string & {});
  id?: string;
  value?: unknown;
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  pattern?: string;
  autocomplete?: string;
  inputmode?: string;
  rows?: number;
  multiple?: boolean;
  options?: Array<FieldOption | string | number>;
  checked?: boolean;
}

export interface SecretOptions extends FieldOptions {
  copy?: boolean;
  reveal?: boolean;
}

export interface CopyButtonOptions {
  text?: string;
  /** Selector of an element whose value (inputs) or text is copied. */
  target?: string;
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
  className?: string;
  size?: 'sm';
}

export type PluginConfigBlock = Record<string, any>;
export type FormValues = Record<string, any>;

export interface TrackOptions {
  toConfig?(values: FormValues, blocks: PluginConfigBlock[]):
    PluginConfigBlock | PluginConfigBlock[] | Promise<PluginConfigBlock | PluginConfigBlock[]>;
  save?(values: FormValues): unknown;
  persist?: boolean;
  bar?: boolean | Target;
  submit?: boolean;
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  savedMessage?: string;
  toast?: boolean;
  onDirtyChange?(dirty: boolean): void;
  onSaved?(config: unknown): void;
  onError?(err: unknown): void;
}

export interface FormTracker {
  bar: HTMLElement | null;
  isDirty(): boolean;
  values(): FormValues;
  /** Resolves true when saved (to Homebridge or a custom save), false outside Homebridge. */
  save(): Promise<boolean>;
  discard(): void;
  reset(): void;
  check(): void;
  destroy(): void;
}

export interface FormApi {
  field(opts: FieldOptions): string;
  secret(opts: SecretOptions): string;
  values(form: Target): FormValues;
  fill<T extends Target>(form: T, data: FormValues): T extends string ? Element : T;
  track(form: Target, opts?: TrackOptions): FormTracker;
}

export interface CopyButtonApi {
  render(opts?: CopyButtonOptions): string;
}

// ── Lists, skeletons, logs ──

export type DeviceStatus = 'online' | 'offline' | 'checking' | 'disabled';

export interface DeviceItem {
  id?: string | number;
  name?: string;
  displayName?: string;
  subtitle?: string;
  iconClass?: string;
  status?: DeviceStatus;
  statusLabel?: string;
  [key: string]: unknown;
}

export interface DeviceListOptions<T = DeviceItem> {
  items?: T[];
  loading?: boolean;
  label?: string;
  renderItem?(item: T, index: number): string;
  search?: boolean | { placeholder?: string; label?: string };
  keys?: string[];
  filter?(item: T, query: string): boolean;
  onActivate?(item: T, index: number, event: Event): void;
  empty?: EmptyStateOptions;
  noResults?: EmptyStateOptions;
  skeletonCount?: number;
}

export interface DeviceListController<T = DeviceItem> {
  setItems(items: T[]): void;
  setLoading(loading: boolean): void;
  setQuery(query: string): void;
  items(): T[];
  visible(): T[];
  status(): string;
  destroy(): void;
}

export interface SkeletonOptions {
  lines?: number;
  avatar?: boolean;
  className?: string;
}

export interface LogViewerOptions {
  maxLines?: number;
  label?: string;
  live?: 'off' | 'polite';
  autoscroll?: boolean;
  wrap?: boolean;
  lineClass?(line: string): string | undefined | null;
  jumpLabel?: string;
}

export interface LogViewerController {
  element: HTMLElement;
  append(text: string | string[]): void;
  clear(): void;
  lines(): string[];
  scrollToBottom(): void;
  isFollowing(): boolean;
  destroy(): void;
}

// ── Pairing / sign-in / steps ──

export interface PinOptions {
  pin: string | number;
  label?: string;
  qrSrc?: string;
  qrAlt?: string;
  copy?: boolean;
  copyLabel?: string;
}

export interface RenderPinOptions extends PinOptions {
  /** An SVG/IMG element to mount, or an image URL. */
  qr?: Element | string;
}

export type AuthState = 'waiting' | 'polling' | 'success' | 'error' | 'expired';
export type PollResult = boolean | null | undefined | { done?: boolean; error?: unknown; interval?: number; [key: string]: unknown };

export interface DeviceCodeOptions {
  title?: string;
  url?: string;
  code?: string;
  instructions?: string;
  openLabel?: string;
  poll?(): PollResult | Promise<PollResult>;
  interval?: number;
  expiresIn?: number;
  autoStart?: boolean;
  successMessage?: string;
  onSuccess?(result: PollResult): void;
  onError?(err: unknown): void;
  onRetry?(): void;
}

export interface DeviceCodeController {
  element: HTMLElement;
  setState(state: AuthState, message?: string): DeviceCodeController;
  state(): AuthState;
  start(): DeviceCodeController;
  stop(): void;
  destroy(): void;
}

export interface StepDefinition {
  title: string;
  panel?: Target;
}

export interface StepsOptions {
  steps: Array<StepDefinition | string>;
  current?: number;
  label?: string;
  focus?: boolean;
  onChange?(index: number, step: StepDefinition): void;
}

export interface StepsController {
  go(index: number): number;
  next(): number;
  prev(): number;
  current(): number;
  destroy(): void;
}

// ── Assistant (AI) ──

export interface AiStatus {
  enabled: boolean;
  provider?: string;
  model?: string;
  capabilities?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface AiUsage {
  inputTokens?: number;
  outputTokens?: number;
  [key: string]: unknown;
}

export interface AiTextResult {
  text: string;
  usage?: AiUsage;
  [key: string]: unknown;
}

export interface AiConfigResult {
  config: unknown;
  explanation?: string;
  usage?: AiUsage;
  [key: string]: unknown;
}

export interface AiRequestOptions {
  onChunk?(delta: string, event: { requestId: string; delta: string; [key: string]: unknown }): void;
  onDone?(event: { requestId: string; [key: string]: unknown }): void;
  onError?(message: string, event: { requestId: string; message?: string; [key: string]: unknown }): void;
  /** Cancels the request when aborted. */
  signal?: AbortSignal;
  /** Send a best-effort /ai/cancel request when cancelled (default true). */
  notifyServer?: boolean;
}

/** A pending Assistant request: a promise that can be cancelled. */
export interface AiRequest<T> extends Promise<T> {
  /** Cancels the request; returns false if it had already settled. */
  cancel(reason?: unknown): boolean;
  requestId: string | null;
}

export interface AiButtonOptions {
  label?: string;
  id?: string;
  className?: string;
  size?: 'sm' | 'lg';
  title?: string;
}

export interface AiAnswerOptions {
  label?: string;
  title?: string;
  text?: string;
  streaming?: boolean;
  /** Footnote; '' hides it. */
  note?: string;
}

export interface AiAnswerController {
  append(delta: string): AiAnswerController;
  setText(text: string): AiAnswerController;
  done(result?: string | { text?: string }): AiAnswerController;
  error(err: unknown): AiAnswerController;
  getText(): string;
}

export interface DiffLine {
  type: 'add' | 'del' | 'same';
  text: string;
}

export interface AiDiffChange {
  before: unknown;
  after: unknown;
  lines: DiffLine[];
}

export interface AiDiffOptions {
  before?: unknown;
  after?: unknown;
  title?: string;
  label?: string;
  applyLabel?: string;
  rejectLabel?: string;
  onApply?(change: AiDiffChange): unknown;
  onReject?(change: AiDiffChange): unknown;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  text: string;
  error?: string;
}

export interface AiChatOptions {
  label?: string;
  context?: string;
  placeholder?: string;
  emptyText?: string;
  onSend?(prompt: string, ctx: {
    onChunk(delta: string): void;
    history: Array<{ role: 'user' | 'assistant'; text: string }>;
    signal?: AbortSignal;
  }): unknown;
}

export interface AiChatController {
  send(text?: string): Promise<string | null>;
  cancel(): boolean;
  clear(): void;
  messages(): AiChatMessage[];
}

export interface AiApi {
  status(): Promise<AiStatus>;
  explain(body: { error: string; context?: string; device?: unknown }, opts?: AiRequestOptions): AiRequest<AiTextResult>;
  ask(body: { prompt: string; context?: string }, opts?: AiRequestOptions): AiRequest<AiTextResult>;
  config(body: { schema: unknown; request: string; current?: unknown }, opts?: AiRequestOptions): AiRequest<AiConfigResult>;
  markdown(text: string | null | undefined): string;
  diffLines(before: unknown, after: unknown): DiffLine[];
  renderButton(opts?: AiButtonOptions): string;
  renderBadge(label?: string): string;
  renderThinking(label?: string): string;
  renderAnswer(el: Element, opts?: AiAnswerOptions): AiAnswerController;
  renderDiff(el: Element, opts?: AiDiffOptions): { lines: DiffLine[]; added: number; removed: number };
  renderChat(el: Element, opts?: AiChatOptions): AiChatController;
  edgeGlow(show?: boolean): HTMLElement | null;
}

// ── The MpKit object ──

export interface MpKitApi {
  version: string;
  escapeHtml(value: unknown): string;
  announce(message: string, politeness?: 'polite' | 'assertive'): void;
  StatusBadge: StatusBadgeApi;
  EmptyState: { render(opts?: EmptyStateOptions): string };
  Loading: { render(message?: string): string };
  View: { show(id: string, opts?: ViewShowOptions): HTMLElement | null };
  Footer: { render(opts?: FooterOptions): void };
  Tabs: { init(el: Target, opts?: TabsOptions): TabsController | null };
  Theme: ThemeApi;
  Toast: ToastApi;
  confirm(opts?: ConfirmOptions | string): Promise<boolean>;
  Form: FormApi;
  CopyButton: CopyButtonApi;
  copy(text: string): Promise<boolean>;
  DeviceList: { render<T = DeviceItem>(el: Target, opts?: DeviceListOptions<T>): DeviceListController<T> };
  Skeleton: { render(opts?: SkeletonOptions): string };
  LogViewer: { create(el: Target, opts?: LogViewerOptions): LogViewerController; stripAnsi(text: string): string };
  stripAnsi(text: string): string;
  Pairing: {
    formatPin(code: string | number): string;
    pin(opts: PinOptions): string;
    renderPin(el: Target, opts: RenderPinOptions): HTMLElement | null;
  };
  Auth: { deviceCode(el: Target, opts?: DeviceCodeOptions): DeviceCodeController };
  Steps: { create(el: Target, opts: StepsOptions): StepsController };
  ai: AiApi;
}

declare global {
  // eslint-disable-next-line no-var
  var MpKit: MpKitApi;
  interface Window {
    MpKit: MpKitApi;
  }
}
