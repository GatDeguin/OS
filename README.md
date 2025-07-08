# OS

A minimal 3D desktop demo using Three.js and MediaPipe.

The environment includes several simple built‑in applications such as a
terminal emulator, text editor, web browser, live clock and a basic
calculator.

## Requirements
- Modern browser with WebGL and camera access
- Node.js (optional, for local server)
- Internet connection (MediaPipe runtime files are fetched from CDN)

## Running the demo
You can open `index.html` directly in your browser. For convenience a small
Node.js server is provided. Install dependencies and start it with:

```bash
npm install
npm start
```

The server listens on port 8000 by default. Visit
<http://localhost:8000> after starting it.

## Bundling / Rebuilding
All third party scripts are included under `vendor/` for convenience.  If you
prefer to bundle the project with a tool such as Webpack or Vite, install the
tool with `npm` and run its build command (`webpack`, `vite build`, etc.) to
generate your own bundle.  Ensure the local vendor paths in `index.html` or your
bundler configuration are updated accordingly.

When using ES modules, the import map in `index.html` maps
`three/addons/` to the local `vendor/three` directory. Import
Three.js addons directly via this path, e.g.:

```javascript
import { OrbitControls } from 'three/addons/OrbitControls.js';
```

Avoid paths containing intermediate `controls/` or `renderers/`
subdirectories, as those do not exist and will lead to 404
errors when loading the modules.

## Plugins

OS supports lightweight plugins located under the `plugins/` directory.
Each plugin provides a manifest describing the application and a script
implementing it. A step‑by‑step guide and API documentation are
available in [docs/plugins.md](docs/plugins.md).

See [CONTRIBUTING](CONTRIBUTING.md) for details on testing and submitting
changes.

