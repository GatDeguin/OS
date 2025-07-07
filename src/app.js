import { registerApp } from './pluginApi.js';

async function loadPlugins() {
  try {
    const listRes = await fetch('./plugins/plugins.json');
    if (!listRes.ok) return;
    const dirs = await listRes.json();
    for (const dir of dirs) {
      try {
        const mRes = await fetch(`./plugins/${dir}/manifest.json`);
        const manifest = await mRes.json();
        const mod = await import(`../plugins/${dir}/${manifest.main || 'index.js'}`);
        if (mod && typeof mod.default === 'function') {
          await mod.default(registerApp, manifest);
        }
      } catch (e) {
        console.error('Error loading plugin', dir, e);
      }
    }
  } catch (e) {
    console.error('Failed to load plugins', e);
  }
}

await loadPlugins();

import('./main.js');
