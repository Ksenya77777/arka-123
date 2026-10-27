import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

// Интерактивная 3D-модель помещения АРКА 123.
// Размеры: 12 × 10,25 м = 123 м², потолок 4,2 м, два арочных окна 4 × 3,5 м.
const W = 12;
const D = 10.25;
const H = 4.5;
const WIN_W = 4;
const WIN_H = 3.5;
const SILL = 0.75;

const TIMES = {
  morning: { top: '#9db9d6', bottom: '#f6dcb9', sun: '#ffd6a0', power: 2.4, pos: [-9, 6, -18] },
  day:     { top: '#78aee6', bottom: '#eaf3fb', sun: '#fff5e3', power: 3.2, pos: [3, 14, -18] },
  evening: { top: '#4f5f95', bottom: '#f2a36a', sun: '#ff9d5c', power: 2.2, pos: [11, 3.5, -16] },
};

function canvasTexture(size, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function floorTexture() {
  // паркет «ёлочка»: колонки досок, наклонённых попеременно на +45° и −45°
  return canvasTexture(1024, (g, s) => {
    g.fillStyle = '#c99b6a';
    g.fillRect(0, 0, s, s);
    const L = 150; const Wd = 36; const col = Wd * Math.SQRT2;
    const cols = Math.ceil(s / col) + 2;
    for (let i = -1; i < cols; i++) {
      const x = i * col;
      for (let y = -L; y < s + L; y += col) {
        g.save();
        g.translate(x + col / 2, y + col / 2 + (i % 2 ? col / 2 : 0));
        g.rotate((i % 2 ? -1 : 1) * Math.PI / 4);
        const tone = 205 + Math.random() * 26;
        g.fillStyle = `rgb(${tone},${tone * 0.76 | 0},${tone * 0.52 | 0})`;
        g.fillRect(-L / 2 + 1, -Wd / 2 + 1, L - 2, Wd - 2);
        g.restore();
      }
    }
  }, [3, 2.6]);
}

function plasterTexture() {
  return canvasTexture(512, (g, s) => {
    g.fillStyle = '#ddd5c7';
    g.fillRect(0, 0, s, s);
    for (let i = 0; i < 7000; i++) {
      const v = 200 + Math.random() * 36;
      g.fillStyle = `rgba(${v},${v - 6},${v - 18},0.35)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 2 + Math.random() * 3);
    }
  }, [4, 1.6]);
}

function skyTexture(top, bottom) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Национальная библиотека: ромбокубооктаэдр (все перестановки (±1, ±1, ±(1+√2)))
function libraryMesh() {
  const a = 1 + Math.SQRT2;
  const pts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push(new THREE.Vector3(sx, sy, sz * a), new THREE.Vector3(sx, sy * a, sz), new THREE.Vector3(sx * a, sy, sz));
  }
  const geo = new ConvexGeometry(pts).toNonIndexed();
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color: '#9fbfd9', metalness: 0.55, roughness: 0.28, flatShading: true,
  });
  const m = new THREE.Mesh(geo, mat);
  m.scale.setScalar(5.2);
  m.rotation.set(0.5, 0.35, 0.15);
  m.position.set(2, 13, -52);
  return m;
}

function wallWithArchWindows() {
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2, 0);
  shape.lineTo(W / 2, 0);
  shape.lineTo(W / 2, H);
  shape.lineTo(-W / 2, H);
  shape.closePath();
  const r = WIN_W / 2;
  for (const cx of [-3.5, 3.5]) {
    const hole = new THREE.Path();
    hole.moveTo(cx - r, SILL);
    hole.lineTo(cx - r, SILL + WIN_H - r);
    hole.absarc(cx, SILL + WIN_H - r, r, Math.PI, 0, true);
    hole.lineTo(cx + r, SILL);
    hole.closePath();
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false, curveSegments: 40 });
  return geo;
}

function chairFactory() {
  const seatG = new THREE.BoxGeometry(0.44, 0.05, 0.44);
  const backG = new THREE.BoxGeometry(0.44, 0.42, 0.05);
  const legG = new THREE.BoxGeometry(0.04, 0.45, 0.04);
  const mat = new THREE.MeshStandardMaterial({ color: '#203641', roughness: 0.6 });
  const accent = new THREE.MeshStandardMaterial({ color: '#c08a50', roughness: 0.5 });
  return () => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(seatG, accent); seat.position.y = 0.45;
    const back = new THREE.Mesh(backG, mat); back.position.set(0, 0.7, -0.2);
    g.add(seat, back);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      const l = new THREE.Mesh(legG, mat); l.position.set(x, 0.225, z); g.add(l);
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  };
}

export function createRoom(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', '3D-модель помещения АРКА 123: вращайте мышью, пальцем или стрелками клавиатуры');
  renderer.domElement.tabIndex = 0;
  renderer.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  scene.background = skyTexture(TIMES.day.top, TIMES.day.bottom);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 200);
  camera.position.set(0, 1.7, 4.4);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.5, 0);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 4.4;
  controls.maxPolarAngle = Math.PI / 2 + 0.1;
  controls.minPolarAngle = 0.55;
  // OrbitControls ставит touch-action: none и отнимает у страницы вертикальный скролл на телефоне
  renderer.domElement.style.touchAction = 'pan-y';
  controls.listenToKeyEvents(renderer.domElement);
  controls.autoRotate = !reduceMotion;
  controls.enableDamping = !reduceMotion;
  controls.autoRotateSpeed = 0.7;
  const stopAuto = () => { controls.autoRotate = false; };
  controls.addEventListener('start', stopAuto);
  renderer.domElement.addEventListener('keydown', stopAuto);
  renderer.domElement.addEventListener('focus', stopAuto);

  // --- помещение ---
  const wallMat = new THREE.MeshStandardMaterial({ map: plasterTexture(), roughness: 0.9 });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#2b2f34', roughness: 0.95 });
  const panelMat = new THREE.MeshStandardMaterial({ color: '#f2f0eb', roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1d2125', roughness: 0.55 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: '#f1eee8', roughness: 0.95 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.55 });

  const back = new THREE.Mesh(wallWithArchWindows(), new THREE.MeshStandardMaterial({ map: plasterTexture(), roughness: 0.9 }));
  back.position.set(0, 0, -D / 2 - 0.45);
  back.castShadow = back.receiveShadow = true;
  scene.add(back);

  const plane = (w, h, mat, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  };
  plane(W, D, floorMat, [0, 0, 0], [-Math.PI / 2, 0, 0]);
  const ceiling = plane(W, D, ceilMat, [0, H, 0], [Math.PI / 2, 0, 0]);
  ceiling.receiveShadow = false;
  // боковые и входная стены: декоративная штукатурка
  plane(D, H, wallMat, [-W / 2, H / 2, 0], [0, Math.PI / 2, 0]);
  plane(D, H, wallMat, [W / 2, H / 2, 0], [0, -Math.PI / 2, 0]);
  plane(W, H, wallMat, [0, H / 2, D / 2], [0, Math.PI, 0]);

  // потолок цвета антрацит и линейные светильники, как в зале (33 панели)
  const barMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff6e0', emissiveIntensity: 2.2 });
  const rnd = (() => { let x = 7; return () => (x = (x * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 33; i++) {
    const len = 1.2 + rnd() * 1.6;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.08), barMat);
    bar.position.set((rnd() - 0.5) * (W - 1.5), H - 0.35 - rnd() * 0.5, (rnd() - 0.5) * (D - 1.5));
    bar.rotation.y = rnd() * Math.PI;
    scene.add(bar);
  }

  // стеновые панели справа (белые с антрацитовым вставками) и колонны
  const side = [[-3.2, panelMat], [-1.1, panelMat], [1.0, darkMat], [3.1, panelMat]];
  for (const [z, m] of side) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, H - 0.3, 1.9), m);
    p.position.set(W / 2 - 0.03, (H - 0.3) / 2 + 0.1, z);
    scene.add(p);
  }
  for (const [x, z] of [[-5.6, 2.2], [5.6, -2.0]]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, H, 0.55), darkMat);
    col.position.set(x, H / 2, z);
    col.castShadow = col.receiveShadow = true;
    scene.add(col);
  }

  // оконные рамы: чёрные, арка, горизонтальный и вертикальный импосты, подоконник и радиатор
  const frameZ = -D / 2 + 0.04;
  for (const cx of [-3.5, 3.5]) {
    const r = WIN_W / 2;
    const archY = SILL + WIN_H - r;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r - 0.03, 0.045, 10, 48, Math.PI), darkMat);
    ring.position.set(cx, archY, frameZ);
    const mk = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.09), darkMat);
      m.position.set(x, y, frameZ);
      return m;
    };
    scene.add(ring,
      mk(0.09, archY - SILL + r, cx, (archY + r + SILL) / 2),            // вертикальный импост
      mk(0.09, archY - SILL, cx - (r - 0.03), (archY + SILL) / 2),       // левая стойка
      mk(0.09, archY - SILL, cx + (r - 0.03), (archY + SILL) / 2),       // правая стойка
      mk(WIN_W, 0.09, cx, SILL + (archY - SILL) * 0.55),                 // горизонтальный импост
      mk(WIN_W, 0.09, cx, SILL),                                         // низ рамы
      mk(WIN_W + 0.3, 0.07, cx, SILL - 0.04));                           // подоконник
    const sillBox = new THREE.Mesh(new THREE.BoxGeometry(WIN_W + 0.3, 0.07, 0.45), darkMat);
    sillBox.position.set(cx, SILL - 0.04, -D / 2 + 0.2);
    const rad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.1), darkMat);
    rad.position.set(cx, 0.4, -D / 2 + 0.06);
    scene.add(sillBox, rad);
  }

  // --- вид из окна ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#8a9a7a', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.4;
  scene.add(ground);
  scene.add(libraryMesh());

  // --- свет ---
  const hemi = new THREE.HemisphereLight('#dbe8f6', '#d6cdbf', 1.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff5e3', 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 80;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0005;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);
  const fill = new THREE.PointLight('#fff1d6', 55, 18, 2);
  fill.position.set(0, 4.0, 1);
  scene.add(fill);

  const setTime = (key) => {
    const t = TIMES[key] ?? TIMES.day;
    scene.background?.dispose();
    scene.background = skyTexture(t.top, t.bottom);
    sun.color.set(t.sun);
    gsap.to(sun, { intensity: t.power, duration: 0.8 });
    gsap.to(sun.position, { x: t.pos[0], y: t.pos[1], z: t.pos[2], duration: 0.8 });
    hemi.color.set(t.top);
  };
  setTime('day');
  sun.position.set(...TIMES.day.pos);

  // --- мебель и сценарии ---
  const chair = chairFactory();
  const tableMat = new THREE.MeshStandardMaterial({ color: '#e7dfd3', roughness: 0.6 });
  const tableLeg = new THREE.MeshStandardMaterial({ color: '#203641', roughness: 0.5 });
  const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  const rectTable = (w, d, x, z) => {
    const g = new THREE.Group();
    g.add(shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), tableMat)));
    g.children[0].position.y = 0.75;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const l = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), tableLeg));
      l.position.set(sx * (w / 2 - 0.1), 0.36, sz * (d / 2 - 0.1));
      g.add(l);
    }
    g.position.set(x, 0, z);
    return g;
  };
  const roundTable = (x, z) => {
    const g = new THREE.Group();
    const top = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.06, 36), tableMat));
    top.position.y = 0.75;
    const leg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.72, 16), tableLeg));
    leg.position.y = 0.36;
    g.add(top, leg);
    g.position.set(x, 0, z);
    return g;
  };

  const scenarios = {
    empty: () => new THREE.Group(),
    class: () => {
      const g = new THREE.Group();
      // проектор и экран на правой стене
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.475), new THREE.MeshStandardMaterial({
        color: '#fff', emissive: '#bcd6ee', emissiveIntensity: 0.55,
        map: canvasTexture(512, (c, s) => {
          c.fillStyle = '#f6f8fb'; c.fillRect(0, 0, s, s);
          c.fillStyle = '#203641'; c.font = '600 54px Georgia'; c.fillText('Мастер-класс', 40, 150);
          c.fillStyle = '#c08a50'; c.fillRect(40, 190, 220, 8);
          c.fillStyle = '#6b6a66'; c.font = '28px sans-serif'; c.fillText('АРКА 123', 40, 250);
        }),
      }));
      screen.position.set(W / 2 - 0.1, 2.0, 0);
      screen.rotation.y = -Math.PI / 2;
      const proj = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: '#222' })));
      proj.position.set(0.5, H - 0.4, 0);
      g.add(screen, proj);
      // стол преподавателя и преподаватель
      g.add(rectTable(0.7, 1.7, 4.7, 0));
      const body = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 6, 16), new THREE.MeshStandardMaterial({ color: '#c08a50', roughness: 0.6 })));
      body.position.set(5.35, 1.0, 0.4);
      const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), new THREE.MeshStandardMaterial({ color: '#e8c4a4' })));
      head.position.set(5.35, 1.72, 0.4);
      g.add(body, head);
      // ряды слушателей лицом к экрану
      for (let col = 0; col < 4; col++) for (let row = -3; row <= 3; row++) {
        const c = chair();
        c.position.set(-3.6 + col * 1.5, 0, row * 1.05);
        c.rotation.y = Math.PI / 2;
        g.add(c);
      }
      return g;
    },
    table: () => {
      const g = new THREE.Group();
      g.add(rectTable(6.4, 1.5, 0, 0.4));
      for (let i = 0; i < 6; i++) {
        const x = -2.5 + i;
        const a = chair(); a.position.set(x, 0, 0.4 - 1.1); g.add(a);
        const b = chair(); b.position.set(x, 0, 0.4 + 1.1); b.rotation.y = Math.PI; g.add(b);
      }
      const e1 = chair(); e1.position.set(-3.8, 0, 0.4); e1.rotation.y = Math.PI / 2; g.add(e1);
      const e2 = chair(); e2.position.set(3.8, 0, 0.4); e2.rotation.y = -Math.PI / 2; g.add(e2);
      return g;
    },
    tables: () => {
      const g = new THREE.Group();
      for (const cx of [-3.6, 0, 3.6]) for (const cz of [-1.2, 2.3]) {
        g.add(roundTable(cx, cz));
        for (let k = 0; k < 4; k++) {
          const th = (k * Math.PI) / 2 + Math.PI / 4;
          const px = cx + Math.cos(th) * 1.0;
          const pz = cz + Math.sin(th) * 1.0;
          const c = chair();
          c.position.set(px, 0, pz);
          c.rotation.y = Math.atan2(-Math.cos(th), -Math.sin(th));
          g.add(c);
        }
      }
      return g;
    },
  };

  // сценарии строятся один раз и переиспользуются: нет утечек GPU-памяти при переключении
  const cache = {};
  let current = null;
  let currentKey = null;
  const setScenario = (key) => {
    if (key === currentKey) return;
    currentKey = key;
    cache[key] ??= (scenarios[key] ?? scenarios.empty)();
    const next = cache[key];
    const old = current;
    current = next;
    gsap.killTweensOf(next.scale);
    scene.add(next);
    next.scale.setScalar(0.001);
    gsap.to(next.scale, { x: 1, y: 1, z: 1, duration: reduceMotion ? 0 : 0.7, ease: 'back.out(1.4)' });
    if (old) {
      gsap.killTweensOf(old.scale);
      gsap.to(old.scale, {
        x: 0.001, y: 0.001, z: 0.001, duration: reduceMotion ? 0 : 0.3, ease: 'power2.in',
        onComplete: () => scene.remove(old),
      });
    }
  };
  setScenario('empty');

  // --- вид: внутри / сверху ---
  const setView = (mode) => {
    controls.autoRotate = false;
    const goPlan = mode === 'plan';
    gsap.killTweensOf(camera.position);
    // ограничения сначала расширяем, а при возврате внутрь возвращаем только после перелёта
    controls.minPolarAngle = 0;
    controls.maxDistance = 15;
    const to = goPlan ? { x: 0.01, y: 14, z: 6 } : { x: 0, y: 1.7, z: 4.4 };
    gsap.to(camera.position, {
      ...to, duration: reduceMotion ? 0 : 1.1, ease: 'power2.inOut',
      onUpdate: () => controls.update(),
      onComplete: () => {
        if (!goPlan) { controls.minPolarAngle = 0.55; controls.maxDistance = 4.4; }
        controls.update();
      },
    });
  };

  // --- размеры и цикл ---
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  let visible = false;
  let raf = 0;
  const loop = () => {
    controls.update();
    renderer.render(scene, camera);
    raf = visible ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }, { rootMargin: '100px' }).observe(container);

  return { setScenario, setTime, setView };
}
