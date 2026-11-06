/* /marketing-tools/ hero (TradeQuo_Marketing_Tools_Hero design): the four tools as 3D objects —
 * creative cards, a TradingView screen, signal candles on a base, the academy temple — over the dark
 * hero. They pop in, bob, follow the mouse (parallax); hovering or tapping one shows its name above it.
 * Phones and other tall screens (stage narrower than 0.95 of its height) get a 2×2 layout.
 * Loaded as a module by marketing.html; three.js is the site's own copy. The page's text stays as it is
 * when WebGL is missing. Labels come from the stage's data-labels (mt.top.l1–l4, joined by |). */
import * as THREE from '../../vendor/three@0.184.0/three.module.min.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = x => Math.min(1, Math.max(0, x));
const damp = (a, b, dt, k) => a + (b - a) * (1 - Math.exp(-dt * k));
const backOut = x => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

function rr(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function makeEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.setRGB(...rgb);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.lookAt(0, 0, 0); env.add(p);
  };
  panel(10, 3, [0, 7, 1], [7, 7, 7]);
  panel(1.6, 11, [-7, 1, 3], [4.5, 4.5, 4.7]);
  panel(1.0, 11, [7, 0, -1], [3, 3, 3.2]);
  panel(11, 4, [0, 1, 8], [0.9, 0.9, 0.95]);
  panel(4, 11, [-5, 0, -6], [1.6, 1.6, 1.7]);
  panel(12, 1.4, [0, -6.5, 3], [1.2, 0.05, 0.07]);
  panel(1.4, 5, [6.5, -1.5, 4], [0.9, 0.03, 0.05]);
  const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(env, 0.03).texture; pm.dispose();
  return t;
}
const radTex = (stops) => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

function sheenTex() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 256, 256);
  [[0, 'rgba(255,255,255,0.16)'], [0.32, 'rgba(255,255,255,0)'], [0.44, 'rgba(255,255,255,0.12)'], [0.5, 'rgba(255,255,255,0.02)'], [1, 'rgba(255,255,255,0)']].forEach(([o, v]) => g.addColorStop(o, v));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function materials() {
  return {
    lacquer: new THREE.MeshPhysicalMaterial({ color: 0x09090b, metalness: 0.1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, envMapIntensity: 1.5 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xdedee4, metalness: 1, roughness: 0.3, envMapIntensity: 1.4 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xf4f4f7, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
    sheen: new THREE.MeshBasicMaterial({ map: sheenTex(), transparent: true, depthWrite: false }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xd60f19, emissive: 0x5a0006, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff2a33 }),
    white: new THREE.MeshBasicMaterial({ color: 0xf2f2f5 }),
    dim: new THREE.MeshBasicMaterial({ color: 0x55555c }),
  };
}

function fixUV(g, w, h) { const p = g.attributes.position, uv = g.attributes.uv; for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / w + 0.5, p.getY(k) / h + 0.5); }
function buildCards(M) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(rr(0.86, 1.2, 0.08), { depth: 0.028, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3, curveSegments: 18 });
  geo.translate(0, 0, -0.014);
  const cards = [];
  for (let k = 0; k < 4; k++) {
    const m = new THREE.Mesh(geo, [M.lacquer, M.chrome]);
    m.position.set(0.1 - k * 0.08, -k * 0.035, -k * 0.1); m.rotation.z = 0.06 - k * 0.07;
    g.add(m); cards.push(m);
  }
  const f = cards[0], z = 0.0235, add = (geo2, mat, x, y) => { const p = new THREE.Mesh(geo2, mat); p.position.set(x, y, z); f.add(p); return p; };
  add(new THREE.CircleGeometry(0.03, 24), M.red, -0.31, 0.49);
  add(new THREE.PlaneGeometry(0.16, 0.022), M.dim, -0.16, 0.49);
  const pts = [[-0.34, 0.06], [-0.22, 0.12], [-0.12, 0.04], [0.0, 0.2], [0.1, 0.14], [0.22, 0.3], [0.34, 0.26]].map(([x, y]) => new THREE.Vector3(x, y, z + 0.002));
  f.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.007, 8, false), M.red));
  add(new THREE.PlaneGeometry(0.56, 0.06), M.white, -0.07, -0.16);
  add(new THREE.PlaneGeometry(0.4, 0.06), M.white, -0.15, -0.25);
  add(new THREE.PlaneGeometry(0.3, 0.02), M.dim, -0.2, -0.34);
  const btn = new THREE.Mesh(new THREE.ShapeGeometry(rr(0.26, 0.08, 0.04), 12), M.red); btn.position.set(-0.2, -0.47, z); f.add(btn);
  const sh = new THREE.Mesh(new THREE.ShapeGeometry(rr(0.84, 1.18, 0.075), 16), M.sheen); fixUV(sh.geometry, 0.84, 1.18); sh.position.z = 0.026; f.add(sh);
  g.rotation.set(0.05, -0.45, 0);
  return g;
}

function buildScreen(M) {
  const g = new THREE.Group();
  const geo = new THREE.ExtrudeGeometry(rr(1.5, 0.98, 0.07), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 16 });
  geo.translate(0, 0, -0.02);
  g.add(new THREE.Mesh(geo, [M.lacquer, M.chrome]));
  const z = 0.031;
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.003), M.dim); l.position.set(0, -0.32 + i * 0.16, z); l.material = new THREE.MeshBasicMaterial({ color: 0x232328 }); g.add(l); }
  const S = [40, 36, 44, 38, 30, 34, 26, 33, 45, 41, 52, 58, 50, 62, 57, 70, 66, 78];
  const n = S.length, lo = 20, hi = 86, Y = v => -0.36 + (v - lo) / (hi - lo) * 0.72;
  S.forEach((c, i) => {
    const o = i ? S[i - 1] : c - 4, up = c >= o, top = Y(Math.max(o, c)), bot = Y(Math.min(o, c)), x = -0.62 + i * (1.24 / (n - 1));
    const h = Math.max(0.02, top - bot), mat = up ? M.pearl : M.ruby;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.038, h, 0.02), mat); b.position.set(x, (top + bot) / 2, z + 0.01); g.add(b);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.006, h + 0.07, 0.008), mat); w.position.set(x, (top + bot) / 2, z + 0.006); g.add(w);
  });
  const lv = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.004), M.red); lv.position.set(0, Y(66), z + 0.001); g.add(lv);
  const sh = new THREE.Mesh(new THREE.ShapeGeometry(rr(1.48, 0.96, 0.065), 16), M.sheen); fixUV(sh.geometry, 1.48, 0.96); sh.position.z = 0.05; g.add(sh);
  g.rotation.set(-0.12, 0.42, 0.06);
  return g;
}

function buildSignals(M) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const base = new THREE.ExtrudeGeometry(rr(1.3, 0.56, 0.1), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 14 });
  base.rotateX(-Math.PI / 2); base.translate(0, 0.012, 0);
  inner.add(new THREE.Mesh(base, [M.lacquer, M.chrome]));
  const H = [0.46, 0.7, 0.42, 0.9, 0.64, 1.06];
  H.forEach((h, i) => {
    const x = -0.45 + i * 0.18, mat = i % 2 ? M.pearl : M.ruby, y0 = 0.15 + (i % 3) * 0.04;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * 0.7, 0.12), mat); b.position.set(x, y0 + h * 0.35 + 0.05, 0); inner.add(b);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, h + 0.1, 12), mat); w.position.set(x, y0 + h * 0.35 + 0.05, 0); inner.add(w);
  });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.014, 0.01), M.red); strip.position.set(0, 0.075, 0.293); inner.add(strip);
  inner.position.y = -0.62;
  g.rotation.set(0.32, -0.55, 0);
  return g;
}

function buildTemple(M) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const box = (w, h, d, y, mat = M.silver, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(0, y, z); inner.add(m); return m; };
  box(1.32, 0.08, 0.72, 0.04); box(1.2, 0.08, 0.62, 0.12); box(1.08, 0.08, 0.52, 0.2);
  const colGeo = new THREE.CylinderGeometry(0.05, 0.056, 0.6, 28), capGeo = new THREE.BoxGeometry(0.13, 0.035, 0.13);
  for (let i = 0; i < 5; i++) {
    const x = -0.42 + i * 0.21;
    [[0.16, M.silver], [-0.14, M.graphite]].forEach(([z, mat]) => {
      const c = new THREE.Mesh(colGeo, mat); c.position.set(x, 0.54, z); inner.add(c);
      const cap = new THREE.Mesh(capGeo, mat); cap.position.set(x, 0.855, z); inner.add(cap);
      const ft = new THREE.Mesh(capGeo, mat); ft.position.set(x, 0.255, z); inner.add(ft);
    });
  }
  box(1.12, 0.1, 0.54, 0.92);
  const tri = new THREE.Shape(); tri.moveTo(-0.6, 0); tri.lineTo(0.6, 0); tri.lineTo(0, 0.3); tri.closePath();
  const pg = new THREE.ExtrudeGeometry(tri, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }); pg.translate(0, 0.97, -0.25);
  inner.add(new THREE.Mesh(pg, M.silver));
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.02), M.ruby); mark.position.set(0, 1.07, 0.262); mark.rotation.z = Math.PI / 4; inner.add(mark);
  const inGlow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.02), new THREE.MeshBasicMaterial({ color: 0xff2a33, transparent: true, opacity: 0.55 })); inGlow.position.set(0, 0.55, -0.02); inner.add(inGlow);
  const pl = new THREE.PointLight(0xff2030, 3.2, 1.6, 1.4); pl.position.set(0, 0.55, 0.02); inner.add(pl);
  inner.position.y = -0.62;
  g.rotation.set(0.12, -0.5, 0);
  return g;
}

const PRESETS = {
  portrait: { fitW: 3.25, look: [0, -0.05, 0], scale: 0.98, pos: [[-0.72, 1.12, 0.1], [0.74, 0.62, -0.35], [-0.7, -0.62, 0.2], [0.72, -1.12, 0]] },
  landscape: { fitW: 8.7, look: [0, 0.05, 0], scale: 1.12, pos: [[-3.3, 0.35, 0], [-1.1, -0.1, -0.4], [1.12, 0.4, 0.1], [3.3, -0.12, 0]] },
};

export function mount(el, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  const cv = renderer.domElement;
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;';
  el.appendChild(cv);
  const scene = new THREE.Scene(); scene.environment = makeEnv(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.6); rim.position.set(3, 2, -4); scene.add(rim);
  const under = new THREE.DirectionalLight(0xff2a33, 1.4); under.position.set(0, -4, 3); scene.add(under);
  const M = materials();
  const root = new THREE.Group(); scene.add(root);
  const glowTex = radTex([[0, 'rgba(255,42,51,0.55)'], [0.35, 'rgba(200,16,26,0.18)'], [1, 'rgba(200,16,26,0)']]);
  const items = [buildCards, buildScreen, buildSignals, buildTemple].map((fn, i) => {
    const holder = new THREE.Group(), bob = new THREE.Group(), spin = new THREE.Group();
    holder.add(bob); bob.add(spin); spin.add(fn(M)); root.add(holder);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
    halo.position.set(0, -0.1, -0.7); halo.scale.set(2.6, 2.6, 1); holder.add(halo);
    return { holder, bob, spin, halo, i };
  });
  const N = 140, pg = new THREE.BufferGeometry(), pa = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { pa[i * 3] = (Math.random() - 0.5) * 9; pa[i * 3 + 1] = (Math.random() - 0.5) * 8; pa[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1; seeds.push(Math.random() * 6.28); }
  pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.022, transparent: true, opacity: 0.45, depthWrite: false }));
  scene.add(dust);

  let preset = PRESETS.landscape, w = 1, h = 1;
  const resize = () => {
    w = opts.width || el.clientWidth; h = opts.height || el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    preset = (opts.layout === 'portrait' || (!opts.layout && w / h < 0.95)) ? PRESETS.portrait : PRESETS.landscape;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  const LABELS = opts.labels || ['Creatives', 'TradingView', 'Trading Signals', 'White-Label Academy'];
  const overlay = document.createElement('div'); overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;'; el.appendChild(overlay);
  const tags = LABELS.map((txt, i) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:7px;opacity:0;white-space:nowrap;will-change:transform,opacity;';
    d.innerHTML = '<span style="font-family:\'Fragment Mono\',monospace;font-size:10.5px;letter-spacing:0.22em;color:#E7131B;">0' + (i + 1) + '</span>' +
      '<span data-t style="font-family:\'DM Sans\',system-ui,sans-serif;font-weight:700;letter-spacing:-0.035em;line-height:1.05;background:linear-gradient(180deg,#FFFFFF 0%,#E4E4E9 34%,#8C8C94 58%,#C9C9CF 78%,#F4F4F7 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 12px rgba(0,0,0,0.75));">' + txt + '</span>' +
      '<span style="width:1px;height:18px;background:linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0));"></span>';
    d.setAttribute('aria-hidden', 'true');
    overlay.appendChild(d); return { d, t: d.querySelector('[data-t]'), k: 0, w: 0, fs: 0 };
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), box = new THREE.Box3(), tv = new THREE.Vector3();
  let hover = -1;
  const pick = (cx, cy) => {
    const rc = el.getBoundingClientRect(); if (!rc.width) return -1;
    ndc.set((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(items.map(it => it.spin), true); if (!hits.length) return -1;
    const o = hits[0].object;
    return items.findIndex(it => { let p = o; while (p) { if (p === it.spin) return true; p = p.parent; } return false; });
  };
  let tx = 0, ty = 0, px = 0, py = 0, drag = null;
  const onMove = e => {
    const r = el.getBoundingClientRect();
    if (drag) { tx = Math.max(-1, Math.min(1, drag.tx + (e.clientX - drag.x) / r.width * 2.4)); return; }
    if (e.pointerType !== 'mouse') return;
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    hover = pick(e.clientX, e.clientY); cv.style.cursor = hover >= 0 ? 'pointer' : '';
  };
  const onDown = e => { if (e.pointerType !== 'mouse') drag = { x: e.clientX, y: e.clientY, tx }; };
  const onUp = e => {
    if (drag && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) { const i = pick(e.clientX, e.clientY); hover = i === hover ? -1 : i; }
    drag = null; tx = 0; ty = 0;
  };
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp); cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hover = -1; if (!drag) { tx = 0; ty = 0; } });

  let visible = true; const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);
  let t = 0, last = performance.now(), raf;
  const step = dt => {
    t += dt;
    px = damp(px, tx, dt, drag ? 10 : 2.5); py = damp(py, ty, dt, 2.5);
    const P = preset, wob = reduce ? 0 : 1;
    const D = Math.max(7, P.fitW / (2 * Math.tan(15 * Math.PI / 180) * camera.aspect));
    camera.position.set(P.look[0] + px * 0.5, P.look[1] + 0.35 - py * 0.3, D); camera.lookAt(P.look[0], P.look[1], 0);
    root.rotation.y = px * 0.22;
    items.forEach((it, i) => {
      const [x, y, z] = P.pos[i];
      it.holder.position.set(x, y, z);
      const q = reduce ? 1 : backOut(clamp01((t - 0.15 - i * 0.16) / 1.1));
      const tg = tags[i]; tg.k = damp(tg.k, hover === i ? 1 : 0, dt, 7);
      const hk = tg.k * tg.k * (3 - 2 * tg.k);
      it.holder.scale.setScalar(P.scale * Math.max(0.001, q) * (1 + 0.07 * hk));
      it.bob.position.y = Math.sin(t * 0.9 + i * 1.3) * 0.07 * wob;
      it.spin.rotation.y = Math.sin(t * 0.33 + i * 1.9) * 0.38 * wob + (1 - clamp01(q)) * -1.2;
      it.spin.rotation.x = Math.sin(t * 0.27 + i) * 0.05 * wob;
      it.halo.material.opacity = 0.42 + 0.12 * Math.sin(t * 1.4 + i) + 0.4 * hk;
    });
    const a = dust.geometry.attributes.position;
    for (let i = 0; i < N; i++) { a.array[i * 3 + 1] += dt * 0.05 * wob; if (a.array[i * 3 + 1] > 4) a.array[i * 3 + 1] = -4; a.array[i * 3] += Math.sin(t * 0.4 + seeds[i]) * dt * 0.02 * wob; }
    a.needsUpdate = true;
    scene.updateMatrixWorld();
    const portrait = preset === PRESETS.portrait, fs = portrait ? 22 : 30;
    items.forEach((it, i) => {
      const tg = tags[i];
      if (tg.k < 0.005) { if (tg.d.style.opacity !== '0') tg.d.style.opacity = '0'; return; }
      box.setFromObject(it.spin); box.getCenter(tv); tv.y = box.max.y; tv.project(camera);
      const sx = (tv.x + 1) / 2 * w, e2 = tg.k * tg.k * (3 - 2 * tg.k);
      const sy = Math.max((1 - tv.y) / 2 * h, portrait ? 168 : 140);
      const half = Math.min(w / 2, (tg.w || (tg.w = tg.d.offsetWidth)) / 2 + 12), x = Math.max(half, Math.min(w - half, sx));
      if (tg.fs !== fs) { tg.t.style.fontSize = fs + 'px'; tg.fs = fs; tg.w = 0; }
      tg.d.style.opacity = e2.toFixed(3);
      tg.d.style.transform = 'translate(' + x + 'px,' + (sy - 6 - 10 * (1 - e2)) + 'px) translate(-50%,-100%)';
      tg.d.style.filter = 'blur(' + ((1 - e2) * 4).toFixed(2) + 'px)';
    });
    renderer.render(scene, camera);
  };
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || !w) return;
    step(dt);
  };
  raf = requestAnimationFrame(frame);
  return { snap(sec) { resize(); for (let k = 0; k < sec * 30; k++) step(1 / 30); return cv; }, destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointerup', onUp); renderer.dispose(); cv.remove(); overlay.remove(); } };
}

const stage = document.querySelector('[data-mt-stage]');
if (stage) {
  try {
    const labels = (stage.dataset.labels || '').split('|').filter(Boolean);
    mount(stage, labels.length === 4 ? { labels } : {});
  } catch (e) { /* no WebGL: the hero keeps its background, title and list */ }
}
