// Type test for the classic script: the MpKit global (run with `npm run test:types`).
/// <reference path="../../dist/kit.d.ts" />
import type { DeviceItem, ThemeController } from '@mp-consulting/homebridge-ui-kit/kit.js';

const theme: ThemeController = MpKit.Theme.init({ onChange: (resolved) => resolved.toUpperCase() });
void theme.ready.then((r) => r);
window.MpKit.View.show('list', { focus: false, announce: 'List' });
const html: string = MpKit.StatusBadge.online() + MpKit.EmptyState.render({ title: 'x' });
void html;

const req = MpKit.ai.ask({ prompt: 'hi' }, { onChunk: (d) => d.length, signal: new AbortController().signal });
req.cancel();
void req.then((res) => res.text.trim());
void MpKit.ai.config({ schema: {}, request: 'x' }).then((r) => r.config);

void MpKit.confirm({ title: 'Delete?', danger: true }).then((ok: boolean) => ok);
MpKit.Toast.success('Saved', 'Title').close();
const tracker = MpKit.Form.track('#form', { toConfig: (values, blocks) => ({ ...blocks[0], ...values }) });
void tracker.save().then((saved: boolean) => saved);
MpKit.Form.field({ name: 'host', type: 'select', options: ['a', { value: 1, label: 'One' }] });

interface Bulb extends DeviceItem { watts: number }
const list = MpKit.DeviceList.render<Bulb>('#list', { items: [{ name: 'a', watts: 9 }], onActivate: (b) => b.watts });
list.setItems([]);
MpKit.LogViewer.create('#log', { maxLines: 10 }).append(['a']);
MpKit.Pairing.renderPin(document.body, { pin: '12345678', qr: document.createElementNS('http://www.w3.org/2000/svg', 'svg') });
MpKit.Auth.deviceCode('#auth', { poll: async () => ({ done: true }) }).setState('success');
MpKit.Steps.create('#steps', { steps: ['One', { title: 'Two', panel: '#p2' }] }).next();
MpKit.Tabs.init('#tabs')?.select(1);

// @ts-expect-error unknown theme value
MpKit.Theme.init({ theme: 'sepia' });
