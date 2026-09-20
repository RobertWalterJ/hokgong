// Hok Gong — playing a word or a sentence out loud.
//
// Three sources, in order, and the app always says which one the learner is
// hearing:
//
//   1. a Tatoeba recording bundled with the app (audio/<sentence id>.mp3) —
//      a person, reading a sentence, credited by name;
//   2. the same recording fetched from audio.tatoeba.org, for the builds that
//      do not carry the audio folder;
//   3. a zh-HK text-to-speech voice, which is a machine approximation.
//
// If none of the three is available the app says the recording is missing. It
// never silently plays nothing, and it never plays Mandarin.

import { sayYue, cantoneseAvailable } from './speech.js';

// Set by the build: the single-file build has no audio folder beside it.
const BASE = window.HOKGONG_AUDIO ?? 'audio/';
const REMOTE = 'https://audio.tatoeba.org/sentences/yue/';
export const BUNDLED = new Set(window.HOKGONG_AUDIO_IDS || []);

let current = null;
let listener = null;
export function onAudio(fn) { listener = fn; }

export function stopAudio() {
  if (current) { try { current.pause(); } catch { /* ignore */ } current = null; }
  listener?.(false);
}

// Plays a recorded sentence. Resolves to the source actually used, or null.
export function playRecording(id, { onend = null } = {}) {
  stopAudio();
  return new Promise((resolve) => {
    const tryUrl = (url, then) => {
      const a = new Audio(url);
      current = a;
      a.addEventListener('playing', () => listener?.(true));
      a.addEventListener('ended', () => { listener?.(false); onend?.(); });
      a.addEventListener('error', () => { listener?.(false); then(); });
      a.play().catch(then);
    };
    const remote = () => tryUrl(`${REMOTE}${id}.mp3`, () => { listener?.(false); onend?.(); resolve(null); });
    if (BUNDLED.size && !BUNDLED.has(id)) { remote(); resolve('remote'); return; }
    tryUrl(`${BASE}${id}.mp3`, remote);
    resolve('bundled');
  });
}

// Plays a word. A recorded example sentence is better evidence than a machine
// voice, but it is a whole sentence — so for a single word the synthetic voice
// is used, and the app labels it.
export function playWord(word, { onend = null } = {}) {
  stopAudio();
  if (!cantoneseAvailable()) { onend?.(); return false; }
  listener?.(true);
  sayYue(word, { onend: () => { listener?.(false); onend?.(); } });
  return true;
}

export const canPlayWord = () => cantoneseAvailable();
