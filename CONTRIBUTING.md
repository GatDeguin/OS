# Contributing

## Running locally

Open `index.html` directly in a modern browser or use the provided Node.js server:

```bash
node server.js
```

Then visit [http://localhost:8000](http://localhost:8000) in your browser.

## Testing

This project does not yet include automated tests. Please verify that pages load
and function as expected in your browser after making changes.

## Submitting contributions

1. Fork the repository and create a branch for your changes.
2. Ensure your code is formatted and self‑contained.
3. Open a pull request describing your changes and the reason for them.


## Developing plugins

Plugins live under the `plugins/` directory. Each plugin is a folder
containing a `manifest.json` and the JavaScript file implementing the
application.

`manifest.json` must define at least:

```json
{
  "id": "myapp",
  "name": "My App",
  "icon": "URL to icon",
  "main": "index.js"     // script file to load
}
```

The script specified by `main` should export a default function receiving
`registerApp` and the parsed manifest. Use `registerApp` to register your
window creation handler:

```javascript
export default function(registerApp, manifest) {
  registerApp(manifest, (container, win) => {
    container.textContent = 'Hello from plugin!';
  });
}
```

To install a plugin, place its folder in `plugins/` and list its directory
name inside `plugins/plugins.json`.
