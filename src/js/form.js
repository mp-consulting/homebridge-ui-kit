// Form helpers: Bootstrap field markup, secret inputs (reveal + copy), copy
// buttons, value (de)serialisation, and dirty-state tracking with a sticky
// Save bar wired to homebridge.updatePluginConfig / savePluginConfig.

import { root, doc, hbClient } from './env.js';
import { announce, errorMessage, escapeHtml, toElement, uid } from './util.js';
import { Toast } from './toast.js';

// ── Clipboard ──

/** Copies text to the clipboard. Resolves true on success, false otherwise. */
export function copyText(text) {
  const value = String(text == null ? '' : text);
  const nav = root.navigator;
  if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
    return nav.clipboard.writeText(value).then(() => true, () => legacyCopy(value));
  }
  return Promise.resolve(legacyCopy(value));
}

function legacyCopy(value) {
  const d = doc();
  if (!d || !d.body || typeof d.execCommand !== 'function') { return false; }
  const area = d.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.className = 'mp-sr-only';
  d.body.appendChild(area);
  area.select();
  let ok = false;
  try { ok = d.execCommand('copy'); } catch { ok = false; }
  area.remove();
  return !!ok;
}

function attrs(map) {
  return Object.keys(map).map(k => {
    const v = map[k];
    if (v === undefined || v === null || v === false) { return ''; }
    return v === true ? ' ' + k : ' ' + k + '="' + escapeHtml(v) + '"';
  }).join('');
}

/** CopyButton — HTML for a button that copies `text` or the value/text of `target`. */
export const CopyButton = {
  /** opts: { text, target (selector), label = 'Copy', copiedLabel = 'Copied', className, size: 'sm' } */
  render(opts) {
    opts = opts || {};
    const cls = 'btn btn-outline-secondary mp-copy-btn' + (opts.size === 'sm' ? ' btn-sm' : '')
      + (opts.className ? ' ' + opts.className : '');
    return '<button type="button"' + attrs({
      class: cls,
      'data-mp-copy': opts.target ? undefined : String(opts.text == null ? '' : opts.text),
      'data-mp-copy-target': opts.target,
      'data-mp-copied-label': opts.copiedLabel || 'Copied',
      'aria-label': opts.ariaLabel,
    }) + '>' + escapeHtml(opts.label || 'Copy') + '</button>';
  },
};

/** Copies for a [data-mp-copy] / [data-mp-copy-target] button and shows feedback. */
export function copyFromButton(btn) {
  let text = btn.getAttribute('data-mp-copy');
  const targetSel = btn.getAttribute('data-mp-copy-target');
  if (targetSel) {
    const target = toElement(targetSel);
    if (!target) { return Promise.resolve(false); }
    text = 'value' in target && target.tagName !== 'BUTTON' ? target.value : target.textContent;
  }
  return copyText(text).then(ok => {
    const label = btn.getAttribute('data-mp-copied-label') || 'Copied';
    if (!btn.__mpLabel) { btn.__mpLabel = btn.textContent; }
    btn.textContent = ok ? label : 'Copy failed';
    btn.classList.toggle('is-copied', ok);
    announce(ok ? 'Copied to clipboard' : 'Could not copy');
    clearTimeout(btn.__mpCopyTimer);
    btn.__mpCopyTimer = setTimeout(() => {
      btn.textContent = btn.__mpLabel;
      btn.classList.remove('is-copied');
    }, 2000);
    return ok;
  });
}

/** Toggles a [data-mp-reveal="inputId"] button's password field. */
export function toggleReveal(btn) {
  const input = doc().getElementById(btn.getAttribute('data-mp-reveal'));
  if (!input) { return; }
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-pressed', show ? 'true' : 'false');
  btn.textContent = show ? (btn.getAttribute('data-mp-hide-label') || 'Hide')
    : (btn.getAttribute('data-mp-show-label') || 'Show');
}

// ── Fields ──

function normaliseOptions(options) {
  return (options || []).map(o => (o && typeof o === 'object' ? o : { value: o, label: String(o) }));
}

function fieldParts(opts, kind) {
  const id = opts.id || uid('mp-field');
  const helpId = opts.help ? id + '-help' : null;
  const errorId = opts.error ? id + '-error' : null;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const label = '<label class="' + (kind === 'check' ? 'form-check-label' : 'form-label') + '" for="' + escapeHtml(id) + '">'
    + escapeHtml(opts.label || opts.name || '')
    + (opts.required ? '<span class="mp-required" aria-hidden="true"> *</span>' : '') + '</label>';
  const help = opts.help ? '<div class="form-text" id="' + escapeHtml(helpId) + '">' + escapeHtml(opts.help) + '</div>' : '';
  const error = opts.error ? '<div class="invalid-feedback d-block" id="' + escapeHtml(errorId) + '">' + escapeHtml(opts.error) + '</div>' : '';
  return { id, describedBy, label, help, error };
}

/**
 * Form.field(opts) → HTML for a labelled Bootstrap form control.
 * opts: { name, label, type = 'text' (any input type, 'textarea', 'select',
 *   'checkbox', 'switch'), id, value, placeholder, help, error, required,
 *   disabled, readonly, min, max, step, pattern, autocomplete, rows,
 *   options: [{ value, label }] | ['a', 'b'] (select), checked (checkbox) }
 * All values are escaped; help and error are wired with aria-describedby.
 */
function field(opts) {
  opts = opts || {};
  const type = opts.type || 'text';
  const check = type === 'checkbox' || type === 'switch';
  const p = fieldParts(opts, check ? 'check' : 'field');
  const common = {
    id: p.id,
    name: opts.name,
    required: !!opts.required,
    disabled: !!opts.disabled,
    'aria-describedby': p.describedBy,
    'aria-invalid': opts.error ? 'true' : undefined,
  };
  const invalid = opts.error ? ' is-invalid' : '';

  if (check) {
    return '<div class="form-check' + (type === 'switch' ? ' form-switch' : '') + ' mb-3 mp-field">'
      + '<input' + attrs(Object.assign({
        class: 'form-check-input' + invalid,
        type: 'checkbox',
        role: type === 'switch' ? 'switch' : undefined,
        checked: !!(opts.checked !== undefined ? opts.checked : opts.value),
      }, common)) + '>' + p.label + p.help + p.error + '</div>';
  }

  let control;
  if (type === 'select') {
    control = '<select' + attrs(Object.assign({ class: 'form-select' + invalid, multiple: !!opts.multiple }, common)) + '>'
      + normaliseOptions(opts.options).map(o => {
        const selected = Array.isArray(opts.value) ? opts.value.map(String).indexOf(String(o.value)) >= 0
          : String(opts.value) === String(o.value);
        return '<option' + attrs({ value: String(o.value), selected, disabled: !!o.disabled }) + '>'
          + escapeHtml(o.label) + '</option>';
      }).join('') + '</select>';
  } else if (type === 'textarea') {
    control = '<textarea' + attrs(Object.assign({
      class: 'form-control' + invalid, rows: opts.rows || 3, placeholder: opts.placeholder, readonly: !!opts.readonly,
    }, common)) + '>' + escapeHtml(opts.value == null ? '' : opts.value) + '</textarea>';
  } else {
    control = '<input' + attrs(Object.assign({
      class: 'form-control' + invalid,
      type,
      value: opts.value == null ? undefined : String(opts.value),
      placeholder: opts.placeholder,
      readonly: !!opts.readonly,
      min: opts.min,
      max: opts.max,
      step: opts.step,
      pattern: opts.pattern,
      autocomplete: opts.autocomplete,
      inputmode: opts.inputmode,
    }, common)) + '>';
  }
  return '<div class="mb-3 mp-field">' + p.label + control + p.help + p.error + '</div>';
}

/**
 * Form.secret(opts) → HTML for a password-style field with Show/Hide and
 * Copy buttons (handled by the kit's delegated listeners).
 * opts: field options plus { copy = true, reveal = true }
 */
function secret(opts) {
  opts = opts || {};
  const p = fieldParts(opts, 'field');
  const input = '<input' + attrs({
    class: 'form-control mp-secret-input' + (opts.error ? ' is-invalid' : ''),
    type: 'password',
    id: p.id,
    name: opts.name,
    value: opts.value == null ? undefined : String(opts.value),
    placeholder: opts.placeholder,
    required: !!opts.required,
    disabled: !!opts.disabled,
    readonly: !!opts.readonly,
    autocomplete: opts.autocomplete || 'off',
    spellcheck: 'false',
    autocapitalize: 'off',
    'aria-describedby': p.describedBy,
    'aria-invalid': opts.error ? 'true' : undefined,
  }) + '>';
  const label = escapeHtml(opts.label || opts.name || 'value');
  const reveal = opts.reveal === false ? '' : '<button type="button" class="btn btn-outline-secondary mp-reveal-btn"'
    + ' data-mp-reveal="' + escapeHtml(p.id) + '" aria-controls="' + escapeHtml(p.id) + '" aria-pressed="false"'
    + ' aria-label="Show ' + label + '">Show</button>';
  const copy = opts.copy === false ? '' : CopyButton.render({ target: '#' + p.id, ariaLabel: 'Copy ' + label });
  return '<div class="mb-3 mp-field">' + p.label
    + '<div class="input-group' + (opts.error ? ' has-validation' : '') + '">' + input + reveal + copy + '</div>'
    + p.help + p.error + '</div>';
}

// ── Values ──

function setPath(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  keys.slice(0, -1).forEach(k => {
    if (!node[k] || typeof node[k] !== 'object') { node[k] = {}; }
    node = node[k];
  });
  node[keys[keys.length - 1]] = value;
}

function getPath(obj, path) {
  return path.split('.').reduce((node, k) => (node == null ? undefined : node[k]), obj);
}

function controls(form) {
  return Array.from(form.querySelectorAll('input[name], select[name], textarea[name]'))
    .filter(el => !el.disabled && !el.hasAttribute('data-mp-ignore')
      && ['button', 'submit', 'reset', 'file', 'image'].indexOf(el.type) < 0);
}

/**
 * Form.values(form) → plain object from the named controls. Dotted names
 * nest ("auth.token"), checkboxes give booleans (or arrays of values when
 * several share a name), number/range inputs give numbers (null when empty),
 * radio groups their checked value, multiple selects arrays.
 */
function values(form) {
  form = toElement(form);
  const out = {};
  const els = controls(form);
  const counts = {};
  els.forEach(el => { if (el.type === 'checkbox') { counts[el.name] = (counts[el.name] || 0) + 1; } });
  els.forEach(el => {
    const name = el.name;
    if (el.type === 'checkbox') {
      if (counts[name] > 1) {
        const list = getPath(out, name) || [];
        if (el.checked) { list.push(el.value); }
        setPath(out, name, list);
      } else {
        setPath(out, name, el.checked);
      }
    } else if (el.type === 'radio') {
      if (el.checked) { setPath(out, name, el.value); }
      else if (getPath(out, name) === undefined) { setPath(out, name, null); }
    } else if (el.type === 'number' || el.type === 'range') {
      setPath(out, name, el.value === '' ? null : Number(el.value));
    } else if (el.tagName === 'SELECT' && el.multiple) {
      setPath(out, name, Array.from(el.selectedOptions).map(o => o.value));
    } else {
      setPath(out, name, el.value);
    }
  });
  return out;
}

/** Form.fill(form, data) — sets named controls from a (nested) object. */
function fill(form, data) {
  form = toElement(form);
  data = data || {};
  controls(form).forEach(el => {
    const v = getPath(data, el.name);
    if (v === undefined) { return; }
    if (el.type === 'checkbox') {
      el.checked = Array.isArray(v) ? v.map(String).indexOf(el.value) >= 0 : !!v;
    } else if (el.type === 'radio') {
      el.checked = String(v) === el.value;
    } else if (el.tagName === 'SELECT' && el.multiple) {
      const list = (Array.isArray(v) ? v : [v]).map(String);
      Array.from(el.options).forEach(o => { o.selected = list.indexOf(o.value) >= 0; });
    } else {
      el.value = v == null ? '' : String(v);
    }
  });
  return form;
}

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Deep merge of plain objects (arrays and scalars from `patch` replace). */
export function mergeConfig(base, patch) {
  const out = Object.assign({}, base);
  Object.keys(patch || {}).forEach(k => {
    out[k] = isPlainObject(out[k]) && isPlainObject(patch[k]) ? mergeConfig(out[k], patch[k]) : patch[k];
  });
  return out;
}

// ── Dirty tracking + Save bar ──

/**
 * Form.track(form, opts) — tracks unsaved changes and shows a sticky Save bar.
 * Saving calls homebridge.updatePluginConfig(blocks) then savePluginConfig().
 * opts: {
 *   toConfig(values, blocks) → block or array of blocks (default: values
 *     merged into the first existing block),
 *   save(values) — replaces the Homebridge calls entirely,
 *   persist = true (false: only updatePluginConfig, the user saves in Homebridge),
 *   bar = true | element (where to render the bar; default after the form),
 *   message, saveLabel, discardLabel, savedMessage, toast = true,
 *   onDirtyChange(dirty), onSaved(config), onError(err)
 * }
 * Outside Homebridge (no opts.save) saving only resets the dirty state and
 * resolves false. Returns { isDirty(), values(), save(), discard(), reset(), destroy(), bar }.
 */
function track(form, opts) {
  opts = opts || {};
  form = toElement(form);
  const d = form.ownerDocument;
  let baseline = JSON.stringify(values(form));
  let baselineValues = values(form);
  let dirty = false;
  let busy = false;

  let bar = null;
  if (opts.bar !== false) {
    bar = d.createElement('div');
    bar.className = 'mp-savebar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Unsaved changes');
    bar.hidden = true;
    bar.innerHTML = '<span class="mp-savebar-message" role="status">'
      + escapeHtml(opts.message || 'You have unsaved changes') + '</span>'
      + '<span class="mp-savebar-actions">'
      + '<button type="button" class="btn btn-sm btn-outline-secondary" data-mp-save="discard">'
      + escapeHtml(opts.discardLabel || 'Discard') + '</button>'
      + '<button type="button" class="btn btn-sm btn-primary" data-mp-save="save">'
      + escapeHtml(opts.saveLabel || 'Save') + '</button></span>';
    const host = opts.bar && opts.bar !== true ? toElement(opts.bar) : null;
    if (host) { host.appendChild(bar); } else { form.insertAdjacentElement('afterend', bar); }
  }

  function setDirty(next) {
    if (next === dirty) { return; }
    dirty = next;
    if (bar) { bar.hidden = !dirty; }
    form.classList.toggle('is-dirty', dirty);
    if (typeof opts.onDirtyChange === 'function') { opts.onDirtyChange(dirty); }
  }

  function check() {
    setDirty(JSON.stringify(values(form)) !== baseline);
  }

  function reset() {
    baselineValues = values(form);
    baseline = JSON.stringify(baselineValues);
    setDirty(false);
  }

  function setBusy(next) {
    busy = next;
    if (!bar) { return; }
    bar.setAttribute('aria-busy', next ? 'true' : 'false');
    bar.querySelectorAll('button').forEach(b => { b.disabled = next; });
  }

  async function defaultSave(vals) {
    const hb = hbClient();
    if (!hb || typeof hb.updatePluginConfig !== 'function') { return null; }
    const blocks = typeof hb.getPluginConfig === 'function' ? (await hb.getPluginConfig()) || [] : [];
    let config = typeof opts.toConfig === 'function'
      ? await opts.toConfig(vals, blocks)
      : [mergeConfig(blocks[0] || {}, vals)].concat(blocks.slice(1));
    if (!Array.isArray(config)) { config = [config]; }
    await hb.updatePluginConfig(config);
    if (opts.persist !== false && typeof hb.savePluginConfig === 'function') { await hb.savePluginConfig(); }
    return config;
  }

  async function save() {
    if (busy) { return false; }
    const vals = values(form);
    setBusy(true);
    try {
      const custom = typeof opts.save === 'function';
      const result = custom ? await opts.save(vals) : await defaultSave(vals);
      const saved = custom || result !== null;
      reset();
      if (saved) {
        if (opts.toast !== false) { Toast.success(opts.savedMessage || 'Settings saved'); }
        if (typeof opts.onSaved === 'function') { opts.onSaved(result); }
      }
      return saved;
    } catch (err) {
      if (opts.toast !== false) { Toast.error(errorMessage(err, 'Could not save the settings')); }
      if (typeof opts.onError === 'function') { opts.onError(err); }
      throw err;
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    fill(form, baselineValues);
    check();
  }

  function onBarClick(ev) {
    const btn = ev.target.closest('[data-mp-save]');
    if (!btn) { return; }
    if (btn.getAttribute('data-mp-save') === 'save') { save().catch(() => {}); } else { discard(); }
  }

  function onSubmit(ev) {
    ev.preventDefault();
    save().catch(() => {});
  }

  form.addEventListener('input', check);
  form.addEventListener('change', check);
  if (opts.submit !== false) { form.addEventListener('submit', onSubmit); }
  if (bar) { bar.addEventListener('click', onBarClick); }

  return {
    bar,
    isDirty: () => dirty,
    values: () => values(form),
    save,
    discard,
    /** Takes the current values as the new saved state. */
    reset,
    /** Re-checks after programmatic changes. */
    check,
    destroy() {
      form.removeEventListener('input', check);
      form.removeEventListener('change', check);
      form.removeEventListener('submit', onSubmit);
      if (bar) { bar.remove(); }
    },
  };
}

export const Form = { field, secret, values, fill, track };
