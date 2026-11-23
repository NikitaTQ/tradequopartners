(function () {
  if (customElements.get('carpet-mini')) return;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
  let tp;
  const three = () => tp || (tp = import(window.__THREE_URL || new URL('vendor/three.module.js', document.baseURI).href).catch(() => import(THREE_URL)));

  function kit(THREE, canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min((window.devicePixelRatio || 1) * 1.5, 3));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050506);
    const pm = new THREE.PMREMGenerator(r);
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x020202);
    const eb = (w, h, d, c, k, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); };
    eb(5, .3, 3, 0xffffff, 8, 0, 8, 1);
    eb(.3, 6, 1.2, 0xffffff, 4, -7, 2, 3);
    eb(.3, 5, 6, 0xff2a2a, 1.6, 7, 1, -2);
    eb(10, 1.2, .3, 0xffe4c8, 1.4, 0, -1, 8);
    eb(1.6, 6, .3, 0xffffff, 3, 3.5, 3, 7);
    eb(14, .4, .3, 0xff3036, 1.2, 0, -.5, -7);
    scene.environment = pm.fromScene(env, .03).texture;
    scene.environmentIntensity = .85;
    const ctex = (w, h, draw, srgb) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const glowTex = ctex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const bokehTex = ctex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2 - 2); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(.82, 'rgba(255,255,255,.7)'); gr.addColorStop(.93, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 1, 0, Math.PI * 2); g.fill(); });
    const flareTex = ctex(256, 256, (g, w) => {
      const c = w / 2;
      let gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.08, 'rgba(255,255,255,.9)'); gr.addColorStop(.3, 'rgba(255,255,255,.15)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, c - 1.5, w, 3);
      gr = g.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(c - 1, w * .2, 2, w * .6);
    });
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const add = (k) => (o) => { o.material = o.material; return o; };
    const sprite = (tex, color, op, fog = true) => new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog }));
    const beam = (apex, tgt, angle, I, col) => {
      const L = apex.distanceTo(tgt), R = L * Math.tan(angle);
      const m = new THREE.Mesh(new THREE.ConeGeometry(R, L, 96, 1, true), new THREE.ShaderMaterial({
        uniforms: { uI: { value: I }, uC: { value: new THREE.Color(col) } },
        vertexShader: 'varying float vH;varying vec3 vN;varying vec3 vV;void main(){vH=uv.y;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader: 'uniform float uI;uniform vec3 uC;varying float vH;varying vec3 vN;varying vec3 vV;void main(){float f=pow(abs(dot(vN,vV)),2.2);float h=smoothstep(0.,.3,vH)*(.25+.75*vH);gl_FragColor=vec4(uC*f*h*uI,1.);}',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      }));
      m.position.copy(apex).add(tgt).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), apex.clone().sub(tgt).normalize());
      scene.add(m);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(R * 1.1, 64), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffdcb8, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(tgt.x, tgt.y + .045, tgt.z); scene.add(pool);
      const N = 380, dp = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { const t = rnd(), a = rnd() * Math.PI * 2, rr = Math.sqrt(rnd()) * R * (1 - t) * .9; const p = apex.clone().lerp(tgt, 1 - t); dp[i * 3] = p.x + Math.cos(a) * rr; dp[i * 3 + 1] = p.y; dp[i * 3 + 2] = p.z + Math.sin(a) * rr; }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      scene.add(new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex, color: 0xffe2c0, size: .045, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false })));
      return R;
    };
    const velvetTex = (base, rep) => {
      const map = ctex(1024, 1024, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        const id = g.getImageData(0, 0, w, h), d = id.data;
        for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 34; d[i] = Math.max(0, Math.min(255, d[i] + n)); d[i + 1] = Math.max(0, d[i + 1] + n * .25); d[i + 2] = Math.max(0, d[i + 2] + n * .3); }
        g.putImageData(id, 0, 0);
      }, true);
      const bump = ctex(256, 256, (g, w, h) => { const id = g.createImageData(w, h), d = id.data; for (let i = 0; i < d.length; i += 4) { const v = 100 + Math.random() * 80; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } g.putImageData(id, 0, 0); });
      if (rep) { map.repeat.set(...rep); bump.repeat.set(rep[0] * 2, rep[1] * 2); }
      return { map, bump };
    };
    const mats = {
      chrome: new THREE.MeshStandardMaterial({ color: 0xeef0f4, metalness: 1, roughness: .06 }),
      satin: new THREE.MeshStandardMaterial({ color: 0xc9ccd2, metalness: 1, roughness: .28 }),
      darkChrome: new THREE.MeshStandardMaterial({ color: 0x2a2b30, metalness: 1, roughness: .16 }),
      slat: new THREE.MeshStandardMaterial({ color: 0x3a3c42, metalness: .9, roughness: .32 }),
    };
    return { r, scene, ctex, glowTex, bokehTex, flareTex, rnd, sprite, beam, velvetTex, mats };
  }

  class Base extends HTMLElement {
    connectedCallback() {
      if (this._built) { this._render && this._render(); return; }
      this._built = true;
      Object.assign(this.style, { display: 'block', position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' });
      this.canvas = document.createElement('canvas');
      Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(this.canvas);
      three().then(T => this._build(T)).catch(e => console.error(this.tagName, e));
    }
    _frame(THREE, r, scene, cam, layout) {
      const resize = () => {
        const w = this.clientWidth || 1, h = this.clientHeight || 1;
        r.setSize(w, h, false);
        const L = layout(w / h);
        cam.fov = L.fov; cam.position.set(...L.pos);
        if (L.offX) { const fw = w * L.offX; cam.aspect = fw / h; cam.setViewOffset(fw, h, 0, 0, w, h); }
        else if (L.offY) { const fh = h * L.offY; cam.aspect = w / fh; cam.setViewOffset(w, fh, 0, 0, w, h); }
        else { cam.aspect = w / h; cam.clearViewOffset(); }
        cam.lookAt(new THREE.Vector3(...L.look));
        cam.updateProjectionMatrix();
        r.render(scene, cam);
      };
      this._render = resize; resize();
      new ResizeObserver(resize).observe(this);
    }
  }

  // ---------- 6 · red carpet leading to the viewer ----------
  class CarpetStage extends Base {
    _build(THREE) {
      const K = kit(THREE, this.canvas), { r, scene, mats, sprite, rnd } = K;
      scene.fog = new THREE.Fog(0x050506, 12, 52);
      const cam = new THREE.PerspectiveCamera(40, 1, .1, 200);
      const zN = 9, zF = -48, len = zN - zF, zC = (zN + zF) / 2;

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 90), new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: .26, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .84, envMapIntensity: .3 }));
      floor.rotation.x = -Math.PI / 2; floor.position.z = -30; scene.add(floor);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(40, 90), new THREE.MeshBasicMaterial({ color: 0x030303 }));
      under.rotation.x = -Math.PI / 2; under.position.set(0, -6, -30); scene.add(under);

      const props = new THREE.Group(); scene.add(props);
      const vt = K.velvetTex('#8a0a12', [.8, 17]);
      const carpetMat = new THREE.MeshPhysicalMaterial({ map: vt.map, bumpMap: vt.bump, bumpScale: .7, roughness: .82, sheen: 1, sheenColor: new THREE.Color(0xd0202a), sheenRoughness: .32, specularIntensity: .08 });
      const carpet = new THREE.Mesh(new THREE.BoxGeometry(2.6, .035, len), [mats.darkChrome, mats.darkChrome, carpetMat, mats.darkChrome, mats.darkChrome, mats.darkChrome]);
      carpet.position.set(0, .0175, zC); carpet.receiveShadow = true; props.add(carpet);
      [-1.33, 1.33].forEach(x => { const rail = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, len, 16), mats.chrome); rail.rotation.x = Math.PI / 2; rail.position.set(x, .024, zC); props.add(rail); });

      // corridor walls of titanium slats
      const wx = 5.2, step = 2.4, NS = Math.floor(len / step);
      [-1, 1].forEach(s => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 9), new THREE.MeshLambertMaterial({ color: 0x0a0a0b }));
        wall.rotation.y = s * -Math.PI / 2; wall.position.set(s * (wx + .02), 4.5, zC); scene.add(wall);
        const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, 8, .03), mats.darkChrome, NS), m = new THREE.Matrix4();
        for (let i = 0; i < NS; i++) { m.makeTranslation(s * wx, 4, zN - i * step); sl.setMatrixAt(i, m); }
        scene.add(sl);
        const led = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, len), new THREE.MeshStandardMaterial({ color: 0x220304, emissive: 0xff2a30, emissiveIntensity: 3 }));
        led.position.set(s * (wx - .12), .03, zC); props.add(led);
        const wash = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.2), new THREE.MeshBasicMaterial({ map: K.ctex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,.9)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }), color: 0xc4141c, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false }));
        wash.rotation.y = s * -Math.PI / 2; wash.position.set(s * (wx - .1), 1.6, zC); scene.add(wash);
        const puckG = new THREE.CylinderGeometry(.11, .12, .05, 40), lensG = new THREE.CircleGeometry(.075, 32), lensM = new THREE.MeshStandardMaterial({ color: 0x220304, emissive: 0xff3a40, emissiveIntensity: 4 });
        for (let z = zN - 1.2; z > zF + 3; z -= 2.4) {
          const pk = new THREE.Mesh(puckG, mats.chrome); pk.position.set(s * (wx - .45), .025, z); props.add(pk);
          const ln = new THREE.Mesh(lensG, lensM); ln.rotation.x = -Math.PI / 2; ln.position.set(s * (wx - .45), .052, z); props.add(ln);
          const gl = sprite(K.glowTex, 0xff3a40, .45); gl.scale.setScalar(.55); gl.position.set(s * (wx - .45), .1, z); scene.add(gl);
        }
        [3, -5, -13, -22].forEach(z => { const p = new THREE.PointLight(0xff2028, 5, 0, 2); p.position.set(s * (wx - .6), .35, z); scene.add(p); });
      });

      // the stage at the far end
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff0e4).multiplyScalar(2.2), fog: false }));
      portal.position.set(0, 2.6, zF + .2); scene.add(portal);
      [[0, 5.25, 3.7, .1], [0, -.05, 3.7, .1], [-1.8, 2.6, .1, 5.4], [1.8, 2.6, .1, 5.4]].forEach(([x, y, w, h]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, .12), mats.chrome); b.position.set(x, y, zF + .26); scene.add(b); });
      [[.16, 1.2, zF + .9], [.08, .6, zF + 1.5]].forEach(([y, d, z], i) => { const st = new THREE.Mesh(new THREE.BoxGeometry(4.4 - i * .4, .08, d), mats.darkChrome); st.position.set(0, y, z); scene.add(st); const lip = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 4.4 - i * .4, 12), mats.chrome); lip.rotation.z = Math.PI / 2; lip.position.set(0, y + .04, z + d / 2); scene.add(lip); });
      const pf = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ color: 0x050506, fog: false })); pf.position.set(0, 4.5, zF); scene.add(pf);
      const h1 = sprite(K.glowTex, 0xffd8c0, .45, false); h1.scale.set(10, 9, 1); h1.position.set(0, 2.6, zF + 1); scene.add(h1);
      const h2 = sprite(K.glowTex, 0xc0141c, .55, false); h2.scale.set(26, 16, 1); h2.position.set(0, 3, zF + 2); scene.add(h2);
      const pr = sprite(K.glowTex, 0xffd8c0, .18, false); pr.scale.set(4, 9, 1); pr.position.set(0, -2.6, zF + 1); scene.add(pr);

      props.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      const mirror = props.clone(); mirror.scale.y = -1; scene.add(mirror);

      scene.add(new THREE.HemisphereLight(0x2a2024, 0x050505, .35));
      const backT = new THREE.Object3D(); backT.position.set(0, 0, -2); scene.add(backT);
      const back = new THREE.SpotLight(0xffe2c8, 5, 0, .3, .7, 0); back.position.set(0, 4.5, zF + 4); back.target = backT; scene.add(back);
      const nearT = new THREE.Object3D(); nearT.position.set(0, 0, 3.2); scene.add(nearT);
      const key = new THREE.SpotLight(0xfff2e2, 14, 0, .19, .45, 0); key.position.set(0, 11, 4.4); key.target = nearT; scene.add(key);
      K.beam(key.position.clone(), nearT.position.clone(), .19, .22, 0xffe9d2);

      // paparazzi flashes + bokeh
      [[-4.3, 1.9, -6, 2.6], [4.4, 1.5, -9, 2.2], [-4.4, 2.3, -15, 1.8], [4.3, 2.1, -20, 1.6], [-4.2, 1.4, -26, 1.3], [4.2, 1.8, -31, 1.1], [-4.3, 2.0, -37, .9], [4.1, 1.3, -14, 1.4]].forEach(([x, y, z, k], i) => {
        const f = sprite(K.flareTex, i % 3 ? 0xffffff : 0xffe2c8, .9, false); f.scale.setScalar(k); f.position.set(x, y, z); scene.add(f);
      });
      for (let i = 0; i < 22; i++) {
        const s = sprite(K.bokehTex, [0xff3a40, 0xffb27a, 0xffffff, 0xff5a61][i % 4], .04 + rnd() * .1, false);
        const side = i % 2 ? 1 : -1; s.position.set(side * (2.2 + rnd() * 2.4), .6 + rnd() * 3.6, 2 - rnd() * 16); s.scale.setScalar(.25 + rnd() * .55); scene.add(s);
      }

      this._frame(THREE, r, scene, cam, a => a >= 1.1
        ? { fov: 40, pos: [0, 1.6, 7.6], look: [0, 4.4, -20] }
        : { fov: 58, pos: [0, 1.7, 8.2], look: [0, 4.6, -20] });
    }
  }

  // ---------- 9 · velvet rope, unhooked ----------
  class RopeStage extends Base {
    _build(THREE) {
      const K = kit(THREE, this.canvas), { r, scene, mats, sprite, rnd } = K;
      scene.fog = new THREE.Fog(0x050506, 11, 22);
      const cam = new THREE.PerspectiveCamera(34, 1, .1, 100);

      const floorTex = K.ctex(1024, 1024, (g, w, h) => {
        g.fillStyle = '#0d0c0c'; g.fillRect(0, 0, w, h);
        const n = 14, pw = w / n;
        for (let i = 0; i < n; i++) {
          const x = i * pw, v = 12 + Math.random() * 7;
          g.fillStyle = `rgb(${v + 4 | 0},${v | 0},${v - 1 | 0})`; g.fillRect(x, 0, pw - 2, h);
          for (let k = 0; k < 30; k++) { g.strokeStyle = `rgba(255,220,200,${Math.random() * .03})`; g.beginPath(); const gx = x + Math.random() * pw; g.moveTo(gx, 0); g.bezierCurveTo(gx + 5, h * .3, gx - 5, h * .65, gx + 2, h); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,.8)'; g.fillRect(x + pw - 2, 0, 2, h);
        }
      }, true);
      floorTex.repeat.set(2, 1.4);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: .3, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .84, envMapIntensity: .25 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -1); floor.receiveShadow = true; scene.add(floor);
      const under = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ color: 0x030303 }));
      under.rotation.x = -Math.PI / 2; under.position.set(0, -4.2, -1); scene.add(under);

      const wallZ = -4.6;
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: .9 }));
      wall.position.set(0, 6, wallZ - .2); wall.receiveShadow = true; scene.add(wall);
      const NS = 90, slats = new THREE.InstancedMesh(new THREE.BoxGeometry(.085, 11, .14), mats.slat, NS), mtx = new THREE.Matrix4();
      for (let i = 0; i < NS; i++) { mtx.makeTranslation(-11.1 + i * .25, 5.5, wallZ); slats.setMatrixAt(i, mtx); }
      slats.receiveShadow = true; scene.add(slats);
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(30, .12, .3), mats.darkChrome); skirt.position.set(0, .06, wallZ + .05); scene.add(skirt);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x220304, emissive: 0xff2a30, emissiveIntensity: 3 });
      [-3.2, 4.0, -7.4, 7.6].forEach((x, i) => {
        const can = new THREE.Mesh(new THREE.CylinderGeometry(.16, .18, .3, 40, 1, true), mats.darkChrome); can.position.set(x, .2, wallZ + .55); can.rotation.x = -.35; scene.add(can);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(.15, 40), lensMat); lens.position.set(x, .34, wallZ + .5); lens.rotation.x = -Math.PI / 2 - .35; scene.add(lens);
        if (i < 2) { const up = new THREE.SpotLight(0xff1e26, 26, 0, .42, .7, 1.3); up.position.set(x, .35, wallZ + .65); up.target.position.set(x * .9, 5, wallZ); scene.add(up, up.target); }
        const gs = sprite(K.glowTex, 0xff3038, .5); gs.scale.setScalar(.9); gs.position.set(x, .42, wallZ + .5); scene.add(gs);
      });

      // stanchions + rope (built at real scale, then scaled up)
      const S = 2.4, OX = .5;
      const props = new THREE.Group(); props.scale.setScalar(S); props.position.x = OX; scene.add(props);
      const put = (geo, mat, x, y, z, parent = props) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
      const prof = [[0, 0], [.2, 0], [.212, .008], [.212, .03], [.195, .048], [.13, .07], [.07, .085], [.04, .1], [.032, .125], [.03, .9], [.036, .915], [.046, .935], [.046, .955], [.032, .975], [.05, .995], [.066, 1.03], [.06, 1.07], [.036, 1.098], [0, 1.104]].map(p => new THREE.Vector2(p[0], p[1]));
      const postGeo = new THREE.LatheGeometry(prof, 96);
      const ringGeo = new THREE.TorusGeometry(.022, .006, 12, 40);
      const stanchion = (x, z, ringSides) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); props.add(g);
        put(postGeo, mats.chrome, 0, 0, 0, g);
        const rim = put(new THREE.TorusGeometry(.205, .006, 10, 96), mats.darkChrome, 0, .004, 0, g); rim.rotation.x = Math.PI / 2;
        ringSides.forEach(a => { const rg = put(ringGeo, mats.chrome, Math.cos(a) * .066, .945, Math.sin(a) * .066, g); rg.rotation.y = -a + Math.PI / 2; });
        return g;
      };
      const A = [-.6, 0], B = [.6, 0], C = [2.0, -1.1], D = [-1.9, -1.3];
      stanchion(...A, [0, Math.PI + .6]);
      stanchion(...B, [Math.PI, -.6]);
      stanchion(...C, [Math.PI - .6]);
      stanchion(...D, [-.6]);

      const vt = K.velvetTex('#6a070d', [12, 1]);
      const velvet = new THREE.MeshPhysicalMaterial({ map: vt.map, bumpMap: vt.bump, bumpScale: .4, roughness: .62, sheen: 1, sheenColor: new THREE.Color(0xd0222c), sheenRoughness: .35, specularIntensity: .25 });
      const RR = .028;
      const ferrule = (p, dir) => {
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        const f = put(new THREE.CylinderGeometry(RR * 1.25, RR * 1.15, .085, 40), mats.chrome, p.x, p.y, p.z); f.quaternion.copy(q);
        const tip = p.clone().add(dir.clone().normalize().multiplyScalar(-.05));
        const cap = put(new THREE.CylinderGeometry(RR * .7, RR * 1.15, .02, 32), mats.chrome, tip.x, tip.y, tip.z); cap.quaternion.copy(q);
        return q;
      };
      const rope = (pts) => {
        const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
        const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, RR, 20), velvet); m.castShadow = true; props.add(m);
        return curve;
      };
      const hang = (P, Q, sag) => { const a = new THREE.Vector3(...P), b = new THREE.Vector3(...Q), out = []; for (let i = 0; i <= 12; i++) { const t = i / 12, p = a.clone().lerp(b, t); p.y -= sag * (1 - Math.pow(2 * t - 1, 2)); out.push([p.x, p.y, p.z]); } return out; };
      const hookPos = (S0, a, y = .9) => [S0[0] + Math.cos(a) * .092, y, S0[1] + Math.sin(a) * .092];
      // hooked runs going off into the dark
      [[hookPos(B, -.6), hookPos(C, Math.PI - .6)], [hookPos(D, -.6), hookPos(A, Math.PI + .6)]].forEach(([P, Q]) => {
        const c = rope(hang(P, Q, .32));
        ferrule(c.getPoint(.012), c.getTangent(.012).negate()); ferrule(c.getPoint(.988), c.getTangent(.988));
      });
      // the unhooked one: hangs from A, slack on the floor, clip resting near B
      const y0 = RR + .002;
      const c = rope([hookPos(A, 0, .9), [-.5, .72, .03], [-.47, .45, .07], [-.42, .2, .12], [-.34, .06, .18], [-.22, y0, .24], [0, y0, .3], [.22, y0, .3], [.4, y0, .24], [.52, y0, .16]]);
      ferrule(c.getPoint(.004), c.getTangent(.004).negate());
      const endP = c.getPoint(1), endT = c.getTangent(1);
      const qe = ferrule(endP.clone().add(endT.clone().multiplyScalar(.035)), endT);
      const clipC = endP.clone().add(endT.clone().multiplyScalar(.1));
      const clip = put(new THREE.TorusGeometry(.03, .007, 12, 48), mats.chrome, clipC.x, .008, clipC.z);
      clip.rotation.x = Math.PI / 2; clip.rotation.z = Math.atan2(endT.z, endT.x);
      const gate = put(new THREE.CylinderGeometry(.004, .004, .05, 12), mats.satin, clipC.x, .01, clipC.z); gate.rotation.x = Math.PI / 2; gate.rotation.z = Math.atan2(endT.z, endT.x);

      props.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
      const mirror = props.clone(); mirror.scale.set(S, -S, S); mirror.traverse(o => { o.castShadow = false; }); scene.add(mirror);

      scene.add(new THREE.HemisphereLight(0x2a2024, 0x050505, .4));
      const gapT = new THREE.Object3D(); gapT.position.set(OX, 0, .5); scene.add(gapT);
      const headT = new THREE.Object3D(); headT.position.set(OX, 1.6, 0); scene.add(headT);
      const key = new THREE.SpotLight(0xfff2e2, 32, 0, .2, .45, 0); key.position.set(OX + .5, 10.5, 1.4); key.target = gapT;
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0003; key.shadow.camera.near = 5; key.shadow.camera.far = 16; scene.add(key);
      const rim = new THREE.SpotLight(0xff2a32, 16, 0, .3, .8, 0); rim.position.set(OX - 1.5, 3.2, -4); rim.target = headT; scene.add(rim);
      const rim2 = new THREE.SpotLight(0xffd9c4, 6, 0, .3, .8, 0); rim2.position.set(OX + 2.6, 3.8, -3.6); rim2.target = headT; scene.add(rim2);
      const fill = new THREE.SpotLight(0xdfe6ff, 2.4, 0, .4, .9, 0); fill.position.set(OX - 4, 3.5, 6); fill.target = headT; scene.add(fill);
      K.beam(key.position.clone(), gapT.position.clone(), .2, .3, 0xffe9d2);

      const haze = sprite(K.glowTex, 0x6e0a10, .5); haze.scale.set(12, 8, 1); haze.position.set(OX, 3, wallZ + .3); scene.add(haze);
      for (let i = 0; i < 24; i++) {
        const s = sprite(K.bokehTex, [0xff3a40, 0xffb27a, 0xffffff, 0xff5a61][i % 4], .05 + rnd() * .12, false);
        s.position.set(-6 + rnd() * 13, 1.2 + rnd() * 5, wallZ + .6 + rnd() * 1.4); s.scale.setScalar(.25 + rnd() * .5); scene.add(s);
      }

      this._frame(THREE, r, scene, cam, a => a >= 1.1
        ? { fov: 34, pos: [.4, 2.2, 6.8], look: [0, 1.15, 0], offX: 1.32 }
        : { fov: 44, pos: [OX, 2.4, 8], look: [OX, 1.2, 0], offY: 1.55 });
    }
  }

  class CarpetMini extends CarpetStage {
    _frame(T, r, scene, cam) { super._frame(T, r, scene, cam, a => a >= 2 ? { fov: 30, pos: [0, 1.5, 6.4], look: [0, 1.35, -20] } : { fov: 44, pos: [0, 1.5, 6.4], look: [0, 1.6, -20] }); }
  }
  class RopeMini extends RopeStage {
    _frame(T, r, scene, cam) { super._frame(T, r, scene, cam, a => a >= 2 ? { fov: 27, pos: [.5, 1.9, 7.6], look: [.5, 1.3, 0] } : { fov: 34, pos: [.5, 1.9, 7.6], look: [.5, 1.1, 0] }); }
  }
  customElements.define('carpet-mini', CarpetMini);
  customElements.define('rope-mini', RopeMini);
  customElements.define('carpet-stage', CarpetStage);
  customElements.define('rope-stage', RopeStage);
})();
