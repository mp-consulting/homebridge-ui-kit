import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src', 'kit.js'), 'utf8');

// Minimal DOM stand-in: just enough for View and Footer.
function fakeElement(id, classes = []) {
  const set = new Set(classes);
  return {
    id,
    innerHTML: '',
    classList: {
      contains: c => set.has(c),
      toggle: (c, force) => (force ? set.add(c) : set.delete(c)),
    },
  };
}

function loadKit(elements = []) {
  const document = {
    querySelectorAll: sel => elements.filter(e => e.classList.contains(sel.slice(1))),
    querySelector: sel => elements.find(e => e.classList.contains(sel.slice(1))) || null,
  };
  const window = {};
  vm.runInNewContext(source, { window, document });
  return window.MpKit;
}

const XSS = '<img src=x onerror=alert(1)>';

describe('escapeHtml', () => {
  const { escapeHtml } = loadKit();

  test('escapes HTML metacharacters', () => {
    assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`),
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  test('handles null, undefined and numbers', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
  });
});

describe('StatusBadge', () => {
  const { StatusBadge } = loadKit();

  test('uses default labels', () => {
    assert.match(StatusBadge.online(), />Online<\/span>$/);
    assert.match(StatusBadge.offline(), />Offline<\/span>$/);
    assert.match(StatusBadge.checking(), />Checking…<\/span>$/);
    assert.match(StatusBadge.disabled(), />Disabled<\/span>$/);
  });

  test('renders the matching status dot, hidden from screen readers', () => {
    assert.match(StatusBadge.online(), /mp-status-online me-1" aria-hidden="true"/);
    assert.match(StatusBadge.offline(), /mp-status-offline/);
    assert.match(StatusBadge.checking(), /mp-status-checking/);
    assert.doesNotMatch(StatusBadge.disabled(), /mp-status/);
  });

  test('escapes custom labels', () => {
    for (const fn of Object.values(StatusBadge)) {
      const html = fn(XSS);
      assert.ok(!html.includes('<img'), html);
      assert.ok(html.includes('&lt;img'), html);
    }
  });
});

describe('EmptyState', () => {
  const { EmptyState } = loadKit();

  test('renders defaults without a hint', () => {
    const html = EmptyState.render();
    assert.match(html, /bi bi-inbox/);
    assert.match(html, /No items/);
    assert.doesNotMatch(html, /mp-empty-state-hint/);
  });

  test('escapes title, hint and icon class', () => {
    const html = EmptyState.render({ iconClass: '" onmouseover="x', title: XSS, hint: XSS });
    assert.ok(!html.includes('<img'));
    assert.ok(!html.includes('" onmouseover'));
    assert.match(html, /mp-empty-state-hint/);
  });
});

describe('Loading', () => {
  const { Loading } = loadKit();

  test('announces the message via a status region', () => {
    const html = Loading.render('Fetching');
    assert.match(html, /role="status" aria-live="polite"/);
    assert.match(html, /<span>Fetching<\/span>/);
  });

  test('escapes the message', () => {
    assert.ok(!Loading.render(XSS).includes('<img'));
  });
});

describe('View', () => {
  test('shows only the requested view', () => {
    const a = fakeElement('a', ['mp-view', 'active']);
    const b = fakeElement('b', ['mp-view']);
    loadKit([a, b]).View.show('b');
    assert.equal(a.classList.contains('active'), false);
    assert.equal(b.classList.contains('active'), true);
  });

  test('hides everything for an unknown id', () => {
    const a = fakeElement('a', ['mp-view', 'active']);
    loadKit([a]).View.show('missing');
    assert.equal(a.classList.contains('active'), false);
  });
});

describe('Footer', () => {
  test('renders links in a fixed order with separators', () => {
    const footer = fakeElement('f', ['mp-footer']);
    loadKit([footer]).Footer.render({
      changelog: 'https://example.com/CHANGELOG.md',
      github: 'https://github.com/x/y',
    });
    assert.match(footer.innerHTML, /GitHub<\/a><span class="mp-footer-sep" aria-hidden="true">\|<\/span><a [^>]+>.*Changelog/);
    assert.match(footer.innerHTML, /rel="noopener noreferrer"/);
    assert.equal(footer.innerHTML.match(/<svg class="mp-footer-icon"[^>]*aria-hidden="true"/g).length, 2);
    assert.doesNotMatch(footer.innerHTML, /class="bi /);
  });

  test('drops non-http(s) URLs', () => {
    const footer = fakeElement('f', ['mp-footer']);
    loadKit([footer]).Footer.render({
      github: 'javascript:alert(1)',
      npm: ' JaVaScRiPt:alert(1)',
      changelog: 'data:text/html,x',
    });
    assert.equal(footer.innerHTML, '');
  });

  test('escapes quotes in URLs', () => {
    const footer = fakeElement('f', ['mp-footer']);
    loadKit([footer]).Footer.render({ github: 'https://x.com/"onclick="alert(1)' });
    assert.ok(!footer.innerHTML.includes('"onclick'));
  });

  test('accepts an element target and ignores a missing one', () => {
    const el = fakeElement('custom');
    const kit = loadKit([]);
    kit.Footer.render({ target: el, npm: 'https://npmjs.com/x' });
    assert.match(el.innerHTML, /npm<\/a>/);
    assert.doesNotThrow(() => kit.Footer.render({ npm: 'https://npmjs.com/x' }));
  });
});

describe('dist', () => {
  test('kit.js carries the package version', () => {
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const dist = readFileSync(join(root, 'dist', 'kit.js'), 'utf8');
    assert.ok(dist.startsWith(`/* @mp-consulting/homebridge-ui-kit v${version}`));
    assert.ok(!dist.includes('__VERSION__'));
  });

  test('kit.css bundles everything; ai.css is tokens + Assistant only', () => {
    const kitCss = readFileSync(join(root, 'dist', 'kit.css'), 'utf8');
    const aiCss = readFileSync(join(root, 'dist', 'ai.css'), 'utf8');
    for (const css of [kitCss, aiCss]) {
      assert.match(css, /--mp-ai-1: #BC82F3/);
      assert.match(css, /@property --mp-ai-angle/);
      assert.match(css, /\.mp-ai-halo/);
      assert.match(css, /prefers-reduced-motion/);
    }
    assert.match(kitCss, /\.btn-primary/);
    assert.match(kitCss, /\.mp-footer/);
    assert.doesNotMatch(aiCss, /\.btn-primary|\.spinner-border|\.mp-footer/);
  });
});
