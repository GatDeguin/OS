import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { createApp } from './apps.js';

let sceneCSS;

export function initWindowSystem(scene) {
  sceneCSS = scene;
}

export class Win {
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

    createApp(id, cont, this);

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
      const c = e.touches ? e.touches[0] : e;
      this.obj.position.set(
        start.pos.x + (c.clientX - start.x),
        start.pos.y - (c.clientY - start.y),
        start.pos.z
      );
    };

    const startDrag = e => {
      const c = e.touches ? e.touches[0] : e;
      start = { x: c.clientX, y: c.clientY, pos: this.obj.position.clone() };
    };

    bar.onmousedown = e => {
      startDrag(e);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () =>
        document.removeEventListener('mousemove', onMove),
        { once: true }
      );
    };

    bar.addEventListener('touchstart', e => {
      startDrag(e);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener(
        'touchend',
        () => document.removeEventListener('touchmove', onMove),
        { once: true }
      );
    });
  }
}

export function spawnWindow(app) {
  new Win(app);
}
