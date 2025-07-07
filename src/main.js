/* ---------- Imports ---------- */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { initWindowSystem, spawnWindow } from './win.js';
import { setupHands } from './hands.js';

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
const size      = { w: innerWidth, h: innerHeight };

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
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  const styles = getComputedStyle(document.documentElement);
  grad.addColorStop(0, styles.getPropertyValue('--bg-grad-1').trim());
  grad.addColorStop(1, styles.getPropertyValue('--bg-grad-2').trim());
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 1024);

  const tex  = new THREE.CanvasTexture(c);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshBasicMaterial({ map: tex, depthTest: false })
  );
  quad.position.z = -500;      // dentro del frustum
  sceneGL.add(quad);
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
const APPS = [
  { id: 'term',  name: 'Terminal',     icon: 'https://img.icons8.com/fluency/96/console.png' },
  { id: 'edit',  name: 'Editor',       icon: 'https://img.icons8.com/fluency/96/notepad.png' },
  { id: 'web',   name: 'Web',          icon: 'https://img.icons8.com/fluency/96/internet.png' },
  { id: 'clock', name: 'Reloj',        icon: 'https://img.icons8.com/fluency/96/alarm.png' },
  { id: 'calc',  name: 'Calculadora',  icon: 'https://img.icons8.com/fluency/96/calculator.png' }
];

const iconObjs = [];

function layoutIcons() {
  const cols = Math.max(1, Math.floor(size.w / 200));
  iconObjs.forEach((obj, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - (cols - 1) / 2) * 160;
    const y = 120 - row * 160;
    obj.userData.basePos.set(x, y, 0);
    obj.position.copy(obj.userData.basePos);
  });
}

APPS.forEach((app, i) => {
  const el = document.createElement('div');
  el.className = 'icon';
  el.innerHTML = `<img src="${app.icon}"><span>${app.name}</span>`;
  const obj = new CSS3DObject(el);
  obj.userData = { basePos: new THREE.Vector3() };
  iconObjs.push(obj);
  sceneCSS.add(obj);
  el.addEventListener('click', () => spawnWindow(app));
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
