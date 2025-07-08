importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js');

let hands;

onmessage = async e => {
  const { type, image } = e.data;
  if (type === 'init') {
    hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}` });
    hands.setOptions({ maxNumHands: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(r => { postMessage({ multiHandLandmarks: r.multiHandLandmarks }); });
  } else if (type === 'frame' && hands) {
    await hands.send({ image });
    image.close && image.close();
  }
};
