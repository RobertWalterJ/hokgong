// Hok Gong — hearing your own tone.
//
// Cantonese has six tones on level syllables, and they are the difference
// between 詩 si1 (poem), 史 si2 (history), 試 si3 (to try), 時 si4 (time),
// 市 si5 (market) and 是 si6. Recognising them is one skill; producing them is
// another, and no amount of listening practice tests the second one. So the
// phone listens: it tracks the pitch of what you just said and reports the
// shape it actually measured.
//
// What it does:
//   - records a short burst from the microphone (nothing leaves the device;
//     nothing is stored);
//   - estimates the fundamental frequency every 10 ms by normalised
//     autocorrelation, keeping only frames that are clearly voiced;
//   - converts to semitones relative to YOUR pitch range, learnt from your own
//     attempts, because a tone is a pitch relative to the speaker, not an
//     absolute frequency — this is why a child and an adult say the same tone
//     at frequencies an octave apart;
//   - describes the contour: where it sits in your range, and whether it
//     rises, falls or holds.
//
// What it does NOT do, and says so: it is not a judgement of your accent, it
// cannot hear vowel quality or final consonants, and on a noisy street it will
// simply report that it could not hear a clear pitch. The six tone targets
// below are the standard Chao pitch values (Bauer & Benedict, *Modern
// Cantonese Phonology*, 1997): 55, 25, 33, 21, 23, 22 — a five-point scale
// where 5 is the top of the speaker's range and 1 the bottom.

const TONES = {
  1: { chao: '55', name: 'high, level', start: 2, end: 2 },
  2: { chao: '25', name: 'rising, ending high', start: -1, end: 2 },
  3: { chao: '33', name: 'mid, level', start: 0, end: 0 },
  4: { chao: '21', name: 'low, falling', start: -1, end: -2 },
  5: { chao: '23', name: 'low, rising to mid', start: -1, end: 0 },
  6: { chao: '22', name: 'low, level', start: -1, end: -1 },
};
export const toneName = (t) => TONES[t]?.name || '';
export const toneChao = (t) => TONES[t]?.chao || '';

// One Chao step is about 2.5 semitones for a typical speaking range of an
// octave; the conversion only has to be consistent, not exact.
const STEP = 2.5;
const KEY = 'hokgong.voice';

// Your own pitch range, learnt from your own attempts. Held as the median of
// the median f0 of each attempt, which is stable against one odd recording.
function loadVoice() {
  try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && Array.isArray(v.medians)) return v; } catch { /* fall through */ }
  return { medians: [] };
}
function saveVoice(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* nothing to do */ } }
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
export function voiceCentre() {
  const v = loadVoice();
  return v.medians.length >= 3 ? median(v.medians) : null;
}
export function forgetVoice() { saveVoice({ medians: [] }); }

// ── pitch detection ──────────────────────────────────────────────────────
// Normalised autocorrelation over a 40 ms window: for each candidate lag, the
// correlation divided by the energy, which makes the peak height a clarity
// measure rather than a volume measure. Voice only — 70 to 500 Hz.
function f0At(buf, start, len, rate) {
  const MIN = Math.floor(rate / 500), MAX = Math.floor(rate / 70);
  let energy = 0;
  for (let i = 0; i < len; i++) energy += buf[start + i] * buf[start + i];
  if (energy < 1e-4) return null;                       // silence
  let bestLag = -1, best = 0;
  for (let lag = MIN; lag <= MAX && start + len + lag < buf.length; lag++) {
    let corr = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < len; i++) {
      const a = buf[start + i], b = buf[start + i + lag];
      corr += a * b; e1 += a * a; e2 += b * b;
    }
    const norm = corr / (Math.sqrt(e1 * e2) || 1);
    if (norm > best) { best = norm; bestLag = lag; }
  }
  if (bestLag < 0 || best < 0.86) return null;          // not clearly voiced
  return { f0: rate / bestLag, clarity: best };
}

// The pitch track of a recording: one estimate every 10 ms, voiced frames only.
export function track(samples, rate) {
  const win = Math.floor(rate * 0.04), hop = Math.floor(rate * 0.01);
  const out = [];
  for (let s = 0; s + win * 2 < samples.length; s += hop) {
    const p = f0At(samples, s, win, rate);
    if (p) out.push({ t: s / rate, ...p });
  }
  // Drop octave errors: a frame more than 7 semitones from the running median
  // is the detector halving or doubling, not the speaker leaping.
  if (out.length < 4) return out;
  const mid = median(out.map((p) => p.f0));
  return out.filter((p) => Math.abs(12 * Math.log2(p.f0 / mid)) < 7);
}

// ── what the contour was ─────────────────────────────────────────────────
// Reported in Chao-like steps relative to the speaker's own centre, with the
// first and last fifth of the voiced span trimmed: the edges of a syllable are
// where the detector is least sure and where consonants pull the pitch about.
export function describe(points, centre) {
  if (points.length < 6) return { ok: false, why: 'I could not hear a clear pitch. Try again a little closer, and hold the vowel.' };
  const mid = centre || median(points.map((p) => p.f0));
  const st = points.map((p) => ({ t: p.t, v: 12 * Math.log2(p.f0 / mid) }));
  const cut = Math.max(1, Math.round(st.length / 5));
  const core = st.slice(cut, st.length - cut);
  const span = core.length ? core : st;
  const mean = (a) => a.reduce((s, x) => s + x.v, 0) / a.length;
  const head = mean(span.slice(0, Math.max(1, Math.round(span.length / 3))));
  const tail = mean(span.slice(-Math.max(1, Math.round(span.length / 3))));
  const slope = tail - head;
  return {
    ok: true,
    centre: mid,
    calibrated: !!centre,
    startStep: head / STEP,
    endStep: tail / STEP,
    slopeSemitones: slope,
    movement: slope > 1.8 ? 'rising' : slope < -1.8 ? 'falling' : 'level',
    height: (head + tail) / 2 / STEP,
    points: st,
  };
}

// How far the measured contour is from each tone, in Chao steps. Returned as a
// ranking rather than a verdict, because two tones can genuinely be close.
export function rank(shape) {
  if (!shape.ok) return [];
  return Object.entries(TONES).map(([t, spec]) => {
    // Without calibration only the movement is trustworthy: one recording
    // cannot say where the top of your range is. Height is then weighted
    // lightly rather than ignored, and the app says the reading is provisional.
    const wHeight = shape.calibrated ? 1 : 0.35;
    const d = Math.hypot(
      (shape.startStep - spec.start) * wHeight,
      (shape.endStep - spec.end) * wHeight,
      ((shape.endStep - shape.startStep) - (spec.end - spec.start)) * 1.4,
    );
    return { tone: +t, distance: d, ...spec };
  }).sort((a, b) => a.distance - b.distance);
}

// ── recording ────────────────────────────────────────────────────────────
// Kept deliberately small: start, stop, hand back the samples. The stream is
// stopped every time, so the browser's recording indicator goes out and the
// microphone is not left open.
export async function listen({ seconds = 1.6 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser will not give a page the microphone.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const src = ctx.createMediaStreamSource(stream);
    const rate = ctx.sampleRate;
    const chunkSize = 2048;
    const node = ctx.createScriptProcessor ? ctx.createScriptProcessor(chunkSize, 1, 1) : null;
    const chunks = [];
    let level = 0;
    if (node) {
      node.onaudioprocess = (e) => {
        const d = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(d));
        let peak = 0;
        for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        level = peak;
      };
      src.connect(node);
      // Connecting to the destination would play the microphone back through
      // the speaker; a zero-gain node keeps the graph pulling without that.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      node.connect(mute); mute.connect(ctx.destination);
    }
    await new Promise((r) => setTimeout(r, seconds * 1000));
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let o = 0;
    for (const c of chunks) { samples.set(c, o); o += c.length; }
    return { samples, rate, peak: level };
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    try { await ctx.close(); } catch { /* ignore */ }
  }
}

// One attempt, start to finish: record, track, describe, rank — and remember
// this attempt's median so the range gets more accurate with use.
export async function attempt({ seconds = 1.6 } = {}) {
  const { samples, rate, peak } = await listen({ seconds });
  if (peak < 0.02) return { ok: false, why: 'I heard almost nothing. Check that the microphone is allowed, and say the word out loud.' };
  const points = track(samples, rate);
  const shape = describe(points, voiceCentre());
  if (shape.ok) {
    const v = loadVoice();
    v.medians = [...v.medians, median(points.map((p) => p.f0))].slice(-40);
    saveVoice(v);
  }
  return { ...shape, ranking: rank(shape) };
}
