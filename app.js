/* ---------- Imports ---------- */
import * as THREE from 'three';
import {CSS3DRenderer, CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

/* ---------- Constantes ---------- */
const container = document.getElementById('container');
const video     = document.getElementById('camera');
const overlay   = document.getElementById('overlay');
const msgEl     = document.getElementById('overlay-msg');
const startBtn  = document.getElementById('start-btn');
const size      = {w:innerWidth,h:innerHeight};

/* ---------- ESCENA ---------- */
const sceneGL   = new THREE.Scene();
const sceneCSS  = new THREE.Scene();
const camera    = new THREE.PerspectiveCamera(50,size.w/size.h,1,2000);
camera.position.set(0,0,650);

const rendererGL  = new THREE.WebGLRenderer({antialias:true});
const rendererCSS = new CSS3DRenderer();
[rendererGL,rendererCSS].forEach(r=>{r.setSize(size.w,size.h);container.appendChild(r.domElement)});
rendererGL.domElement.style.zIndex = '1';
rendererCSS.domElement.className   = 'css3d'; // p/selección cómoda

/* ---------- Fondo degradado (1 sola geometría + CanvasTexture) ---------- */
(()=>{
  const c = document.createElement('canvas'); c.width=c.height=1024;
  const g = c.getContext('2d')
    .createLinearGradient(0,0,0,1024);
  g.addColorStop(0,'var(--bg-grad-1)');
  g.addColorStop(1,'var(--bg-grad-2)');
  c.getContext('2d').fillStyle=g;
  c.getContext('2d').fillRect(0,0,1024,1024);
  const tex = new THREE.CanvasTexture(c);
  const quad= new THREE.Mesh(
    new THREE.PlaneGeometry(4000,4000),
    new THREE.MeshBasicMaterial({map:tex,depthTest:false})
  );
  quad.position.z = -1500;
  sceneGL.add(quad);
})();

/* ---------- Controles de cámara ---------- */
const controls = new OrbitControls(camera,rendererCSS.domElement);
Object.assign(controls,{
  enablePan:false,enableZoom:false,
  minPolarAngle:Math.PI/2-.25,maxPolarAngle:Math.PI/2+.25,
  minAzimuthAngle:-.25,maxAzimuthAngle:.25,
  enableDamping:true,dampingFactor:.08
});

/* ---------- Íconos de apps ---------- */
const APPS = [
  {id:'term', name:'Terminal', icon:'https://img.icons8.com/fluency/96/console.png'},
  {id:'edit', name:'Editor',   icon:'https://img.icons8.com/fluency/96/notepad.png'},
  {id:'web',  name:'Web',      icon:'https://img.icons8.com/fluency/96/internet.png'}
];

APPS.forEach((app,i)=>{
  const el = document.createElement('div');
  el.className='icon';
  el.innerHTML=`<img src="${app.icon}"><span>${app.name}</span>`;
  const obj = new CSS3DObject(el);
  obj.position.set((i-(APPS.length-1)/2)*160,120,0);
  sceneCSS.add(obj);
  el.addEventListener('click',()=>spawnWindow(app));
});

/* ---------- Clase Ventana ---------- */
class Win{
  constructor({id,name}){
    this.root = document.createElement('div');
    this.root.className='window active';
    this.root.id = `win-${id}`;
    /* --- Título --- */
    const title = document.createElement('div');
    title.className='titlebar'; title.textContent=name;
    const close = document.createElement('button');
    close.className='close-btn'; close.textContent='×';
    close.onclick = ()=>sceneCSS.remove(this.obj);
    title.appendChild(close); this.root.appendChild(title);
    /* --- Contenido --- */
    const cont = document.createElement('div');
    cont.className='content'; this.root.appendChild(cont);

    switch(id){
      case 'term':{
        const pre=document.createElement('pre');pre.textContent='Terminal >';
        const inp=document.createElement('input');
        inp.placeholder='escribe y pulsa Enter';
        inp.onkeydown=e=>{
          if(e.key==='Enter'){
            pre.textContent+=`\n$ ${inp.value}`;
            inp.value='';
            cont.scrollTop=cont.scrollHeight;
          }
        };
        cont.append(pre,inp);
      }break;
      case 'edit':{
        const ta=document.createElement('textarea');
        ta.value='Escribe aquí…';
        cont.appendChild(ta);
      }break;
      case 'web':{
        const iframe=document.createElement('iframe');
        iframe.src='https://example.com';
        cont.appendChild(iframe);
      }
    }

    /* --- Objeto 3D --- */
    this.obj = new CSS3DObject(this.root);
    this.obj.position.set(0,0,120);
    sceneCSS.add(this.obj);
    /* --- Drag manual (simple) --- */
    this.#enableDrag(title);
  }

  #enableDrag(bar){
    let start={x:0,y:0,pos:new THREE.Vector3()};
    const onMove=e=>{
      this.obj.position.set(
        start.pos.x + (e.clientX-start.x),
        start.pos.y - (e.clientY-start.y),
        start.pos.z
      );
    };
    bar.onmousedown=e=>{
      start={x:e.clientX,y:e.clientY,pos:this.obj.position.clone()};
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',()=>document.removeEventListener('mousemove',onMove),{once:true});
    };
  }
}

function spawnWindow(app){ new Win(app); }

/* ---------- MediaPipe Hands ---------- */
const ctx2 = (()=>{       /* canvas overlay para feedback */
  const c = document.createElement('canvas');
  c.width=size.w; c.height=size.h;
  c.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2';
  container.appendChild(c);
  return c.getContext('2d',{willReadFrequently:true});
})();

const hands = new Hands({
  locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.10.24/${f}`
});
hands.setOptions({
  maxNumHands:1,
  minDetectionConfidence:.7,
  minTrackingConfidence:.7
});

let grabbing=false,target=null;
const finger=[4,8];

hands.onResults(({multiHandLandmarks:[lm]})=>{
  ctx2.clearRect(0,0,size.w,size.h);
  if(!lm) return;

  const [p1,p2]=finger.map(i=>lm[i]);
  const mid = {x:(p1.x+p2.x)/2*size.w, y:(p1.y+p2.y)/2*size.h};
  const dist = Math.hypot((p2.x-p1.x)*size.w,(p2.y-p1.y)*size.h);

  ctx2.beginPath();ctx2.arc(mid.x,mid.y,10,0,2*Math.PI);
  ctx2.fillStyle='rgba(255,0,0,.6)'; ctx2.fill();

  if(dist<40){
    if(!grabbing){
      grabbing=true;
      /* --- raycast CSS3D icons/windows --- */
      const ndc = new THREE.Vector3(
        (mid.x/size.w)*2-1,
        -(mid.y/size.h)*2+1,
        .5
      ).unproject(camera);
      const ray = new THREE.Raycaster(camera.position,ndc.sub(camera.position).normalize());
      const hits=ray.intersectObjects(sceneCSS.children);
      target=hits[0]?.object??null;
    }
    if(target){
      const ndc2=new THREE.Vector3(
        (mid.x/size.w)*2-1,
        -(mid.y/size.h)*2+1,
        target.position.z/(2000/camera.far)
      ).unproject(camera);
      target.position.copy(ndc2);
    }
  }else{grabbing=false;target=null}
});

/* ---------- Video / cámara ---------- */
function startCamera(){
  navigator.mediaDevices.getUserMedia({video:{width:640,height:480}})
    .then(str=>{video.srcObject=str;video.play();})
    .catch(err=>{
      msgEl.textContent = 'Error al acceder a la c\u00e1mara: '+err.message;
      overlay.classList.remove('hidden');
    });
}

startBtn.onclick=()=>{
  overlay.classList.add('hidden');
  startCamera();
};

video.onplaying = function loop(){
  hands.send({image:video});
  requestAnimationFrame(loop);
};

/* ---------- Resize ---------- */
addEventListener('resize',()=>{
  size.w=innerWidth;size.h=innerHeight;
  camera.aspect=size.w/size.h;camera.updateProjectionMatrix();
  [rendererGL,rendererCSS].forEach(r=>r.setSize(size.w,size.h));
});

/* ---------- Bucle render ---------- */
(function animate(){
  requestAnimationFrame(animate);
  controls.update();
  rendererGL.render(sceneGL,camera);
  rendererCSS.render(sceneCSS,camera);
})();

