/* /partner-tools/ hero (Partner_Tools_Hero design; first TradeQuo_Marketing_Tools_Hero): the four tools as 3D
 * objects — creative cards, a TradingView screen, signal candles on a base, and IB Tools (three stacked tiles:
 * analytics, controls, a gear) or the academy temple — over the hero. The stage's data-theme="light" lights them
 * for a light page (darker silver, black candles, a soft red glow, dark names); data-ib puts IB Tools in the
 * temple's place. They pop in, bob, follow the mouse (parallax); each one's name stands above it, coming in as it lands;
 * hovering or tapping one lifts it a little and brightens its glow.
 * Phones and other tall screens (stage narrower than 0.95 of its height) get a 2×2 layout.
 * A name always sits above its object, never higher than 8px from the stage's top (3px on tall stages; opts.floor() px if given). Trading Signals and the Academy temple follow TradeQuo_Academy_Temple (the temple scaled to the size
 * the old one had). Loaded as a module by marketing.html; three.js is the site's own copy. The page's text stays as it is
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
function makeEnv(renderer, light, noRed) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: light ? 0x8e8e94 : 0x0c0c0e, side: THREE.BackSide })));
  const panel = (w, h, pos, rgb) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.setRGB(...rgb);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.lookAt(0, 0, 0); env.add(p);
  };
  panel(10, 3, [0, 7, 1], [7, 7, 7]);
  panel(1.6, 11, [-7, 1, 3], [4.5, 4.5, 4.7]);
  panel(1.0, 11, [7, 0, -1], [3, 3, 3.2]);
  panel(11, 4, [0, 1, 8], [0.9, 0.9, 0.95]);
  panel(4, 11, [-5, 0, -6], [1.6, 1.6, 1.7]);
  if (light) { panel(14, 5, [0, -5, 2], [0.02, 0.02, 0.025]); panel(3, 11, [6, 0, 4], [0.03, 0.03, 0.035]); }   /* dark below and aside: the metal reads on white */
  if (!noRed) { panel(12, 1.4, [0, -6.5, 3], [1.2, 0.05, 0.07]); panel(1.4, 5, [6.5, -1.5, 4], [0.9, 0.03, 0.05]); }
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
function materials(light) {
  return {
    lacquer: new THREE.MeshPhysicalMaterial({ color: 0x09090b, metalness: 0.1, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.1, envMapIntensity: 1.5 }),
    silver: new THREE.MeshStandardMaterial({ color: light ? 0xbfbfc6 : 0xe4e4ea, metalness: 0.92, roughness: light ? 0.2 : 0.24, envMapIntensity: 1.45 }),
    cellaGlow: new THREE.MeshStandardMaterial({ color: 0x220205, emissive: 0x9a0a12, emissiveIntensity: 0.9, roughness: 0.4 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xf4f4f7, metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 }),
    sheen: new THREE.MeshBasicMaterial({ map: sheenTex(), transparent: true, depthWrite: false }),
    graphite: new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 1, roughness: 0.28, envMapIntensity: 1.1 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xd60f19, emissive: 0x5a0006, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff2a33 }),
    /* Trading Signals and the temple (TradeQuo_Academy_Temple): their own pearl and ruby, the base's lacquer and chrome */
    pearl2: new THREE.MeshPhysicalMaterial({ color: light ? 0x141417 : 0xffffff, metalness: 0.12, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.25 }),
    ruby2: new THREE.MeshPhysicalMaterial({ color: 0xd60f19, emissive: 0x380004, metalness: 0.15, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
    baseLacquer: new THREE.MeshPhysicalMaterial({ color: 0x060607, metalness: 0.1, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 }),
    baseChrome: new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08, envMapIntensity: 1.7 }),
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
  inner.add(new THREE.Mesh(base, [M.baseLacquer, M.baseChrome]));
  const top = 0.144;
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(rr(1.2, 0.46, 0.07), 12), M.chrome); plate.rotation.x = -Math.PI / 2; plate.position.y = top + 0.001; plate.scale.set(1, 1, 1); inner.add(plate);
  const plate2 = new THREE.Mesh(new THREE.ShapeGeometry(rr(1.18, 0.44, 0.065), 12), M.lacquer); plate2.rotation.x = -Math.PI / 2; plate2.position.y = top + 0.002; inner.add(plate2);
  const D = [[0.07, 0.3, 0.0, 0.47], [0.1, 0.46, 0.0, 0.72], [0.09, 0.28, 0.0, 0.49], [0.14, 0.56, 0.0, 0.86], [0.16, 0.4, 0.0, 0.7], [0.2, 0.66, 0.0, 1.04]];
  D.forEach(([b, h, lo, hi], i) => {
    const x = -0.45 + i * 0.18, mat = i % 2 ? M.pearl2 : M.ruby2;
    const bg = new THREE.ExtrudeGeometry(rr(0.104, h - 0.016, 0.012), { depth: 0.084, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 4, curveSegments: 6 });
    bg.translate(0, 0, -0.042);
    const body = new THREE.Mesh(bg, mat); body.position.set(x, top + b + h / 2, 0); inner.add(body);
    const wk = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, hi - lo, 16), mat); wk.position.set(x, top + (lo + hi) / 2, 0); inner.add(wk);
    [hi].forEach(y => { const t = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 10), M.chrome); t.position.set(x, top + y, 0); inner.add(t); });
  });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.014, 0.01), M.red); strip.position.set(0, 0.075, 0.293); inner.add(strip);
  inner.position.y = -0.62;
  g.rotation.set(0.3, -0.55, 0);
  return g;
}

/* static parts merged into one mesh per material: positions, normals and indices copied in place
   (the design's version expanded every part to a non-indexed copy first, ~170ms for the temple) */
function mergeStatic(src) {
  src.updateMatrixWorld(true);
  const buckets = new Map(), keep = [];
  src.traverse(o => {
    if (o.isLight || (o.isMesh && Array.isArray(o.material))) { keep.push(o); return; }
    if (!o.isMesh) return;
    if (!buckets.has(o.material)) buckets.set(o.material, []); buckets.get(o.material).push(o);
  });
  const out = new THREE.Group(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  buckets.forEach((ms, mat) => {
    let nv = 0, ni = 0;
    ms.forEach(o => { const g = o.geometry; if (!g.attributes.normal) g.computeVertexNormals(); nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let ov = 0, oi = 0;
    ms.forEach(o => {
      const g = o.geometry, p = g.attributes.position, n = g.attributes.normal, mw = o.matrixWorld; nm.getNormalMatrix(mw);
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(mw); P[(ov + k) * 3] = v.x; P[(ov + k) * 3 + 1] = v.y; P[(ov + k) * 3 + 2] = v.z;
        v.fromBufferAttribute(n, k).applyMatrix3(nm).normalize(); N[(ov + k) * 3] = v.x; N[(ov + k) * 3 + 1] = v.y; N[(ov + k) * 3 + 2] = v.z;
      }
      if (g.index) { const a = g.index.array; for (let k = 0; k < a.length; k++) I[oi + k] = a[k] + ov; oi += a.length; }
      else { for (let k = 0; k < p.count; k++) I[oi + k] = k + ov; oi += p.count; }
      ov += p.count;
    });
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(P, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(N, 3)); bg.setIndex(new THREE.BufferAttribute(I, 1));
    bg.computeBoundingSphere(); bg.computeBoundingBox(); out.add(new THREE.Mesh(bg, mat));
  });
  keep.forEach(o => { o.matrixWorld.decompose(o.position, o.quaternion, o.scale); out.add(o); });
  return out;
}

function ionicShaft(rb, rt, h, flutes, per = 10) {
  const geo = new THREE.CylinderGeometry(1, 1, h, flutes * per, 8, true), p = geo.attributes.position;
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k), y = p.getY(k), z = p.getZ(k), yn = y / h + 0.5;
    const u = ((flutes * Math.atan2(x, z) / (2 * Math.PI)) % 1 + 1) % 1;
    let d = 0; if (u > 0.1 && u < 0.9) { const v = (u - 0.1) / 0.8 * 2 - 1; d = Math.sqrt(1 - v * v); }
    const r = (rb + (rt - rb) * Math.pow(yn, 1.3) + 0.0018 * Math.sin(Math.PI * yn)) * (1 - 0.08 * d);
    p.setXYZ(k, x * r, y, z * r);
  }
  geo.computeVertexNormals(); return geo;
}

function buildTemple(M, q = 1) {
  /* segments of the round parts: q = 1 on wide stages (already about half the design's: the parts are a few
     pixels big), 0.6 on tall ones (phones) */
  const S = (n, min) => Math.max(min, Math.round(n * q));
  const g = new THREE.Group(), inner = new THREE.Group();
  const put = (geo, mat, x, y, z, parent = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const box = (w, h, d, x, y, z, mat = M.silver, parent) => put(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  // crepidoma
  box(1.42, 0.02, 0.86, 0, -0.01, 0, M.graphite);
  [[1.36, 0.8, 0], [1.25, 0.69, 0.07], [1.14, 0.58, 0.14]].forEach(([w, d, y]) => { box(w, 0.062, d, 0, y + 0.031, 0); box(w + 0.012, 0.008, d + 0.012, 0, y + 0.066, 0); });
  // cella with ashlar courses, antae, door
  const cella = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.6, 0.3), [M.graphite, M.graphite, M.graphite, M.graphite, M.cellaGlow, M.graphite]); cella.position.set(0, 0.52, -0.01); inner.add(cella);
  for (let y = 0.27; y < 0.8; y += 0.045) box(0.66, 0.0028, 0.003, 0, y, 0.1415, M.graphite);
  [-1, 1].forEach(sd => { box(0.05, 0.56, 0.03, sd * 0.345, 0.5, 0.15); box(0.062, 0.016, 0.04, sd * 0.345, 0.786, 0.15); box(0.062, 0.016, 0.04, sd * 0.345, 0.228, 0.15); });
  box(0.2, 0.4, 0.004, 0, 0.42, 0.145, M.red);
  box(0.016, 0.42, 0.012, -0.108, 0.43, 0.149, M.chrome); box(0.016, 0.42, 0.012, 0.108, 0.43, 0.149, M.chrome);
  box(0.26, 0.018, 0.016, 0, 0.642, 0.149, M.chrome); box(0.29, 0.008, 0.026, 0, 0.655, 0.149, M.chrome);
  // ionic columns
  const shaft = ionicShaft(0.042, 0.035, 0.53, 24, S(6, 4));
  const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), S(seg, Math.min(seg, 10)));
  const baseG = lathe([[0, 0], [0.056, 0], [0.058, 0.004], [0.056, 0.009], [0.049, 0.011], [0.046, 0.0155], [0.049, 0.019], [0.051, 0.022], [0.048, 0.026], [0.043, 0.028], [0, 0.028]]);
  const plinth = new THREE.BoxGeometry(0.118, 0.01, 0.118);
  const astragal = new THREE.TorusGeometry(0.0365, 0.0042, S(6, 4), S(32, 16)); astragal.rotateX(Math.PI / 2);
  const echinus = lathe([[0, 0], [0.037, 0], [0.045, 0.006], [0.05, 0.013], [0.051, 0.016], [0, 0.016]]);
  const block = new THREE.BoxGeometry(0.1, 0.022, 0.096), abacus = new THREE.BoxGeometry(0.122, 0.01, 0.122);
  const pulv = lathe([[0.022, -0.048], [0.019, -0.03], [0.0155, -0.008], [0.0145, 0], [0.0155, 0.008], [0.019, 0.03], [0.022, 0.048]], 28); pulv.rotateX(Math.PI / 2);
  const disc = new THREE.CylinderGeometry(0.0225, 0.0225, 0.004, S(20, 10)); disc.rotateX(Math.PI / 2);
  const spiral = sx => { const pts = []; for (let k = 0; k <= 90; k++) { const t = k / 90, a = Math.PI / 2 + sx * t * 2.6 * Math.PI * 2, r = 0.0205 * (1 - t * 0.8); pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), S(64, 24), 0.0024, S(5, 4), false); };
  const spR = spiral(1), spL = spiral(-1), eye = new THREE.SphereGeometry(0.0052, S(8, 6), S(6, 4)), channel = new THREE.BoxGeometry(0.056, 0.012, 0.005);
  const col = (x, z) => {
    put(plinth, M.silver, x, 0.215, z); put(baseG, M.silver, x, 0.22, z); put(shaft, M.silver, x, 0.513, z);
    put(astragal, M.silver, x, 0.779, z); put(echinus, M.silver, x, 0.781, z); put(block, M.silver, x, 0.808, z); put(abacus, M.silver, x, 0.824, z);
    [-1, 1].forEach(sx => {
      put(pulv, M.silver, x + sx * 0.05, 0.799, z);
      [-1, 1].forEach(sz => {
        const fz = z + sz * 0.05;
        put(disc, M.silver, x + sx * 0.05, 0.799, fz);
        const sp = put(sx > 0 ? spR : spL, M.silver, x + sx * 0.05, 0.799, fz + sz * 0.003); if (sz < 0) sp.rotation.y = Math.PI;
        put(eye, M.silver, x + sx * 0.05, 0.799, fz + sz * 0.003);
      });
    });
    [-1, 1].forEach(sz => put(channel, M.silver, x, 0.811, z + sz * 0.049));
  };
  for (let k = 0; k < 6; k++) { const x = -0.45 + k * 0.18; col(x, 0.21); col(x, -0.21); }
  col(-0.45, 0); col(0.45, 0);
  // architrave: three fasciae + bead moulding
  box(1.04, 0.016, 0.54, 0, 0.837, 0); box(1.048, 0.017, 0.548, 0, 0.8535, 0); box(1.056, 0.019, 0.556, 0, 0.8715, 0); box(1.066, 0.007, 0.566, 0, 0.8845, 0);
  const bead = new THREE.SphereGeometry(0.0034, S(8, 6), S(6, 4));
  for (let x = -0.52; x <= 0.521; x += 0.0145) put(bead, M.silver, x, 0.8915, 0.2735);
  // frieze with meander relief
  box(1.04, 0.056, 0.54, 0, 0.922, 0);
  const seg = (o, x1, y1, x2, y2) => { const L = Math.hypot(x2 - x1, y2 - y1) + 0.0035, horiz = Math.abs(y2 - y1) < 1e-6; box(horiz ? L : 0.0035, horiz ? 0.0035 : L, 0.004, (x1 + x2) / 2, (y1 + y2) / 2, 0.002, M.silver, o); };
  const meander = (cx, cz, len, rotY) => {
    const o = new THREE.Object3D(); o.position.set(cx, 0.922, cz); o.rotation.y = rotY; inner.add(o);
    const n = Math.round(len / 0.044), uw = len / n, H = 0.036, X = u => -len / 2 + u * uw, Y = v => -H / 2 + v * H;
    seg(o, -len / 2, Y(0), len / 2, Y(0)); seg(o, -len / 2, Y(1), len / 2, Y(1));
    for (let k = 0; k < n; k++) { const U = u => X(k + u); seg(o, U(0.08), Y(0), U(0.08), Y(0.78)); seg(o, U(0.08), Y(0.78), U(0.72), Y(0.78)); seg(o, U(0.72), Y(0.78), U(0.72), Y(0.3)); seg(o, U(0.72), Y(0.3), U(0.36), Y(0.3)); }
  };
  meander(0, 0.27, 1.0, 0); meander(0.52, 0, 0.5, Math.PI / 2); meander(-0.52, 0, 0.5, -Math.PI / 2);
  // egg-and-dart + dentils
  box(1.05, 0.012, 0.55, 0, 0.956, 0);
  const egg = new THREE.SphereGeometry(1, S(8, 6), S(6, 4));
  const eggAt = (x, z, ry) => { const m = put(egg, M.silver, x, 0.956, z); m.scale.set(0.0085, 0.0065, 0.0045); m.rotation.y = ry; };
  for (let x = -0.51; x <= 0.511; x += 0.0204) eggAt(x, 0.275, 0);
  for (let z = -0.255; z <= 0.256; z += 0.0204) { eggAt(0.525, z, Math.PI / 2); eggAt(-0.525, z, Math.PI / 2); }
  box(1.06, 0.014, 0.56, 0, 0.969, 0);
  const den = new THREE.BoxGeometry(0.012, 0.014, 0.012);
  for (let x = -0.52; x <= 0.521; x += 0.022) put(den, M.silver, x, 0.969, 0.283);
  for (let z = -0.264; z <= 0.265; z += 0.022) [-1, 1].forEach(sd => put(den, M.silver, sd * 0.533, 0.969, z));
  box(1.16, 0.03, 0.66, 0, 0.991, 0); box(1.18, 0.01, 0.68, 0, 1.011, 0);
  // antefixes along side eaves
  const ante = lathe([[0, 0], [0.008, 0], [0.005, 0.008], [0.009, 0.018], [0.004, 0.028], [0, 0.031]], 16);
  for (let z = -0.3; z <= 0.301; z += 0.06) [-1, 1].forEach(sd => { const m = put(ante, M.silver, sd * 0.585, 1.016, z); m.scale.set(1, 1, 0.45); m.rotation.y = Math.PI / 2; });
  // pediment
  const y0 = 1.016, run = 0.6, rise = 0.26, a = Math.atan2(rise, run), L = Math.hypot(run, rise);
  const ts = new THREE.Shape(); ts.moveTo(-0.53, 0); ts.lineTo(0.53, 0); ts.lineTo(0, 0.23); ts.closePath();
  const tg = new THREE.ExtrudeGeometry(ts, { depth: 0.54, bevelEnabled: false }); tg.translate(0, y0, -0.27); inner.add(new THREE.Mesh(tg, M.silver));
  const rib = new THREE.CylinderGeometry(0.0058, 0.0058, L + 0.02, S(10, 6));
  [-1, 1].forEach(sd => {
    const nx = sd < 0 ? -Math.sin(a) : Math.sin(a), ny = Math.cos(a), dx = -sd * Math.cos(a), dy = Math.sin(a);
    const at = (off, along) => [sd * run / 2 + nx * off + dx * along, y0 + rise / 2 + ny * off + dy * along];
    const slab = (th, dp, off) => { const [x, y] = at(off, 0); const m = box(L + 0.03, th, dp, x, y, 0); m.rotation.z = -sd * a; };
    slab(0.03, 0.68, 0.022); slab(0.012, 0.7, 0.001); slab(0.012, 0.6, -0.012);
    for (let k = 1; k < 24; k++) { const [x, y] = at(-0.025, -L / 2 + k * L / 24); const d = put(den, M.silver, x, y, 0.286); d.rotation.z = -sd * a; }
    for (let z = -0.32; z <= 0.321; z += 0.032) { const [x, y] = at(0.044, 0); const r = put(rib, M.silver, x, y, z); r.rotation.z = -sd * (a - Math.PI / 2); }
  });
  const ridge = new THREE.CylinderGeometry(0.012, 0.012, 0.7, S(16, 10)); ridge.rotateX(Math.PI / 2); put(ridge, M.silver, 0, y0 + rise + 0.045, 0);
  // medallion + acroteria
  const ring = new THREE.TorusGeometry(0.048, 0.006, S(10, 6), S(40, 24)); put(ring, M.silver, 0, y0 + 0.09, 0.272);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), M.ruby2); mark.position.set(0, y0 + 0.09, 0.275); mark.rotation.z = Math.PI / 4; inner.add(mark);
  const urn = lathe([[0, 0], [0.024, 0], [0.024, 0.008], [0.012, 0.012], [0.02, 0.026], [0.024, 0.04], [0.014, 0.056], [0.018, 0.064], [0, 0.068]], 28);
  put(urn, M.silver, 0, y0 + rise + 0.05, 0.31);
  [-1, 1].forEach(sd => { box(0.044, 0.02, 0.044, sd * 0.575, y0 + 0.012, 0.31); const u = put(urn, M.silver, sd * 0.575, y0 + 0.022, 0.31); u.scale.setScalar(0.75); });
  const pl = new THREE.PointLight(0xff2030, 1.3, 1.0, 1.6); pl.position.set(0, 0.48, 0.24); inner.add(pl);
  inner.position.y = -0.64;
  const body = mergeStatic(inner);
  /* the old temple's size and place (the design's is about a tenth larger) */
  body.scale.setScalar(0.9); body.position.y = -0.027;
  /* hover tests a plain box instead of the 200k-triangle model */
  body.children.forEach(m => { if (m.isMesh) m.raycast = () => {}; });
  const bb = new THREE.Box3().setFromObject(inner), sz = new THREE.Vector3(), cc = new THREE.Vector3(); bb.getSize(sz); bb.getCenter(cc);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(sz.x, sz.y, sz.z), M.red); hit.position.copy(cc); hit.visible = false; body.add(hit);
  g.add(body);
  g.rotation.set(0.12, -0.5, 0);
  return g;
}

/* IB Tools (Partner_Tools_Hero): three rounded tiles stacked at an angle — analytics (silver bars, the last one
   ruby), controls (a lacquer track with a ruby knob, two graphite lines), a tool (a chrome gear with a ruby hub) */
function buildIB(M) {
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const S = 0.9, tileGeo = new THREE.ExtrudeGeometry(rr(S, S, 0.16), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 18 });
  tileGeo.translate(0, 0, -0.025);
  const tile = (mat, y, rz) => { const t = new THREE.Group(); t.add(new THREE.Mesh(tileGeo, [mat, M.chrome])); t.position.set(0, y, 0); t.rotation.set(-Math.PI / 2, 0, rz); inner.add(t); return t; };
  const add = (parent, geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const top = 0.038;
  const a = tile(M.lacquer, 0, 0);
  [0.16, 0.26, 0.2, 0.34, 0.44].forEach((h, i) => add(a, new THREE.BoxGeometry(0.075, h, 0.03), i === 4 ? M.ruby2 : M.silver, -0.24 + i * 0.12, -0.25 + h / 2, top + 0.015));
  add(a, new THREE.BoxGeometry(0.62, 0.008, 0.006), M.graphite, 0, -0.27, top + 0.003);
  const b = tile(M.silver, 0.32, 0.06);
  const track = new THREE.ExtrudeGeometry(rr(0.36, 0.16, 0.08), { depth: 0.03, bevelEnabled: false, curveSegments: 16 });
  add(b, track, M.baseLacquer, -0.08, 0.16, top);
  add(b, new THREE.SphereGeometry(0.065, 32, 24), M.ruby2, 0.02, 0.16, top + 0.045);
  [0, 1].forEach(k => add(b, new THREE.BoxGeometry(k ? 0.36 : 0.52, 0.04, 0.012), M.graphite, -0.32 + (k ? 0.18 : 0.26), -0.08 - k * 0.12, top + 0.006));
  const c = tile(M.baseLacquer, 0.64, -0.05);
  const gear = new THREE.Group(); gear.position.set(0, 0, top + 0.03); c.add(gear);
  gear.add(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 20, 64), M.chrome));
  for (let i = 0; i < 8; i++) { const ang = i / 8 * Math.PI * 2, tth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.08), M.chrome); tth.position.set(Math.cos(ang) * 0.24, Math.sin(ang) * 0.24, 0); tth.rotation.z = ang; gear.add(tth); }
  add(gear, new THREE.CylinderGeometry(0.07, 0.07, 0.06, 32), M.ruby2, 0, 0, 0.01).rotation.x = Math.PI / 2;
  inner.position.y = -0.34;
  g.rotation.set(0.55, -0.6, 0);
  return g;
}

const PRESETS = {
  portrait: { fitW: 3.25, look: [0, -0.05, 0], scale: 0.84, pos: [[-0.72, 1.12, 0.1], [0.74, 0.62, -0.35], [-0.7, -0.62, 0.2], [0.72, -1.12, 0]] },
  landscape: { fitW: 8.7, look: [0, 0.05, 0], scale: 1.12, pos: [[-3.3, 0.35, 0], [-1.1, -0.1, -0.4], [1.12, 0.4, 0.1], [3.3, -0.12, 0]] },
};

export function mount(el, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const light = opts.theme === 'light';
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = light ? 1.1 : 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  const cv = renderer.domElement;
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:pan-y;';
  el.appendChild(cv);
  const scene = new THREE.Scene(); scene.environment = makeEnv(renderer, light);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 2.6); rim.position.set(3, 2, -4); scene.add(rim);
  const under = new THREE.DirectionalLight(0xff2a33, light ? 0.7 : 1.4); under.position.set(0, -4, 3); scene.add(under);
  const M = materials(light); M.baseLacquer.envMap = M.baseChrome.envMap = makeEnv(renderer, light, true);
  const root = new THREE.Group(); scene.add(root);
  const glowTex = light ? radTex([[0, 'rgba(231,19,27,0.32)'], [0.4, 'rgba(231,19,27,0.08)'], [1, 'rgba(231,19,27,0)']])
    : radTex([[0, 'rgba(255,42,51,0.55)'], [0.35, 'rgba(200,16,26,0.18)'], [1, 'rgba(200,16,26,0)']]);
  const tall = (opts.layout === 'portrait' || (!opts.layout && el.clientWidth / Math.max(1, el.clientHeight) < 0.95));
  const items = [buildCards, buildScreen, buildSignals, opts.ibTools ? buildIB : buildTemple].map((fn, i) => {
    const holder = new THREE.Group(), bob = new THREE.Group(), spin = new THREE.Group();
    holder.add(bob); bob.add(spin); spin.add(fn(M, tall ? 0.6 : 1)); root.add(holder);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: light ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: 0.55 }));
    halo.position.set(0, -0.1, -0.7); halo.scale.set(2.6, 2.6, 1); holder.add(halo);
    return { holder, bob, spin, halo, i };
  });
  const N = 140, pg = new THREE.BufferGeometry(), pa = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { pa[i * 3] = (Math.random() - 0.5) * 9; pa[i * 3 + 1] = (Math.random() - 0.5) * 8; pa[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1; seeds.push(Math.random() * 6.28); }
  pg.setAttribute('position', new THREE.BufferAttribute(pa, 3));
  const dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: light ? 0x1a1a1e : 0xffffff, size: 0.022, transparent: true, opacity: light ? 0.28 : 0.45, depthWrite: false }));
  scene.add(dust);

  let preset = PRESETS.landscape, w = 1, h = 1, minY = 0, nameK = 1;   /* nameK: the names' size factor, below 1 where long names would meet */
  const resize = () => {
    w = opts.width || el.clientWidth; h = opts.height || el.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    preset = (opts.layout === 'portrait' || (!opts.layout && w / h < 0.95)) ? PRESETS.portrait : PRESETS.landscape;
    camera.updateProjectionMatrix();
    minY = opts.floor ? opts.floor() : (preset === PRESETS.portrait ? 3 : 8);   /* phones: 5px more room above the first row */
    nameK = 1;
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();

  const LABELS = opts.labels || ['Creatives', 'TradingView', 'Trading Signals', 'White-Label Academy'];
  const overlay = document.createElement('div'); overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;'; el.appendChild(overlay);
  const tags = LABELS.map((txt, i) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:7px;opacity:0;white-space:nowrap;will-change:transform,opacity;';
    d.innerHTML = '<span style="font-family:\'Fragment Mono\',monospace;font-size:11px;letter-spacing:0.22em;color:#E7131B;">0' + (i + 1) + '</span>' +
      '<span data-t style="font-family:\'DM Sans\',system-ui,sans-serif;font-weight:760;letter-spacing:-0.022em;line-height:1.05;padding:0 .06em .2em;margin:0 -.06em -.2em;background:' + (light ? 'linear-gradient(180deg,#3A3A40 0%,#0A0A0B 40%,#55555C 62%,#1A1A1E 82%,#0A0A0B 100%)' : 'linear-gradient(180deg,#FFFFFF 0%,#F3F3F6 36%,#BDBDC4 60%,#E2E2E7 80%,#FFFFFF 100%)') + ';-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 2px 12px ' + (light ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)') + ');">' + txt + '</span>' +
      '<span style="width:1px;height:18px;background:' + (light ? 'linear-gradient(180deg,rgba(10,10,11,0.45),rgba(10,10,11,0))' : 'linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))') + ';"></span>';
    d.setAttribute('aria-hidden', 'true');
    overlay.appendChild(d); return { d, t: d.querySelector('[data-t]'), k: 0, v: 0, w: 0, h: 0, fs: 0, op: '', fl: '' };
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), box = new THREE.Box3(), tv = new THREE.Vector3(), c0 = new THREE.Vector3();
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
      tg.v = reduce ? 1 : damp(tg.v, q > 0.85 ? 1 : 0, dt, 4);   /* the name: in as the object lands, then it stays */
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
    /* the name goes above its object, no higher than the floor */
    const portrait = preset === PRESETS.portrait, fs = Math.round((portrait ? 20 : 30) * nameK);
    const boxes = [];
    items.forEach((it, i) => {
      const tg = tags[i];
      if (tg.v < 0.005) { if (tg.op !== '0') { tg.d.style.opacity = tg.op = '0'; } return; }
      if (tg.fs !== fs) { tg.t.style.fontSize = fs + 'px'; tg.fs = fs; tg.w = 0; }
      if (!tg.w) { tg.w = tg.d.offsetWidth; tg.h = tg.d.offsetHeight; }
      box.setFromObject(it.spin); box.getCenter(c0);
      tv.copy(c0).setY(box.max.y).project(camera);
      const sx = (tv.x + 1) / 2 * w, top = (1 - tv.y) / 2 * h, e2 = tg.v * tg.v * (3 - 2 * tg.v);
      const half = Math.min(w / 2, tg.w / 2 + 12), x = Math.max(half, Math.min(w - half, sx)), drift = 10 * (1 - e2);
      const op = e2.toFixed(3), fl = e2 > 0.995 ? 'none' : 'blur(' + ((1 - e2) * 4).toFixed(2) + 'px)';
      if (op !== tg.op) tg.d.style.opacity = tg.op = op;
      if (fl !== tg.fl) tg.d.style.filter = tg.fl = fl;
      const y = Math.max(top, minY + tg.h + 6) - 6 - drift;
      tg.d.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-100%)';
      boxes.push({ l: x - tg.w / 2, r: x + tg.w / 2, t: y - tg.h, b: y });
    });
    /* all four names stand at once: where two would meet (long names, narrow screens), they all step down a size.
       Judged only with the objects landed and the scene at rest (not mid pop-in, not turned by the mouse), so the
       names shrink only as far as they must */
    const atRest = t > 2.6 && Math.abs(px) < 0.04 && Math.abs(py) < 0.04;
    if (atRest && nameK > 0.55 && boxes.some((a, i) => boxes.some((c, j) => j > i && a.l < c.r + 8 && c.l < a.r + 8 && a.t < c.b && c.t < a.b))) nameK *= 0.96;
    renderer.render(scene, camera);
  };
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || !w) return;
    step(dt);
  };
  raf = requestAnimationFrame(frame);
  return { show(i) { hover = i; }, snap(sec) { resize(); for (let k = 0; k < sec * 30; k++) step(1 / 30); return cv; }, destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); removeEventListener('pointerup', onUp); renderer.dispose(); cv.remove(); overlay.remove(); } };
}

const stage = document.querySelector('[data-mt-stage]');
if (stage) {
  try {
    const labels = (stage.dataset.labels || '').split('|').filter(Boolean);
    const opts = {};
    if (labels.length === 4) opts.labels = labels;
    if (stage.dataset.theme) opts.theme = stage.dataset.theme;
    if ('ib' in stage.dataset) opts.ibTools = true;
    stage.mtHero = mount(stage, opts);   /* show(i) names an object, as a hover would */
  } catch (e) { /* no WebGL: the hero keeps its background, title and list */ }
}
