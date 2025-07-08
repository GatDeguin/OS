# Plugin Development

This project allows external applications to be installed as plugins. A plugin
is a folder inside `plugins/` containing a `manifest.json` file and a
JavaScript module that registers the app.

## Directory Layout

```
plugins/
  myplugin/
    manifest.json
    index.js
```

List the plugin folder name inside `plugins/plugins.json` to have it loaded at
startup.

## Manifest Format

`manifest.json` describes the application:

```json
{
  "id": "myplugin",
  "name": "My Plugin",
  "icon": "https://example.com/icon.png",
  "main": "index.js"
}
```

* `id` — unique identifier for the app.
* `name` — display name shown in the desktop menu.
* `icon` — optional URL to the application icon.
* `main` — script file providing the plugin implementation.

## Plugin Entry Point

The script specified by `main` must export a default function. It receives the
`registerApp` function and the parsed manifest:

```javascript
export default function(registerApp, manifest) {
  registerApp(manifest, (container, win) => {
    container.textContent = 'Hello from plugin!';
  });
}
```

## Plugin API

The module `src/pluginApi.js` exposes helpers for plugins and the core system.

### `registerApp(info, handler)`

Registers a new application. `info` should include at least an `id` field plus
optional `name` and `icon`. `handler(container, win)` is called when the user
opens the app.

### `runPluginApp(id, container, win)`

Launches an installed plugin app. It is used internally by the system but is
exported for completeness. It returns `true` when the plugin was found.

### `APPS`

An array with metadata for all registered applications, including plugins.

## Example Plugin

The repository contains a simple example under `plugins/hello/`:

```
plugins/hello/
  manifest.json
  hello.js
```

`manifest.json`:

```json
{
  "id": "hello",
  "name": "Hola",
  "icon": "https://img.icons8.com/fluency/96/speech-bubble-with-dots.png",
  "main": "hello.js"
}
```

`hello.js`:

```javascript
export default function(registerApp, manifest) {
  registerApp(manifest, (container) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.height = '100%';
    div.textContent = '¡Hola desde el plugin!';
    container.appendChild(div);
  });
}
```

Use this structure as a starting point for your own plugins.
