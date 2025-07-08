/* ---------- Imports ---------- */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { initWindowSystem, spawnWindow } from './win.js';
import { setupHands } from './hands.js';
import { setupGaze } from './gaze.js';
import { APPS } from './pluginApi.js';
import store, { subscribe } from './state.js';

/* ---------- Constantes ---------- */
const container = document.getElementById('container');
const video     = document.getElementById('camera');
const overlay   = document.getElementById('overlay');
const msgEl     = document.getElementById('overlay-msg');
const overlayStartBtn  = document.getElementById('start-btn');
const cameraSelect = document.getElementById('camera-select');
const startButton = document.getElementById('start-button');
const startMenu   = document.getElementById('start-menu');
const startSearch = document.getElementById('start-search');
const taskbarWins = document.getElementById('taskbar-windows');
const toastContainer = document.getElementById('toast-container');
const size      = { w: innerWidth, h: innerHeight };
const gaze      = { x: 0, y: 0 };
const tilt      = { beta: 0, gamma: 0 };

/* ---------- Preferencias ---------- */
const PREFS = store.prefs;

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
function redrawWallpaper(){
  if(!wallCanvas||!wallTex) return;
  const ctx=wallCanvas.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,1024);
  const styles=getComputedStyle(document.documentElement);
  grad.addColorStop(0,styles.getPropertyValue('--bg-grad-1').trim());
  grad.addColorStop(1,styles.getPropertyValue('--bg-grad-2').trim());
  ctx.fillStyle=grad;
  ctx.fillRect(0,0,1024,1024);
  wallTex.needsUpdate=true;
}
function applyWallpaper(w){
  setVars(WALLPAPERS[w]||WALLPAPERS.default);
  redrawWallpaper();
}

let gradStart=performance.now();
function animateGradient(){
  const p=((performance.now()-gradStart)/30000)%1;
  const h1=p*360;
  const h2=(h1+60)%360;
  setVars({'--bg-grad-1':`hsl(${h1},60%,50%)`,'--bg-grad-2':`hsl(${h2},60%,50%)`});
  redrawWallpaper();
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

subscribe(state => {
  applyTheme(state.prefs.theme);
  applyWallpaper(state.prefs.wallpaper);
  applyLang(state.prefs.lang);
  applyContrast(state.prefs.contrast);
});


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

/* Physics via worker */
const physicsWorker = new Worker('../workers/physicsWorker.js', { type: 'module' });
let bodyStates = [];
physicsWorker.onmessage = e => {
  if (e.data.type === 'update') bodyStates = e.data.bodies;
};
function updatePhysicsBounds(){
  const halfH = camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const halfW = halfH * camera.aspect;
  physicsWorker.postMessage({ type: 'resize', data: { bounds: { halfW, halfH } } });
}
updatePhysicsBounds();

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
setupHands({ container, size, camera, sceneCSS, sceneGL, video });
setupGaze({ video, onUpdate: (x, y) => { gaze.x = x; gaze.y = y; } });

let orientationHandler;
if (window.DeviceOrientationEvent) {
  orientationHandler = e => {
    if (e.beta != null && e.gamma != null) {
      tilt.beta = e.beta;
      tilt.gamma = e.gamma;
    }
  };
}

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
  applyWallpaper(store.prefs.wallpaper);
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
let orientation = size.w >= size.h ? 'landscape' : 'portrait';
const ICON_ANIM_SPEED = 0.1;
const ICON_SPRING = 5;

function saveIconPositions() {
  const data = {};
  iconObjs.forEach(obj => {
    const state = bodyStates[obj.userData.index] || obj.userData.basePos;
    data[obj.userData.id] = { x: state.x, y: state.y };
  });
  localStorage.setItem('iconPositions', JSON.stringify(data));
}

function layoutIcons(instantly = false) {
  const spacing = 160;
  const colsBase = orientation === 'portrait' ? 180 : 200;
  const cols = Math.max(1, Math.floor(size.w / colsBase));
  const rows = Math.ceil(iconObjs.length / cols);
  const startX = -((cols - 1) * spacing) / 2;
  const startY = ((rows - 1) * spacing) / 2;
  let j = 0;
  iconObjs.forEach(obj => {
    if (obj.userData.custom) return;
    const row = Math.floor(j / cols);
    const col = j % cols;
    const x = startX + col * spacing;
    const y = startY - row * spacing;
    obj.userData.basePos.set(x, y, 0);
    if (instantly) {
      obj.position.copy(obj.userData.basePos);
      physicsWorker.postMessage({ type: 'set', data: { index: obj.userData.index, x, y } });
    } else {
      obj.userData.animTarget = new THREE.Vector3(x, y, 0);
    }
    j++;
  });
}

function screenToWorld(xScreen, yScreen) {
  const ndc = new THREE.Vector3(
    (xScreen / size.w) * 2 - 1,
    -(yScreen / size.h) * 2 + 1,
    0.5
  ).unproject(camera);
  const dir = ndc.sub(camera.position).normalize();
  const dist = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(dist));
}

function makeDraggable(obj) {
  const el = obj.element;
  obj.userData.dragging = false;

  const onMove = e => {
    const c = e.touches ? e.touches[0] : e;
    const pos = screenToWorld(c.clientX, c.clientY);
    const state = bodyStates[obj.userData.index] || { x: 0, y: 0 };
    const dx = pos.x - state.x;
    const dy = pos.y - state.y;
    physicsWorker.postMessage({ type: 'impulse', data: { index: obj.userData.index, x: dx * 4, y: dy * 4 } });
    e.preventDefault();
  };

  const endDrag = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchmove', onMove);
    obj.userData.custom = true;
    obj.userData.dragging = false;
    const state = bodyStates[obj.userData.index];
    if (state) {
      obj.userData.basePos.set(state.x, state.y, 0);
    }
    saveIconPositions();
  };

  el.addEventListener('mousedown', () => {
    el.classList.add('touching');
    obj.userData.dragging = true;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', endDrag, { once: true });
  });

  el.addEventListener('touchstart', () => {
    el.classList.add('touching');
    obj.userData.dragging = true;
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', endDrag, { once: true });
  });

  ['mouseup', 'touchend'].forEach(ev =>
    el.addEventListener(ev, () => el.classList.remove('touching')));
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
  obj.userData.index = i;
  if (savedIconPos[app.id]) {
    obj.userData.basePos.set(savedIconPos[app.id].x, savedIconPos[app.id].y, 0);
    obj.position.copy(obj.userData.basePos);
    obj.userData.custom = true;
  }
  el.addEventListener('click', () => spawnWindow(app));
  makeDraggable(obj);
});
layoutIcons(true);
physicsWorker.postMessage({
  type: 'init',
  data: {
    icons: iconObjs.map(o => ({ x: o.userData.basePos.x, y: o.userData.basePos.y }))
  }
});

function runIntro(){
  iconObjs.forEach((obj,i)=>{
    const el=obj.element;
    el.classList.add('intro');
    el.style.animationDelay=`${i*0.1}s`;
    el.addEventListener('animationend',()=>{el.classList.remove('intro');el.style.animationDelay='';},{once:true});
  });
  const tb=document.getElementById('taskbar');
  tb.classList.add('intro');
  tb.addEventListener('animationend',()=>tb.classList.remove('intro'),{once:true});
}

/* ---------- Menú Inicio ---------- */
const startItems = [];
APPS.forEach(app => {
  const item = document.createElement('div');
  item.className = 'start-item';
  item.innerHTML = `<img src="${app.icon}"><span>${app.name}</span>`;
  item.onclick = () => { startMenu.classList.remove('show'); spawnWindow(app); };
  startMenu.appendChild(item);
  startItems.push({ el: item, app });
});

startSearch.addEventListener('input', () => {
  const txt = startSearch.value.toLowerCase();
  startItems.forEach(({ el, app }) => {
    const name = app.name.toLowerCase();
    el.style.display = name.includes(txt) ? 'flex' : 'none';
  });
});

startSearch.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const found = startItems.find(({ el }) => el.style.display !== 'none');
    if (found) {
      startMenu.classList.remove('show');
      spawnWindow(found.app);
      startSearch.value = '';
      startItems.forEach(({ el }) => (el.style.display = 'flex'));
    }
  }
});
applyTheme(store.prefs.theme);
applyContrast(store.prefs.contrast);
applyLang(store.prefs.lang);
startButton.onclick = () => {
  startMenu.classList.toggle('show');
  if (startMenu.classList.contains('show')) {
    startSearch.focus();
  }
};
document.addEventListener('click', e => {
  if (!startMenu.contains(e.target) && e.target !== startButton) {
    startMenu.classList.remove('show');
    startSearch.value = '';
    startItems.forEach(({ el }) => (el.style.display = 'flex'));
  }
});


/* ---------- Cámara ---------- */
function startWithoutCamera(msg) {
  msgEl.textContent = msg;
  overlay.classList.remove('hidden');
  setTimeout(() => { overlay.classList.add('hidden'); runIntro(); }, 2000);
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
      runIntro();
    })
    .catch(() => {
      startWithoutCamera('No se detect\u00f3 la c\u00e1mara. Usa mouse o t\u00e1ctil.');
    });
}

overlayStartBtn.onclick = () => {
  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(() => {
          window.addEventListener('deviceorientation', orientationHandler);
        })
        .catch(err => {
          console.warn('Permiso de DeviceOrientation denegado o no disponible.', err);
        });
    } else {
      window.addEventListener('deviceorientation', orientationHandler);
    }
  }
  startCamera(cameraSelect.value);
};

/* ---------- Resize & Orientation ---------- */
function handleResize() {
  size.w = innerWidth;
  size.h = innerHeight;
  orientation = size.w >= size.h ? 'landscape' : 'portrait';
  camera.aspect = size.w / size.h;
  camera.updateProjectionMatrix();
  [rendererGL, rendererCSS].forEach(r => r.setSize(size.w, size.h));
  layoutIcons();
  updatePhysicsBounds();
}

addEventListener('resize', handleResize);
addEventListener('orientationchange', handleResize);

/* ---------- Bucle ---------- */
(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  animateGradient();
  const x = THREE.MathUtils.clamp(gaze.x + tilt.gamma * 0.02, -1, 1);
  const y = THREE.MathUtils.clamp(gaze.y + tilt.beta * 0.02, -1, 1);
  sceneGL.position.x = x * 30;
  sceneGL.position.y = y * 30;
  sceneCSS.position.x = sceneGL.position.x;
  sceneCSS.position.y = sceneGL.position.y;
  const t = performance.now() / 1000;
  iconObjs.forEach((obj, i) => {
    const state = bodyStates[obj.userData.index];
    if (!state) return;
    if (obj.userData.animTarget) {
      const cur = new THREE.Vector3(state.x, state.y, state.z);
      cur.lerp(obj.userData.animTarget, ICON_ANIM_SPEED);
      physicsWorker.postMessage({ type: 'set', data: { index: obj.userData.index, x: cur.x, y: cur.y } });
      if (cur.distanceTo(obj.userData.animTarget) < 0.5) {
        physicsWorker.postMessage({ type: 'set', data: { index: obj.userData.index, x: obj.userData.animTarget.x, y: obj.userData.animTarget.y } });
        obj.userData.animTarget = null;
      }
    }
    if (obj.userData.custom && !obj.userData.dragging) {
      const dx = obj.userData.basePos.x - state.x;
      const dy = obj.userData.basePos.y - state.y;
      physicsWorker.postMessage({ type: 'force', data: { index: obj.userData.index, x: dx * ICON_SPRING, y: dy * ICON_SPRING } });
    }
    obj.position.set(state.x, state.y + Math.sin(t + i) * 5, state.z);
    obj.quaternion.set(state.qx, state.qy, state.qz, state.qw);
  });
  stars.rotation.y += 0.0005;
  rendererGL.render(sceneGL, camera);
  rendererCSS.render(sceneCSS, camera);
})();
