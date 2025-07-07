import * as THREE from 'three';

export function setupHands({ container, size, camera, sceneCSS, video, cursor }) {
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
  const finger = [4, 8];             // pulgar e índice
  const rightPair = [4, 12];         // pulgar y dedo medio
  let leftPinch = false;
  let rightPinch = false;
  let pinchStart = 0;
  let lastX = 0, lastY = 0;

  function distPx(a, b) {
    return Math.hypot((a.x - b.x) * size.w, (a.y - b.y) * size.h);
  }

  function dispatch(type, x, y, button) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const ev = new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'touch',
      button,
      buttons: button === 0 ? 1 : button === 2 ? 2 : 0
    });
    el.dispatchEvent(ev);
  }

  hands.onResults(({ multiHandLandmarks: [lm] }) => {
    ctx2.clearRect(0, 0, size.w, size.h);
    if (!lm) {
      if (cursor) cursor.style.display = 'none';
      if (leftPinch) dispatch('pointerup', lastX, lastY, 0);
      if (rightPinch) dispatch('pointerup', lastX, lastY, 2);
      leftPinch = rightPinch = false;
      grabbing = false;
      target = null;
      return;
    }
    if (cursor) cursor.style.display = 'block';

    drawConnectors(ctx2, lm, HAND_CONNECTIONS, { color: '#0f0', lineWidth: 2 });
    drawLandmarks(ctx2, lm, { color: '#0f0', lineWidth: 1 });

    const [p1, p2] = finger.map(i => lm[i]);
    const mid  = { x: (p1.x + p2.x) / 2 * size.w, y: (p1.y + p2.y) / 2 * size.h };
    const dist = distPx(p1, p2);
    lastX = lm[8].x * size.w;
    lastY = lm[8].y * size.h;
    if (cursor) { cursor.style.left = `${lastX}px`; cursor.style.top = `${lastY}px`; }
    dispatch('pointermove', lastX, lastY, leftPinch ? 0 : rightPinch ? 2 : 0);

    const distR = distPx(...rightPair.map(i => lm[i]));
    const now = performance.now();

    ctx2.beginPath();
    ctx2.arc(mid.x, mid.y, 10, 0, 2 * Math.PI);
    ctx2.fillStyle = 'rgba(255,0,0,.6)';
    ctx2.fill();

    // Pinch izquierdo (click/arrastre)
    if (dist < 40) {
      if (!leftPinch && !rightPinch) {
        leftPinch = true;
        pinchStart = now;
        dispatch('pointerdown', lastX, lastY, 0);
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
        grabbing = !!target;
      }
    } else if (leftPinch) {
      leftPinch = false;
      dispatch('pointerup', lastX, lastY, 0);
      if (now - pinchStart < 300) dispatch('click', lastX, lastY, 0);
      grabbing = false;
      target   = null;
    }

    if (leftPinch && target) {
      const ndc2 = new THREE.Vector3(
        (mid.x / size.w) * 2 - 1,
        -(mid.y / size.h) * 2 + 1,
        target.position.z / (2000 / camera.far)
      ).unproject(camera);
      target.position.copy(ndc2);
    }

    // Pinch derecho (clic secundario)
    if (distR < 40) {
      if (!rightPinch && !leftPinch) {
        rightPinch = true;
        pinchStart = now;
        dispatch('pointerdown', lastX, lastY, 2);
      }
    } else if (rightPinch) {
      rightPinch = false;
      dispatch('pointerup', lastX, lastY, 2);
      if (now - pinchStart < 300) dispatch('contextmenu', lastX, lastY, 2);
    }
  });

  video.onplaying = function loop() {
    hands.send({ image: video });
    requestAnimationFrame(loop);
  };

  return hands;
}
