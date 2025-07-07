/* ---------- Imports ---------- */
import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';

/* ---------- Constantes ---------- */
const container = document.getElementById('container');
const video     = document.getElementById('camera');
const overlay   = document.getElementById('overlay');
const msgEl     = document.getElementById('overlay-msg');
const overlayStartBtn  = document.getElementById('start-btn');
const startButton = document.getElementById('start-button');
const startMenu   = document.getElementById('start-menu');
const size      = { w: innerWidth, h: innerHeight };

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

/* ---------- Clase Ventana ---------- */
class Win {
  constructor({ id, name }) {
    this.root = document.createElement('div');
    this.root.className = 'window';
    this.root.id = `win-${id}`;

    /* Título */
    const title = document.createElement('div');
    title.className = 'titlebar';
    title.textContent = name;

    const close = document.createElement('button');
    close.className = 'close-btn';
    close.textContent = '×';
    close.onclick = () => {
      if (this.interval) clearInterval(this.interval);
      this.root.classList.remove('active');
      this.root.addEventListener('transitionend', () => sceneCSS.remove(this.obj), { once: true });
    };
    title.appendChild(close);
    this.root.appendChild(title);

    /* Contenido */
    const cont = document.createElement('div');
    cont.className = 'content';
    this.root.appendChild(cont);

    switch (id) {
      case 'term': {
        const pre = document.createElement('pre');
        pre.textContent = 'Terminal >';
        const inp = document.createElement('input');
        inp.placeholder = 'escribe y pulsa Enter';
        inp.onkeydown = e => {
          if (e.key === 'Enter') {
            pre.textContent += `\n$ ${inp.value}`;
            inp.value = '';
            cont.scrollTop = cont.scrollHeight;
          }
        };
        cont.append(pre, inp);
        break;
      }
      case 'edit': {
        const ta = document.createElement('textarea');
        ta.value = 'Escribe aquí…';
        cont.appendChild(ta);
        break;
      }
      case 'web': {
        const iframe = document.createElement('iframe');
        iframe.src = 'https://example.com';
        cont.appendChild(iframe);
        break;
      }
      case 'clock': {
        const clock = document.createElement('div');
        clock.style.cssText = 'font-size:2rem;display:flex;align-items:center;justify-content:center';
        const update = () => {
          clock.textContent = new Date().toLocaleTimeString();
        };
        update();
        this.interval = setInterval(update, 1000);
        cont.appendChild(clock);
        break;
      }
      case 'calc': {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;height:100%';
        const inp = document.createElement('input');
        inp.placeholder = 'Ej. 2+2*3';
        inp.style.marginBottom = '6px';
        const res = document.createElement('pre');
        res.style.flex = '1';
        res.textContent = 'Resultado: 0';
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            try {
              res.textContent = `Resultado: ${new Function('return ' + inp.value)()}`;
            } catch {
              res.textContent = 'Error';
            }
          }
        });
        wrap.append(inp, res);
        cont.appendChild(wrap);
        break;
      }
    }

    /* Objeto 3D */
    this.obj = new CSS3DObject(this.root);
    this.obj.position.set(0, 0, 120);
    sceneCSS.add(this.obj);
    requestAnimationFrame(() => this.root.classList.add('active'));

    /* Drag */
    this.#enableDrag(title);
  }

  #enableDrag(bar) {
    let start = { x: 0, y: 0, pos: new THREE.Vector3() };
    const onMove = e => {
      this.obj.position.set(
        start.pos.x + (e.clientX - start.x),
        start.pos.y - (e.clientY - start.y),
        start.pos.z
      );
    };
    bar.onmousedown = e => {
      start = { x: e.clientX, y: e.clientY, pos: this.obj.position.clone() };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
    };
  }
}

function spawnWindow(app) {
  new Win(app);
}

/* ---------- MediaPipe Hands ---------- */
const ctx2 = (() => {
  const c = document.createElement('canvas');
  c.width = size.w; c.height = size.h;
  c.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2';
  container.appendChild(c);
  return c.getContext('2d', { willReadFrequently: true });
})();

const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.10.24/${f}`
});
hands.setOptions({
  maxNumHands: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

let grabbing = false;
let target   = null;
const finger = [4, 8];

hands.onResults(({ multiHandLandmarks: [lm] }) => {
  ctx2.clearRect(0, 0, size.w, size.h);
  if (!lm) return;

  const [p1, p2] = finger.map(i => lm[i]);
  const mid  = { x: (p1.x + p2.x) / 2 * size.w, y: (p1.y + p2.y) / 2 * size.h };
  const dist = Math.hypot((p2.x - p1.x) * size.w, (p2.y - p1.y) * size.h);

  ctx2.beginPath();
  ctx2.arc(mid.x, mid.y, 10, 0, 2 * Math.PI);
  ctx2.fillStyle = 'rgba(255,0,0,.6)';
  ctx2.fill();

  if (dist < 40) {                  // gesto de “pinza”
    if (!grabbing) {
      grabbing = true;
      const ndc = new THREE.Vector3(
        (mid.x / size.w) * 2 - 1,
        -(mid.y / size.h) * 2 + 1,
        0.5
      ).unproject(camera);
      const ray  = new THREE.Raycaster(
        camera.position,
        ndc.sub(camera.position).normalize()
      );
      const hits = ray.intersectObjects(sceneCSS.children);
      target = hits[0]?.object ?? null;
    }
    if (target) {
      const ndc2 = new THREE.Vector3(
        (mid.x / size.w) * 2 - 1,
        -(mid.y / size.h) * 2 + 1,
        target.position.z / (2000 / camera.far)
      ).unproject(camera);
      target.position.copy(ndc2);
    }
  } else {
    grabbing = false;
    target   = null;
  }
});

/* ---------- Cámara ---------- */
function startWithoutCamera(msg) {
  msgEl.textContent = msg;
  overlay.classList.remove('hidden');
  setTimeout(() => overlay.classList.add('hidden'), 2000);
}

function startCamera() {
  const media = navigator.mediaDevices;
  if (!media || !media.getUserMedia) {
    startWithoutCamera('C\u00e1mara no disponible. Usa mouse o t\u00e1ctil.');
    return;
  }
  media.getUserMedia({ video: { width: 640, height: 480 } })
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

overlayStartBtn.onclick = () => startCamera();

video.onplaying = function loop() {
  hands.send({ image: video });
  requestAnimationFrame(loop);
};

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
