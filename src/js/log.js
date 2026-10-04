// LogViewer — a scrolling, plain-text log: ANSI escape codes are stripped,
// lines are capped, and it auto-scrolls unless the user scrolled up.

import { toElement } from './util.js';

// Matches ANSI/VT100 escape sequences (colours, cursor moves, OSC titles).
const ANSI = /[\u001b\u009b][[\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\d/#&.:=?%@~_]+)*|[a-zA-Z\d]+(?:;[-a-zA-Z\d/#&.:=?%@~_]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

/** Removes ANSI escape codes from text. */
export function stripAnsi(text) {
  return String(text == null ? '' : text).replace(ANSI, '');
}

const NEAR_BOTTOM = 8; // px

export const LogViewer = {
  /**
   * Creates a log viewer in el.
   * opts: { maxLines = 1000, label = 'Log', live = 'off' | 'polite',
   *   autoscroll = true, wrap = false, lineClass(line) → extra class,
   *   jumpLabel = 'Jump to latest' }
   * Returns { append(textOrLines), clear(), lines(), scrollToBottom(), isFollowing(), destroy(), element }.
   */
  create(el, opts) {
    opts = opts || {};
    el = toElement(el);
    const d = el.ownerDocument;
    const maxLines = opts.maxLines > 0 ? opts.maxLines : 1000;
    el.innerHTML = '<div class="mp-log' + (opts.wrap ? ' mp-log-wrap' : '') + '">'
      + '<div class="mp-log-body" role="log" tabindex="0"></div>'
      + '<button type="button" class="btn btn-sm btn-primary mp-log-jump" hidden></button>'
      + '</div>';
    const body = el.querySelector('.mp-log-body');
    const jump = el.querySelector('.mp-log-jump');
    body.setAttribute('aria-label', opts.label || 'Log');
    // A busy log would flood screen readers; it is still reachable with Tab.
    body.setAttribute('aria-live', opts.live === 'polite' ? 'polite' : 'off');
    jump.textContent = opts.jumpLabel || 'Jump to latest';
    let follow = opts.autoscroll !== false;
    let lines = [];

    function atBottom() {
      return body.scrollHeight - body.scrollTop - body.clientHeight <= NEAR_BOTTOM;
    }

    function scrollToBottom() {
      body.scrollTop = body.scrollHeight;
      follow = opts.autoscroll !== false;
      jump.hidden = true;
    }

    function onScroll() {
      if (opts.autoscroll === false) { return; }
      follow = atBottom();
      if (follow) { jump.hidden = true; }
    }

    function append(input) {
      const incoming = (Array.isArray(input) ? input : String(input == null ? '' : input).split(/\r?\n/))
        .map(stripAnsi);
      if (!Array.isArray(input) && incoming.length > 1 && incoming[incoming.length - 1] === '') { incoming.pop(); }
      if (!incoming.length) { return; }
      const stick = follow && (opts.autoscroll !== false);
      const frag = d.createDocumentFragment();
      incoming.forEach(line => {
        const row = d.createElement('div');
        const extra = typeof opts.lineClass === 'function' ? opts.lineClass(line) : '';
        row.className = 'mp-log-line' + (extra ? ' ' + extra : '');
        row.textContent = line;
        frag.appendChild(row);
      });
      body.appendChild(frag);
      lines = lines.concat(incoming);
      const excess = lines.length - maxLines;
      if (excess > 0) {
        lines = lines.slice(excess);
        for (let i = 0; i < excess && body.firstChild; i += 1) { body.removeChild(body.firstChild); }
      }
      if (stick) { body.scrollTop = body.scrollHeight; } else if (opts.autoscroll !== false) { jump.hidden = false; }
    }

    body.addEventListener('scroll', onScroll);
    jump.addEventListener('click', () => {
      scrollToBottom();
      body.focus();
    });

    return {
      element: body,
      append,
      clear() {
        lines = [];
        body.textContent = '';
        jump.hidden = true;
      },
      lines: () => lines.slice(),
      scrollToBottom,
      isFollowing: () => follow,
      destroy() {
        body.removeEventListener('scroll', onScroll);
        el.innerHTML = '';
      },
    };
  },
  stripAnsi,
};
