// Runtime environment: the global object, the document and the Homebridge
// plugin UI client (`window.homebridge` from @homebridge/plugin-ui-utils).
// Everything is looked up lazily so the modules can be imported in Node.

/* global homebridge */

export const root = typeof window !== 'undefined' ? window : globalThis;

export function doc() {
  return typeof document !== 'undefined' ? document : root.document;
}

export function hbClient() {
  return root.homebridge || (typeof homebridge !== 'undefined' ? homebridge : undefined);
}

/** True when the Homebridge client exposes `method` as a function. */
export function hbHas(method) {
  const hb = hbClient();
  return !!hb && typeof hb[method] === 'function';
}
