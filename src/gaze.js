export function setupGaze({ video, onUpdate }) {
  let face;
  video.addEventListener('playing', async function init() {
    video.removeEventListener('playing', init);
    try {
      const mod = await import('https://cdn.skypack.dev/@mediapipe/face_mesh');
      const { FaceMesh } = mod;
      face = new FaceMesh({
        locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${f}`
      });
      face.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      face.onResults(({ multiFaceLandmarks: [lm] }) => {
        if (!lm) { onUpdate(0, 0); return; }
        const nose = lm[1];
        const x = (nose.x - 0.5) * 2;
        const y = (0.5 - nose.y) * 2;
        onUpdate(x, y);
      });
      (function loop() {
        face.send({ image: video });
        requestAnimationFrame(loop);
      })();
    } catch (e) {
      window.showToast && window.showToast('Error al cargar MediaPipe FaceMesh');
    }
  });
  return face;
}
