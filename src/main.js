/* ---------- Imports ---------- */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { initWindowSystem, spawnWindow } from './win.js';
import { setupHands } from './hands.js';
import { APPS } from './pluginApi.js';

/* ---------- Constantes ---------- */
const container = document.getElementById('container');
const video     = document.getElementById('camera');
const overlay   = document.getElementById('overlay');
const msgEl     = document.getElementById('overlay-msg');
const overlayStartBtn  = document.getElementById('start-btn');
const cameraSelect = document.getElementById('camera-select');
const startButton = document.getElementById('start-button');
const startMenu   = document.getElementById('start-menu');
const taskbarWins = document.getElementById('taskbar-windows');
const toastContainer = document.getElementById('toast-container');
const size      = { w: innerWidth, h: innerHeight };

/* ---------- Preferencias ---------- */
const PREFS = JSON.parse(localStorage.getItem('prefs') || '{}');
Object.assign(PREFS, {
  theme: PREFS.theme || 'light',
  wallpaper: PREFS.wallpaper || 'default',
  lang: PREFS.lang || 'es',
  contrast: PREFS.contrast || 'normal'
});
function savePrefs() { localStorage.setItem('prefs', JSON.stringify(PREFS)); }

const THEMES = {
  light:  { '--accent': '#0078d4', '--text': '#333', '--window': '#fff' },
  dark:   { '--accent': '#0078d4', '--text': '#ddd', '--window': '#222' }
};

const WALLPAPERS = {
  default: { '--bg-grad-1': '#1e3c72', '--bg-grad-2': '#2a5298' },
  sunset:  { '--bg-grad-1': '#ff7e5f', '--bg-grad-2': '#feb47b' },
  forest:  { '--bg-grad-1': '#0b6623', '--bg-grad-2': '#2a5298' }
};

const CONTRAST = {
  normal: {},
  high: { '--window': '#000', '--text': '#fff', '--accent': '#ff0' }
};

function setVars(map) {
  const root = document.documentElement.style;
  Object.entries(map).forEach(([k,v]) => root.setProperty(k, v));
}

function applyTheme(t) {
  setVars(THEMES[t] || THEMES.light);
}

let wallCanvas, wallTex;
function applyWallpaper(w) {
  setVars(WALLPAPERS[w] || WALLPAPERS.default);
  if (!wallCanvas || !wallTex) return;
  const ctx = wallCanvas.getContext('2d');
  const grad = ctx.createLinearGradient(0,0,0,1024);
  const styles = getComputedStyle(document.documentElement);
  grad.addColorStop(0, styles.getPropertyValue('--bg-grad-1').trim());
  grad.addColorStop(1, styles.getPropertyValue('--bg-grad-2').trim());
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,1024,1024);
  wallTex.needsUpdate = true;
}

function applyContrast(c) {
  setVars(CONTRAST[c] || CONTRAST.normal);
}

const I18N = {
  es: {
    startButton: 'Inicio',
    overlay: {
      p1: 'Permite la cámara para usar gestos de mano.',
      p2: 'Si no está disponible, podrás usar el mouse o la pantalla táctil.',
      btn: 'Comenzar'
    },
    apps: {
      term: 'Terminal', edit: 'Editor', web: 'Web',
      clock: 'Reloj', calc: 'Calculadora', settings: 'Ajustes'
    }
  },
  en: {
    startButton: 'Start',
    overlay: {
      p1: 'Allow camera access to use hand gestures.',
      p2: 'If unavailable, you can use the mouse or touch screen.',
      btn: 'Start'
    },
    apps: {
      term: 'Terminal', edit: 'Editor', web: 'Web',
      clock: 'Clock', calc: 'Calculator', settings: 'Settings'
    }
  }
};

function applyLang(l) {
  const tr = I18N[l] || I18N.es;
  startButton.textContent = tr.startButton;
  const ps = overlay.querySelectorAll('p');
  if (ps[0]) ps[0].textContent = tr.overlay.p1;
  if (ps[1]) ps[1].textContent = tr.overlay.p2;
  overlayStartBtn.textContent = tr.overlay.btn;
  APPS.forEach(app => {
    app.name = tr.apps[app.id];
  });
  iconObjs.forEach((obj,i)=>{
    const span = obj.element.querySelector('span');
    if(span) span.textContent = APPS[i].name;
  });
  startMenu.querySelectorAll('.start-item').forEach((item,i)=>{
    const span = item.querySelector('span');
    if(span) span.textContent = APPS[i].name;
  });
}

window.PREFS = PREFS;
window.savePrefs = savePrefs;
window.applyTheme = applyTheme;
window.applyWallpaper = applyWallpaper;
window.applyLang = applyLang;
window.applyContrast = applyContrast;

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  el.addEventListener('animationend', e => {
    if (e.animationName === 'toast-out') el.remove();
  });
  toastContainer.appendChild(el);
}

window.showToast = showToast;

async function populateCameraOptions() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === 'videoinput');
  cameraSelect.innerHTML = '';
  cams.forEach((cam, i) => {
    const opt = document.createElement('option');
    opt.value = cam.deviceId;
    opt.textContent = cam.label || `C\u00e1mara ${i + 1}`;
    cameraSelect.appendChild(opt);
  });
}

populateCameraOptions();

/* ---------- ESCENA ---------- */
const sceneGL  = new THREE.Scene();
const sceneCSS = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(50, size.w / size.h, 1, 2000);
camera.position.set(0, 0, 650);

/* Renderizadores */
const rendererGL  = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const rendererCSS = new CSS3DRenderer();

[rendererGL, rendererCSS].forEach(r => {
  r.setSize(size.w, size.h);
  container.appendChild(r.domElement);
});

/* Orden de capas */
rendererGL.setClearColor(0x000000, 0);      // WebGL transparente
rendererGL.domElement.style.zIndex = '0';
rendererCSS.domElement.style.zIndex = '10';
rendererCSS.domElement.className    = 'css3d';

initWindowSystem(sceneCSS, taskbarWins);
setupHands({ container, size, camera, sceneCSS, video });

/* ---------- Fondo degradado ---------- */
(() => {
  wallCanvas = document.createElement('canvas');
  wallCanvas.width = wallCanvas.height = 1024;
  wallTex  = new THREE.CanvasTexture(wallCanvas);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshBasicMaterial({ map: wallTex, depthTest: false })
  );
  quad.position.z = -500;      // dentro del frustum
  sceneGL.add(quad);
  applyWallpaper(PREFS.wallpaper);
})();

/* ---------- Partículas ---------- */
const starGeo = new THREE.BufferGeometry();
const starCount = 200;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPos[i * 3]     = (Math.random() - 0.5) * 3000;
  starPos[i * 3 + 1] = (Math.random() - 0.5) * 3000;
  starPos[i * 3 + 2] = (Math.random() - 0.5) * 3000;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false });
const stars = new THREE.Points(starGeo, starMat);
sceneGL.add(stars);

/* ---------- Controles ---------- */
const controls = new OrbitControls(camera, rendererCSS.domElement);
Object.assign(controls, {
  enablePan: false,
  enableZoom: false,
  minPolarAngle: Math.PI / 2 - 0.25,
  maxPolarAngle: Math.PI / 2 + 0.25,
  minAzimuthAngle: -0.25,
  maxAzimuthAngle:  0.25,
  enableDamping: true,
  dampingFactor: 0.08
});

/* ---------- Íconos ---------- */
const iconObjs = [];
const savedIconPos = JSON.parse(localStorage.getItem('iconPositions') || '{}');

function saveIconPositions() {
  const data = {};
  iconObjs.forEach(obj => {
    data[obj.userData.id] = {
      x: obj.userData.basePos.x,
      y: obj.userData.basePos.y
    };
  });
  localStorage.setItem('iconPositions', JSON.stringify(data));
}

function layoutIcons() {
  const cols = Math.max(1, Math.floor(size.w / 200));
  let j = 0;
  iconObjs.forEach(obj => {
    if (obj.userData.custom) return;
    const row = Math.floor(j / cols);
    const col = j % cols;
    const x = (col - (cols - 1) / 2) * 160;
    const y = 120 - row * 160;
    obj.userData.basePos.set(x, y, 0);
    obj.position.copy(obj.userData.basePos);
    j++;
  });
}

function enableIconDrag(obj) {
  const el = obj.element;
  let start = { x: 0, y: 0, pos: new THREE.Vector3() };

  const onMove = e => {
    const c = e.touches ? e.touches[0] : e;
    obj.userData.basePos.set(
      start.pos.x + (c.clientX - start.x),
      start.pos.y - (c.clientY - start.y),
      0
    );
    e.preventDefault();
  };

  const endDrag = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    obj.userData.custom = true;
    saveIconPositions();
  };

  el.addEventListener('mousedown', e => {
    start = { x: e.clientX, y: e.clientY, pos: obj.userData.basePos.clone() };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag, { once: true });
  });

  el.addEventListener('touchstart', e => {
    const c = e.touches[0];
    start = { x: c.clientX, y: c.clientY, pos: obj.userData.basePos.clone() };
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', endDrag, { once: true });
  });
}

APPS.forEach((app, i) => {
  const el = document.createElement('div');
  el.className = 'icon';
  el.innerHTML = `<img src="${app.icon}"><span>${app.name}</span>`;
  const obj = new CSS3DObject(el);
  obj.userData = {
    id: app.id,
    basePos: new THREE.Vector3(),
    custom: false
  };
  iconObjs.push(obj);
  sceneCSS.add(obj);
  if (savedIconPos[app.id]) {
    obj.userData.basePos.set(savedIconPos[app.id].x, savedIconPos[app.id].y, 0);
    obj.position.copy(obj.userData.basePos);
    obj.userData.custom = true;
  }
  el.addEventListener('click', () => spawnWindow(app));
  enableIconDrag(obj);
});
layoutIcons();

/* ---------- Menú Inicio ---------- */
APPS.forEach(app => {
  const item = document.createElement('div');
  item.className = 'start-item';
  item.innerHTML = `<img src="${app.icon}"><span>${app.name}</span>`;
  item.onclick = () => { startMenu.classList.remove('show'); spawnWindow(app); };
  startMenu.appendChild(item);
});
applyTheme(PREFS.theme);
applyContrast(PREFS.contrast);
applyLang(PREFS.lang);
startButton.onclick = () => startMenu.classList.toggle('show');
document.addEventListener('click', e => {
  if (!startMenu.contains(e.target) && e.target !== startButton) {
    startMenu.classList.remove('show');
  }
});


/* ---------- Cámara ---------- */
function startWithoutCamera(msg) {
  msgEl.textContent = msg;
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 2000);
}

function startCamera(deviceId) {
  const media = navigator.mediaDevices;
  if (!media || !media.getUserMedia) {
    startWithoutCamera('C\u00e1mara no disponible. Usa mouse o t\u00e1ctil.');
    return;
  }
  const constraints = { video: { width: 640, height: 480 } };
  if (deviceId) constraints.video.deviceId = { exact: deviceId };
  media.getUserMedia(constraints)
    .then(stream => {
      video.srcObject = stream;
      video.play();
      /* El vídeo jamás se muestra */
      video.style.opacity = '0';
      video.style.zIndex  = '-1';
      overlay.classList.add('hidden');
    })
    .catch(() => {
      startWithoutCamera('No se detect\u00f3 la c\u00e1mara. Usa mouse o t\u00e1ctil.');
    });
}

overlayStartBtn.onclick = () => startCamera(cameraSelect.value);

/* ---------- Resize ---------- */
addEventListener('resize', () => {
  size.w = innerWidth; size.h = innerHeight;
  camera.aspect = size.w / size.h;
  camera.updateProjectionMatrix();
  [rendererGL, rendererCSS].forEach(r => r.setSize(size.w, size.h));
  layoutIcons();
});

/* ---------- Bucle ---------- */
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const t = performance.now() / 1000;
  iconObjs.forEach((obj, i) => {
    obj.position.y = obj.userData.basePos.y + Math.sin(t + i) * 5;
  });
  stars.rotation.y += 0.0005;
  rendererGL.render(sceneGL, camera);
  rendererCSS.render(sceneCSS, camera);
})();
