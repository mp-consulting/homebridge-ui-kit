// Type test for the ES module entry.
import MpKit, { markdown, diffLines, escapeHtml, Theme, Toast, type DiffLine } from '@mp-consulting/homebridge-ui-kit';

const html: string = markdown('**x**') + escapeHtml('<b>');
const lines: DiffLine[] = diffLines('a', 'b');
Theme.resolve('auto', true);
Toast.info('x');
MpKit.ai.renderBadge();
void html;
void lines;
