import * as THREE from 'three';

export function setupHands({ container, size, camera, sceneCSS, video }) {
  const cursor = document.createElement('div');
  cursor.id = 'hand-cursor';
  container.appendChild(cursor);
  const cursorPos = { x: 0, y: 0 };
  let leftDown = false;
  let rightDown = false;
  function sendMouse(type, button) {
    const el = document.elementFromPoint(cursorPos.x, cursorPos.y);
    if (!el) return;
    const evt = new MouseEvent(type, {
      bubbles: true,
      clientX: cursorPos.x,
      clientY: cursorPos.y,
      button
    });
    el.dispatchEvent(evt);
  }
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
    if (!lm) {
      cursor.style.display = 'none';
      cursor.classList.remove('active');
      if (leftDown) {
        sendMouse('mouseup', 0);
        leftDown = false;
      }
      if (rightDown) {
        sendMouse('mouseup', 2);
        rightDown = false;
      }
      grabbing = false;
      target = null;
      return;
    }
    cursor.style.display = 'block';

    drawConnectors(ctx2, lm, HAND_CONNECTIONS, { color: '#0f0', lineWidth: 2 });
    drawLandmarks(ctx2, lm, { color: '#0f0', lineWidth: 1 });

    const idx = lm[8];
    cursorPos.x = idx.x * size.w;
    cursorPos.y = idx.y * size.h;
    cursor.style.transform = `translate(${cursorPos.x}px,${cursorPos.y}px)`;

    sendMouse('mousemove', 0);

    const [p1, p2] = finger.map(i => lm[i]);
    const mid  = { x: (p1.x + p2.x) / 2 * size.w, y: (p1.y + p2.y) / 2 * size.h };
    const dist = Math.hypot((p2.x - p1.x) * size.w, (p2.y - p1.y) * size.h);

    const rightDist = Math.hypot((lm[12].x - lm[4].x) * size.w, (lm[12].y - lm[4].y) * size.h);

    ctx2.beginPath();
    ctx2.arc(mid.x, mid.y, 10, 0, 2 * Math.PI);
    ctx2.fillStyle = 'rgba(255,0,0,.6)';
    ctx2.fill();

    if (dist < 40) {
      if (!leftDown) {
        sendMouse('mousedown', 0);
        leftDown = true;
      }
      cursor.classList.add('active');
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
      if (leftDown) {
        sendMouse('mouseup', 0);
        sendMouse('click', 0);
      }
      leftDown = false;
      cursor.classList.toggle('active', rightDown);
      grabbing = false;
      target   = null;
    }

    if (rightDist < 40) {
      if (!rightDown) {
        sendMouse('mousedown', 2);
        rightDown = true;
      }
      cursor.classList.add('active');
    } else if (rightDown) {
      sendMouse('mouseup', 2);
      const el = document.elementFromPoint(cursorPos.x, cursorPos.y);
      if (el) el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: cursorPos.x, clientY: cursorPos.y, button: 2 }));
      rightDown = false;
      cursor.classList.toggle('active', leftDown);
    }
  });

  video.addEventListener('playing', function loop() {
    hands.send({ image: video });
    requestAnimationFrame(loop);
  });

  return hands;
}
