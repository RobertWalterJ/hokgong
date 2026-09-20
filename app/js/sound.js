// Palimpsest — the sound of a reading room by the water.
//
// Everything is synthesised at runtime from noise, resonators and a few sine
// partials: no samples, nothing downloaded, works offline.
//
// WHAT IT IS NOT. No hand drums, no cedar flutes, no "tribal" anything. Those
// would be cheesy, and worse, they would be a costume — the exact
// flattening of many nations into one "Indian" sound that the pack's own
// nomenclature chapter warns against. Synthesis cannot make a convincing
// instrument anyway; the honest thing it can make is MATERIAL.
//
// SO: the materials of the subject. Birchbark (the scrolls), stone (chert, the
// Maritime Archaic's currency), water (every centre in the pack is on a river
// or a coast), paper (the books themselves), and the quiet of a room where
// you read. Each cue is a gesture made with one of those.
//
// THREE RULES, inherited from Landfall's sound lab and measured the same way
// (build/sound-lab.html):
//   1. Stay where a phone can speak: nothing carries meaning below ~400 Hz.
//   2. Subtle means short and quiet, not thin: everything shares one small,
//      dark room, which is what makes synthesis sound placed rather than cheap.
//   3. Speech wins: when read-aloud is talking, everything ducks to 22%.
// Sound is ON only if you turn it on; the room tone is a separate choice.

let ctx = null;
let bus = null;
let on = false;
let ducked = false;
let step = 0;

// A minor pentatonic, 660–1320 Hz: water drops sit here, where a phone speaker
// is flattering and nothing is piercing. Rises with a streak, folds back.
const DROPS = [659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!bus) bus = buildBus(ctx);
  return ctx;
}

// The room: a short, dark, wooden-sounding impulse. Decorrelated channels for
// width; a one-pole lowpass so the tail loses its top like a real small room.
function impulse(c, seconds = 0.9, decay = 3.6) {
  const n = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < n; i++) {
      last = last * 0.76 + (Math.random() * 2 - 1) * 0.24;
      d[i] = last * (1 - i / n) ** decay;
    }
  }
  return buf;
}

function buildBus(c) {
  const master = c.createGain();
  master.gain.value = ducked ? 0.22 : 0.9;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -30; comp.knee.value = 6; comp.ratio.value = 3;
  comp.attack.value = 0.003; comp.release.value = 0.18;
  const makeup = c.createGain();
  makeup.gain.value = 1.6;
  const verb = c.createConvolver();
  verb.buffer = impulse(c);
  const verbTone = c.createBiquadFilter();
  verbTone.type = 'highpass'; verbTone.frequency.value = 420;
  const verbGain = c.createGain();
  verbGain.gain.value = 0.85;
  const send = c.createGain();
  send.connect(verb).connect(verbTone).connect(verbGain).connect(master);
  master.connect(comp).connect(makeup).connect(c.destination);
  return { master, send };
}

const rnd = (a, b) => a + Math.random() * (b - a);
const vary = (f, cents = 8) => f * (2 ** (rnd(-cents, cents) / 1200));

function out(node, gain, verbAmount, at = null) {
  const dry = ctx.createGain();
  dry.gain.value = gain;
  node.connect(dry).connect(at || bus.master);
  if (verbAmount > 0) {
    const wet = ctx.createGain();
    wet.gain.value = gain * verbAmount;
    node.connect(wet).connect(bus.send);
  }
}

function noiseBuffer(c, seconds, shape = 1.6) {
  const len = Math.max(64, Math.floor(c.sampleRate * seconds));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** shape;
  return buf;
}

// Filtered noise: bark, paper, stone contact.
function hiss(freq, { at = 0, dur = 0.03, gain = 0.05, q = 1.1, verb = 0.1, sweep = 1, shape = 1.6, attack = 0 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const n = c.createBufferSource();
  n.buffer = noiseBuffer(c, dur, shape);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (sweep !== 1) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + attack); } else g.gain.value = 1;
  n.connect(f).connect(g);
  out(g, gain * rnd(0.9, 1.1), verb);
  n.start(t); n.stop(t + dur + 0.02);
}

// A water drop: a sine whose pitch leaps UP as the bubble forms and rings
// down fast. That upward chirp is the whole signature of a drop — a falling
// or level tone reads as a beep.
function drop(freq, { at = 0, gain = 0.09, verb = 0.45, len = 0.12 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const f = vary(freq, 12);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f * 0.62, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.018);
  o.frequency.exponentialRampToValueAtTime(f * 1.12, t + len);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g);
  out(g, gain * rnd(0.92, 1.06), verb);
  o.start(t); o.stop(t + len + 0.03);
  // the tiny splash on contact
  hiss(4200, { at, dur: 0.008, gain: gain * 0.25, q: 0.8, verb: 0.1 });
}

// Struck wood: a triangle through a closing lowpass plus a quiet fourth
// partial — the marimba-ish "tok" of a hollow log or a wooden bowl.
function wood(freq, { at = 0, dur = 0.28, gain = 0.07, verb = 0.3, bright = 2200 } = {}) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const f = vary(freq, 6);
  const o = c.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f, t);
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(Math.max(bright, f * 2), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.05, 300), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(1, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g);
  out(g, gain * rnd(0.94, 1.06), verb);
  o.start(t); o.stop(t + dur + 0.03);
  const p = c.createOscillator();
  p.type = 'sine';
  p.frequency.setValueAtTime(f * 3.93, t);          // inharmonic, like a bar
  const pg = c.createGain();
  pg.gain.setValueAtTime(0.0001, t);
  pg.gain.exponentialRampToValueAtTime(1, t + 0.003);
  pg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.3);
  p.connect(pg);
  out(pg, gain * 0.14, verb);
  p.start(t); p.stop(t + dur + 0.03);
}

// ── public ─────────────────────────────────────────────────────────────
export function setSound(v) { on = !!v; if (!on) setAmbience(false); }
export function primeSound() { ac(); }
export function resetStreak() { step = 0; }
export function setSpeaking(v) {
  ducked = !!v;
  if (!ctx || !bus) return;
  const t = ctx.currentTime;
  bus.master.gain.cancelScheduledValues(t);
  bus.master.gain.setTargetAtTime(ducked ? 0.22 : 0.9, t, 0.05);
}

// Any tap: a dry flick of birchbark. Felt more than heard.
export function press() {
  if (!on) return;
  hiss(2600, { dur: 0.011, gain: 0.07, q: 1.4, verb: 0.03 });
  hiss(1100, { at: 0.002, dur: 0.02, gain: 0.03, q: 2.2, verb: 0.03 });
}

// Right: one drop into still water, a little higher with each in a row.
export function right(n = null) {
  step = n == null ? step + 1 : n;
  if (!on) return;
  const i = Math.max(0, step - 1);
  const f = DROPS[i < DROPS.length ? i : 2 + ((i - DROPS.length) % (DROPS.length - 2))];
  drop(f, { gain: 0.1 });
  // every fifth in a row, the ring answers itself — a second, softer drop
  if (step > 0 && step % 5 === 0) drop(f * 1.5, { at: 0.13, gain: 0.05, verb: 0.6 });
}

// Wrong: two small stones knocked together, muted, and a low wooden settle.
// It says "no" by texture and a falling step — never an alarm.
export function wrong() {
  step = 0;
  if (!on) return;
  // Quieter than `right` on purpose (the lab measured it 5 dB louder at
  // first): a mistake should never sound bigger than getting it right.
  hiss(1800, { dur: 0.009, gain: 0.04, q: 3.5, verb: 0.08 });
  hiss(1450, { at: 0.055, dur: 0.009, gain: 0.032, q: 3.5, verb: 0.08 });
  wood(466.16, { at: 0.03, dur: 0.22, gain: 0.026, verb: 0.2, bright: 1400 });
  wood(415.3, { at: 0.1, dur: 0.3, gain: 0.024, verb: 0.25, bright: 1200 });
}

// The source card arriving: a sheet of paper settling on a table.
export function reveal(good = true) {
  if (!on) return;
  hiss(good ? 2600 : 2200, { dur: 0.16, gain: 0.03, q: 0.7, verb: 0.2, sweep: 0.55, attack: 0.03, shape: 1.2 });
}

// Next question: a page turned — lift, then settle.
export function advance() {
  if (!on) return;
  hiss(2300, { dur: 0.09, gain: 0.035, q: 0.8, verb: 0.12, sweep: 1.3, attack: 0.03, shape: 1 });
  hiss(1700, { at: 0.08, dur: 0.07, gain: 0.03, q: 0.9, verb: 0.15, sweep: 0.7 });
}

// A clean round: rain on water, then one warm wooden note.
export function fanfare() {
  if (!on) return;
  const notes = [1318.51, 1046.5, 880, 1174.66, 783.99];
  let at = 0;
  notes.forEach((f) => { drop(f, { at, gain: 0.065, verb: 0.55 }); at += rnd(0.07, 0.12); });
  wood(523.25, { at: at + 0.05, dur: 0.6, gain: 0.07, verb: 0.55 });
}

// ── room tone ──────────────────────────────────────────────────────────
// Air moving past a window by the water: band-limited noise (it has to live
// above 500 Hz or a phone renders nothing but hiss), slowly breathing in level
// and colour, with a rare, faint drip. Around 45 dB below full scale — you
// notice it most when it stops. Paused when the app is in the background.
let amb = null;
export function setAmbience(v) {
  if (!v || !on) {
    if (amb) { const a = amb; amb = null; try { a.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); setTimeout(() => { try { a.src.stop(); } catch { /* */ } clearTimeout(a.dripT); }, 1500); } catch { /* */ } }
    return;
  }
  const c = ac(); if (!c || amb) return;
  const src = c.createBufferSource();
  const secs = 6;
  const buf = c.createBuffer(2, c.sampleRate * secs, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b = 0;
    for (let i = 0; i < d.length; i++) { b = b * 0.97 + (Math.random() * 2 - 1) * 0.03; d[i] = b * 6; }
    // crossfade the loop seam
    const x = Math.floor(c.sampleRate * 0.25);
    for (let i = 0; i < x; i++) { const k = i / x; d[i] = d[i] * k + d[d.length - x + i] * (1 - k); }
  }
  src.buffer = buf; src.loop = true; src.loopEnd = secs - 0.25;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
  const lfoAmt = c.createGain(); lfoAmt.gain.value = 260;
  lfo.connect(lfoAmt).connect(bp.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.setTargetAtTime(0.02, c.currentTime, 1.2);
  const breath = c.createOscillator(); breath.frequency.value = 0.045;
  const breathAmt = c.createGain(); breathAmt.gain.value = 0.007;
  breath.connect(breathAmt).connect(g.gain);
  src.connect(bp).connect(g).connect(bus.master);
  src.start(); lfo.start(); breath.start();
  amb = { src, g, dripT: null };
  const drip = () => {
    if (!amb) return;
    if (!ducked && document.visibilityState === 'visible') drop(rnd(900, 1250), { gain: 0.018, verb: 0.8, len: 0.1 });
    amb.dripT = setTimeout(drip, rnd(9000, 24000));
  };
  amb.dripT = setTimeout(drip, rnd(6000, 14000));
}
document.addEventListener?.('visibilitychange', () => {
  if (!ctx) return;
  if (document.visibilityState === 'hidden') ctx.suspend?.().catch(() => {});
  else if (on) ctx.resume?.().catch(() => {});
});

// ── measurement ────────────────────────────────────────────────────────
export const CUES = ['press', 'right', 'wrong', 'reveal', 'advance', 'fanfare'];
export async function __render(name, OfflineCtx, seconds = 3) {
  const prev = { ctx, bus, on, step };
  const c = new OfflineCtx(2, Math.ceil(44100 * seconds), 44100);
  ctx = c; bus = buildBus(c); on = true;
  if (name === 'right') step = 0;
  ({ press, right, wrong, reveal, advance, fanfare })[name]();
  const r = await c.startRendering();
  ({ ctx, bus, on, step } = prev);
  return r;
}
