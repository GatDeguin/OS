const PREF_KEY = 'prefs';
let stored = {};
try {
  stored = JSON.parse(localStorage.getItem(PREF_KEY)) || {};
} catch {
  stored = {};
}

const store = {
  prefs: {
    theme: stored.theme || 'light',
    wallpaper: stored.wallpaper || 'default',
    lang: stored.lang || 'es',
    contrast: stored.contrast || 'normal'
  },
  apps: [
    { id: 'term',  name: 'Terminal',     icon: 'https://img.icons8.com/fluency/96/console.png' },
    { id: 'edit',  name: 'Editor',       icon: 'https://img.icons8.com/fluency/96/notepad.png' },
    { id: 'web',   name: 'Web',          icon: 'https://img.icons8.com/fluency/96/internet.png' },
    { id: 'clock', name: 'Reloj',        icon: 'https://img.icons8.com/fluency/96/alarm.png' },
    { id: 'calc',  name: 'Calculadora',  icon: 'https://img.icons8.com/fluency/96/calculator.png' },
    { id: 'settings', name: 'Ajustes',   icon: 'https://img.icons8.com/fluency/96/settings.png' }
  ]
};

const listeners = new Set();
function notify() {
  listeners.forEach(fn => fn(store));
}

export function updatePrefs(newPrefs) {
  Object.assign(store.prefs, newPrefs);
  localStorage.setItem(PREF_KEY, JSON.stringify(store.prefs));
  notify();
}

export function addApp(app) {
  store.apps.push(app);
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export default store;
