export const APPS = [
  { id: 'term',  name: 'Terminal',     icon: 'https://img.icons8.com/fluency/96/console.png' },
  { id: 'edit',  name: 'Editor',       icon: 'https://img.icons8.com/fluency/96/notepad.png' },
  { id: 'web',   name: 'Web',          icon: 'https://img.icons8.com/fluency/96/internet.png' },
  { id: 'clock', name: 'Reloj',        icon: 'https://img.icons8.com/fluency/96/alarm.png' },
  { id: 'calc',  name: 'Calculadora',  icon: 'https://img.icons8.com/fluency/96/calculator.png' },
  { id: 'settings', name: 'Ajustes',   icon: 'https://img.icons8.com/fluency/96/settings.png' }
];

const plugins = {};

export function registerApp(info, handler) {
  if (!info || !info.id || typeof handler !== 'function') return;
  APPS.push({ id: info.id, name: info.name || info.id, icon: info.icon || '' });
  plugins[info.id] = handler;
}

export function runPluginApp(id, cont, win) {
  const fn = plugins[id];
  if (fn) { fn(cont, win); return true; }
  return false;
}

// Expose for plugin scripts
window.registerApp = registerApp;
