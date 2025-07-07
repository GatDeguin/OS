# OS

A minimal 3D desktop demo using Three.js and MediaPipe.

## Requirements
- Modern browser with WebGL and camera access
- Node.js (optional, for local server)

## Running the demo
You can open `index.html` directly in your browser. For convenience a small
Node.js server is provided:

```bash
node server.js
```

The server listens on port 8000 by default. Visit
<http://localhost:8000> after starting it.

## Bundling / Rebuilding
All third party scripts are included under `vendor/` for convenience.  If you
prefer to bundle the project with a tool such as Webpack or Vite, install the
tool with `npm` and run its build command (`webpack`, `vite build`, etc.) to
generate your own bundle.  Ensure the local vendor paths in `index.html` or your
bundler configuration are updated accordingly.

See [CONTRIBUTING](CONTRIBUTING.md) for details on testing and submitting
changes.

