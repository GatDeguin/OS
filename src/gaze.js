export function setupGaze({ video, onUpdate }) {
  let face;
  video.addEventListener('playing', async function init() {
    video.removeEventListener('playing', init);
    try {
      const { FaceMesh } = globalThis;
      if (!FaceMesh) throw new Error('FaceMesh not loaded');
      face = new FaceMesh({
        locateFile: f => `vendor/mediapipe/${f}`
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
