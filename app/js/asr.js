// Hok Gong — letting the phone check what you said.
//
// Saying a word and then marking yourself is a flashcard, not a test. It is
// useful, and it is a different kind of thing from a question the app can
// score — Robert's objection, and a fair one. Where the phone can actually
// recognise Cantonese, it should.
//
// This uses the browser's own speech recognition (the Web Speech API) with
// Cantonese as the language. On Android Chrome that is Google's recogniser.
//
// THE PRIVACY COST, STATED PLAINLY. Unlike the tone tracker in pitch.js, which
// runs entirely on the device, this sends your recorded speech to the
// browser-maker's servers to be transcribed. That is how the API works and it
// cannot be done locally in a web page. So it is OFF by default, it is turned
// on by an explicit setting that says exactly this, and everything else in the
// app keeps working without it.
//
// WHAT IT IS WORTH. The recogniser is built for sentences, not for isolated
// words, and it is trained on Hong Kong Cantonese. It will mishear a learner
// more often than it mishears a native speaker, so a miss is not proof you
// said it wrong. The app says that too: a match counts as right, a non-match
// hands the decision back to you rather than marking you wrong.

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
// Cantonese first, Hong Kong Chinese second: on Chrome the first is the right
// label and the second is what some builds accept.
const LANGS = ['yue-Hant-HK', 'zh-HK'];

export const asrSupported = () => !!SR;

// Listens once and returns what it heard: { ok, heard: [..], why }.
export function listenFor({ seconds = 5 } = {}) {
  return new Promise((resolve) => {
    if (!SR) { resolve({ ok: false, why: 'This browser has no speech recognition.' }); return; }
    let done = false;
    const finish = (r) => { if (!done) { done = true; resolve(r); } };
    const rec = new SR();
    rec.lang = LANGS[0];
    rec.maxAlternatives = 5;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const heard = [];
      for (const result of e.results) {
        for (let i = 0; i < result.length; i++) heard.push(String(result[i].transcript || '').trim());
      }
      finish({ ok: true, heard: heard.filter(Boolean) });
    };
    rec.onerror = (e) => finish({ ok: false, why: ({
      'not-allowed': 'The microphone is blocked for this site.',
      'service-not-allowed': 'The browser would not start its speech service.',
      'no-speech': 'I did not hear anything.',
      network: 'Speech recognition needs a connection, and there is none.',
      'language-not-supported': 'This browser will not do Cantonese recognition.',
    }[e.error] || ('Speech recognition failed: ' + e.error)) });
    rec.onend = () => finish({ ok: false, why: 'I did not hear anything.' });
    try { rec.start(); } catch (err) { finish({ ok: false, why: String(err.message || err) }); }
    setTimeout(() => { try { rec.stop(); } catch { /* already stopped */ } }, seconds * 1000);
  });
}

// Did any of what it heard contain the word? Recognisers punctuate, add
// particles, and sometimes return the simplified form of a character, so the
// comparison is deliberately forgiving in one direction only: it looks for the
// word inside what was heard, never the other way round.
export function matches(word, heard) {
  const clean = (s) => String(s).replace(/[\s,.。，、！？!?·…]/g, '');
  const target = clean(word);
  for (const h of heard) {
    const got = clean(h);
    if (!got) continue;
    if (got.includes(target)) return { hit: true, on: h };
    // A one-character word inside a longer utterance is a weak match; a
    // multi-character word missing one character is not a match at all.
    if (target.length >= 2) {
      const shared = [...target].filter((c) => got.includes(c)).length;
      if (shared >= target.length - 1 && got.length <= target.length + 3) return { hit: true, on: h, partial: true };
    }
  }
  return { hit: false };
}
