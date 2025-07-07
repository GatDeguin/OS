const FS_KEY = 'memfs';
let root;
try {
  root = JSON.parse(localStorage.getItem(FS_KEY)) || { type: 'dir', children: {} };
} catch {
  root = { type: 'dir', children: {} };
}

function save() {
  localStorage.setItem(FS_KEY, JSON.stringify(root));
}

function getNode(path) {
  if (!path || path === '/') return root;
  const parts = path.split('/').filter(Boolean);
  let node = root;
  for (const p of parts) {
    if (!node.children || !node.children[p]) return null;
    node = node.children[p];
  }
  return node;
}

function getParent(path) {
  const parts = path.split('/').filter(Boolean);
  const name = parts.pop();
  const parent = parts.length ? getNode('/' + parts.join('/')) : root;
  return { parent, name };
}

function ls(path = '/') {
  const node = getNode(path);
  if (!node || node.type !== 'dir') throw new Error('No existe el directorio: ' + path);
  return Object.keys(node.children);
}

function cat(path) {
  const node = getNode(path);
  if (!node || node.type !== 'file') throw new Error('No existe el archivo: ' + path);
  return node.content;
}

function write(path, content = '') {
  const { parent, name } = getParent(path);
  if (!parent || parent.type !== 'dir') throw new Error('No existe el directorio: ' + path);
  parent.children[name] = { type: 'file', content };
  save();
}

function mkdir(path) {
  const parts = path.split('/').filter(Boolean);
  let node = root;
  for (const p of parts) {
    if (!node.children[p]) node.children[p] = { type: 'dir', children: {} };
    else if (node.children[p].type !== 'dir') throw new Error(p + ' ya existe y no es un directorio');
    node = node.children[p];
  }
  save();
}

export default { ls, cat, write, mkdir };
window.fs = { ls, cat, write, mkdir };
