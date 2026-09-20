// Hok Gong — the interface learns Cantonese too.
//
// The app starts in English. As the words you can answer add up, the interface
// begins saying things in Cantonese first and English second, and later in
// Cantonese alone. The progression is deliberately slow: the point is that the
// words arrive when you already know them, so the app never becomes harder to
// use than it was yesterday.
//
// Two rules keep this honest:
//
//   1. Every Cantonese phrase here is built from words the corpus and the
//      dictionaries actually carry. build/verify.mjs checks each one against
//      corpus/lexicon.json and fails the build if a word is invented.
//   2. A phrase only switches once you have answered its own words correctly —
//      `needs` lists them — as well as passing the overall threshold. Knowing
//      300 words in general is no use if none of them is 再.
//
// `at` is how many words you can answer before the Cantonese appears with the
// English under it; from `at` × 3 the English becomes a whisper you can still
// tap to hear. Nothing is ever only in Cantonese with no way back: Settings
// has a switch that puts the whole interface back into English.

export const PHRASES = {
  start:      { en: 'Start',            yue: '開始',     jyut: 'hoi1 ci2',        at: 25,   needs: ['開始'] },
  again:      { en: 'Again',            yue: '再一次',   jyut: 'zoi3 jat1 ci3',   at: 120,  needs: ['再', '一', '次'] },
  right:      { en: 'Right',            yue: '啱',       jyut: 'aam1',            at: 60,   needs: ['啱'] },
  wrong:      { en: 'Not quite',        yue: '唔啱',     jyut: 'm4 aam1',         at: 60,   needs: ['唔', '啱'] },
  listen:     { en: 'Listen',           yue: '聽',       jyut: 'teng1',           at: 40,   needs: ['聽'] },
  listenAgain:{ en: 'Listen again',     yue: '再聽',     jyut: 'zoi3 teng1',      at: 140,  needs: ['再', '聽'] },
  sayIt:      { en: 'Say it',           yue: '講',       jyut: 'gong2',           at: 40,   needs: ['講'] },
  next:       { en: 'Next',             yue: '下一個',   jyut: 'haa6 jat1 go3',   at: 160,  needs: ['下', '一', '個'] },
  good:       { en: 'Good',             yue: '好',       jyut: 'hou2',            at: 20,   needs: ['好'] },
  thanks:     { en: 'Thank you',        yue: '唔該',     jyut: 'm4 goi1',         at: 80,   needs: ['唔該'] },
  iKnow:      { en: 'I knew it',        yue: '我識',     jyut: 'ngo5 sik1',       at: 200,  needs: ['我', '識'] },
  iDont:      { en: 'Not yet',          yue: '我唔識',   jyut: 'ngo5 m4 sik1',    at: 200,  needs: ['我', '唔', '識'] },
  words:      { en: 'Words',            yue: '生字',     jyut: 'saang1 zi6',      at: 180,  needs: ['生', '字'] },
  tones:      { en: 'Tones',            yue: '聲調',     jyut: 'sing1 diu6',      at: 220,  needs: ['聲', '調'] },
  grammar:    { en: 'Grammar',          yue: '文法',     jyut: 'man4 faat3',      at: 260,  needs: ['文', '法'] },
  learn:      { en: 'Learn',            yue: '學',       jyut: 'hok6',            at: 100,  needs: ['學'] },
  done:       { en: 'Done',             yue: '完',       jyut: 'jyun4',           at: 150,  needs: ['完'] },
  today:      { en: 'Today',            yue: '今日',     jyut: 'gam1 jat6',       at: 180,  needs: ['今日'] },
  what:       { en: 'What does it mean?', yue: '咩意思？', jyut: 'me1 ji3 si1',   at: 300,  needs: ['咩', '意思'] },
  whichTone:  { en: 'Which one did you hear?', yue: '聽到邊個？', jyut: 'teng1 dou2 bin1 go3', at: 380, needs: ['聽', '到', '邊', '個'] },
  onceMore:   { en: 'One more round',   yue: '再嚟一次', jyut: 'zoi3 lai4 jat1 ci3', at: 440, needs: ['再', '嚟', '一', '次'] },
  seeYou:     { en: 'See you tomorrow', yue: '聽日見',   jyut: 'ting1 jat6 gin3', at: 520, needs: ['聽日', '見'] },
};

// What the learner can already answer, as a set of words — the ladder asks it
// for the `needs` check. Set once at boot by app.js.
let knownWords = new Set();
let count = 0;
let englishOnly = false;
export function setProgress({ words = new Set(), n = 0 } = {}) { knownWords = words; count = n; }
export function setEnglishOnly(v) { englishOnly = !!v; }

// A phrase, at the stage the learner is at:
//   { text, sub, jyut, stage }  stage 0 English, 1 Cantonese with English,
//                               2 Cantonese with the English quiet
export function t(key) {
  const p = PHRASES[key];
  if (!p) return { text: key, sub: null, jyut: null, stage: 0 };
  const ready = !englishOnly && count >= p.at && p.needs.every((w) => knownWords.has(w));
  if (!ready) return { text: p.en, sub: null, jyut: null, stage: 0 };
  const stage = count >= p.at * 3 ? 2 : 1;
  return { text: p.yue, sub: p.en, jyut: p.jyut, stage };
}

// For Progress: how much of the interface has crossed over, and what is next.
export function ladder() {
  const keys = Object.keys(PHRASES);
  const on = keys.filter((k) => t(k).stage > 0);
  const next = keys.map((k) => PHRASES[k]).filter((p) => count < p.at).sort((a, b) => a.at - b.at)[0] || null;
  return { on: on.length, total: keys.length, next };
}
