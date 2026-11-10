/* IB Tools hero (IB_Tools_Devices_Film design): a 15.5 s loop in a 1920x1080 scene. A glass commission card becomes a
 * phone, the phone a tablet, the tablet a laptop, and the laptop a desktop that tablet, laptop and phone join.
 * Source of site/assets/js/ib-film.js: edit here, then `cd tools && node build-ib-film.mjs`.
 * React (site/vendor) draws the devices from the clock T; the design's player (animations-v3) is replaced by a light
 * clock: the same scenes and cues, a loop, paused while the hero is off screen or the tab hidden; with reduced motion
 * the scene holds the line-up frame. The captions are the page's text (translated, in the display face) laid over
 * the scene at its foot, not drawn into it, so they stay readable at any scale. */
/* global React, ReactDOM */
(function () {
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── the clock: scenes as in the design (OM_SCENES), cues = where each starts ──────────────────────────────
const SCENES = [['Card', 3], ['Phone', 3], ['Tablet', 3], ['Laptop', 3], ['Lineup', 3], ['Out', 0.5]];
const CUES = {};
let TOTAL = 0;
for (const [n, d] of SCENES) { CUES[n] = TOTAL; TOTAL += d; }
const STILL = CUES.Lineup + 1.7;   // reduced motion: the line-up, all four devices, with the last caption
const Ctx = React.createContext({ T: 0, CUES, authoredTotal: TOTAL });
const useComposition = () => React.useContext(Ctx);

const MOTION = {
  enter: (s, e) => animate({ from: 0, to: 1, start: s, end: e, ease: Easing.easeOutCubic }),
  morph: (s, e) => animate({ from: 0, to: 1, start: s, end: e, ease: Easing.easeInOutCubic }),
  pop: (s, e) => animate({ from: 0, to: 1, start: s, end: e, ease: Easing.easeOutBack }),
};
const lerp = (a, b, p) => a + (b - a) * p;
const cl = (v) => Math.max(0, Math.min(1, v));

// [x, y, w, h, opacity] in screen-content px
const Z = { ti: 0, island: 0, cam1: 0, pen: 0, notch: 0, base: 0, stand: 0 };
const LAY = {
  card:    { ...Z, cx: 0, cy: 0, cam: 1.7, sw: 360, sh: 220, cw: 360, ch: 220, bezel: 0, r: 24, frame: 0, bg: 0,
             blocks: { menu: [0, -40, 360, 26, 0], top: [16, -50, 328, 40, 0], com: [0, 0, 360, 220, 1], cli: [0, 236, 360, 150, 0], tree: [380, 0, 300, 220, 0], ai: [380, 0, 240, 220, 0], tabs: [0, 236, 360, 58, 0] } },
  phone:   { ...Z, ti: 1, island: 1, cx: 0, cy: 0, cam: 1.12, sw: 330, sh: 700, cw: 330, ch: 700, bezel: 12, r: 48, frame: 1, bg: 1,
             blocks: { menu: [0, -40, 330, 26, 0], top: [18, 58, 294, 40, 1], com: [16, 104, 298, 290, 1], cli: [16, 404, 298, 206, 1], tree: [344, 104, 298, 540, 0], ai: [340, 104, 240, 500, 0], tabs: [12, 622, 306, 58, 1] } },
  tablet:  { ...Z, cam1: 1, pen: 1, cx: 0, cy: -10, cam: 0.92, sw: 640, sh: 860, cw: 640, ch: 860, bezel: 20, r: 26, frame: 1, bg: 1,
             blocks: { menu: [0, -40, 640, 26, 0], top: [24, 22, 592, 42, 1], com: [24, 80, 592, 290, 1], cli: [24, 386, 288, 450, 1], tree: [328, 386, 288, 450, 1], ai: [660, 80, 240, 578, 0], tabs: [24, 900, 592, 58, 0] } },
  laptop:  { ...Z, notch: 1, base: 1, cx: 0, cy: -130, cam: 0.8, sw: 1180, sh: 720, cw: 1180, ch: 720, bezel: 14, r: 16, frame: 1, bg: 1,
             blocks: { menu: [0, 0, 1180, 26, 1], top: [24, 36, 1132, 42, 1], com: [24, 92, 560, 304, 1], cli: [24, 412, 560, 284, 1], tree: [600, 92, 300, 604, 1], ai: [916, 92, 240, 604, 1], tabs: [24, 800, 592, 58, 0] } },
  desktop: { ...Z, stand: 1, cx: -30, cy: -170, cam: 1.0, sw: 900, sh: 506, cw: 1180, ch: 664, bezel: 12, r: 12, frame: 1, bg: 1,
             blocks: { menu: [0, 0, 1180, 26, 1], top: [24, 36, 1132, 42, 1], com: [24, 92, 560, 290, 1], cli: [24, 398, 560, 242, 1], tree: [600, 92, 300, 548, 1], ai: [916, 92, 240, 548, 1], tabs: [24, 800, 592, 58, 0] } },
};
function mix(A, B, p) {
  const o = { blocks: {} };
  for (const k in A) if (k !== 'blocks') o[k] = lerp(A[k], B[k], p);
  for (const b in A.blocks) o.blocks[b] = A.blocks[b].map((v, i) => lerp(v, B.blocks[b][i], p));
  return o;
}

const INK = '#0A0A0A', MUTED = '#6B6E75', SOFT = '#8A8D93', RED = '#E7131B';
const REDG = 'linear-gradient(150deg, #F2262E, #B80E15)';
const SILVER = 'linear-gradient(145deg, #F7F8FA 0%, #C4C7CD 38%, #EDEEF1 55%, #9FA3AA 100%)';
const label = { fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: MUTED, whiteSpace: 'nowrap' };
const mono = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontSize: 11, color: SOFT, whiteSpace: 'nowrap' };

function Block({ r, dark, children }) {
  const [x, y, w, h, op] = r;
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, overflow: 'hidden', boxSizing: 'border-box',
      borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
      background: dark ? 'linear-gradient(150deg, #34363E 0%, #0E0F12 60%, #22242A 100%)' : 'linear-gradient(160deg, #FFFFFF 0%, #F3F4F6 100%)',
      border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.95)',
      boxShadow: dark ? 'inset 0 16px 26px -20px rgba(255,255,255,0.3), 0 16px 30px -18px rgba(18,22,30,0.55)' : 'inset 0 -1px 1px rgba(18,22,30,0.06), 0 14px 28px -18px rgba(18,22,30,0.4)',
      color: dark ? '#FFFFFF' : INK,
    }}>{children}</div>
  );
}

function TopBar({ r }) {
  const [x, y, w, h, op] = r;
  const tabs = cl((w - 560) / 240);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, display: 'flex', alignItems: 'center', gap: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 22, height: 22, borderRadius: 7, background: REDG, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }}></span>
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>IB Desk</span>
      </div>
      <div style={{ display: 'flex', gap: 20, fontSize: 13, fontWeight: 600, color: MUTED, opacity: tabs, whiteSpace: 'nowrap' }}>
        <span style={{ color: INK }}>Overview</span><span>Clients</span><span>Commissions</span><span>Network</span>
      </div>
      <span style={{ marginLeft: 'auto', width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(160deg, #F4F5F7, #B9BCC3)', border: '1px solid #FFFFFF', boxShadow: '0 2px 6px rgba(18,22,30,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#2A2C31' }}>AM</span>
    </div>
  );
}

function ComBlock({ r, T, CUES }) {
  const w = r[2];
  const draw = MOTION.enter(0.35, 1.35)(T);
  const count = MOTION.enter(0.2, 1.25)(T);
  const money = (48215.6 * count).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [whole, cents] = money.split('.');
  const fs = Math.max(28, Math.min(40, w / 11));
  const pt = MOTION.enter(CUES.Lineup + 1.2, CUES.Lineup + 2.0)(T);
  return (
    <Block r={r}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={label}>COMMISSIONS</span><span style={mono}>30D</span>
      </div>
      <span style={{ fontSize: fs, fontWeight: 800, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, whiteSpace: 'nowrap' }}>${whole}<span style={{ color: SOFT }}>.{cents}</span></span>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#2A2C31', whiteSpace: 'nowrap' }}>▲ 12.4% vs prior <span style={{ color: SOFT, fontWeight: 500 }}>· illustrative</span></span>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id="ibf-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={RED} stopOpacity="0.18"></stop>
              <stop offset="1" stopColor={RED} stopOpacity="0"></stop>
            </linearGradient>
            <clipPath id="ibf-clip"><rect x="-4" y="-10" width={308 * draw} height="140"></rect></clipPath>
          </defs>
          <path d="M0 30H300M0 70H300M0 110H300" stroke="rgba(18,22,30,0.07)" vectorEffect="non-scaling-stroke"></path>
          <path d="M0 100 L25 94 L50 97 L75 84 L100 88 L125 72 L150 76 L175 60 L200 64 L225 46 L250 50 L275 30 L300 20 L300 120 L0 120 Z" fill="url(#ibf-area)" clipPath="url(#ibf-clip)"></path>
          <path d="M0 100 L25 94 L50 97 L75 84 L100 88 L125 72 L150 76 L175 60 L200 64 L225 46 L250 50 L275 30 L300 20" fill="none" stroke={RED} strokeWidth="2.2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" clipPath="url(#ibf-clip)"></path>
        </svg>
        <span style={{ position: 'absolute', left: '100%', top: '16.7%', width: 10, height: 10, margin: '-5px 0 0 -5px', borderRadius: '50%', background: '#FFFFFF', border: '2px solid ' + RED, boxSizing: 'border-box', opacity: cl((draw - 0.95) * 20) }}></span>
        <span style={{ position: 'absolute', left: '100%', top: '16.7%', width: 10, height: 10, margin: '-5px 0 0 -5px', borderRadius: '50%', border: '2px solid ' + RED, boxSizing: 'border-box', opacity: pt > 0 && pt < 1 ? 0.7 * (1 - pt) : 0, transform: `scale(${1 + pt * 2.6})` }}></span>
      </div>
    </Block>
  );
}

const WEEKS = [[62, 28], [66, 26], [64, 27], [70, 24], [72, 22], [74, 22], [78, 20], [80, 19]];
function CliBlock({ r }) {
  const h = r[3];
  return (
    <Block r={r}>
      <span style={label}>CLIENT ACTIVITY</span>
      <div style={{ display: 'flex', gap: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: MUTED }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2A2C31' }}></span>Active</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>1,284</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: MUTED }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: RED }}></span>Inactive</span>
          <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em' }}>316</span>
        </div>
      </div>
      <div style={{ display: 'flex', height: 8, gap: 3 }}>
        <span style={{ width: '80%', borderRadius: 5, background: 'linear-gradient(90deg, #2A2C31, #6B6E75)' }}></span>
        <span style={{ flex: 1, borderRadius: 5, background: REDG }}></span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'flex-end', gap: 8, paddingTop: 6, opacity: cl((h - 170) / 50), borderBottom: '1px solid rgba(18,22,30,0.1)' }}>
        {WEEKS.map(([a, i], k) => (
          <div key={k} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <span style={{ flex: 1, height: a + '%', borderRadius: '3px 3px 0 0', background: 'linear-gradient(180deg, #6B6E75, #2A2C31)' }}></span>
            <span style={{ flex: 1, height: i + '%', borderRadius: '3px 3px 0 0', background: k === 7 ? REDG : 'linear-gradient(180deg, #DADCE0, #B9BCC3)' }}></span>
          </div>
        ))}
      </div>
    </Block>
  );
}

const N1 = [[60, 120], [150, 120], [240, 120]];
const N2 = [[28, 210, 0], [88, 210, 0], [128, 210, 1], [172, 210, 1], [214, 210, 2], [270, 210, 2]];
function TreeBlock({ r, T, CUES }) {
  const s0 = CUES.Tablet + 0.35;
  const pr = MOTION.pop(s0, s0 + 0.4)(T);
  const p1 = (i) => MOTION.pop(s0 + 0.15 + i * 0.07, s0 + 0.55 + i * 0.07)(T);
  const p2 = (i) => MOTION.pop(s0 + 0.4 + i * 0.05, s0 + 0.8 + i * 0.05)(T);
  const ln = MOTION.enter(s0 + 0.1, s0 + 0.9)(T);
  const red = MOTION.enter(s0 + 0.8, s0 + 1.4)(T);
  const c = (x1, y1, x2, y2) => `M${x1} ${y1} C${x1} ${(y1 + y2) / 2} ${x2} ${(y1 + y2) / 2} ${x2} ${y2}`;
  return (
    <Block r={r}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={label}>SUB-IB NETWORK</span><span style={mono}>3 levels</span>
      </div>
      <svg width="100%" viewBox="0 0 300 240" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', flex: 1, minHeight: 0 }}>
        <g fill="none" stroke="rgba(18,22,30,0.2)" strokeWidth="1.2" opacity={ln}>
          {N1.map(([x, y], i) => <path key={i} d={c(150, 38, x, y - 8)}></path>)}
          {N2.map(([x, y, p], i) => <path key={i} d={c(N1[p][0], N1[p][1] + 8, x, y - 6)}></path>)}
        </g>
        <path d={c(150, 38, 60, 112) + ' ' + c(60, 128, 28, 204)} fill="none" stroke={RED} strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - red}></path>
        <g transform={`translate(150 30) scale(${pr})`}>
          <circle r="16" fill="rgba(231,19,27,0.1)"></circle><circle r="9" fill={RED}></circle>
        </g>
        <text x="166" y="35" fontSize="13" fontWeight="800" fill={INK} fontFamily="Inter, sans-serif" opacity={pr}>You</text>
        {N1.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={7 * p1(i)} fill="#2A2C31" stroke="#FFFFFF" strokeWidth="2"></circle>)}
        {N2.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5 * p2(i)} fill={i === 0 ? RED : '#A0A3A9'} stroke="#FFFFFF" strokeWidth="1.5"></circle>)}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap', borderTop: '1px solid rgba(18,22,30,0.07)', paddingTop: 10 }}>
        <span>Sub-IBs <b style={{ color: INK }}>18</b></span><span>Clients <b style={{ color: INK }}>1,600</b></span>
      </div>
    </Block>
  );
}

const REPLY = 'Here is an overview of your partner network.';
function AiBlock({ r, T, CUES }) {
  const s = CUES.Laptop;
  const ub = MOTION.pop(s + 0.45, s + 0.85)(T);
  const ty = MOTION.enter(s + 0.95, s + 1.55)(T);
  const rows = (i) => MOTION.enter(s + 1.35 + i * 0.12, s + 1.75 + i * 0.12)(T);
  const txt = REPLY.slice(0, Math.round(REPLY.length * ty));
  const row = { display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', gap: 8 };
  return (
    <Block r={r} dark>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 0 C7.6 4.2 9.8 6.4 14 7 C9.8 7.6 7.6 9.8 7 14 C6.4 9.8 4.2 7.6 0 7 C4.2 6.4 6.4 4.2 7 0 Z" fill="#FF4148"></path></svg>
        <span style={{ ...label, color: '#FFFFFF' }}>ASK AI</span>
      </div>
      <div style={{ alignSelf: 'flex-end', maxWidth: '88%', padding: '9px 12px', borderRadius: '12px 12px 4px 12px', background: 'linear-gradient(170deg, #FFFFFF, #DCDEE3)', color: INK, fontSize: 12.5, lineHeight: 1.4, fontWeight: 600, opacity: cl(ub), transform: `scale(${0.85 + 0.15 * ub})`, transformOrigin: '100% 100%' }}>Show me an overview of my partner network.</div>
      <span style={{ fontSize: 12.5, lineHeight: 1.45, color: '#D4D6DB', fontWeight: 500, minHeight: 36 }}>{txt}</span>
      <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...row, opacity: rows(0), borderBottom: '1px solid rgba(255,255,255,0.08)' }}><span style={{ color: '#A0A3A9' }}>Sub-IBs</span><span>18</span></div>
        <div style={{ ...row, opacity: rows(1), borderBottom: '1px solid rgba(255,255,255,0.08)' }}><span style={{ color: '#A0A3A9' }}>Active clients</span><span>1,284</span></div>
        <div style={{ ...row, opacity: rows(2) }}><span style={{ color: '#A0A3A9' }}>Top partner</span><span>Northline</span></div>
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 5px 0 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)' }}>
        <span style={{ flex: 1, fontSize: 11, color: SOFT, whiteSpace: 'nowrap', overflow: 'hidden' }}>Ask about your network…</span>
        <span style={{ width: 26, height: 26, borderRadius: '50%', background: REDG, flex: 'none' }}></span>
      </div>
    </Block>
  );
}

function MenuBar({ r }) {
  const [x, y, w, h, op] = r;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, display: 'flex', alignItems: 'center', gap: 18, padding: '0 16px', boxSizing: 'border-box', background: 'rgba(255,255,255,0.55)', borderBottom: '1px solid rgba(18,22,30,0.06)', fontSize: 12, fontWeight: 600, color: '#2A2C31', whiteSpace: 'nowrap' }}>
      <span style={{ fontWeight: 800 }}>IB Desk</span><span>File</span><span>Edit</span><span>View</span><span>Window</span>
      <span style={{ marginLeft: 'auto' }}>Mon 9:41</span>
    </div>
  );
}

function TabBar({ r }) {
  const [x, y, w, h, op] = r;
  const items = ['Overview', 'Clients', 'Network', 'Ask AI'];
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: op, borderRadius: 22, background: 'linear-gradient(160deg, #FFFFFF, #F1F2F4)', border: '1px solid #FFFFFF', boxShadow: '0 12px 24px -16px rgba(18,22,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
      {items.map((t, i) => (
        <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 18, height: 18, borderRadius: i === 3 ? '50%' : 6, background: i === 0 ? REDG : 'linear-gradient(160deg, #C9CCD2, #8A8D93)' }}></span>
          <span style={{ fontSize: 10, fontWeight: 700, color: i === 0 ? INK : SOFT, whiteSpace: 'nowrap' }}>{t}</span>
        </div>
      ))}
    </div>
  );
}

const TITAN = 'linear-gradient(145deg, #6E7178 0%, #2B2D31 34%, #8A8D93 52%, #3A3C41 70%, #1C1D20 100%)';
const KROWS = [
  [['esc', 1.5], ...'1234567890ab'.split('').map(() => ['', 1]), ['', 1.5]],
  [['`', 1], ...'1234567890-='.split('').map((c) => [c, 1]), ['delete', 2]],
  [['tab', 1.5], ...'QWERTYUIOP[]'.split('').map((c) => [c, 1]), ['\\', 1.5]],
  [['caps', 1.75], ...'ASDFGHJKL;\''.split('').map((c) => [c, 1]), ['return', 2.25]],
  [['shift', 2.25], ...'ZXCVBNM,./'.split('').map((c) => [c, 1]), ['shift', 2.75]],
  [['fn', 1], ['ctrl', 1], ['opt', 1], ['cmd', 1.25], ['', 5.5], ['cmd', 1.25], ['opt', 1], ['arrows', 3]],
];
const KEY = { height: '100%', borderRadius: 5, background: 'linear-gradient(180deg, #33353A 0%, #1B1C1F 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 1px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#BFC2C8', fontFamily: "'Inter', sans-serif", overflow: 'hidden', whiteSpace: 'nowrap' };
function Keyboard() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, padding: 7, borderRadius: 10, background: 'linear-gradient(180deg, #B4B8BF, #C9CCD2)', boxShadow: 'inset 0 2px 4px rgba(18,22,30,0.35), inset 0 -1px 0 rgba(255,255,255,0.6)' }}>
      {KROWS.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 5, height: ri === 0 ? 16 : 30 }}>
          {row.map(([t, u], ki) => t === 'arrows' ? (
            <div key={ki} style={{ flex: u, display: 'flex', gap: 3, alignItems: 'flex-end' }}>
              <span style={{ ...KEY, flex: 1, height: '50%' }}></span>
              <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ ...KEY, flex: 1 }}></span><span style={{ ...KEY, flex: 1 }}></span></div>
              <span style={{ ...KEY, flex: 1, height: '50%' }}></span>
            </div>
          ) : (
            <span key={ki} style={{ ...KEY, flex: u, fontSize: t.length > 1 ? 8.5 : 10, justifyContent: t.length > 1 && ki === 0 ? 'flex-start' : t.length > 1 ? 'flex-end' : 'center', padding: t.length > 1 ? '0 7px' : 0 }}>{t}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
const GRILLE = { width: '5.5%', borderRadius: 6, backgroundImage: 'radial-gradient(circle, rgba(18,22,30,0.45) 0 1px, rgba(0,0,0,0) 1.6px)', backgroundSize: '6px 6px', opacity: 0.8 };

function Device({ lay, T, CUES }) {
  const ow = lay.sw + 2 * lay.bezel, oh = lay.sh + 2 * lay.bezel;
  const sc = lay.sw / lay.cw;
  const b = lay.blocks;
  const dw = ow * 1.08;
  const btn = { position: 'absolute', width: 4, borderRadius: 2, background: TITAN, opacity: lay.island };
  return (
    <div style={{ position: 'absolute', left: -ow / 2, top: -oh / 2, width: ow, height: oh }}>
      <div style={{ position: 'absolute', left: ow * 0.06, right: ow * 0.06, top: oh + 6 + lay.base * 250 + lay.stand * 112, height: 60, marginTop: -24, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(18,22,30,0.34), rgba(18,22,30,0))', opacity: 0.25 + 0.75 * lay.frame }}></div>
      <div style={{ position: 'absolute', left: ow / 2 - 60, top: oh - 4, width: 120, height: 104, background: 'linear-gradient(90deg, #A9ADB4, #EDEEF1 45%, #B9BCC3)', opacity: lay.stand, clipPath: 'polygon(14% 0, 86% 0, 100% 100%, 0 100%)' }}></div>
      <div style={{ position: 'absolute', left: ow / 2 - 170, top: oh + 98, width: 340, height: 14, borderRadius: 8, background: SILVER, boxShadow: '0 10px 20px -8px rgba(18,22,30,0.4)', opacity: lay.stand }}></div>
      <div style={{ position: 'absolute', left: (ow - dw) / 2 + 6, top: oh - 6, width: dw - 12, height: 10, borderRadius: 3, background: 'linear-gradient(180deg, #2A2C31, #6B6E75)', opacity: lay.base }}></div>
      <div style={{ position: 'absolute', left: (ow - dw) / 2, top: oh + 2, width: dw, height: 330, transformOrigin: '50% 0', transformStyle: 'preserve-3d', transform: `perspective(1300px) rotateX(${90 - 34 * lay.base}deg)`, opacity: lay.base }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '8px 8px 30px 30px', background: 'linear-gradient(180deg, #F1F2F4 0%, #DCDFE3 55%, #C6C9CF 100%)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.95), inset 0 -3px 6px rgba(18,22,30,0.1)', padding: '24px 4% 0', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <div style={{ width: '100%', display: 'flex', gap: '2.5%' }}>
            <div style={GRILLE}></div>
            <Keyboard />
            <div style={GRILLE}></div>
          </div>
          <div style={{ width: '40%', height: 118, borderRadius: 14, background: 'linear-gradient(170deg, #E6E8EB 0%, #D3D6DB 100%)', boxShadow: 'inset 0 0 0 1px rgba(18,22,30,0.1), inset 0 2px 0 rgba(255,255,255,0.9), 0 1px 0 rgba(255,255,255,0.7)' }}></div>
        </div>
        <div style={{ position: 'absolute', left: '50%', bottom: -1, width: 120, height: 6, marginLeft: -60, borderRadius: '8px 8px 0 0', background: 'linear-gradient(180deg, #B4B8BF, #D3D6DB)' }}></div>
      </div>
      <div style={{ position: 'absolute', left: (ow - dw) / 2 + 10, top: oh + 2 + 330 * Math.cos((90 - 34 * lay.base) * Math.PI / 180) * 0.86, width: dw - 20, height: 12, borderRadius: '0 0 14px 14px', background: 'linear-gradient(180deg, #B9BCC3, #8A8D93)', boxShadow: '0 22px 30px -12px rgba(18,22,30,0.5)', opacity: lay.base }}></div>
      <div style={{ ...btn, left: -3, top: oh * 0.17, height: 30 }}></div>
      <div style={{ ...btn, left: -3, top: oh * 0.25, height: 58 }}></div>
      <div style={{ ...btn, left: -3, top: oh * 0.35, height: 58 }}></div>
      <div style={{ ...btn, left: ow - 1, top: oh * 0.28, height: 92 }}></div>
      <div style={{ position: 'absolute', left: ow + 6, top: oh * 0.2, width: 13, height: oh * 0.46, borderRadius: 7, background: 'linear-gradient(90deg, #FFFFFF 0%, #ECEDF0 55%, #C9CCD2 100%)', boxShadow: '0 8px 16px -8px rgba(18,22,30,0.45)', opacity: lay.pen }}></div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: lay.r + lay.bezel, background: SILVER, opacity: lay.frame * (1 - lay.ti), boxShadow: '0 50px 90px -40px rgba(18,22,30,0.5), inset 0 1px 1px rgba(255,255,255,0.9)' }}></div>
      <div style={{ position: 'absolute', inset: 0, borderRadius: lay.r + lay.bezel, background: TITAN, opacity: lay.frame * lay.ti, boxShadow: '0 50px 90px -40px rgba(18,22,30,0.55), inset 0 1px 1px rgba(255,255,255,0.5)' }}></div>
      <div style={{ position: 'absolute', inset: Math.min(3, lay.bezel), borderRadius: Math.max(0, lay.r + lay.bezel - 3), background: '#0B0C0E', opacity: lay.frame }}></div>
      <div style={{ position: 'absolute', left: ow / 2 - 4, top: lay.bezel / 2 - 4, width: 8, height: 8, borderRadius: '50%', background: '#1E2026', boxShadow: 'inset 0 0 0 2px #2E3138', opacity: lay.cam1 }}></div>
      <div style={{ position: 'absolute', left: lay.bezel, top: lay.bezel, width: lay.sw, height: lay.sh, borderRadius: lay.r, overflow: 'hidden', boxShadow: lay.frame < 0.5 ? `0 40px 70px -30px rgba(18,22,30,${0.45 * (1 - lay.frame * 2)})` : 'none' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: lay.bg, background: 'radial-gradient(60% 50% at 30% 20%, #FFFFFF 0%, rgba(255,255,255,0) 70%), linear-gradient(160deg, #ECEEF1 0%, #D6D9DE 100%)' }}></div>
        <div style={{ position: 'absolute', left: 0, top: 0, width: lay.cw, height: lay.ch, transform: `scale(${sc})`, transformOrigin: '0 0' }}>
          <MenuBar r={b.menu} />
          <TopBar r={b.top} />
          <ComBlock r={b.com} T={T} CUES={CUES} />
          <CliBlock r={b.cli} />
          <TreeBlock r={b.tree} T={T} CUES={CUES} />
          <AiBlock r={b.ai} T={T} CUES={CUES} />
          <TabBar r={b.tabs} />
        </div>
        <div style={{ position: 'absolute', left: 26, top: 16, fontSize: 14, fontWeight: 700, color: INK, opacity: lay.island }}>9:41</div>
        <div style={{ position: 'absolute', right: 24, top: 18, display: 'flex', alignItems: 'center', gap: 6, opacity: lay.island }}>
          <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 11 }}>{[4, 6, 8, 11].map((h) => <span key={h} style={{ width: 3, height: h, borderRadius: 1, background: INK }}></span>)}</span>
          <span style={{ width: 22, height: 11, borderRadius: 3, border: '1.5px solid ' + INK, boxSizing: 'border-box', padding: 1.5, display: 'flex' }}><span style={{ width: '75%', background: INK, borderRadius: 1 }}></span></span>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: 11, width: 100, height: 30, marginLeft: -50, borderRadius: 16, background: '#0B0C0E', opacity: lay.island }}></div>
        <div style={{ position: 'absolute', left: '50%', bottom: 8, width: 124, height: 5, marginLeft: -62, borderRadius: 3, background: INK, opacity: 0.85 * lay.island }}></div>
        <div style={{ position: 'absolute', left: '50%', top: 0, width: 170, height: 26, marginLeft: -85, borderRadius: '0 0 12px 12px', background: '#0B0C0E', opacity: lay.notch }}>
          <span style={{ position: 'absolute', left: '50%', top: 9, width: 8, height: 8, marginLeft: -4, borderRadius: '50%', background: '#1E2026', boxShadow: 'inset 0 0 0 2px #2E3138' }}></span>
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.55 * lay.frame, background: 'linear-gradient(115deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.35) 38%, rgba(255,255,255,0) 46%)' }}></div>
      </div>
    </div>
  );
}

const FRIENDS = [
  { k: 'tablet', x: -640, y: 110, s: 0.38, z: 60 },
  { k: 'laptop', x: 600, y: 80, s: 0.42, z: 60 },
  { k: 'phone', x: 230, y: 170, s: 0.5, z: 130 },
];

function Piece({ orbit }) {
  const { T, CUES, authoredTotal } = useComposition();
  const total = authoredTotal || 10;
  const seq = [
    ['card', 'phone', CUES.Phone - 0.35, CUES.Phone + 0.8],
    ['phone', 'tablet', CUES.Tablet - 0.25, CUES.Tablet + 0.8],
    ['tablet', 'laptop', CUES.Laptop - 0.25, CUES.Laptop + 0.8],
    ['laptop', 'desktop', CUES.Lineup - 0.1, CUES.Lineup + 1.0],
  ];
  let lay = LAY.card;
  for (const [a, b, s, e] of seq) if (T >= s) lay = mix(LAY[a], LAY[b], MOTION.morph(s, e)(T));

  const intro = MOTION.enter(0, 0.9)(T);
  const out = MOTION.morph(CUES.Out, total)(T);
  const u = T / total;
  const ry = orbit ? lerp(-14, 9, u) : -6;
  const rx = orbit ? lerp(9, 5, u) : 6;
  const cam = lay.cam * (0.94 + 0.06 * intro) * (1 - 0.04 * out);

  return (
    <div data-screen-label={`IB devices t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden', fontFamily: "'Inter', sans-serif", color: INK }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(40% 50% at 50% 44%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%), radial-gradient(30% 36% at 78% 30%, rgba(28,30,36,0.14) 0%, rgba(28,30,36,0) 70%), radial-gradient(26% 26% at 30% 78%, rgba(231,19,27,0.07) 0%, rgba(231,19,27,0) 70%)' }}></div>
      <div style={{ position: 'absolute', inset: 0, perspective: 2400, perspectiveOrigin: '50% 45%', opacity: intro * (1 - out) }}>
        <div style={{ position: 'absolute', left: 960, top: 540, width: 0, height: 0, transformStyle: 'preserve-3d', transform: `scale(${cam}) rotateX(${rx}deg) rotateY(${ry}deg)` }}>
          <div style={{ position: 'absolute', left: lay.cx, top: lay.cy + 20 * (1 - intro) }}>
            <Device lay={lay} T={T} CUES={CUES} />
          </div>
          {FRIENDS.map((f, i) => {
            const p = MOTION.enter(CUES.Lineup + 0.35 + i * 0.12, CUES.Lineup + 1.15 + i * 0.12)(T);
            return (
              <div key={f.k} style={{ position: 'absolute', left: f.x, top: f.y + 70 * (1 - p), opacity: p, transform: `translateZ(${f.z}px) scale(${f.s * (0.9 + 0.1 * p)})` }}>
                <Device lay={LAY[f.k]} T={T} CUES={CUES} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── captions: when each shows (the design's timings), drawn by the page in its own type ──────────────────
const CAPS = [
  { at: 0.4, until: CUES.Phone + 0.1 },
  { at: CUES.Phone + 0.5, until: CUES.Tablet - 0.05 },
  { at: CUES.Tablet + 0.45, until: CUES.Laptop - 0.05 },
  { at: CUES.Laptop + 0.45, until: CUES.Lineup - 0.05 },
  { at: CUES.Lineup + 1.0, until: TOTAL, sub: true },
];
/* a caption's sentences, each kept whole on narrow screens (a line breaks between them, not inside "Any-screen"),
   their closing stops in red as in the design; the spacing between them is the text's own (none in CJK) */
const SENT = /\s*[^.。．!?！？]+[.。．!?！？]*|\s*[.。．!?！？]+/g;
function sentences(text) {
  return (text.match(SENT) || []).map((m, i) => {
    const [, lead, words, stop] = m.match(/^(\s*)([\s\S]*?)([.。．!?！？]*)$/);
    return <React.Fragment key={i}>{lead}<span className="tq-ibh__s">{words}{stop && <span className="tq-ibh__dot">{stop}</span>}</span></React.Fragment>;
  });
}
function Caption({ T, texts, brand }) {
  const ci = CAPS.reduce((k, c, i) => (T >= c.at - 0.05 ? i : k), 0);
  const C = CAPS[ci];
  const out = MOTION.morph(CUES.Out, TOTAL)(T);
  const cap = MOTION.enter(C.at, C.at + 0.5)(T) * (C.sub ? 1 : 1 - MOTION.enter(C.until - 0.35, C.until)(T));
  return (
    <div className="tq-ibh__cap" aria-hidden="true" style={{ opacity: cap * (1 - out), transform: `translateY(${16 * (1 - cap)}px)` }}>
      <span className={'tq-h2 tq-ibh__line' + (C.sub ? ' is-sub' : '')}>{sentences(texts[ci] || '')}</span>
      <span className="tq-ibh__brand" style={{ opacity: C.sub ? 1 : 0 }}>{brand}</span>
    </div>
  );
}

/* the 1920x1080 scene in the hero. Landscape: whole, as large as fits. Tall screens: the scene runs past the sides
   (only its middle holds devices): card, phone and tablet (at most ~1100 px wide) fill the width; while the laptop is
   on, the view widens to its ~1400 px (keyboard deck in perspective), and for the line-up to ~1780 px */
function scale(w, h, T) {
  if (!w || !h) return 0;
  if (w >= h * 1.1) return Math.min(w / 1920, h / 1080);
  const lap = MOTION.morph(CUES.Laptop - 0.25, CUES.Laptop + 0.8)(T);
  const all = MOTION.morph(CUES.Lineup - 0.1, CUES.Lineup + 1.0)(T);
  return Math.min(h * 0.6 / 800, w / lerp(lerp(1100, 1400, lap), 1780, all));   // the tallest device (the phone) ~800 px: 60% of the hero
}

/* Phones (portrait, up to 640px) play a video of the scene instead (assets/ib/ib-film-phone.mp4, made by
   tools/render-ib-film.mjs from this film in ?film=capture mode): ~1800 elements with shadows and gradients redrawn
   30 times a second are too much for a phone, a video is not. The captions stay the page's text, in step with the
   video's time. If the video cannot play (iOS Low Power Mode), its poster (the line-up) stays, with the last caption. */
const CAPTURE = /[?&]film=capture\b/.test(location.search);
const PHONE = '(max-width: 640px) and (max-aspect-ratio: 1/1)';

function Hero({ texts, brand, still, src, poster }) {
  const [T, setT] = React.useState(still ? STILL : 0);
  const [size, setSize] = React.useState([0, 0]);
  const usesVideo = () => !!src && !still && !CAPTURE && matchMedia(PHONE).matches;
  const [video, setVideo] = React.useState(usesVideo);
  const box = React.useRef(null), vid = React.useRef(null);
  React.useEffect(() => {
    const mq = matchMedia(PHONE), on = () => setVideo(usesVideo());
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  /* capture mode: the renderer sets the time itself */
  React.useEffect(() => {
    if (CAPTURE) window.ibFilmSeek = (t) => new Promise((r) => { setT(t); requestAnimationFrame(() => requestAnimationFrame(r)); });
  }, []);
  React.useLayoutEffect(() => {
    const el = box.current;
    const fit = () => setSize([el.clientWidth, el.clientHeight]);
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [w, h] = size, k = scale(w, h, T), tall = w && w < h * 1.1;
  /* the loop: real time (or the video's), paused off screen and in a hidden tab; touch screens at 30 fps */
  React.useEffect(() => {
    if (still || CAPTURE) return undefined;
    const el = box.current, v = video ? vid.current : null, coarse = matchMedia('(pointer: coarse)').matches;
    let raf = 0, last = 0, t = 0, seen = true, acc = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      t = v ? v.currentTime % TOTAL : (t + dt) % TOTAL; acc += dt;
      if (coarse && acc < 1 / 30) return;
      acc = 0; setT(t);
    };
    const run = () => {
      if (raf || !seen || document.hidden) return;
      last = 0; raf = requestAnimationFrame(frame);
      if (v) { v.muted = true; v.play().catch(() => { stop(); setT(STILL); }); }
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; if (v) v.pause(); };
    const io = new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) run(); else stop(); });
    io.observe(el);
    const vis = () => { if (document.hidden) stop(); else run(); };
    document.addEventListener('visibilitychange', vis);
    run();
    return () => { stop(); io.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, [still, video]);
  const value = React.useMemo(() => ({ T, CUES, authoredTotal: TOTAL }), [T]);
  return (
    <Ctx.Provider value={value}>
      <div ref={box} className={'tq-ibh__box' + (tall ? ' is-tall' : '')} style={{ '--k': k }}>
        {video ? (
          <video ref={vid} className="tq-ibh__video" src={src} poster={poster} muted playsInline loop preload="auto" disablePictureInPicture />
        ) : (
          <div className="tq-ibh__scene" dir="ltr" lang="en" style={{ transform: `translate(-50%, -50%) scale(${k})`, visibility: k ? 'visible' : 'hidden' }}>
            <Piece orbit />
          </div>
        )}
        <Caption T={T} texts={texts} brand={brand} />
      </div>
    </Ctx.Provider>
  );
}

const root = document.querySelector('[data-ib-film]');
if (root && window.React && window.ReactDOM) {
  const texts = Array.from(document.querySelectorAll('[data-ib-caps] li'), (li) => li.textContent.trim());
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  ReactDOM.createRoot(root).render(<Hero texts={texts} brand={root.getAttribute('data-brand') || ''} still={still} src={root.getAttribute('data-src')} poster={root.getAttribute('data-poster')} />);
}
})();
