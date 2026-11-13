/* IB Tools, the Copy trading hand-off block (#copy, Liquid_Glass_Hand-off design, variant 4a), ported from the design's
   component. One progress value p (0..1) drives everything:
     · the client's hand slides in (0–.30), the step "01" gives way to "02" (.44–.60);
     · the provider's position glows (.28–.60), gathers into a drop of liquid silver (.30–.44), flies along an arc to
       the client's phone (.46–.74), lands (.70–.78) and spreads into it (.77–.88), a ring opening where it lands;
     · the client's screen fills in: symbol, price, the chart drawn, the position, the "Copied" badge (.76–.95).
   The drop is a metaball field drawn on a WebGL canvas (the design's shader: refraction of the background, a mirror-like
   environment, a red core, two highlights, a soft shadow); it is drawn only inside the box around the drops.
   p follows the scroll: the stage holds still while the page scrolls 2.1 screens past it (partner.css);
   the first half takes p to .30 (the client's hand comes in), the second half to 1 (the drop forms,
   flies and lands, the client's screen fills in); scrolling up plays it back. p eases after the scroll; the hands float
   a little. Frames run only while the block is on screen and the tab is visible. Reduced motion: the end state, still.
   No WebGL (or no highp in fragment shaders): everything but the drop. */
(function () {
  var root = document.querySelector('[data-ib-copy]');
  if (!root) return;
  var el = {};
  [].forEach.call(root.querySelectorAll('[data-k]'), function (e) { el[e.getAttribute('data-k')] = e; });
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the screens' matrices (design variant 4a): screen px (300x650) → hand image px */
  var ML = [0.8316552, -0.06342102, 0, 0.00004116766, 0.1565365, 0.9015542, 0, 0.00001140881, 0, 0, 1, 0, 339.5838, 74.24875, 0, 1];
  var MR = [0.8328572, 0.07936495, 0, 0.0000266892, -0.1551771, 0.7954829, 0, -0.0001264555, 0, 0, 1, 0, 204.2637, 121.5337, 0, 1];

  var cl = function (x) { return Math.max(0, Math.min(1, x)); };
  var E = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var E5 = function (t) { return t < .5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2; };
  var sm = function (t) { return t * t * (3 - 2 * t); };
  var L = function (a, z, t) { return a + (z - a) * t; };
  var set = function (k, tf, op) { var e = el[k]; if (!e) return; if (tf != null) e.style.transform = tf; if (op != null) e.style.opacity = op.toFixed(3); };
  var at = function (k, x, y, s, op) { set(k, 'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(3) + ')', op); };
  var up = function (k, t, d) { set(k, 'translate3d(0,' + ((1 - t) * (d || 12)).toFixed(2) + 'px,0)', t); };
  var draw = function (k, t) { var e = el[k]; if (e) e.style.strokeDashoffset = (1 - t).toFixed(4); };
  var qp = function (A, Q, B, t) { var u = 1 - t; return [u * u * A[0] + 2 * u * t * Q[0] + t * t * B[0], u * u * A[1] + 2 * u * t * Q[1] + t * t * B[1]]; };

  function apply(p, T) {
    var sg = function (a, z) { return cl((p - a) / (z - a)); };
    var bell = function (c, w) { return sm(cl(1 - Math.abs(p - c) / w)); };
    var fl = Math.sin(T * .8) * 3, fr = Math.sin(T * .8 + 1.9) * 3;
    set('rail', 'scaleY(' + p.toFixed(4) + ')');
    up('c1', 1 - sg(.44, .52), -10); up('c2', sg(.52, .6));
    var ph = (T % 1.8) / 1.8; set('p-dot', 'scale(' + (.6 + ph * 1.6).toFixed(3) + ')', (1 - ph) * .9);
    var e = E5(sg(0, .3)), lx = 360, ly = 101 + fl, rx = 976.2 + L(360, 0, e), ry = 101 + L(400, 0, e) + fr;
    set('L', 'translate3d(' + lx + 'px,' + ly.toFixed(2) + 'px,0) scale(.78)');
    set('R', 'translate3d(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px,0) rotate(' + L(5, 0, e).toFixed(3) + 'deg) scale(.78)');
    /* a point of a screen (its px) on the board */
    var P = function (side, u, v) {
      var a = side === 'L' ? ML : MR, X = a[0] * u + a[4] * v + a[12], Y = a[1] * u + a[5] * v + a[13], W = a[3] * u + a[7] * v + a[15];
      return side === 'L' ? [lx + .78 * X / W, ly + .78 * Y / W] : [rx + .78 * X / W, ry + .78 * Y / W];
    };
    var A = P('L', 150, 486), Bp = P('R', 150, 490), Q = [(A[0] + Bp[0]) / 2, Math.min(A[1], Bp[1]) - 260];
    var form = E(sg(.3, .44)), fly = E(sg(.46, .74)), land = sm(sg(.7, .78)), spread = E(sg(.77, .88));
    var Wb = function (i) { return 1 + .05 * Math.sin(T * 6.5 + i * 1.7); }, live = form * (1 - spread);
    var m = qp(A, Q, Bp, fly), tl = qp(A, Q, Bp, Math.max(0, fly - .035)), sat = qp(A, Q, Bp, Math.max(0, fly - .09));
    var dist = Math.hypot(m[0] - A[0], m[1] - A[1]);
    glDraw([
      [A[0], A[1], 18 * form * cl(1 - dist / 80) * Wb(0)],
      [m[0], m[1], 24 * live * Wb(1)],
      [tl[0], tl[1], 17 * live * Wb(2)],
      [(A[0] + m[0]) / 2, (A[1] + m[1]) / 2, 9 * form * cl(1 - dist / 110)],
      [Bp[0], Bp[1], 28 * land * (1 - spread) * Wb(4)],
      [sat[0], sat[1], 7 * sg(.5, .56) * (1 - land)]
    ], T, live);
    set('p-send', null, sg(.28, .34) * (1 - sg(.5, .6)));
    at('gA', A[0], A[1], 1, bell(.4, .08) * .9);
    var r = sg(.76, .92); at('ring', Bp[0], Bp[1], .4 + 3 * r, r > 0 && r < 1 ? (1 - r) * .85 : 0);
    up('c-sym', sg(.76, .81)); up('c-buy', sg(.78, .83)); up('c-px', sg(.78, .83));
    draw('c-draw', E(sg(.78, .94))); up('c-card', sg(.8, .86)); up('c-badge', sg(.88, .95));
  }

  /* ---- the drop: the design's fragment shader (board px; uScale = canvas px per board px) ---- */
  var FS = 'precision highp float;\n' +
    'uniform vec2 uRes;uniform float uScale;uniform vec4 uB[6];uniform float uT;uniform float uSh;\n' +
    'const float R=26.;\n' +
    'float field(vec2 p){float f=0.;for(int i=0;i<6;i++){vec2 d=p-uB[i].xy;float r=uB[i].z;f+=r*r/(dot(d,d)+.001);}return f;}\n' +
    'float hz(float f){return R*sqrt(clamp(1.-1./max(f,1e-4),0.,1.));}\n' +
    'vec3 bgCol(vec2 q){float d=length((q-vec2(921.6,360.))/vec2(792.,585.));vec3 a=vec3(.910,.910,.933),b=vec3(.835,.835,.863),c=vec3(.765,.769,.796);return d<.55?mix(a,b,d/.55):mix(b,c,clamp((d-.55)/.45,0.,1.));}\n' +
    'vec3 envCol(vec3 r){float up=-r.y;vec3 c=mix(vec3(.16,.17,.19),vec3(.95,.955,.97),smoothstep(-.35,.55,up));c+=vec3(.55)*smoothstep(.6,.72,up)*(1.-smoothstep(.82,.95,up));c+=vec3(.35)*smoothstep(.72,.95,r.x);c=mix(c,vec3(.906,.075,.106),smoothstep(.45,.9,r.y)*.28);return c;}\n' +
    'void main(){\n' +
    ' vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uScale;\n' +
    ' float sh=smoothstep(.3,1.3,field(p-vec2(0.,22.)))*.14*uSh;\n' +
    ' float f=field(p);\n' +
    ' if(f<.75){gl_FragColor=vec4(0.,0.,0.,sh);return;}\n' +
    ' float e=.75;\n' +
    ' float fxp=field(p+vec2(e,0.)),fxm=field(p-vec2(e,0.)),fyp=field(p+vec2(0.,e)),fym=field(p-vec2(0.,e));\n' +
    ' vec2 gf=vec2(fxp-fxm,fyp-fym)/(2.*e);\n' +
    ' float a=clamp((f-1.)/max(length(gf),1e-4)*uScale+.5,0.,1.);\n' +
    ' vec3 n=normalize(vec3(-(hz(fxp)-hz(fxm))/(2.*e),-(hz(fyp)-hz(fym))/(2.*e),1.));\n' +
    ' float fr=pow(1.-clamp(n.z,0.,1.),2.);\n' +
    ' vec3 col=bgCol(p-n.xy*46.)*vec3(.78,.80,.85);\n' +
    ' col=mix(col,envCol(reflect(vec3(0.,0.,-1.),n)),.22+.72*fr);\n' +
    ' float core=0.;for(int i=0;i<6;i++){vec2 d=p-uB[i].xy;float rr=uB[i].z;core+=rr>.5?exp(-dot(d,d)/(rr*rr*.30)):0.;}\n' +
    ' core=clamp(core,0.,1.)*(.88+.12*sin(uT*3.));\n' +
    ' col=mix(col,vec3(.93,.09,.12),core*.62*n.z);\n' +
    ' col+=vec3(1.,.55,.57)*core*.18*n.z;\n' +
    ' col+=.22*smoothstep(.15,.8,dot(n.xy,vec2(.55,.75)))*n.z;\n' +
    ' vec3 V=vec3(0.,0.,1.);\n' +
    ' float sp=pow(max(dot(reflect(-normalize(vec3(-.45,-.7,.8)),n),V),0.),90.);\n' +
    ' float sp2=pow(max(dot(reflect(-normalize(vec3(.7,.2,.7)),n),V),0.),18.)*.22;\n' +
    ' col+=vec3(sp*1.3+sp2);\n' +
    ' col*=1.-.38*smoothstep(.5,.92,fr);\n' +
    ' col=clamp(col,0.,1.);\n' +
    ' gl_FragColor=vec4(col*a,a)+vec4(0.,0.,0.,sh)*(1.-a);\n' +
    '}';
  var G = null, glFailed = false;
  function glInit() {
    var cv = el.gl, gl = cv && cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    var hp = gl.getShaderPrecisionFormat && gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!hp || !hp.precision) return null;                 /* the field needs highp (distances squared up to ~2e6) */
    var sh = function (t, src) { var s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; };
    var vs = sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'), fs = sh(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = function (n) { return gl.getUniformLocation(pr, n); };
    return { cv: cv, gl: gl, uB: u('uB'), uRes: u('uRes'), uScale: u('uScale'), uT: u('uT'), uSh: u('uSh'), drawn: false };
  }
  var arr = new Float32Array(24);
  function glDraw(blobs, T, shadow) {
    var on = blobs.some(function (x) { return x[2] > .4; });
    if (!G) { if (!on || glFailed) return; G = glInit(); if (!G) { glFailed = true; return; } }
    var gl = G.gl;
    if (!on) { if (G.drawn) { gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); G.drawn = false; } return; }
    /* the canvas at the size it is seen (the board is zoomed), at most 1.5 canvas px per board px */
    var shown = G.cv.getBoundingClientRect().width / 1440 || 1;
    var s = Math.max(.5, Math.min(1.5, (window.devicePixelRatio || 1) * shown)), W = Math.round(1440 * s), H = Math.round(900 * s);
    if (G.cv.width !== W) { G.cv.width = W; G.cv.height = H; }
    gl.viewport(0, 0, W, H);
    /* only the box around the drops (and their shadow, 22px lower) is drawn */
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    blobs.forEach(function (x, i) {
      arr[i * 4] = x[0]; arr[i * 4 + 1] = x[1]; arr[i * 4 + 2] = Math.max(0, x[2]);
      if (x[2] > .05) { var m = x[2] * 2.6 + 24; x0 = Math.min(x0, x[0] - m); x1 = Math.max(x1, x[0] + m); y0 = Math.min(y0, x[1] - m); y1 = Math.max(y1, x[1] + m + 22); }
    });
    gl.disable(gl.SCISSOR_TEST); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    var sx = Math.max(0, Math.floor(x0 * s)), sy = Math.max(0, Math.floor(H - y1 * s)), sw = Math.min(W, Math.ceil(x1 * s)) - sx, shh = Math.min(H, Math.ceil(H - y0 * s)) - sy;
    if (sw > 0 && shh > 0) {
      gl.enable(gl.SCISSOR_TEST); gl.scissor(sx, sy, sw, shh);
      gl.uniform4fv(G.uB, arr); gl.uniform2f(G.uRes, W, H); gl.uniform1f(G.uScale, s); gl.uniform1f(G.uT, T); gl.uniform1f(G.uSh, shadow);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    G.drawn = true;
  }

  /* ---- the scroll ---- */
  var stage = root.querySelector('.tq-ibcp__stage');
  /* how far the 2.1 screens of scroll have passed (0..1) → p: the first half to .30, the second from .30 to 1 */
  function target() {
    var r = root.getBoundingClientRect(), track = r.height - stage.offsetHeight, f = track > 0 ? cl(-r.top / track) : 1;
    return f < .5 ? .3 * f / .5 : .3 + .7 * (f - .5) / .5;
  }
  if (reduce) { apply(1, 0); return; }
  var T = 0, cur = target(), last = 0, raf = 0, seen = false;
  apply(cur, 0);
  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
    T += dt;
    var to = target(), k = 1 - Math.exp(-dt * 7);
    cur = Math.abs(to - cur) < 1e-4 ? to : cur + (to - cur) * k;
    apply(cur, T);
  }
  function run() { var go = seen && !document.hidden; if (go && !raf) { last = 0; raf = requestAnimationFrame(tick); } else if (!go && raf) { cancelAnimationFrame(raf); raf = 0; } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { seen = es[es.length - 1].isIntersecting; run(); }, { rootMargin: '80px 0px' }).observe(root);
  } else { seen = true; }
  document.addEventListener('visibilitychange', run);
  run();
})();
