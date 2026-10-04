/* @mp-consulting/homebridge-ui-kit v1.2.2
   Brand design system for Homebridge plugins
   https://github.com/mp-consulting/homebridge-ui-kit */
(() => {
  // src/js/env.js
  var root = typeof window !== "undefined" ? window : globalThis;
  function doc() {
    return typeof document !== "undefined" ? document : root.document;
  }
  function hbClient() {
    return root.homebridge || (typeof homebridge !== "undefined" ? homebridge : void 0);
  }

  // src/js/util.js
  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);
  }
  function safeUrl(url) {
    if (typeof url !== "string") {
      return null;
    }
    return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
  }
  var uidSeq = 0;
  function uid(prefix) {
    uidSeq += 1;
    return (prefix || "mp") + "-" + uidSeq;
  }
  function toElement(target) {
    if (!target) {
      return null;
    }
    if (typeof target === "string") {
      const d = doc();
      return d ? d.querySelector(target) : null;
    }
    return target;
  }
  function errorMessage(err, fallback) {
    if (typeof err === "string" && err) {
      return err;
    }
    return err && err.message || fallback;
  }
  var liveRegion = null;
  function announce(message, politeness) {
    const d = doc();
    if (!d || !d.body || typeof d.createElement !== "function") {
      return;
    }
    if (!liveRegion || !liveRegion.isConnected) {
      liveRegion = d.createElement("div");
      liveRegion.className = "mp-sr-only";
      liveRegion.setAttribute("data-mp-live", "");
      liveRegion.setAttribute("aria-atomic", "true");
      d.body.appendChild(liveRegion);
    }
    liveRegion.setAttribute("aria-live", politeness === "assertive" ? "assertive" : "polite");
    liveRegion.textContent = "";
    const text = String(message == null ? "" : message);
    setTimeout(() => {
      liveRegion.textContent = text;
    }, 30);
  }
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusables(el) {
    return Array.from(el.querySelectorAll(FOCUSABLE)).filter((n) => !n.hidden && !n.closest("[hidden]"));
  }
  function focusElement(el) {
    if (!el || typeof el.focus !== "function") {
      return;
    }
    if (!el.matches(FOCUSABLE) && !el.hasAttribute("tabindex")) {
      el.setAttribute("tabindex", "-1");
      el.classList.add("mp-focus-target");
    }
    try {
      el.focus({ preventScroll: true });
    } catch {
      el.focus();
    }
  }
  function textOf(el) {
    return el ? String(el.textContent || "").replace(/\s+/g, " ").trim() : "";
  }

  // src/js/core.js
  function badge(badgeClass, dotClass, label) {
    return '<span class="badge ' + badgeClass + '">' + (dotClass ? '<span class="mp-status ' + dotClass + '" aria-hidden="true"></span>' : "") + escapeHtml(label) + "</span>";
  }
  var FOOTER_LINKS = [
    {
      key: "github",
      text: "GitHub",
      paths: [
        "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"
      ]
    },
    {
      key: "npm",
      text: "npm",
      paths: [
        "M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2zm3.564 1.426L5.596 5 8 5.961 14.154 3.5zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464z"
      ]
    },
    {
      key: "changelog",
      text: "Changelog",
      paths: [
        "M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z",
        "M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z",
        "M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"
      ]
    }
  ];
  function icon(paths) {
    return '<svg class="mp-footer-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + paths.map((d) => '<path d="' + d + '"/>').join("") + "</svg>";
  }
  var StatusBadge = {
    online: (label) => badge("bg-success-subtle text-success", "mp-status-online", label || "Online"),
    offline: (label) => badge("bg-danger-subtle text-danger", "mp-status-offline", label || "Offline"),
    checking: (label) => badge("bg-secondary-subtle text-secondary", "mp-status-checking", label || "Checking…"),
    disabled: (label) => badge("bg-secondary", null, label || "Disabled")
  };
  var EmptyState = {
    render(opts) {
      opts = opts || {};
      const iconClass = opts.iconClass || "bi bi-inbox";
      const title = opts.title || "No items";
      const hint = opts.hint || "";
      return '<div class="mp-empty-state"><i class="' + escapeHtml(iconClass) + ' mp-empty-state-icon" aria-hidden="true"></i><p class="mp-empty-state-title">' + escapeHtml(title) + "</p>" + (hint ? '<p class="mp-empty-state-hint">' + escapeHtml(hint) + "</p>" : "") + "</div>";
    }
  };
  var Loading = {
    render(message) {
      message = message || "Loading…";
      return '<div class="mp-loading" role="status" aria-live="polite"><div class="spinner-border spinner-border-sm text-secondary" aria-hidden="true"></div><span>' + escapeHtml(message) + "</span></div>";
    }
  };
  var HEADING = "h1, h2, h3, h4, h5, h6, [data-mp-focus]";
  var View = {
    show(id, opts) {
      opts = opts || {};
      let shown = null;
      let changed = false;
      let previous = false;
      doc().querySelectorAll(".mp-view").forEach((v) => {
        const active = v.id === id;
        const was = v.classList.contains("active");
        if (active) {
          shown = v;
          changed = !was;
        } else if (was) {
          previous = true;
        }
        v.classList.toggle("active", active);
      });
      if (!shown || !changed || typeof shown.querySelector !== "function") {
        return shown;
      }
      const heading = shown.querySelector(HEADING);
      if (opts.focus === void 0 ? previous : opts.focus) {
        focusElement(heading || shown);
      }
      if (opts.announce === void 0 ? previous : opts.announce) {
        const label = typeof opts.announce === "string" ? opts.announce : shown.getAttribute("aria-label") || textOf(heading);
        if (label) {
          announce(label);
        }
      }
      return shown;
    }
  };
  var Footer = {
    render(opts) {
      opts = opts || {};
      const el = toElement(opts.target || ".mp-footer");
      if (!el) {
        return;
      }
      const links = [];
      FOOTER_LINKS.forEach((link) => {
        const url = safeUrl(opts[link.key]);
        if (!url) {
          return;
        }
        links.push('<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + icon(link.paths) + link.text + "</a>");
      });
      el.innerHTML = links.join('<span class="mp-footer-sep" aria-hidden="true">|</span>');
    }
  };

  // src/js/ai.js
  var SPARKLE = '<svg class="mp-ai-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0c.4 3.9 2.1 5.6 6 6-3.9.4-5.6 2.1-6 6-.4-3.9-2.1-5.6-6-6 3.9-.4 5.6-2.1 6-6z"/><path d="M13.5 10.5c.15 1.5.85 2.2 2.5 2.5-1.65.3-2.35 1-2.5 2.5-.15-1.5-.85-2.2-2.5-2.5 1.65-.3 2.35-1 2.5-2.5z"/></svg>';
  var CARET = '<span class="mp-ai-caret" aria-hidden="true"></span>';
  var DEFAULT_NOTE = "Generated by the Assistant. Check it before acting on it.";
  var DEFAULT_ERROR = "The Assistant could not answer. Please try again.";
  var LCS_LIMIT = 4e6;
  var aiSeq = 0;
  function newRequestId() {
    aiSeq += 1;
    return "mpai-" + Date.now().toString(36) + "-" + aiSeq.toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }
  function eventData(ev) {
    if (ev && ev.data !== void 0) {
      return ev.data;
    }
    if (ev && ev.detail !== void 0) {
      return ev.detail;
    }
    return ev;
  }
  function abortError(reason) {
    if (reason != null) {
      return reason;
    }
    var message = "The Assistant request was cancelled";
    if (typeof DOMException === "function") {
      try {
        return new DOMException(message, "AbortError");
      } catch (e) {
      }
    }
    var err = new Error(message);
    err.name = "AbortError";
    return err;
  }
  function notifyCancel(hb, requestId) {
    try {
      Promise.resolve(hb.request("/ai/cancel", { requestId })).catch(function() {
      });
    } catch (e) {
    }
  }
  function aiRequest(path, body, opts) {
    opts = opts || {};
    var hb = hbClient();
    if (!hb || typeof hb.request !== "function") {
      return withCancel(Promise.reject(new Error("MpKit.ai needs the Homebridge plugin UI (window.homebridge)")));
    }
    var signal = opts.signal;
    if (signal && signal.aborted) {
      return withCancel(Promise.reject(abortError(signal.reason)));
    }
    var requestId = newRequestId();
    var payload = {};
    Object.keys(body || {}).forEach(function(k) {
      payload[k] = body[k];
    });
    payload.requestId = requestId;
    var settled = false;
    var listeners = [];
    if (typeof hb.addEventListener === "function") {
      var on = function(type, fn) {
        var handler = function(ev) {
          var data = eventData(ev);
          if (!settled && data && data.requestId === requestId) {
            fn(data);
          }
        };
        hb.addEventListener(type, handler);
        listeners.push([type, handler]);
      };
      if (typeof opts.onChunk === "function") {
        on("ai:chunk", function(d) {
          if (typeof d.delta === "string" && d.delta) {
            opts.onChunk(d.delta, d);
          }
        });
      }
      if (typeof opts.onDone === "function") {
        on("ai:done", function(d) {
          opts.onDone(d);
        });
      }
      if (typeof opts.onError === "function") {
        on("ai:error", function(d) {
          opts.onError(d.message || DEFAULT_ERROR, d);
        });
      }
    }
    var rejectCancelled;
    var cancelled = new Promise(function(resolve, reject) {
      rejectCancelled = reject;
    });
    cancelled.catch(function() {
    });
    function onAbort() {
      cancel(signal.reason);
    }
    function cleanup() {
      settled = true;
      if (signal && typeof signal.removeEventListener === "function") {
        signal.removeEventListener("abort", onAbort);
      }
      if (typeof hb.removeEventListener !== "function") {
        return;
      }
      listeners.forEach(function(l) {
        hb.removeEventListener(l[0], l[1]);
      });
      listeners = [];
    }
    function cancel(reason) {
      if (settled) {
        return false;
      }
      cleanup();
      if (opts.notifyServer !== false) {
        notifyCancel(hb, requestId);
      }
      rejectCancelled(abortError(reason));
      return true;
    }
    if (signal && typeof signal.addEventListener === "function") {
      signal.addEventListener("abort", onAbort);
    }
    var pending;
    try {
      pending = Promise.resolve(hb.request(path, payload));
    } catch (err) {
      pending = Promise.reject(err);
    }
    var result = Promise.race([pending, cancelled]).then(function(value) {
      cleanup();
      return value;
    }, function(err) {
      cleanup();
      throw err;
    });
    return withCancel(result, cancel, requestId);
  }
  function withCancel(promise, cancel, requestId) {
    promise.cancel = cancel || function() {
      return false;
    };
    promise.requestId = requestId || null;
    return promise;
  }
  function inlineMarkdown(text) {
    return String(text).split(/(`[^`\n]+`)/).map(function(part, i) {
      if (i % 2 === 1) {
        return "<code>" + escapeHtml(part.slice(1, -1)) + "</code>";
      }
      return escapeHtml(part).replace(/\*\*([^*\n]+?)\*\*|__([^_\n]+?)__/g, function(m, a, b) {
        return "<strong>" + (a || b) + "</strong>";
      });
    }).join("");
  }
  var UL_ITEM = /^\s*[-*+]\s+(.*)$/;
  var OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
  var HEADING2 = /^\s*#{1,6}\s+(.*)$/;
  var FENCE = /^\s*(```|~~~)/;
  function markdown(text) {
    var lines = String(text == null ? "" : text).replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var para = [];
    var i = 0;
    function flush() {
      if (para.length) {
        out.push("<p>" + para.map(inlineMarkdown).join("<br>") + "</p>");
        para = [];
      }
    }
    while (i < lines.length) {
      var line = lines[i];
      var fence = FENCE.exec(line);
      if (fence) {
        flush();
        var code = [];
        i += 1;
        while (i < lines.length && lines[i].trim().indexOf(fence[1]) !== 0) {
          code.push(lines[i]);
          i += 1;
        }
        i += 1;
        out.push("<pre><code>" + escapeHtml(code.join("\n")) + "</code></pre>");
        continue;
      }
      var listRe = UL_ITEM.test(line) ? UL_ITEM : OL_ITEM.test(line) ? OL_ITEM : null;
      if (listRe) {
        flush();
        var tag = listRe === UL_ITEM ? "ul" : "ol";
        var items = [];
        while (i < lines.length && listRe.test(lines[i])) {
          items.push("<li>" + inlineMarkdown(listRe.exec(lines[i])[1]) + "</li>");
          i += 1;
        }
        out.push("<" + tag + ">" + items.join("") + "</" + tag + ">");
        continue;
      }
      var heading = HEADING2.exec(line);
      if (heading) {
        flush();
        out.push("<p><strong>" + inlineMarkdown(heading[1]) + "</strong></p>");
      } else if (!line.trim()) {
        flush();
      } else {
        para.push(line);
      }
      i += 1;
    }
    flush();
    return out.join("");
  }
  function withCaret(html) {
    if (/<\/p>$/.test(html)) {
      return html.slice(0, -4) + CARET + "</p>";
    }
    if (/<\/li><\/[ou]l>$/.test(html)) {
      return html.slice(0, -10) + CARET + html.slice(-10);
    }
    return html + CARET;
  }
  function toLines(value) {
    if (value == null) {
      return [];
    }
    var text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    text = text.replace(/\r\n?/g, "\n");
    if (text === "") {
      return [];
    }
    if (text.charAt(text.length - 1) === "\n") {
      text = text.slice(0, -1);
    }
    return text.split("\n");
  }
  function diffLines(before, after) {
    var a = toLines(before);
    var b = toLines(after);
    var out = [];
    var start = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) {
      out.push({ type: "same", text: a[start] });
      start += 1;
    }
    var endA = a.length;
    var endB = b.length;
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
      endA -= 1;
      endB -= 1;
    }
    var x = a.slice(start, endA);
    var y = b.slice(start, endB);
    var n = x.length;
    var m = y.length;
    var i;
    var j;
    if (n * m > LCS_LIMIT) {
      x.forEach(function(t) {
        out.push({ type: "del", text: t });
      });
      y.forEach(function(t) {
        out.push({ type: "add", text: t });
      });
    } else {
      var w = m + 1;
      var dp = new Int32Array((n + 1) * w);
      for (i = n - 1; i >= 0; i -= 1) {
        for (j = m - 1; j >= 0; j -= 1) {
          dp[i * w + j] = x[i] === y[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
      }
      i = 0;
      j = 0;
      while (i < n && j < m) {
        if (x[i] === y[j]) {
          out.push({ type: "same", text: x[i] });
          i += 1;
          j += 1;
        } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
          out.push({ type: "del", text: x[i] });
          i += 1;
        } else {
          out.push({ type: "add", text: y[j] });
          j += 1;
        }
      }
      for (; i < n; i += 1) {
        out.push({ type: "del", text: x[i] });
      }
      for (; j < m; j += 1) {
        out.push({ type: "add", text: y[j] });
      }
    }
    for (i = endA; i < a.length; i += 1) {
      out.push({ type: "same", text: a[i] });
    }
    return out;
  }
  var DIFF_SIGN = { add: "+", del: "−", same: " " };
  var DIFF_SR = { add: "Added: ", del: "Removed: ", same: "" };
  function diffLineHtml(line) {
    return '<span class="mp-ai-diff-line is-' + line.type + '"><span class="mp-ai-diff-sign" aria-hidden="true">' + DIFF_SIGN[line.type] + "</span>" + (DIFF_SR[line.type] ? '<span class="mp-ai-sr-only">' + DIFF_SR[line.type] + "</span>" : "") + escapeHtml(line.text) + "</span>";
  }
  function bind(el, type, fn) {
    var store2 = el.__mpAiListeners || (el.__mpAiListeners = {});
    if (store2[type]) {
      el.removeEventListener(type, store2[type]);
    }
    store2[type] = fn;
    el.addEventListener(type, fn);
  }
  function actionTarget(ev) {
    var t = ev && ev.target;
    return t && typeof t.closest === "function" ? t.closest("[data-mp-ai-action]") : null;
  }
  function badgeHtml(label) {
    return '<span class="mp-ai-badge">' + SPARKLE + escapeHtml(label || "Assistant") + "</span>";
  }
  function thinkingHtml(label) {
    return '<span class="mp-ai-thinking" role="status">' + escapeHtml(label || "Thinking…") + "</span>";
  }
  var edgeEl = null;
  var ai = {
    /** GET-style status of the Assistant: { enabled, provider, model, capabilities }. */
    status: function() {
      var hb = hbClient();
      if (!hb || typeof hb.request !== "function") {
        return Promise.reject(new Error("MpKit.ai needs the Homebridge plugin UI (window.homebridge)"));
      }
      return Promise.resolve(hb.request("/ai/status"));
    },
    /**
     * Explains a device/plugin error. body: { error, context?, device? } → { text, usage }
     * opts: { onChunk, onDone, onError, signal, notifyServer = true }; the
     * returned promise has .cancel() and .requestId.
     */
    explain: function(body, opts) {
      return aiRequest("/ai/explain", body, opts);
    },
    /** Free-form question. body: { prompt, context? } → { text, usage } */
    ask: function(body, opts) {
      return aiRequest("/ai/ask", body, opts);
    },
    /** Generates plugin config. body: { schema, request, current? } → { config, explanation, usage } */
    config: function(body, opts) {
      return aiRequest("/ai/config", body, opts);
    },
    markdown,
    diffLines,
    /**
     * Returns HTML for an Assistant button (sparkle icon + escaped label).
     * opts: { label = 'Ask Assistant', id, className, size: 'sm' | 'lg', title }
     */
    renderButton: function(opts) {
      opts = opts || {};
      var cls = "mp-ai-button" + (opts.size === "sm" || opts.size === "lg" ? " mp-ai-button-" + opts.size : "") + (opts.className ? " " + escapeHtml(opts.className) : "");
      return '<button type="button" class="' + cls + '"' + (opts.id ? ' id="' + escapeHtml(opts.id) + '"' : "") + (opts.title ? ' title="' + escapeHtml(opts.title) + '"' : "") + ">" + SPARKLE + "<span>" + escapeHtml(opts.label || "Ask Assistant") + "</span></button>";
    },
    /** Returns HTML for a small "Assistant" badge. */
    renderBadge: badgeHtml,
    /** Returns HTML for a pulsing "Thinking…" indicator (a status live region). */
    renderThinking: thinkingHtml,
    /**
     * Renders an answer panel into el and returns a controller for streaming:
     *   const answer = MpKit.ai.renderAnswer(el);
     *   const res = await MpKit.ai.ask({ prompt }, { onChunk: answer.append });
     *   answer.done(res.text);
     * opts: { label = 'Assistant', title, text, streaming = true, note }
     * The text is rendered as escaped, safe markdown.
     */
    renderAnswer: function(el, opts) {
      opts = opts || {};
      var note = opts.note === void 0 ? DEFAULT_NOTE : opts.note;
      el.innerHTML = '<section class="mp-ai-panel" aria-label="' + escapeHtml(opts.label || "Assistant") + ' answer"><div class="mp-ai-panel-header">' + badgeHtml(opts.label) + (opts.title ? '<p class="mp-ai-panel-title">' + escapeHtml(opts.title) + "</p>" : "") + '</div><div class="mp-ai-panel-body mp-ai-prose"></div><p class="mp-ai-error" role="alert" hidden></p>' + (note ? '<p class="mp-ai-panel-note">' + escapeHtml(note) + "</p>" : "") + "</section>";
      var panel = el.querySelector(".mp-ai-panel");
      var body = el.querySelector(".mp-ai-panel-body");
      var errorEl = el.querySelector(".mp-ai-error");
      var text = opts.text == null ? "" : String(opts.text);
      var streaming = opts.streaming !== false;
      function paint() {
        var html = markdown(text);
        if (streaming) {
          html = text ? withCaret(html) : thinkingHtml();
        }
        body.innerHTML = html;
        panel.classList.toggle("is-streaming", streaming);
        panel.setAttribute("aria-busy", streaming ? "true" : "false");
      }
      var controller = {
        append: function(delta) {
          text += delta == null ? "" : String(delta);
          paint();
          return controller;
        },
        setText: function(value) {
          text = value == null ? "" : String(value);
          paint();
          return controller;
        },
        done: function(result) {
          var final = result && typeof result === "object" ? result.text : result;
          if (typeof final === "string" && final) {
            text = final;
          }
          streaming = false;
          paint();
          return controller;
        },
        error: function(err) {
          streaming = false;
          paint();
          errorEl.textContent = errorMessage(err, DEFAULT_ERROR);
          errorEl.hidden = false;
          return controller;
        },
        getText: function() {
          return text;
        }
      };
      paint();
      return controller;
    },
    /**
     * Renders a line diff with Apply / Reject buttons into el.
     * before/after may be strings or JSON-serialisable values (pretty-printed).
     * onApply / onReject receive { before, after, lines }; they may return a
     * promise — if it rejects, the buttons are re-enabled and the error shown.
     * opts: { before, after, onApply, onReject, title, applyLabel, rejectLabel }
     * Returns { lines, added, removed }.
     */
    renderDiff: function(el, opts) {
      opts = opts || {};
      var lines = diffLines(opts.before, opts.after);
      var added = lines.filter(function(l) {
        return l.type === "add";
      }).length;
      var removed = lines.filter(function(l) {
        return l.type === "del";
      }).length;
      var hasActions = typeof opts.onApply === "function" || typeof opts.onReject === "function";
      var title = opts.title || "Suggested changes";
      el.innerHTML = '<div class="mp-ai-diff"><div class="mp-ai-diff-header">' + badgeHtml(opts.label) + '<span class="mp-ai-diff-title">' + escapeHtml(title) + '</span><span class="mp-ai-diff-stats"><span class="mp-ai-diff-stat-add">+' + added + '<span class="mp-ai-sr-only"> added</span></span><span class="mp-ai-diff-stat-del">−' + removed + '<span class="mp-ai-sr-only"> removed</span></span></span></div><pre class="mp-ai-diff-body" tabindex="0" aria-label="' + escapeHtml(title) + '"><code>' + (added || removed ? lines.map(diffLineHtml).join("") : '<span class="mp-ai-diff-line">No changes</span>') + "</code></pre>" + (hasActions ? '<div class="mp-ai-diff-actions"><span class="mp-ai-diff-status" role="status"></span><button type="button" class="mp-ai-action" data-mp-ai-action="reject">' + escapeHtml(opts.rejectLabel || "Reject") + '</button><button type="button" class="mp-ai-action mp-ai-action-primary" data-mp-ai-action="apply">' + escapeHtml(opts.applyLabel || "Apply") + "</button></div>" : "") + "</div>";
      var result = { lines, added, removed };
      if (!hasActions) {
        return result;
      }
      var root2 = el.querySelector(".mp-ai-diff");
      var statusEl = el.querySelector(".mp-ai-diff-status");
      var applyBtn = el.querySelector('[data-mp-ai-action="apply"]');
      var rejectBtn = el.querySelector('[data-mp-ai-action="reject"]');
      var settled = false;
      var busy = false;
      function setDisabled(disabled) {
        applyBtn.disabled = disabled;
        rejectBtn.disabled = disabled;
      }
      bind(el, "click", function(ev) {
        var btn = actionTarget(ev);
        if (!btn || settled || busy) {
          return;
        }
        var action = btn.getAttribute("data-mp-ai-action");
        if (action !== "apply" && action !== "reject") {
          return;
        }
        var cb = action === "apply" ? opts.onApply : opts.onReject;
        busy = true;
        setDisabled(true);
        statusEl.textContent = "";
        Promise.resolve().then(function() {
          return typeof cb === "function" ? cb({ before: opts.before, after: opts.after, lines }) : void 0;
        }).then(function() {
          busy = false;
          settled = true;
          root2.classList.add(action === "apply" ? "is-applied" : "is-rejected");
          statusEl.textContent = action === "apply" ? "Applied" : "Rejected";
        }, function(err) {
          busy = false;
          setDisabled(false);
          statusEl.textContent = errorMessage(err, "Something went wrong");
        });
      });
      return result;
    },
    /**
     * Renders a chat (log + input) into el. Each message is sent with
     * MpKit.ai.ask({ prompt, context }) and streamed into the log; the context is
     * opts.context plus the recent conversation. Pass opts.onSend(prompt,
     * { onChunk, history }) to use another transport; it may resolve with a
     * string or { text }.
     * opts: { label = 'Assistant', context, placeholder, emptyText, onSend }
     * onSend also receives ctx.signal (an AbortSignal) for chat.cancel().
     * Returns { send(text?), cancel(), clear(), messages() }.
     */
    renderChat: function(el, opts) {
      opts = opts || {};
      var inputId = uid("mp-ai-chat-input");
      el.innerHTML = '<div class="mp-ai-chat"><div class="mp-ai-chat-header">' + badgeHtml(opts.label) + '</div><div class="mp-ai-chat-log" role="log" aria-live="polite" aria-label="' + escapeHtml(opts.label || "Assistant") + ' conversation"></div><form class="mp-ai-chat-form"><label class="mp-ai-sr-only" for="' + inputId + '">Message</label><textarea class="mp-ai-chat-input" id="' + inputId + '" rows="1" placeholder="' + escapeHtml(opts.placeholder || "Ask the Assistant…") + '"></textarea><button type="submit" class="mp-ai-button">' + SPARKLE + "<span>Send</span></button></form></div>";
      var log = el.querySelector(".mp-ai-chat-log");
      var input = el.querySelector(".mp-ai-chat-input");
      var sendBtn = el.querySelector(".mp-ai-chat-form .mp-ai-button");
      var messages = [];
      var busy = false;
      function messageHtml(m) {
        if (m.role === "user") {
          return '<div class="mp-ai-chat-msg is-user"><div class="mp-ai-chat-bubble"><span class="mp-ai-sr-only">You: </span>' + escapeHtml(m.text).replace(/\n/g, "<br>") + "</div></div>";
        }
        var html = markdown(m.text);
        if (m.streaming) {
          html = m.text ? withCaret(html) : thinkingHtml();
        }
        if (m.error) {
          html += '<p class="mp-ai-error" role="alert">' + escapeHtml(m.error) + "</p>";
        }
        if (m.stopped) {
          html += '<p class="mp-ai-panel-note">Stopped</p>';
        }
        return '<div class="mp-ai-chat-msg is-assistant"><div class="mp-ai-chat-bubble mp-ai-prose"><span class="mp-ai-sr-only">' + escapeHtml(opts.label || "Assistant") + ": </span>" + html + "</div></div>";
      }
      function paint() {
        log.innerHTML = messages.length ? messages.map(messageHtml).join("") : '<p class="mp-ai-chat-empty">' + escapeHtml(opts.emptyText || "Ask the Assistant a question.") + "</p>";
        log.setAttribute("aria-busy", busy ? "true" : "false");
        log.scrollTop = log.scrollHeight;
        sendBtn.disabled = busy;
        sendBtn.setAttribute("aria-busy", busy ? "true" : "false");
      }
      function defaultSend(prompt, ctx) {
        var transcript = ctx.history.slice(-10).map(function(m) {
          return (m.role === "user" ? "User" : "Assistant") + ": " + m.text;
        }).join("\n");
        var context = [opts.context, transcript ? "Conversation so far:\n" + transcript : ""].filter(Boolean).join("\n\n");
        var body = { prompt };
        if (context) {
          body.context = context;
        }
        return ai.ask(body, { onChunk: ctx.onChunk, signal: ctx.signal });
      }
      var controller = null;
      function send(text) {
        var prompt = String(text == null ? input.value : text).trim();
        if (!prompt || busy) {
          return Promise.resolve(null);
        }
        if (text == null) {
          input.value = "";
        }
        var history = messages.filter(function(m) {
          return !m.error && !m.stopped;
        }).map(function(m) {
          return { role: m.role, text: m.text };
        });
        var reply = { role: "assistant", text: "", streaming: true };
        messages.push({ role: "user", text: prompt }, reply);
        busy = true;
        paint();
        var handler = typeof opts.onSend === "function" ? opts.onSend : defaultSend;
        controller = typeof AbortController === "function" ? new AbortController() : null;
        var signal = controller ? controller.signal : void 0;
        return Promise.resolve().then(function() {
          return handler(prompt, {
            history,
            signal,
            onChunk: function(delta) {
              reply.text += delta == null ? "" : String(delta);
              paint();
            }
          });
        }).then(function(res) {
          var final = res && typeof res === "object" ? res.text : res;
          if (typeof final === "string" && final) {
            reply.text = final;
          }
        }, function(err) {
          if (err && err.name === "AbortError" || signal && signal.aborted) {
            reply.stopped = true;
          } else {
            reply.error = errorMessage(err, DEFAULT_ERROR);
          }
        }).then(function() {
          reply.streaming = false;
          busy = false;
          controller = null;
          paint();
          return reply.error || reply.stopped ? null : reply.text;
        });
      }
      bind(el, "submit", function(ev) {
        ev.preventDefault();
        send();
      });
      bind(el, "keydown", function(ev) {
        var t = ev.target;
        if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing && t === input) {
          ev.preventDefault();
          send();
        }
      });
      paint();
      return {
        send,
        /** Stops the reply in progress (aborts the signal passed to onSend / ask). */
        cancel: function() {
          if (!controller) {
            return false;
          }
          controller.abort();
          return true;
        },
        clear: function() {
          messages = [];
          paint();
        },
        messages: function() {
          return messages.map(function(m) {
            return { role: m.role, text: m.text, error: m.error };
          });
        }
      };
    },
    /**
     * Shows (default) or hides a fixed glow around the page edges, e.g. while
     * the Assistant works. Returns the element.
     */
    edgeGlow: function(show2) {
      if (show2 === false) {
        if (edgeEl) {
          edgeEl.hidden = true;
        }
        return edgeEl;
      }
      if (!edgeEl) {
        edgeEl = doc().createElement("div");
        edgeEl.className = "mp-ai-edge-glow";
        edgeEl.setAttribute("aria-hidden", "true");
        doc().body.appendChild(edgeEl);
      }
      edgeEl.hidden = false;
      return edgeEl;
    }
  };

  // src/js/theme.js
  var THEME_STORAGE_KEY = "mp-kit-theme";
  var QUERY = "(prefers-color-scheme: dark)";
  function normalizeTheme(value) {
    if (typeof value !== "string") {
      return null;
    }
    const v = value.trim().toLowerCase();
    if (v === "dark" || v === "dark-mode") {
      return "dark";
    }
    if (v === "light" || v === "light-mode") {
      return "light";
    }
    if (v === "auto" || v === "system") {
      return "auto";
    }
    return null;
  }
  function resolveTheme(preference, systemDark) {
    return preference === "dark" || preference !== "light" && !!systemDark ? "dark" : "light";
  }
  function themeFromSettings(settings) {
    if (!settings || typeof settings !== "object") {
      return null;
    }
    return normalizeTheme(settings.colorScheme) || normalizeTheme(settings.theme) || normalizeTheme(settings.lightingMode);
  }
  function mediaQuery() {
    try {
      return typeof root.matchMedia === "function" ? root.matchMedia(QUERY) : null;
    } catch {
      return null;
    }
  }
  function store(key, value) {
    if (!key) {
      return;
    }
    try {
      root.localStorage.setItem(key, value);
    } catch {
    }
  }
  function stored(key) {
    if (!key) {
      return null;
    }
    try {
      return normalizeTheme(root.localStorage.getItem(key));
    } catch {
      return null;
    }
  }
  async function homebridgeTheme() {
    const hb = hbClient();
    if (!hb) {
      return null;
    }
    if (typeof hb.getUserSettings === "function") {
      try {
        const pref = themeFromSettings(await hb.getUserSettings());
        if (pref) {
          return pref;
        }
      } catch {
      }
    }
    if (typeof hb.userCurrentLightingMode === "function") {
      try {
        const pref = normalizeTheme(await hb.userCurrentLightingMode());
        if (pref) {
          return pref;
        }
      } catch {
      }
    }
    return null;
  }
  function applyTheme(resolved, opts) {
    opts = opts || {};
    const d = doc();
    const target = opts.target || d && d.documentElement;
    if (!target) {
      return;
    }
    const dark = resolved === "dark";
    if (opts.attribute !== false) {
      target.setAttribute("data-bs-theme", dark ? "dark" : "light");
    }
    if (opts.className !== false) {
      target.classList.toggle("mp-theme-dark", dark);
    }
  }
  var Theme = {
    /**
     * Applies the theme now (stored/system preference), then the Homebridge
     * user's setting once it arrives, and follows system changes while the
     * preference is 'auto'.
     * opts: { target = <html>, theme ('light'|'dark'|'auto': skip Homebridge),
     *         homebridge = true, storageKey = 'mp-kit-theme' (false: none),
     *         attribute = true, className = true, onChange(resolved, preference) }
     */
    init(opts) {
      opts = opts || {};
      const key = opts.storageKey === void 0 ? THEME_STORAGE_KEY : opts.storageKey;
      const explicit = normalizeTheme(opts.theme);
      let preference = explicit || stored(key) || "auto";
      let current = null;
      let pinned = !!explicit;
      let destroyed = false;
      const media = mediaQuery();
      function update() {
        const resolved = resolveTheme(preference, media && media.matches);
        applyTheme(resolved, opts);
        store(key, preference);
        if (resolved !== current) {
          const first = current === null;
          current = resolved;
          if (!first && typeof opts.onChange === "function") {
            opts.onChange(resolved, preference);
          }
        }
      }
      function onMedia() {
        if (!destroyed && preference === "auto") {
          update();
        }
      }
      if (media) {
        if (typeof media.addEventListener === "function") {
          media.addEventListener("change", onMedia);
        } else if (typeof media.addListener === "function") {
          media.addListener(onMedia);
        }
      }
      update();
      const controller = {
        /** Resolves with the resolved theme once the Homebridge setting was applied. */
        ready: null,
        preference: () => preference,
        resolved: () => current,
        /** Overrides the preference ('light' | 'dark' | 'auto'). */
        set(mode) {
          preference = normalizeTheme(mode) || "auto";
          pinned = true;
          update();
          return current;
        },
        destroy() {
          destroyed = true;
          if (!media) {
            return;
          }
          if (typeof media.removeEventListener === "function") {
            media.removeEventListener("change", onMedia);
          } else if (typeof media.removeListener === "function") {
            media.removeListener(onMedia);
          }
        }
      };
      controller.ready = (pinned || opts.homebridge === false ? Promise.resolve(null) : homebridgeTheme()).then((pref) => {
        if (pref && !pinned && !destroyed) {
          preference = pref;
          update();
        }
        return current;
      });
      return controller;
    },
    apply: applyTheme,
    resolve: resolveTheme,
    normalize: normalizeTheme,
    fromSettings: themeFromSettings
  };

  // src/js/tabs.js
  function panelId(tab) {
    const ref = tab.getAttribute("data-mp-view") || tab.getAttribute("aria-controls") || tab.getAttribute("data-bs-target") || tab.getAttribute("href") || "";
    const id = ref.charAt(0) === "#" ? ref.slice(1) : ref;
    return /^[A-Za-z][\w:.-]*$/.test(id) ? id : null;
  }
  function isRtl(el) {
    const holder = el.closest("[dir]");
    if (holder) {
      return holder.getAttribute("dir").toLowerCase() === "rtl";
    }
    try {
      const view = el.ownerDocument.defaultView;
      return view.getComputedStyle(el).direction === "rtl";
    } catch {
      return false;
    }
  }
  var Tabs = {
    /**
     * Enhances a tab bar. el: .mp-tabs element or selector.
     * opts: { activation: 'auto' | 'manual', onChange(tab, index, panel) }
     * Tabs reference their panel with data-mp-view (an .mp-view id, shown with
     * MpKit.View.show), aria-controls, data-bs-target or href="#id".
     * Returns { select(indexOrTab), selected(), tabs(), destroy() }.
     */
    init(el, opts) {
      opts = opts || {};
      const root2 = typeof el === "string" ? doc().querySelector(el) : el;
      if (!root2) {
        return null;
      }
      const tabs = Array.from(root2.querySelectorAll('.nav-link, [role="tab"]'));
      const vertical = root2.getAttribute("aria-orientation") === "vertical";
      root2.setAttribute("role", "tablist");
      tabs.forEach((tab) => {
        if (tab.parentElement !== root2 && tab.parentElement.tagName === "LI") {
          tab.parentElement.setAttribute("role", "presentation");
        }
        tab.setAttribute("role", "tab");
        if (!tab.id) {
          tab.id = uid("mp-tab");
        }
        const id = panelId(tab);
        const panel = id && root2.ownerDocument.getElementById(id);
        if (panel) {
          tab.setAttribute("aria-controls", id);
          panel.setAttribute("role", "tabpanel");
          if (!panel.hasAttribute("aria-labelledby")) {
            panel.setAttribute("aria-labelledby", tab.id);
          }
        }
      });
      let current = -1;
      function panelOf(tab) {
        const id = tab.getAttribute("aria-controls");
        return id ? root2.ownerDocument.getElementById(id) : null;
      }
      function select(target, fromUser) {
        const index = typeof target === "number" ? target : tabs.indexOf(target);
        if (index < 0 || index >= tabs.length) {
          return;
        }
        const changed = index !== current;
        tabs.forEach((tab, i) => {
          const on = i === index;
          tab.setAttribute("aria-selected", on ? "true" : "false");
          tab.setAttribute("tabindex", on ? "0" : "-1");
          tab.classList.toggle("active", on);
          const panel2 = panelOf(tab);
          if (!panel2 || panel2.classList.contains("mp-view")) {
            return;
          }
          if (panel2.classList.contains("tab-pane")) {
            panel2.classList.toggle("active", on);
            panel2.classList.toggle("show", on);
          } else {
            panel2.hidden = !on;
          }
        });
        const panel = panelOf(tabs[index]);
        if (panel && panel.classList.contains("mp-view")) {
          View.show(panel.id, { focus: false, announce: false });
        }
        current = index;
        if (changed && fromUser && typeof opts.onChange === "function") {
          opts.onChange(tabs[index], index, panel);
        }
      }
      function onClick(ev) {
        const tab = ev.target.closest('[role="tab"]');
        if (!tab || !root2.contains(tab)) {
          return;
        }
        if (tab.tagName === "A") {
          ev.preventDefault();
        }
        select(tab, true);
      }
      function onKeydown(ev) {
        const tab = ev.target.closest('[role="tab"]');
        if (!tab || !root2.contains(tab)) {
          return;
        }
        const enabled = tabs.filter((t) => !t.disabled && t.getAttribute("aria-disabled") !== "true");
        const pos = enabled.indexOf(tab);
        const rtl = !vertical && isRtl(root2);
        const next = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
        const prev = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
        let to = null;
        if (ev.key === next) {
          to = enabled[(pos + 1) % enabled.length];
        } else if (ev.key === prev) {
          to = enabled[(pos - 1 + enabled.length) % enabled.length];
        } else if (ev.key === "Home") {
          to = enabled[0];
        } else if (ev.key === "End") {
          to = enabled[enabled.length - 1];
        } else if ((ev.key === "Enter" || ev.key === " ") && opts.activation === "manual") {
          ev.preventDefault();
          select(tab, true);
          return;
        }
        if (!to) {
          return;
        }
        ev.preventDefault();
        if (opts.activation === "manual") {
          tabs.forEach((t) => t.setAttribute("tabindex", t === to ? "0" : "-1"));
        } else {
          select(to, true);
        }
        to.focus();
      }
      root2.addEventListener("click", onClick);
      root2.addEventListener("keydown", onKeydown);
      const initial = tabs.findIndex((t) => t.classList.contains("active") || t.getAttribute("aria-selected") === "true");
      select(initial < 0 ? 0 : initial, false);
      return {
        select: (target) => select(target, true),
        selected: () => current,
        tabs: () => tabs.slice(),
        destroy() {
          root2.removeEventListener("click", onClick);
          root2.removeEventListener("keydown", onKeydown);
        }
      };
    }
  };

  // src/js/toast.js
  var TYPES = ["success", "error", "warning", "info"];
  var DURATION = { success: 5e3, info: 5e3, warning: 7e3, error: 8e3 };
  var ICON = { success: "✓", info: "i", warning: "!", error: "✕" };
  var container = null;
  function ensureContainer(d) {
    if (!container || !container.isConnected) {
      container = d.createElement("div");
      container.className = "mp-toast-container";
      d.body.appendChild(container);
    }
    return container;
  }
  function show(type, message, opts) {
    if (TYPES.indexOf(type) < 0) {
      type = "info";
    }
    opts = typeof opts === "string" ? { title: opts } : opts || {};
    const text = String(message == null ? "" : message);
    const hb = hbClient();
    if (!opts.local && hb && hb.toast && typeof hb.toast[type] === "function") {
      hb.toast[type](text, opts.title);
      return { close() {
      }, element: null, native: true };
    }
    const d = doc();
    if (!d || !d.body) {
      return { close() {
      }, element: null, native: false };
    }
    const el = d.createElement("div");
    el.className = "mp-toast mp-toast-" + type;
    el.setAttribute("role", type === "error" || type === "warning" ? "alert" : "status");
    el.setAttribute("aria-atomic", "true");
    el.innerHTML = '<span class="mp-toast-icon" aria-hidden="true">' + ICON[type] + '</span><div class="mp-toast-body">' + (opts.title ? '<p class="mp-toast-title">' + escapeHtml(opts.title) + "</p>" : "") + '<p class="mp-toast-message">' + escapeHtml(text) + '</p></div><button type="button" class="mp-toast-close" aria-label="Close">×</button>';
    ensureContainer(d).appendChild(el);
    let timer = null;
    let closed = false;
    const duration = opts.duration === void 0 ? DURATION[type] : Number(opts.duration) || 0;
    function close() {
      if (closed) {
        return;
      }
      closed = true;
      clearTimeout(timer);
      el.remove();
    }
    function arm() {
      clearTimeout(timer);
      if (duration > 0) {
        timer = setTimeout(close, duration);
      }
    }
    el.addEventListener("mouseenter", () => clearTimeout(timer));
    el.addEventListener("mouseleave", arm);
    el.addEventListener("focusin", () => clearTimeout(timer));
    el.addEventListener("focusout", arm);
    el.querySelector(".mp-toast-close").addEventListener("click", close);
    arm();
    return { close, element: el, native: false };
  }
  var Toast = {
    show,
    success: (message, opts) => show("success", message, opts),
    error: (message, opts) => show("error", message, opts),
    warning: (message, opts) => show("warning", message, opts),
    info: (message, opts) => show("info", message, opts)
  };

  // src/js/dialog.js
  function confirm(opts) {
    opts = typeof opts === "string" ? { message: opts } : opts || {};
    const d = doc();
    if (!d || !d.body) {
      return Promise.resolve(false);
    }
    const titleId = uid("mp-dialog-title");
    const messageId = uid("mp-dialog-message");
    const danger = !!opts.danger;
    const backdrop = d.createElement("div");
    backdrop.className = "mp-dialog-backdrop";
    backdrop.innerHTML = '<div class="mp-dialog' + (danger ? " mp-dialog-danger" : "") + '" role="alertdialog" aria-modal="true" aria-labelledby="' + titleId + '"' + (opts.message ? ' aria-describedby="' + messageId + '"' : "") + '><h2 class="mp-dialog-title" id="' + titleId + '">' + escapeHtml(opts.title || "Are you sure?") + "</h2>" + (opts.message ? '<p class="mp-dialog-message" id="' + messageId + '">' + escapeHtml(opts.message) + "</p>" : "") + '<div class="mp-dialog-actions"><button type="button" class="btn btn-outline-secondary" data-mp-dialog="cancel">' + escapeHtml(opts.cancelLabel || "Cancel") + '</button><button type="button" class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" data-mp-dialog="confirm">' + escapeHtml(opts.confirmLabel || "Confirm") + "</button></div></div>";
    const dialog = backdrop.firstChild;
    const previous = d.activeElement;
    const inerted = Array.from(d.body.children).filter((n) => !n.hasAttribute("inert") && !n.hasAttribute("data-mp-live") && !n.classList.contains("mp-toast-container"));
    inerted.forEach((n) => n.setAttribute("inert", ""));
    d.body.appendChild(backdrop);
    d.body.classList.add("mp-dialog-open");
    return new Promise((resolve) => {
      function finish(result) {
        d.removeEventListener("keydown", onKey, true);
        backdrop.remove();
        inerted.forEach((n) => n.removeAttribute("inert"));
        if (!d.querySelector(".mp-dialog-backdrop")) {
          d.body.classList.remove("mp-dialog-open");
        }
        if (previous && typeof previous.focus === "function" && previous.isConnected) {
          try {
            previous.focus({ preventScroll: true });
          } catch {
            previous.focus();
          }
        }
        resolve(result);
      }
      function onKey(ev) {
        if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          finish(false);
        } else if (ev.key === "Tab") {
          const items = focusables(dialog);
          if (!items.length) {
            return;
          }
          const first = items[0];
          const last = items[items.length - 1];
          const active = d.activeElement;
          if (ev.shiftKey && (active === first || !dialog.contains(active))) {
            ev.preventDefault();
            last.focus();
          } else if (!ev.shiftKey && (active === last || !dialog.contains(active))) {
            ev.preventDefault();
            first.focus();
          }
        }
      }
      backdrop.addEventListener("click", (ev) => {
        const action = ev.target.closest && ev.target.closest("[data-mp-dialog]");
        if (action) {
          finish(action.getAttribute("data-mp-dialog") === "confirm");
        } else if (ev.target === backdrop) {
          finish(false);
        }
      });
      d.addEventListener("keydown", onKey, true);
      dialog.querySelector('[data-mp-dialog="' + (danger ? "cancel" : "confirm") + '"]').focus();
    });
  }

  // src/js/index.js
  var version = "1.2.2";
  var MpKit = {
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
    ai
  };

  // src/js/global.js
  root.MpKit = MpKit;
})();
