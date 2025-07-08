import store, { addApp } from './state.js';

export const APPS = store.apps;

const plugins = {};

export function registerApp(info, handler) {
  if (!info || !info.id || typeof handler !== 'function') return;
  addApp({ id: info.id, name: info.name || info.id, icon: info.icon || '' });
  plugins[info.id] = handler;
}

export function runPluginApp(id, cont, win) {
  const fn = plugins[id];
  if (fn) { fn(cont, win); return true; }
  return false;
}

// Expose for plugin scripts
window.registerApp = registerApp;
