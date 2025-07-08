export function setupGaze({ video, onUpdate }) {
  const face = new FaceMesh({
    // Match FaceMesh script version
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
  video.addEventListener('playing', function loop() {
    face.send({ image: video });
    requestAnimationFrame(loop);
  });
  return face;
}
