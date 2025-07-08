import * as THREE from 'three';

let drawConnectors, drawLandmarks, HAND_CONNECTIONS;

export class HandTracker {
  constructor({ container, size, camera, sceneCSS }) {
    this.size = size;
    this.camera = camera;
    this.sceneCSS = sceneCSS;
    this.cursorPos = { x: 0, y: 0 };
    this.leftDown = false;
    this.rightDown = false;
    this.grabbing = false;
    this.target = null;

    this.cursor = document.createElement('div');
    this.cursor.id = 'hand-cursor';
    container.appendChild(this.cursor);

    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2';
    container.appendChild(canvas);
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });

    this.worker = null;
  }

  start(video) {
    this.video = video;
    video.addEventListener('playing', async () => {
      try {
        const mod = await import('https://cdn.skypack.dev/@mediapipe/drawing_utils');
        drawConnectors = mod.drawConnectors;
        drawLandmarks = mod.drawLandmarks;
        HAND_CONNECTIONS = mod.HAND_CONNECTIONS;
      } catch (e) {
        window.showToast && window.showToast('Error al cargar MediaPipe Hands');
        return;
      }
      this.worker = new Worker('../workers/handsWorker.js');
      this.worker.onmessage = e => this.onResults(e.data);
      this.worker.postMessage({ type: 'init' });
      this.loop();
    }, { once: true });
  }

  async loop() {
    const bitmap = await createImageBitmap(this.video);
    this.worker.postMessage({ type: 'frame', image: bitmap }, [bitmap]);
    requestAnimationFrame(() => this.loop());
  }

  sendMouse(type, button) {
    const el = document.elementFromPoint(this.cursorPos.x, this.cursorPos.y);
    if (!el) return;
    const evt = new MouseEvent(type, {
      bubbles: true,
      clientX: this.cursorPos.x,
      clientY: this.cursorPos.y,
      button
    });
    el.dispatchEvent(evt);
  }

  onResults({ multiHandLandmarks }) {
    this.ctx.clearRect(0, 0, this.size.w, this.size.h);
    const [lm] = multiHandLandmarks || [];
    if (!lm) {
      this.cursor.style.display = 'none';
      this.cursor.classList.remove('active');
      if (this.leftDown) {
        this.sendMouse('mouseup', 0);
        this.leftDown = false;
      }
      if (this.rightDown) {
        this.sendMouse('mouseup', 2);
        this.rightDown = false;
      }
      this.grabbing = false;
      this.target = null;
      return;
    }

    this.cursor.style.display = 'block';
    drawConnectors(this.ctx, lm, HAND_CONNECTIONS, { color: '#0f0', lineWidth: 2 });
    drawLandmarks(this.ctx, lm, { color: '#0f0', lineWidth: 1 });

    const indexTip = lm[8];
    this.cursorPos.x = indexTip.x * this.size.w;
    this.cursorPos.y = indexTip.y * this.size.h;
    this.cursor.style.transform = `translate(${this.cursorPos.x}px,${this.cursorPos.y}px)`;

    this.sendMouse('mousemove', 0);

    const thumbTip = lm[4];
    const middleTip = lm[12];
    const mid = {
      x: (thumbTip.x + indexTip.x) / 2 * this.size.w,
      y: (thumbTip.y + indexTip.y) / 2 * this.size.h
    };
    const clickDist = Math.hypot((indexTip.x - thumbTip.x) * this.size.w,
      (indexTip.y - thumbTip.y) * this.size.h);
    const rightDist = Math.hypot((middleTip.x - thumbTip.x) * this.size.w,
      (middleTip.y - thumbTip.y) * this.size.h);

    this.ctx.beginPath();
    this.ctx.arc(mid.x, mid.y, 10, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255,0,0,.6)';
    this.ctx.fill();

    if (clickDist < 40) {
      if (!this.leftDown) {
        this.sendMouse('mousedown', 0);
        this.leftDown = true;
      }
      this.cursor.classList.add('active');
      if (!this.grabbing) {
        this.grabbing = true;
        const ndc = new THREE.Vector3(
          (mid.x / this.size.w) * 2 - 1,
          -(mid.y / this.size.h) * 2 + 1,
          0.5
        ).unproject(this.camera);
        const ray = new THREE.Raycaster(
          this.camera.position,
          ndc.sub(this.camera.position).normalize()
        );
        const hits = ray.intersectObjects(this.sceneCSS.children);
        this.target = hits[0]?.object || null;
      }
      if (this.target) {
        const ndc2 = new THREE.Vector3(
          (mid.x / this.size.w) * 2 - 1,
          -(mid.y / this.size.h) * 2 + 1,
          this.target.position.z / (2000 / this.camera.far)
        ).unproject(this.camera);
        this.target.position.copy(ndc2);
      }
    } else {
      if (this.leftDown) {
        this.sendMouse('mouseup', 0);
        this.sendMouse('click', 0);
      }
      this.leftDown = false;
      this.cursor.classList.toggle('active', this.rightDown);
      this.grabbing = false;
      this.target = null;
    }

    if (rightDist < 40) {
      if (!this.rightDown) {
        this.sendMouse('mousedown', 2);
        this.rightDown = true;
      }
      this.cursor.classList.add('active');
    } else if (this.rightDown) {
      this.sendMouse('mouseup', 2);
      const el = document.elementFromPoint(this.cursorPos.x, this.cursorPos.y);
      if (el) el.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        clientX: this.cursorPos.x,
        clientY: this.cursorPos.y,
        button: 2
      }));
      this.rightDown = false;
      this.cursor.classList.toggle('active', this.leftDown);
    }
  }
}

export function setupHands({ container, size, camera, sceneCSS, video }) {
  const tracker = new HandTracker({ container, size, camera, sceneCSS });
  tracker.start(video);
  return tracker.worker;
}
