import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/CSS3DRenderer.js';
import { createApp } from './apps.js';

let sceneCSS;
let taskbar;
let focusedWin = null;
let zCounter = 1;

export function initWindowSystem(scene, taskbarContainer) {
  sceneCSS = scene;
  taskbar  = taskbarContainer;
}

export class Win {
  constructor({ id, name, icon }) {
    this.icon = icon;
    this.state = 'normal';
    this.prev  = null;
    this.taskBtn = document.createElement('div');
    this.taskBtn.className = 'task-icon';
    this.taskBtn.innerHTML = `<img src="${icon}">`;
    this.taskBtn.onclick = () => {
      if (this.state === 'minimized') this.restore();
      else this.focus();
    };
    taskbar.appendChild(this.taskBtn);
    this.root = document.createElement('div');
    this.root.className = 'window';
    this.root.id = `win-${id}`;

    this.root.addEventListener('mousedown', () => this.focus());
    this.root.addEventListener('touchstart', () => this.focus());

    /* Título */
    const title = document.createElement('div');
    title.className = 'titlebar';
    const text = document.createElement('span');
    text.textContent = name;
    const btnWrap = document.createElement('div');
    btnWrap.className = 'title-buttons';

    const minBtn = document.createElement('button');
    minBtn.className = 'title-btn min-btn';
    minBtn.textContent = '–';
    minBtn.onmousedown = e => e.stopPropagation();
    minBtn.onclick = () => this.minimize();

    this.maxBtn = document.createElement('button');
    this.maxBtn.className = 'title-btn max-btn';
    this.maxBtn.textContent = '□';
    this.maxBtn.onmousedown = e => e.stopPropagation();
    this.maxBtn.onclick = () => this.toggleMaximize();

    const close = document.createElement('button');
    close.className = 'title-btn close-btn';
    close.textContent = '×';
    close.onmousedown = e => e.stopPropagation();
    close.onclick = () => {
      if (this.interval) clearInterval(this.interval);
      if (this.taskBtn) this.taskBtn.remove();
      this.root.classList.remove('active');
      if (focusedWin === this) focusedWin = null;
      this.root.addEventListener('transitionend', () => sceneCSS.remove(this.obj), { once: true });
    };

    btnWrap.append(minBtn, this.maxBtn, close);
    title.append(text, btnWrap);
    this.root.appendChild(title);

    /* Contenido */
    const cont = document.createElement('div');
    cont.className = 'content';
    this.root.appendChild(cont);

    /* Asa de redimension */
    const resizer = document.createElement('div');
    resizer.className = 'resize-handle';
    this.root.appendChild(resizer);

    createApp(id, cont, this);

    /* Objeto 3D */
    this.obj = new CSS3DObject(this.root);
    this.obj.position.set(0, 0, 120);
    sceneCSS.add(this.obj);
    this.focus();
    requestAnimationFrame(() => this.root.classList.add('active'));

    /* Drag */
    this.#enableDrag(title);
    this.#enableResize(resizer);
  }

  focus() {
    if (focusedWin && focusedWin !== this) {
      focusedWin.root.classList.remove('focused');
    }
    focusedWin = this;
    this.root.classList.add('focused');
    this.root.style.zIndex = (++zCounter).toString();
    sceneCSS.remove(this.obj);
    sceneCSS.add(this.obj);
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

  #enableResize(handle) {
    const MIN_W = 200;
    const MIN_H = 150;
    let start = { x: 0, y: 0, w: 0, h: 0 };

    const onMove = e => {
      const c = e.touches ? e.touches[0] : e;
      const w = Math.max(MIN_W, start.w + (c.clientX - start.x));
      const h = Math.max(MIN_H, start.h + (c.clientY - start.y));
      this.root.style.width = `${w}px`;
      this.root.style.height = `${h}px`;
      e.preventDefault();
    };

    const startRes = e => {
      const c = e.touches ? e.touches[0] : e;
      start = { x: c.clientX, y: c.clientY, w: this.root.offsetWidth, h: this.root.offsetHeight };
      e.preventDefault();
    };

    handle.onmousedown = e => {
      startRes(e);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true });
    };

    handle.addEventListener('touchstart', e => {
      startRes(e);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', () => document.removeEventListener('touchmove', onMove), { once: true });
    });
  }

  minimize() {
    if (this.state === 'minimized') return;
    this.state = 'minimized';
    this.root.style.display = 'none';
    if (focusedWin === this) focusedWin = null;
    // el botón de la barra ya existe; solo ocultamos la ventana
  }

  restore() {
    if (this.state !== 'minimized') return;
    this.root.style.display = '';
    this.state = 'normal';
    this.focus();
  }

  toggleMaximize() {
    if (this.state === 'minimized') {
      this.restore();
    }
    if (this.state === 'maximized') {
      this.root.style.width = this.prev.w + 'px';
      this.root.style.height = this.prev.h + 'px';
      this.obj.position.copy(this.prev.pos);
      this.state = 'normal';
      this.maxBtn.textContent = '□';
    } else {
      this.prev = {
        w: this.root.offsetWidth,
        h: this.root.offsetHeight,
        pos: this.obj.position.clone()
      };
      this.root.style.width = '100vw';
      this.root.style.height = 'calc(100vh - 40px)';
      this.obj.position.set(0, 0, 120);
      this.state = 'maximized';
      this.maxBtn.textContent = '❐';
    }
    this.focus();
  }
}

export function spawnWindow(app) {
  new Win(app);
}
