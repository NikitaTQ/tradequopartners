/* programs/: the 3D platform of the "Who it's for" block (TradeQuo_Partner_Flow design).
 * A chrome-framed platform with a glass slab; the active persona's emblem floats above it. The page
 * (startWhoFlow in landing.js) owns the persona rows and the scroll: it calls api.pick / api.setFlip /
 * api.snapshot / api.hide, and hears about stage clicks through window.__pfWhoSet. Loaded only when the
 * scene comes near; three.js is the site's own copy. Without WebGL the stage stays empty and the page's
 * scroll part runs on its own. */
import * as THREE from '../../vendor/three@0.184.0/three.module.min.js';

const V = THREE.Vector3;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp01 = x => Math.min(1, Math.max(0, x));
const damp = (a, b, dt, k) => a + (b - a) * (1 - Math.exp(-dt * k));

function makeEnv(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x060607, side: THREE.BackSide })));
  const box = (w, h, pos, rgb) => {
    const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); m.color.setRGB(...rgb);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); p.position.set(...pos); p.lookAt(0, 0, 0); env.add(p);
  };
  box(6, 2.2, [0, 7, 0.5], [8, 8, 8]); box(7, 2.5, [0, 3, 7], [3.4, 3.4, 3.5]); box(8, 1.2, [0, 2, -7], [5, 5, 5]);
  box(0.8, 9, [-7, 0.5, 2.5], [4.4, 4.4, 4.6]); box(0.5, 9, [7, 0.5, -1.5], [2.6, 2.6, 2.7]); box(12, 1.2, [0, -6.5, 2], [0.32, 0.02, 0.025]);
  const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(env, 0.02).texture; pm.dispose();
  return tex;
}
function rig(scene) {
  const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(-3, 5, 4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.9); fill.position.set(4, 1.5, 3); scene.add(fill);
  const back = new THREE.DirectionalLight(0xffffff, 3.2); back.position.set(0.5, 3, -5); scene.add(back);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222226, 0.6));
  scene.traverse(o => { if (o.isLight) o.layers.enableAll(); });
}
const radTex = stops => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
};
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const _up = new V(0, 1, 0);
function rod(a, b, r, mat) {
  const d = new V().subVectors(b, a), len = d.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), mat);
  m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(_up, d.normalize());
  return m;
}

function build(A) {
  const { scene, camera } = A;
  camera.fov = 24;
  const gB = new THREE.MeshPhysicalMaterial({ color: 0xBFC4D0, roughness: 0.14, transparent: true, opacity: 0.32, side: THREE.BackSide, depthWrite: false, envMapIntensity: 1.7 });
  const gF = new THREE.MeshPhysicalMaterial({ color: 0xF8F9FC, emissive: 0x7e808a, roughness: 0.04, transparent: true, opacity: 0.34, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, iridescence: 0.65, iridescenceIOR: 1.32, iridescenceThicknessRange: [220, 620], depthWrite: false, envMapIntensity: 3 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, emissive: 0x8a8a92, metalness: 0.85, roughness: 0.12 });
  const brushed = new THREE.MeshStandardMaterial({ color: 0xF2F2F6, emissive: 0x7a7a82, metalness: 0.7, roughness: 0.3 });
  const frameM = new THREE.MeshStandardMaterial({ color: 0xFAFAFD, emissive: 0x9a9aa4, metalness: 1, roughness: 0.16 });
  const dark = new THREE.MeshPhysicalMaterial({ color: 0xF4F4F7, emissive: 0x6a6a72, metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05 });
  const ruby = new THREE.MeshPhysicalMaterial({ color: 0xD8101A, emissive: 0x3a0004, metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
  const glass = (geo, p) => { const b = new THREE.Mesh(geo, gB); b.renderOrder = 2; const f = new THREE.Mesh(geo, gF); f.renderOrder = 4; p.add(b, f); };
  const add = (geo, mat, p, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); p.add(m); return m; };

  const W = 0.86, H = 1.22, D = 0.16, Y0 = 0.16;
  const slab = new THREE.ExtrudeGeometry(roundedRect(W, H, 0.1), { depth: D - 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 16 });
  slab.translate(0, H / 2 + Y0, -(D - 0.04) / 2);
  const plinthGeo = new THREE.ExtrudeGeometry(roundedRect(W + 0.12, 0.3, 0.06), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 10 });
  plinthGeo.rotateX(-Math.PI / 2); plinthGeo.translate(0, 0.012, 0);
  const lipGeo = new THREE.BoxGeometry(W + 0.02, 0.05, 0.035);
  const fr = roundedRect(W + 0.03, H + 0.03, 0.115); fr.holes.push(roundedRect(W + 0.004, H + 0.004, 0.103));
  const frameGeo = new THREE.ExtrudeGeometry(fr, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 2, curveSegments: 18 });
  frameGeo.translate(0, H / 2 + Y0, -0.006);
  const glowTex = radTex([[0, 'rgba(231,19,27,0.42)'], [0.4, 'rgba(231,19,27,0.12)'], [1, 'rgba(231,19,27,0)']]);
  const shTex = radTex([[0, 'rgba(0,0,0,0.6)'], [0.55, 'rgba(0,0,0,0.2)'], [1, 'rgba(0,0,0,0)']]);

  const EMB = [
    // educators: mortarboard with ruby tassel
    g => {
      const cap = new THREE.CylinderGeometry(0.13, 0.15, 0.1, 48, 1, true); add(cap, chrome, g, 0, -0.04, 0);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.01, 48), brushed, g, 0, 0.01, 0);
      const board = new THREE.ExtrudeGeometry(roundedRect(0.4, 0.4, 0.02), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2 });
      board.rotateX(-Math.PI / 2); const b = add(board, chrome, g, 0, 0.02, 0); b.rotation.y = Math.PI / 4;
      add(new THREE.SphereGeometry(0.02, 20, 14), brushed, g, 0, 0.05, 0);
      g.add(rod(new V(0, 0.05, 0), new V(0.2, 0.03, 0.02), 0.004, brushed));
      g.add(rod(new V(0.2, 0.03, 0.02), new V(0.2, -0.13, 0.02), 0.004, brushed));
      add(new THREE.SphereGeometry(0.032, 24, 16), ruby, g, 0.2, -0.15, 0.02);
      g.rotation.x = 0.5;
    },
    // signal groups: antenna broadcasting
    g => {
      g.add(rod(new V(0, -0.22, 0), new V(0, 0.08, 0), 0.012, chrome));
      add(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 40), brushed, g, 0, -0.225, 0);
      add(new THREE.SphereGeometry(0.04, 28, 18), ruby, g, 0, 0.11, 0);
      [0.11, 0.18, 0.25].forEach(r => [-1, 1].forEach(sx => {
        const a = add(new THREE.TorusGeometry(r, 0.013, 14, 48, 1.2), chrome, g, 0, 0.11, 0);
        a.rotation.z = sx > 0 ? -0.6 : Math.PI - 0.6;
      }));
    },
    // content creators: lens / play
    g => {
      add(new THREE.TorusGeometry(0.21, 0.028, 20, 80), chrome, g);
      add(new THREE.TorusGeometry(0.165, 0.009, 12, 80), brushed, g);
      const ds = new THREE.CylinderGeometry(0.16, 0.16, 0.02, 64); ds.rotateX(Math.PI / 2); add(ds, dark, g, 0, 0, -0.012);
      const tri = new THREE.Shape(); tri.moveTo(-0.045, -0.07); tri.lineTo(0.08, 0); tri.lineTo(-0.045, 0.07); tri.closePath();
      const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 3 });
      add(tg, ruby, g, 0.005, 0, -0.005);
    },
    // communities & IB teams: three linked nodes around a ruby core
    g => {
      const P = [0, 1, 2].map(k => { const a = Math.PI / 2 + k * Math.PI * 2 / 3; return new V(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0); });
      P.forEach((p, k) => { add(new THREE.SphereGeometry(0.055, 32, 20), chrome, g, p.x, p.y, p.z); g.add(rod(p, P[(k + 1) % 3], 0.009, brushed)); g.add(rod(p, new V(), 0.006, brushed)); });
      add(new THREE.SphereGeometry(0.045, 28, 18), ruby, g);
      add(new THREE.TorusGeometry(0.27, 0.005, 10, 96), brushed, g);
    },
    // established businesses & brands: tower with a ruby flag
    g => {
      const t = new THREE.ExtrudeGeometry(roundedRect(0.14, 0.3, 0.015), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
      add(t, dark, g, -0.03, -0.09, -0.05);
      for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(0.16, 0.006, 0.006), chrome, g, -0.03, -0.2 + k * 0.075, 0.058);
      add(new THREE.BoxGeometry(0.2, 0.02, 0.14), brushed, g, -0.03, -0.245, 0);
      g.add(rod(new V(-0.03, 0.06, 0), new V(-0.03, 0.28, 0), 0.009, dark));
      add(new THREE.SphereGeometry(0.012, 16, 12), chrome, g, -0.03, 0.275, 0);
      const fs = new THREE.Shape(); fs.moveTo(0, 0); fs.bezierCurveTo(0.05, 0.02, 0.09, -0.02, 0.15, 0.0); fs.lineTo(0.15, -0.08); fs.bezierCurveTo(0.09, -0.1, 0.05, -0.06, 0, -0.08); fs.closePath();
      add(new THREE.ExtrudeGeometry(fs, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 }), ruby, g, -0.024, 0.265, -0.005);
    },
  ];
  const gFd = new THREE.MeshPhysicalMaterial({ color: 0x111216, roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 0.2, clearcoatRoughness: 0.02, specularIntensity: 0.25, iridescence: 0.25, iridescenceIOR: 1.3, iridescenceThicknessRange: [220, 620], depthWrite: false, envMapIntensity: 0.12 });
  const gBd = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.18, transparent: true, opacity: 0.95, side: THREE.BackSide, depthWrite: false, envMapIntensity: 1.6 });
  const plateGeo = new THREE.ExtrudeGeometry(roundedRect(W - 0.12, H - 0.12, 0.07), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 14 });
  plateGeo.translate(0, H / 2 + Y0, -0.04);
  const plateM = new THREE.MeshPhysicalMaterial({ color: 0x08080a, metalness: 0.3, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.1, envMapIntensity: 0.35 });
  const ringS = roundedRect(W - 0.08, H - 0.08, 0.08); ringS.holes.push(roundedRect(W - 0.094, H - 0.094, 0.074));
  const ringGeo = new THREE.ExtrudeGeometry(ringS, { depth: 0.004, bevelEnabled: false, curveSegments: 14 }); ringGeo.translate(0, H / 2 + Y0, D / 2 - 0.006);
  const sheenGeo = (() => {
    const sw = W - 0.05, shh = H - 0.05, g = new THREE.ShapeGeometry(roundedRect(sw, shh, 0.085), 14), p = g.attributes.position, uv = g.attributes.uv;
    for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k) / sw + 0.5, p.getY(k) / shh + 0.5);
    g.translate(0, H / 2 + Y0, D / 2 + 0.003); return g;
  })();
  const sheenTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 0, 256, 256);
    [[0, 'rgba(255,255,255,0.10)'], [0.3, 'rgba(255,255,255,0)'], [0.4, 'rgba(255,255,255,0.20)'], [0.47, 'rgba(255,255,255,0.05)'], [0.58, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,0)']].forEach(([o, v]) => gr.addColorStop(o, v));
    x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    const tg = x.createLinearGradient(0, 0, 0, 40); tg.addColorStop(0, 'rgba(255,255,255,0.22)'); tg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = tg; x.fillRect(0, 0, 256, 40);
    return new THREE.CanvasTexture(c);
  })();
  const sheenM = new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, depthWrite: false, opacity: 0.35 });
  const card = (g, darkCard) => {
    if (darkCard) {
      const b = new THREE.Mesh(slab, gBd); b.renderOrder = 2; g.add(b);
      add(plateGeo, plateM, g);
      const f = new THREE.Mesh(slab, gFd); f.renderOrder = 4; g.add(f);
    } else glass(slab, g);
    add(ringGeo, frameM, g);
    const sh = new THREE.Mesh(sheenGeo, sheenM); sh.renderOrder = 5; g.add(sh);
  };
  const KIT = { card, glass, add, chrome, brushed, dark, ruby, frameM, slab, plinthGeo, frameGeo, lipGeo, EMB, glowTex, shTex, W, H, D, Y0 };

  // hero: one large black-glass platform, the active category's emblem floats above it
  const N = EMB.length, PW = 2.7, PD = 1.55, PT = 0.2, EMY = 1.32, ES = 2.45;
  const flat = (w, d, r, depth, bv) => { const g = new THREE.ExtrudeGeometry(roundedRect(w, d, r), { depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 28 }); g.rotateX(-Math.PI / 2); return g; };
  const flatRing = (w, d, r, t) => { const sh = roundedRect(w, d, r); sh.holes.push(roundedRect(w - t * 2, d - t * 2, Math.max(0.01, r - t))); const g = new THREE.ShapeGeometry(sh, 28); g.rotateX(-Math.PI / 2); return g; };
  const root = new THREE.Group(); scene.add(root);
  const lift = new THREE.Group(); root.add(lift);
  const plat = new THREE.Group(); plat.position.y = -PT / 2; lift.add(plat);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(PW * 1.75, PD * 2), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 0.55 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.01; root.add(shadow);
  const shell = flat(PW, PD, 0.24, PT - 0.05, 0.025); shell.translate(0, 0.025, 0);
  const shB = new THREE.MeshPhysicalMaterial({ color: 0x0c0d10, roughness: 0.12, transparent: true, opacity: 0.9, side: THREE.BackSide, depthWrite: false, envMapIntensity: 1.2 });
  const shF = new THREE.MeshPhysicalMaterial({ color: 0x15161b, roughness: 0.03, transparent: true, opacity: 0.32, clearcoat: 0.35, clearcoatRoughness: 0.02, specularIntensity: 0.3, iridescence: 0.3, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 600], depthWrite: false, envMapIntensity: 0.15 });
  const mB = new THREE.Mesh(shell, shB); mB.renderOrder = 1; plat.add(mB);
  const core = flat(PW - 0.26, PD - 0.26, 0.15, 0.07, 0); core.translate(0, 0.055, 0);
  plat.add(new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: 0x050506 })));
  const glowM = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(PW * 0.9, PD * 0.95), glowM); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.127; glow.renderOrder = 2; plat.add(glow);
  const etchM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false });
  [[PW - 0.42, PD - 0.42, 0.1], [PW - 0.66, PD - 0.66, 0.06]].forEach(([w, d, r]) => { const m = new THREE.Mesh(flatRing(w, d, r, 0.006), etchM); m.position.y = 0.127; m.renderOrder = 2; plat.add(m); });
  const mF = new THREE.Mesh(shell, shF); mF.renderOrder = 3; plat.add(mF);
  const shw = PW - 0.06, shd = PD - 0.06, sg = new THREE.ShapeGeometry(roundedRect(shw, shd, 0.21), 28), sp = sg.attributes.position, su = sg.attributes.uv;
  for (let k = 0; k < sp.count; k++) su.setXY(k, sp.getX(k) / shw + 0.5, sp.getY(k) / shd + 0.5);
  sg.rotateX(-Math.PI / 2);
  const sheen = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, depthWrite: false, opacity: 0.55 })); sheen.position.y = PT + 0.003; sheen.renderOrder = 4; plat.add(sheen);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shell, 30), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false })); edges.renderOrder = 4; plat.add(edges);
  const rim = new THREE.Mesh(flatRing(PW - 0.03, PD - 0.03, 0.225, 0.012), frameM); rim.position.y = PT + 0.001; rim.renderOrder = 4; plat.add(rim);
  const pulseM = new THREE.MeshBasicMaterial({ color: 0xE7131B, transparent: true, opacity: 0, depthWrite: false });
  const pulse = new THREE.Mesh(flatRing(PW * 0.5, PD * 0.5, 0.14, 0.016), pulseM); pulse.position.y = PT + 0.004; pulse.renderOrder = 5; plat.add(pulse);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.6 }));
  halo.position.set(0, EMY, -0.7); halo.scale.set(2.8, 2.8, 1); root.add(halo);
  const slots = EMB.map(fn => { const s = new THREE.Group(); s.position.y = EMY; s.rotation.x = -0.3; s.visible = false; root.add(s); const inner = new THREE.Group(); s.add(inner); fn(inner); return s; });

  let cur = 0, prev = -1, tS = -10, next = 6, hid = false, hk = 1, mx = 0, px = 0, fp = 0;
  A.setFlip = p => { fp = p; };
  const go = i => { i = ((i % N) + N) % N; if (i === cur) return; prev = cur; cur = i; tS = A.t; A.opts.onActive && A.opts.onActive(cur); };
  A.pick = i => { go(i); next = A.t + 9; };
  A.step = d => { go(cur + d); next = A.t + 9; };
  A.tap = () => A.step(1);
  A.items = [{ g: root }];
  A.hideHero = v => { hid = v; plat.visible = !v; shadow.visible = !v; };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new V(a * (PW / 2 + 0.035), PT, b * (PD / 2 + 0.035))), pv = new V();
  A.rect = () => {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    corners.forEach(c => { pv.copy(c).applyMatrix4(plat.matrixWorld).project(camera); const x = (pv.x + 1) / 2, y = (1 - pv.y) / 2; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  };
  A.drawPasses = (renderer, ctx, canvas) => { ctx.clearRect(0, 0, canvas.width, canvas.height); camera.layers.set(0); renderer.render(scene, camera); ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height); };
  A.el.addEventListener('pointermove', ev => { const r = A.el.getBoundingClientRect(); mx = (ev.clientX - r.left) / r.width * 2 - 1; });
  A.el.addEventListener('pointerleave', () => { mx = 0; });
  const backOut = x => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const outC = x => 1 - Math.pow(1 - x, 3);
  return (t, dt) => {
    if (!reduce && t >= next) { go(cur + 1); next = t + 6; }
    const asp = Math.max(0.5, camera.aspect), d = Math.max(7, 9.4 / asp);
    px = damp(px, mx, dt, 2.5);
    const fe = fp;
    camera.position.set(px * 0.4 * (1 - fe), 1.1 + d * 0.34, d * 0.94); camera.lookAt(0, 0.82, 0); camera.updateMatrixWorld();
    root.rotation.y = (px * 0.07 + Math.sin(t * 0.25) * 0.03) * (1 - fe);
    const elev = Math.atan2(camera.position.y - 0.95, camera.position.z);
    lift.rotation.x = (Math.PI / 2 - elev) * fe; lift.position.y = PT / 2 + 0.95 * fe; lift.scale.setScalar(1 + 0.45 * fe);
    shadow.material.opacity = 0.55 * (1 - fe);
    hk = damp(hk, hid ? 0 : 1, dt, 9);
    const ek = hk * (1 - clamp01(fe * 2.5));
    const u = t - tS;
    slots.forEach((s, i) => {
      let sc = 0, y = EMY, ry = 0;
      if (i === cur) { const q = clamp01((u - 0.16) / 0.85); sc = backOut(q); y = EMY - 0.45 * (1 - outC(q)); ry = -Math.PI * 1.1 * (1 - outC(q)); }
      else if (i === prev && u < 0.45) { const q = clamp01(u / 0.4), e2 = q * q; sc = 1 - e2; y = EMY - 0.5 * e2; ry = Math.PI * 0.7 * e2; }
      s.visible = sc > 0.002 && ek > 0.01;
      s.scale.setScalar(ES * Math.max(0.001, sc) * ek);
      s.position.y = y + Math.sin(t * 1.3) * 0.04;
      s.rotation.y = ry + Math.sin(t * 0.55) * 0.35;
    });
    const fl = u > 0.22 ? Math.exp(-(u - 0.22) * 2.2) : 0;
    glowM.opacity = 0.55 + 0.45 * fl;
    halo.material.opacity = (0.5 + 0.35 * fl) * ek;
    const pq = clamp01((u - 0.22) / 1.1); pulse.scale.setScalar(0.35 + 1.05 * outC(pq)); pulseM.opacity = pq > 0 && pq < 1 ? 0.85 * (1 - pq) : 0;
    scene.updateMatrixWorld();
  };
}

let SH = null;
function shared() {
  if (SH) return SH;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x000000, 0);
  SH = { renderer, env: makeEnv(renderer), lost: false, gen: 0 };
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); SH.lost = true; });
  canvas.addEventListener('webglcontextrestored', () => { SH.lost = false; SH.env = makeEnv(renderer); SH.gen++; });
  return SH;
}

export function mount(el, opts = {}) {
  el.innerHTML = '';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  const ctx = canvas.getContext('2d');
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  el.append(canvas, overlay);
  const S = shared(), renderer = S.renderer;
  const scene = new THREE.Scene(); scene.environment = S.env;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);
  const A = { scene, camera, opts, overlay, el, w: 0, h: 0, t: 0 };
  const tick = build(A); rig(scene);
  const pr = Math.min(devicePixelRatio, 2);
  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    canvas.width = Math.round(w * pr); canvas.height = Math.round(h * pr);
    A.w = w; A.h = h; camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(el); resize();
  const ray = new THREE.Raycaster(); ray.layers.enableAll(); const ndc = new THREE.Vector2();
  const hitAt = e => {
    if (!A.items || !A.w) return -1;
    const r = el.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const h of ray.intersectObjects(A.items.map(it => it.g), true)) {
      let o = h.object; while (o && !A.items.some(it => it.g === o)) o = o.parent;
      if (o) return A.items.findIndex(it => it.g === o);
    }
    return -1;
  };
  canvas.addEventListener('pointermove', e => { canvas.style.cursor = hitAt(e) >= 0 ? 'pointer' : 'default'; });
  canvas.addEventListener('click', e => { const i = hitAt(e); if (i < 0) return; if (A.tap) A.tap(); else { A.pick(i); opts.onActive && opts.onActive(i); } });
  let gen = S.gen; const sz = new THREE.Vector2();
  const draw = () => {
    if (S.lost || !A.w) return;
    if (S.gen !== gen) { gen = S.gen; scene.environment = S.env; }
    renderer.getSize(sz); if (sz.x !== A.w || sz.y !== A.h) renderer.setSize(A.w, A.h, false);
    A.drawPasses(renderer, ctx, canvas, canvas.width / A.w);
  };
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(el);
  let raf, last = performance.now();
  const step = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible || !A.w) return;
    A.t += dt; tick(A.t, dt); draw();
  };
  const loop = now => { raf = requestAnimationFrame(loop); step(now); };
  raf = requestAnimationFrame(loop);
  const iv = setInterval(() => { const n = performance.now(); if (n - last > 150) step(n); }, 60);
  return { pick: i => A.pick(i), step: d => A.step && A.step(d), snapshot: () => {
    if (!A.rect || !A.w) return null;
    const keep = A.hideHero; if (A.setFlip) A.setFlip(1); tick(A.t, 0); draw();
    const r = A.rect();
    const sx = Math.max(0, Math.floor(r.x * canvas.width)), sy = Math.max(0, Math.floor(r.y * canvas.height)), sw = Math.ceil(r.w * canvas.width), sh = Math.ceil(r.h * canvas.height);
    const c = document.createElement('canvas'); c.width = sw; c.height = sh; c.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return { url: c.toDataURL('image/png'), w: sw, h: sh, r };
  }, setFlip: p => A.setFlip && A.setFlip(p), rect: () => A.rect ? A.rect() : null, hide: (i, v) => { if (A.hideHero) A.hideHero(v); else if (A.items && A.items[i]) A.items[i].g.visible = !v; }, destroy: () => { cancelAnimationFrame(raf); clearInterval(iv); ro.disconnect(); io.disconnect(); el.innerHTML = ''; } };
}

/* ---- page wiring ------------------------------------------------------------------------------- */
const stageEl = document.getElementById('pf-who-stage');
let api = null;
if (stageEl) {
  try {
    api = mount(stageEl, { onActive: (i) => { if (window.__pfWhoSet) window.__pfWhoSet(i); } });
  } catch (e) { console.warn('[partner-flow] 3D off:', e); }
}
if (api) {
  /* arrows either side of the platform, kept next to it as the camera moves */
  const arrows = [-1, 1].map((dir) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pf-arrow';
    b.setAttribute('data-arrow', '');
    b.setAttribute('aria-label', (dir < 0 ? stageEl.dataset.prev : stageEl.dataset.next) || (dir < 0 ? 'Previous' : 'Next'));
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (dir < 0 ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7') + '"/></svg>';
    b.addEventListener('click', () => api.step(dir));
    stageEl.parentNode.appendChild(b);
    return { b, dir };
  });
  const placeArrows = () => {
    const r = api.rect(); if (!r || !r.w) return;
    const W = stageEl.clientWidth, H = stageEl.clientHeight, gap = W < 560 ? 34 : 64;
    arrows.forEach(({ b, dir }) => {
      /* beside the platform, but never past the stage's edges (narrow screens) */
      b.style.left = Math.max(34, Math.min(W - 34, (dir < 0 ? r.x : r.x + r.w) * W + dir * gap)) + 'px';
      b.style.top = ((r.y + r.h * 0.2) * H) + 'px';
      b.classList.add('is-placed');
    });
  };
  setInterval(placeArrows, 400); setTimeout(placeArrows, 120); requestAnimationFrame(() => requestAnimationFrame(placeArrows));
  if (window.__pfWhoActive) api.pick(window.__pfWhoActive);
  window.__whoApi = api;
  window.dispatchEvent(new Event('pf:ready'));
}
