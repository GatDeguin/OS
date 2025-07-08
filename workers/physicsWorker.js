import * as CANNON from '../vendor/cannon-es/cannon-es.js';

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
world.broadphase = new CANNON.NaiveBroadphase();
const iconMat = new CANNON.Material('iconMat');
const iconContactMat = new CANNON.ContactMaterial(iconMat, iconMat, {
  restitution: 0.6,
  friction: 0.4
});
world.addContactMaterial(iconContactMat);
const bodies = [];
const walls = [];
let interval;

function updateBounds({ halfW, halfH }) {
  walls.forEach(w => world.removeBody(w));
  walls.length = 0;
  const t = 10;
  const make = (x, y, w, h) => {
    const b = new CANNON.Body({ mass: 0 });
    b.addShape(new CANNON.Box(new CANNON.Vec3(w, h, t)));
    b.position.set(x, y, 0);
    world.addBody(b);
    walls.push(b);
  };
  make(-halfW - t, 0, t, halfH + t);
  make( halfW + t, 0, t, halfH + t);
  make(0,  halfH + t, halfW + t, t);
  make(0, -halfH - t, halfW + t, t);
}

function step() {
  world.step(1/60);
  const out = bodies.map(b => ({
    x: b.position.x,
    y: b.position.y,
    z: b.position.z,
    qx: b.quaternion.x,
    qy: b.quaternion.y,
    qz: b.quaternion.z,
    qw: b.quaternion.w
  }));
  postMessage({ type: 'update', bodies: out });
}

onmessage = e => {
  const { type, data } = e.data;
  if (type === 'init') {
    data.icons.forEach(p => {
      const body = new CANNON.Body({
        mass: 1,
        linearDamping: 0.9,
        material: iconMat
      });
      body.addShape(new CANNON.Sphere(60));
      body.position.set(p.x, p.y, 0);
      world.addBody(body);
      bodies.push(body);
    });
    if (!interval) interval = setInterval(step, 1000/60);
  } else if (type === 'resize') {
    updateBounds(data.bounds);
  } else if (type === 'impulse') {
    const b = bodies[data.index];
    if (b) b.applyImpulse(new CANNON.Vec3(data.x, data.y, 0), b.position);
  } else if (type === 'force') {
    const b = bodies[data.index];
    if (b) b.applyForce(new CANNON.Vec3(data.x, data.y, 0), b.position);
  } else if (type === 'set') {
    const b = bodies[data.index];
    if (b) {
      b.position.set(data.x, data.y, 0);
      b.velocity.set(0, 0, 0);
    }
  }
};
