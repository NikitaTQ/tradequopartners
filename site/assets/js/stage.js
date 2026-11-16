/* Marketing Tools: the stage (Opera_Stage_Curtain design, in place of TradingView Premium). <opera-stage> draws the design's scene with three.js: velvet
 * curtains that open as the page scrolls through the block (its track, [data-stage-track], 320vh, the stage sticky),
 * the proscenium with its chrome rim, the footlights, the microphone under a spotlight with dust in the beam. The
 * scroll progress goes to the track as --p, which the words over the scene follow (CSS in partner.css). three.js is the
 * site's own copy (vendor/three@0.184.0), loaded when the block is two screens away; without WebGL or three.js the
 * words show at once (--p: 1) on the black stage. Phones draw at 1.5x at most. Scene code as the design has it. */
(function () {
  if (customElements.get('opera-stage')) return;
  const SRC = document.currentScript && document.currentScript.src;
  const THREE_URL = new URL('../../vendor/three@0.184.0/three.module.min.js', SRC || document.baseURI).href;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ss = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  class OperaStage extends HTMLElement {
    connectedCallback() {
      if (this._built) { this._start(); return; }
      this._built = true;
      Object.assign(this.style, { display: 'block', position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' });
      this.canvas = document.createElement('canvas');
      Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
      this.appendChild(this.canvas);
      const track = this.closest('[data-stage-track]') || this.parentElement;
      const fail = () => track.style.setProperty('--p', '1');
      const load = () => {
        if (this._loading) return; this._loading = true;
        let ok = false;
        try { const c = document.createElement('canvas'); ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { ok = false; }
        if (!ok) { fail(); return; }
        import(THREE_URL).then(T => { this._build(T); this._start(); }).catch(e => { console.error('opera-stage', e); fail(); });
      };
      if (window.IntersectionObserver) {
        const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '200% 0px' });
        io.observe(track);
      } else load();
    }
    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; }
    _start() { if (!this._ready || this._raf) return; this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); }

    _build(THREE) {
      const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
      const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      r.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
      r.outputColorSpace = THREE.SRGBColorSpace;
      r.toneMapping = THREE.ACESFilmicToneMapping;
      r.toneMappingExposure = 1.1;
      r.shadowMap.enabled = true;
      r.shadowMap.type = THREE.PCFSoftShadowMap;
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x040405);
      scene.fog = new THREE.Fog(0x040405, 18, 34);
      const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

      const pm = new THREE.PMREMGenerator(r);
      const env = new THREE.Scene();
      env.background = new THREE.Color(0x030303);
      const eb = (w, h, d, c, k, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); env.add(m); };
      eb(6, .3, 4, 0xffffff, 7, 0, 8, 0);
      eb(.3, 7, 9, 0xff2a2a, 1.4, -8, 1, 0);
      eb(.3, 7, 9, 0xff2a2a, 1.4, 8, 1, 0);
      eb(12, 2, .3, 0xffe2c4, 2.6, 0, 0, 9);
      eb(2.5, 2.5, .3, 0xffffff, 5, 4, 5, -7);
      scene.environment = pm.fromScene(env, .04).texture;
      scene.environmentIntensity = .7;

      const ctex = (w, h, draw, srgb) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
      const glowTex = ctex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });

      // velvet
      const fabric = ctex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { const v = 100 + Math.random() * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2 + Math.random() * 8); } });
      fabric.repeat.set(26, 14);
      const velvet = new THREE.MeshPhysicalMaterial({ color: 0x5e0307, roughness: .82, metalness: 0, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xff3a3f), bumpMap: fabric, bumpScale: .1, side: THREE.DoubleSide });

      const chrome = new THREE.MeshStandardMaterial({ color: 0xeceef2, metalness: 1, roughness: .07 });
      const darkChrome = new THREE.MeshStandardMaterial({ color: 0x2c2d31, metalness: 1, roughness: .18 });
      const rubber = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: .55 });
      const redGloss = new THREE.MeshPhysicalMaterial({ color: 0xc70d15, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 });

      // curtains
      const W = 6.95, H = 9.1;
      const mkCurtain = side => {
        const geo = new THREE.PlaneGeometry(W, H, 110, 80);
        const pos = geo.attributes.position;
        const base = Float32Array.from(pos.array);
        const m = new THREE.Mesh(geo, velvet);
        m.position.z = -.45; m.frustumCulled = false; m.receiveShadow = true;
        scene.add(m);
        return { geo, pos, base, side };
      };
      const curtains = [mkCurtain(-1), mkCurtain(1)];
      const updCurtain = (c, po, time) => {
        const a = c.pos.array, b = c.base, side = c.side;
        const outerX = side * 6.85, innerX = -side * .1;
        for (let i = 0; i < a.length; i += 3) {
          const u = b[i] / W + .5, t = b[i + 1] / H + .5;
          const s = side < 0 ? u : 1 - u;
          const comp = po * (.66 + .26 * (1 - t));
          const pinch = po * .38 * Math.exp(-Math.pow((t - .3) / .16, 2));
          const cc = Math.min(.955, comp + pinch * (1 - comp));
          const x = outerX + (innerX - outerX) * s * (1 - cc);
          const below = Math.max(0, 1 - t / .3);
          const y = t * H - .02 + po * 1.15 * s * Math.pow(below, 1.7);
          const ph = (s * 9 + .35 * Math.sin(s * 13 + side)) * Math.PI * 2;
          let z = (.11 + .42 * cc) * (Math.sin(ph) + .22 * Math.sin(ph * 2.07 + t * 2.4 + side));
          z *= .82 + .18 * Math.sin(t * 5 + s * 7);
          z += .04 * Math.sin(time * .7 + s * 5 + t * 3) * (1 - t) * (1 - po * .6);
          z += po * .2 * Math.exp(-Math.pow((t - .3) / .22, 2));
          a[i] = x; a[i + 1] = y; a[i + 2] = z;
        }
        c.pos.needsUpdate = true;
        c.geo.computeVertexNormals();
      };

      // valance
      {
        const vw = 14.6, vh = 1.95;
        const g = new THREE.PlaneGeometry(vw, vh, 260, 36);
        const a = g.attributes.position.array;
        for (let i = 0; i < a.length; i += 3) {
          const x = a[i], t = a[i + 1] / vh + .5;
          const k = (x / vw + .5) * 6, loc = k - Math.floor(k), sw = Math.sin(Math.PI * loc);
          const y = 9.05 - vh * (1 - t) * (.5 + .5 * sw);
          const z = .3 * sw * (1 - t) + .055 * Math.sin(((1 - t) * 7 + sw * 1.3) * Math.PI * 2) * (.35 + .65 * sw) + .05 * Math.sin(x * 9) * t;
          a[i] = x; a[i + 1] = y; a[i + 2] = z;
        }
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, velvet); m.position.z = .02; scene.add(m);
        for (let j = 1; j < 6; j++) {
          const x = -vw / 2 + j * vw / 6;
          const cap = new THREE.Mesh(new THREE.SphereGeometry(.09, 24, 16), chrome); cap.position.set(x, 8.1, .12); scene.add(cap);
          const ts = new THREE.Mesh(new THREE.CylinderGeometry(.03, .13, .5, 32, 1), velvet); ts.position.set(x, 7.78, .12); scene.add(ts);
        }
      }

      // proscenium
      {
        const s = new THREE.Shape();
        s.moveTo(-12, -1.6); s.lineTo(-6.6, -1.6); s.lineTo(-6.6, 7);
        s.absellipse(0, 7, 6.6, 1.55, Math.PI, 0, true);
        s.lineTo(6.6, -1.6); s.lineTo(12, -1.6); s.lineTo(12, 40); s.lineTo(-12, 40); s.lineTo(-12, -1.6);   // its top edge well out of frame: on phones the camera saw it, a bright bevel line across the screen
        const g = new THREE.ExtrudeGeometry(s, { depth: .7, bevelEnabled: true, bevelThickness: .14, bevelSize: .14, bevelSegments: 5, curveSegments: 64 });
        const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: .38, metalness: .15, clearcoat: 1, clearcoatRoughness: .18 });
        const m = new THREE.Mesh(g, lacquer); m.position.z = .45; scene.add(m);
        const p = new THREE.Path(); p.moveTo(-6.48, 0); p.lineTo(-6.48, 7); p.absellipse(0, 7, 6.48, 1.43, Math.PI, 0, true); p.lineTo(6.48, 0);
        const pts = p.getSpacedPoints(240).map(v => new THREE.Vector3(v.x, v.y, 1.3));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 480, .065, 14), chrome);
        scene.add(tube);
      }

      // floor + stage edge
      const floorTex = ctex(1024, 1024, (g, w, h) => {
        g.fillStyle = '#140f0d'; g.fillRect(0, 0, w, h);
        const n = 18, pw = w / n;
        for (let i = 0; i < n; i++) {
          const x = i * pw, v = 18 + Math.random() * 12;
          g.fillStyle = `rgb(${v + 9 | 0},${v | 0},${v - 3 | 0})`; g.fillRect(x, 0, pw - 2, h);
          for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(255,215,180,${Math.random() * .035})`; g.lineWidth = 1; g.beginPath(); const gx = x + Math.random() * pw; g.moveTo(gx, 0); g.bezierCurveTo(gx + 5, h * .3, gx - 5, h * .65, gx + 2, h); g.stroke(); }
          g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x + pw - 2, 0, 2, h);
          g.fillRect(x, Math.random() * h, pw, 2);
        }
      }, true);
      floorTex.repeat.set(2.4, 1);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 11.6), new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: .42, metalness: 0, clearcoat: .3, clearcoatRoughness: .3, envMapIntensity: .06 }));
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -2.4); floor.receiveShadow = true; scene.add(floor);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(28, 1.6, .3), new THREE.MeshStandardMaterial({ color: 0x070707, roughness: .5 }));
      edge.position.set(0, -.8, 3.35); scene.add(edge);
      const lip = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 28, 16), chrome); lip.rotation.z = Math.PI / 2; lip.position.set(0, .0, 3.5); scene.add(lip);
      const bg = new THREE.PlaneGeometry(30, 16, 300, 1); { const a = bg.attributes.position.array; for (let i = 0; i < a.length; i += 3) a[i + 2] = .22 * Math.sin(a[i] * 2.1 + .6 * Math.sin(a[i] * .7)); bg.computeVertexNormals(); }
      const back = new THREE.Mesh(bg, new THREE.MeshPhysicalMaterial({ color: 0x0c0b0d, roughness: .9, sheen: 1, sheenRoughness: .4, sheenColor: new THREE.Color(0x5a3a3c) }));
      back.position.set(0, 6, -8.2); back.receiveShadow = true; scene.add(back);

      // footlights
      const bulbMat = new THREE.MeshStandardMaterial({ color: 0x221a12, emissive: 0xffb36b, emissiveIntensity: 2.4 });
      const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa860, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
      for (let i = 0; i < 13; i++) {
        const x = -6.6 + i * 1.1;
        const hood = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .34, 32, 1, false, 0, Math.PI), darkChrome);
        hood.rotation.z = Math.PI / 2; hood.rotation.y = Math.PI; hood.position.set(x, .02, 3.12); scene.add(hood);
        const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 12), bulbMat); b.position.set(x, .08, 3.05); scene.add(b);
        const sp = new THREE.Sprite(glowMat); sp.scale.setScalar(.75); sp.position.set(x, .12, 3.02); scene.add(sp);
      }

      // microphone
      const MZ = -2;
      const mic = new THREE.Group(); mic.position.set(0, 0, MZ); scene.add(mic);
      {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, .07, 96), darkChrome); base.position.y = .035; base.castShadow = true; mic.add(base);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(.5, 64, 24, 0, Math.PI * 2, 0, Math.PI * .22), chrome); dome.position.y = -.31; dome.castShadow = true; mic.add(dome);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, .14, 48), chrome); collar.position.y = .16; mic.add(collar);
        const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, 1.5, 32), chrome); pole1.position.y = .95; pole1.castShadow = true; mic.add(pole1);
        const clutch = new THREE.Mesh(new THREE.CylinderGeometry(.062, .062, .16, 48), rubber); clutch.position.y = 1.72; mic.add(clutch);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.062, .012, 12, 48), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 1.8; mic.add(ring);
        const knob = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .12, 24), rubber); knob.rotation.z = Math.PI / 2; knob.position.set(.11, 1.72, 0); mic.add(knob);
        const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(.024, .024, .9, 32), chrome); pole2.position.y = 2.24; pole2.castShadow = true; mic.add(pole2);

        const head = new THREE.Group(); head.position.y = 3.02; head.rotation.x = -.14; mic.add(head);
        const yoke = new THREE.Mesh(new THREE.TorusGeometry(.36, .024, 20, 96, Math.PI), chrome); yoke.rotation.z = Math.PI; yoke.castShadow = true; head.add(yoke);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .1, 24), chrome); stem.position.y = -.4; head.add(stem);
        const grille = ctex(256, 256, (g, w, h) => { g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h); g.fillStyle = '#050505'; const n = 14; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.beginPath(); g.arc((x + .5 + (y % 2) * .5) * w / n, (y + .5) * h / n, w / n * .3, 0, Math.PI * 2); g.fill(); } }, true);
        grille.repeat.set(5, 4);
        const gm = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grille, metalness: 1, roughness: .26, bumpMap: grille, bumpScale: 1.2 });
        const cap = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .46, 24, 96), gm); cap.castShadow = true; head.add(cap);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(.252, .252, .11, 96, 1, true), redGloss); head.add(band);
        [-.07, .07].forEach(y => { const t = new THREE.Mesh(new THREE.TorusGeometry(.252, .014, 12, 96), chrome); t.rotation.x = Math.PI / 2; t.position.y = y; head.add(t); });
        [-1, 1].forEach(sx => {
          const pin = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .12, 32), chrome); pin.rotation.z = Math.PI / 2; pin.position.x = sx * .3; head.add(pin);
          const nut = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .04, 6), darkChrome); nut.rotation.z = Math.PI / 2; nut.position.x = sx * .37; head.add(nut);
        });
        const cable = new THREE.CatmullRomCurve3([[.12, .03, .25], [.9, .03, .9], [2.1, .03, .2], [3.4, .03, 1.1], [5.2, .03, .2], [7.5, .03, .9]].map(p => new THREE.Vector3(...p)));
        const cb = new THREE.Mesh(new THREE.TubeGeometry(cable, 200, .026, 12), rubber); cb.castShadow = true; cb.receiveShadow = true; mic.add(cb);
      }
      const micTarget = new THREE.Object3D(); micTarget.position.set(0, 2.2, MZ); scene.add(micTarget);
      const headTarget = new THREE.Object3D(); headTarget.position.set(0, 3.05, MZ); scene.add(headTarget);
      const floorTarget = new THREE.Object3D(); floorTarget.position.set(0, 0, MZ); scene.add(floorTarget);

      // lights
      scene.add(new THREE.HemisphereLight(0x3a2222, 0x050505, .35));
      const foot = new THREE.SpotLight(0xffb070, 2.4, 0, .95, 1, 0); foot.position.set(0, .25, 3.8); foot.target.position.set(0, 4.6, -.4); scene.add(foot, foot.target);
      const house = new THREE.SpotLight(0xfff0dc, 5, 0, .2, .85, 0); house.position.set(0, 5.5, 17); house.target.position.set(0, 3.6, -.4); scene.add(house, house.target);
      const key = new THREE.SpotLight(0xfff3e4, 0, 0, .19, .5, 0); key.position.set(0, 10.6, MZ + 1.1); key.target = floorTarget;
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0004; key.shadow.camera.near = 4; key.shadow.camera.far = 16; scene.add(key);
      const rim = new THREE.SpotLight(0xff2a32, 0, 0, .09, .8, 0); rim.position.set(0, 2.4, -7.6); rim.target = headTarget; scene.add(rim);
      const fill = new THREE.SpotLight(0xffe8d0, 0, 0, .22, .8, 0); fill.position.set(-3, 4, 6); fill.target = micTarget; scene.add(fill);

      // beam
      const apex = key.position.clone(), tgt = floorTarget.position.clone();
      const L = apex.distanceTo(tgt), R = L * Math.tan(.19);
      const beamMat = new THREE.ShaderMaterial({
        uniforms: { uI: { value: 0 }, uC: { value: new THREE.Color(0xffe9d2) } },
        vertexShader: 'varying float vH;varying vec3 vN;varying vec3 vV;void main(){vH=uv.y;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}',
        fragmentShader: 'uniform float uI;uniform vec3 uC;varying float vH;varying vec3 vN;varying vec3 vV;void main(){float f=pow(abs(dot(vN,vV)),2.2);float h=smoothstep(0.,.3,vH)*(.25+.75*vH);gl_FragColor=vec4(uC*f*h*uI,1.);}',
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(R, L, 96, 1, true), beamMat);
      beam.position.copy(apex).add(tgt).multiplyScalar(.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), apex.clone().sub(tgt).normalize());
      scene.add(beam);
      const pool = new THREE.Mesh(new THREE.CircleGeometry(R * 1.15, 64), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffdcb8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(0, .012, MZ); scene.add(pool);

      const N = 320, dp = new Float32Array(N * 3), seed = [];
      for (let i = 0; i < N; i++) { const t = Math.random(), a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * R * (1 - t) * .9; seed.push([a, rr, t, .2 + Math.random() * .6]); }
      const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
      const dust = new THREE.Points(dg, new THREE.PointsMaterial({ map: glowTex, color: 0xffe2c0, size: .05, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      scene.add(dust);

      const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7a0b10, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      haze.scale.set(16, 11, 1); haze.position.set(0, 3.2, -7.9); scene.add(haze);

      this._ready = true;
      const track = this.closest('[data-stage-track]') || this.parentElement;
      let sp = 0, mx = 0, my = 0, tmx = 0, tmy = 0, visible = true;
      const camA = { p: new THREE.Vector3(0, 4.3, 17.2), l: new THREE.Vector3(0, 4.15, 0) };
      const camB = { p: new THREE.Vector3(0, 3.3, 12.8), l: new THREE.Vector3(0, 3.0, MZ) };
      const cp = new THREE.Vector3(), cl = new THREE.Vector3();

      const resize = () => {
        const w = this.clientWidth || 1, h = this.clientHeight || 1;
        r.setSize(w, h, false);
        cam.aspect = w / h;
        const hf = Math.atan(.52);
        cam.fov = clamp(2 * Math.atan(Math.tan(hf) / cam.aspect) * 180 / Math.PI, 30, 62);
        cam.updateProjectionMatrix();
      };
      resize();
      new ResizeObserver(resize).observe(this);
      window.addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; }, { passive: true });
      if (window.IntersectionObserver) new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) this._start(); }).observe(this);

      this._tick = now => {
        const dt = Math.min(.05, Math.max(0, now - this._last) / 1000); this._last = now; this._lf = performance.now();
        if (!visible || !this.isConnected) { this._raf = 0; return; }
        const rect = track.getBoundingClientRect();
        const range = Math.max(1, rect.height - innerHeight);
        const raw = clamp(-rect.top / range, 0, 1);
        sp += (raw - sp) * (1 - Math.exp(-dt * 5));
        track.style.setProperty('--p', sp.toFixed(4));
        mx += (tmx - mx) * (1 - Math.exp(-dt * 3)); my += (tmy - my) * (1 - Math.exp(-dt * 3));
        const time = now / 1000;
        const po = eio(clamp((sp - .04) / .66, 0, 1));
        const rv = ss(.3, .82, sp);
        updCurtain(curtains[0], po, time); updCurtain(curtains[1], po, time);

        const cz = eio(clamp((sp - .1) / .9, 0, 1));
        cp.lerpVectors(camA.p, camB.p, cz); cl.lerpVectors(camA.l, camB.l, cz);
        cam.position.set(cp.x + mx * .9, cp.y - my * .4, cp.z);
        cam.lookAt(cl.x + mx * .25, cl.y, cl.z);

        house.intensity = 5.2 * (1 - po * .85);
        key.intensity = 16 * rv;
        rim.intensity = 9 * rv;
        fill.intensity = 1.6 * rv;
        foot.intensity = 2.4 - .6 * rv;
        beamMat.uniforms.uI.value = .3 * rv;
        pool.material.opacity = .22 * rv;
        dust.material.opacity = .75 * rv;
        haze.material.opacity = .4 * rv;
        for (let i = 0; i < N; i++) {
          const s = seed[i]; let t = (s[2] + time * .012 * s[3]) % 1;
          const a = s[0] + time * .05 * s[3];
          const p = apex.clone().lerp(tgt, 1 - t);
          const rr = s[1] * (1 - t) / Math.max(.05, 1 - s[2]) * .9;
          const k = Math.min(rr, R * (1 - t) * .9);
          dp[i * 3] = p.x + Math.cos(a) * k; dp[i * 3 + 1] = p.y; dp[i * 3 + 2] = p.z + Math.sin(a) * k;
        }
        dg.attributes.position.needsUpdate = true;

        r.render(scene, cam);
        this._raf = requestAnimationFrame(this._tick);
      };
      this._lf = performance.now();
      setInterval(() => { if (visible && this.isConnected && performance.now() - this._lf > 120) { cancelAnimationFrame(this._raf); this._raf = 0; this._tick(performance.now()); } }, 250);
    }
  }
  customElements.define('opera-stage', OperaStage);
})();

