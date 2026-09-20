// Hok Gong — the two voices.
//
// English, for reading the interface aloud (Robert is dyslexic; read-aloud is
// built in, not an afterthought), and Cantonese, for speaking a word when no
// human recording exists.
//
// One hard gotcha: mobile browsers refuse speechSynthesis until it has been
// called once inside a real user gesture. Without unlock() on the first
// pointerdown, speech silently does nothing and looks broken.
//
// And one honest limitation, which the app states rather than hides: a
// text-to-speech voice is a synthetic approximation. Tones come out roughly
// right, but a recording of a person is better, and this only stands in where
// there is no recording.

const voices = { en: null, yue: null };
let unlocked = false;
let onState = null;
export function onSpeaking(fn) { onState = fn; }

const pick = (all, score) => all.slice().sort((a, b) => score(b) - score(a))[0] || null;
function choose() {
  const all = speechSynthesis.getVoices?.() || [];
  if (!all.length) return;
  voices.en = pick(all.filter((v) => /^en/i.test(v.lang)),
    (v) => (/^en[-_]CA/i.test(v.lang) ? 6 : /^en[-_]GB/i.test(v.lang) ? 5 : 3) + (v.localService ? 2 : 0) + (/natural|neural/i.test(v.name) ? 2 : 0));
  // yue-* and zh-HK are Cantonese. zh-TW and zh-CN are Mandarin and would
  // teach the wrong language, so they are never used: no Cantonese voice means
  // no synthetic Cantonese, and the app says so instead of faking it.
  const yue = all.filter((v) => /^yue/i.test(v.lang) || /^zh[-_].*HK/i.test(v.lang) || /cantonese|粵|廣東/i.test(v.name));
  voices.yue = pick(yue, (v) => (/^yue/i.test(v.lang) ? 4 : 0) + (/HK/i.test(v.lang) ? 3 : 0) + (v.localService ? 1 : 0));
}

export function initSpeech() {
  if (!('speechSynthesis' in window)) return;
  choose();
  speechSynthesis.addEventListener?.('voiceschanged', choose);
}
export const available = () => 'speechSynthesis' in window && !!voices.en;
export const cantoneseAvailable = () => 'speechSynthesis' in window && !!voices.yue;
export const cantoneseVoiceName = () => voices.yue?.name || null;

export function unlock() {
  if (unlocked || !('speechSynthesis' in window)) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch { /* nothing to do */ }
}

export function stop() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
  onState?.(false);
}

function speak(text, voice, { rate = 1, lang = null, onend = null } = {}) {
  if (!('speechSynthesis' in window) || !text) { onend?.(); return false; }
  stop();
  const u = new SpeechSynthesisUtterance(String(text));
  if (voice) { u.voice = voice; u.lang = voice.lang; }
  if (lang) u.lang = lang;
  u.rate = rate;
  u.onstart = () => onState?.(true);
  u.onend = u.onerror = () => { onState?.(false); onend?.(); };
  try { speechSynthesis.speak(u); return true; } catch { onState?.(false); onend?.(); return false; }
}

export const say = (text, opts = {}) => speak(text, voices.en, opts);
// Slower than natural by default: a learner needs the syllable, not the speed.
export const sayYue = (text, opts = {}) => speak(text, voices.yue, { rate: 0.85, lang: 'zh-HK', ...opts });
