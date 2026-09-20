// Build the deck: every question the app can ask, from the corpus.
//
//   node build/items.mjs
//
// Nothing is invented. A word carries the Jyutping the corpus recorded and the
// gloss a dictionary gives that pronunciation; a sentence is a Tatoeba sentence
// with its own human translation, and, where one exists, its recording.
// build/verify.mjs checks all of that again before the app is built.
//
// The deck is stored as a word list plus items that point into it, because at
// six thousand words repeating the word, reading and gloss inside every item
// tripled the file for nothing.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const load = async (f) => (await import(pathToFileURL(join(ROOT, f)).href)).default;
const LEX = read('corpus/lexicon.json');
// Every sentence the app can show is read for what it SAYS before anything
// else looks at it. Tatoeba is a general corpus and was never assembled for a
// beginner; nothing here was checking the content until a listening question
// asked Robert to recognise "You might as well go kill yourself".
const { unsuitable } = await import(pathToFileURL(join(ROOT, 'content', 'unsuitable.mjs')).href);
const RAW_SENT = read('corpus/sentences.json');
const dropped = new Map();
const SENT = RAW_SENT.filter((s) => {
  const why = s.eng ? unsuitable(s.eng, s.text) : null;
  if (why) { dropped.set(why, (dropped.get(why) || 0) + 1); return false; }
  return true;
});
console.log(`sentences: ${SENT.length.toLocaleString()} kept of ${RAW_SENT.length.toLocaleString()}; ${(RAW_SENT.length - SENT.length).toLocaleString()} set aside as unsuitable`);
for (const [why, n] of [...dropped].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${why}`);
const COVERAGE = read('corpus/coverage.json');
const GRAMMAR = await load('content/grammar.mjs');
const CONTEXT = await load('content/context.mjs');
const SYLLABUS = await load('content/syllabus.mjs');
const NOTES = await load('content/notes.mjs');

const WORDS = 6000;        // the conversational vocabulary the app is built to reach
const READING = 1200;      // how far read-the-characters items go: reading matters, but later
const AUDIO_WORDS = 600;   // bundle recordings for example sentences this far down the list

const words = (s) => s.split(/\s+/).length;
const chars = (s) => [...s.replace(/[^㐀-鿿]/g, '')].length;
// A seeded shuffle, so the deck is the same every build.
const seeded = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };

// ── the words worth learning first ───────────────────────────────────────
// Recorded speech first, in the order people actually say them; then written
// frequency. Only words whose gloss belongs to the pronunciation recorded —
// the rest wait for a Cantonese speaker to check them.
const usable = LEX.filter((e) => e.gloss.length && e.glossMatchesSaid && chars(e.w) <= 4);
// The first conversation comes first. content/essentials.mjs lists what a
// learner needs in week one — greetings, politeness, family, counting — which
// a 125,000-word corpus of 1997 adult conversation puts at word 2,523. Those
// words jump the queue in the order that file gives; everything after them
// stays in the order people actually speak.
const ESSENTIAL_ORDER = new Map();
for (const group of SYLLABUS) for (const w of group.words) if (!ESSENTIAL_ORDER.has(w)) ESSENTIAL_ORDER.set(w, ESSENTIAL_ORDER.size);
const essentialsFirst = (a, b) => {
  const ea = ESSENTIAL_ORDER.has(a.w) ? ESSENTIAL_ORDER.get(a.w) : Infinity;
  const eb = ESSENTIAL_ORDER.has(b.w) ? ESSENTIAL_ORDER.get(b.w) : Infinity;
  return ea - eb;
};
const ordered = [...usable].sort(essentialsFirst);
const chosen = ordered.slice(0, WORDS);
const index = new Map(chosen.map((e, i) => [e.w, i]));

// Distractors come from the same part of the frequency list, so a question is
// a choice between words a learner plausibly knows, not between a common word
// and something from the far tail.
// Length is the oldest tell in multiple choice: the long answer is the right
// one. So candidates are ranked by how close their length is to the answer's,
// shuffled within each length, and the closest are taken — which keeps the
// spread inside what build/verify.mjs will accept.
const pickOthers = (self, i, n, rnd) => {
  const len = words(self);
  const lo = Math.max(0, i - 250), hi = Math.min(chosen.length, i + 250);
  const pool = [];
  const seen = new Set([self]);
  for (let k = lo; k < hi; k++) {
    const g = chosen[k].gloss[0];
    if (k === i || seen.has(g)) continue;
    seen.add(g);
    pool.push({ g, d: Math.abs(words(g) - len), r: rnd() });
  }
  pool.sort((a, b) => a.d - b.d || a.r - b.r);
  return pool.slice(0, n).map((x) => x.g);
};

// ── every Chinese word in my own prose gets its reading ──────────────────
// Robert cannot read characters. A note that says 飲茶 is literally "drink
// tea" is, to him, a blank followed by an explanation of the blank — and when
// he presses read-aloud, the English voice pronounces the characters as
// Mandarin, which is worse than silence.
//
// So every run of Chinese in prose I wrote is annotated with its Jyutping at
// build time, from the same lexicon the questions use. Longest match first, so
// 飲茶 is one word rather than two characters, and only the first time each
// word appears in a given string.
const readings = new Map(LEX.filter((e) => e.gloss.length).map((e) => [e.w, e.jyut]));
const spaced = (j) => j.replace(/([a-z]+[1-6])(?=[a-z])/g, '$1 ');
const annotate = (text) => {
  if (!text) return text;
  const seen = new Set();
  return text.replace(/[㐀-鿿]+/g, (run) => {
    let out = '';
    let i = 0;
    while (i < run.length) {
      let took = 0;
      for (let n = Math.min(4, run.length - i); n >= 1; n--) {
        const part = run.slice(i, i + n);
        if (readings.has(part)) {
          out += part + (seen.has(part) ? '' : ` (${spaced(readings.get(part))})`);
          seen.add(part);
          took = n;
          break;
        }
      }
      if (!took) { out += run[i]; took = 1; }
      i += took;
    }
    return out;
  });
};

// ── every sentence the app shows gets a reading line ─────────────────────
// A sentence in characters is, to a learner who cannot read them, a picture of
// a sentence. So each one carries its Jyutping, segmented longest-match-first
// against the readings the sources give.
const romanise = (text) => {
  const out = [];
  let i = 0;
  while (i < text.length) {
    if (!/[㐀-鿿]/.test(text[i])) { i++; continue; }     // punctuation is dropped
    let took = 0;
    for (let n = Math.min(4, text.length - i); n >= 1; n--) {
      const part = text.slice(i, i + n);
      if (readings.has(part)) { out.push(spaced(readings.get(part))); took = n; break; }
    }
    if (!took) { out.push('?'); took = 1; }                      // no source gives this character a reading
    i += took;
  }
  return out.join(' ');
};

// A sentence that shows the word, with its translation and, if there is one,
// its recording: Tatoeba, shortest first. Indexed once — scanning 7,120
// sentences per word for six thousand words is an hour of work for nothing.
const byChar = new Map();
for (const s of SENT) {
  if (!s.eng || chars(s.text) > 30) continue;
  for (const c of new Set(s.text)) {
    if (!byChar.has(c)) byChar.set(c, []);
    byChar.get(c).push(s);
  }
}

// How long a sentence may be, by how far into the course the word sits. The
// app used to show nothing longer than 14 characters anywhere, at any stage,
// so a learner at word 4,000 was reading the same length of sentence as one
// on their first day. The corpus holds 2,392 translated sentences of 13
// characters or more, all of it unused.
const lengthFor = (i) => (i < 150 ? 8 : i < 600 ? 12 : i < 2000 ? 16 : 24);

// CALLBACKS. Among the sentences that contain the word, prefer the ones built
// from characters the learner has already been taught — the whole point of
// teaching in an order. `taught` grows as the loop walks the word list, so a
// word at position 300 is scored against the 299 words before it.
const taught = new Set();
const reach = (text) => {
  const cs = [...text.replace(/[^㐀-鿿]/g, '')];
  if (!cs.length) return 0;
  return cs.filter((c) => taught.has(c)).length / cs.length;
};
// Up to three, easiest first: within reach, then with a recording, then short.
// One example per word meant a word was only ever seen in one sentence; a
// review now shows a different one.
const examplesFor = (w, i) => {
  const max = lengthFor(i);
  const hits = (byChar.get(w[0]) || []).filter((s) => s.text.includes(w) && chars(s.text) <= max);
  return hits
    .map((s) => ({ s, r: reach(s.text), a: s.audio ? 1 : 0, n: chars(s.text) }))
    .sort((a, b) => b.r - a.r || b.a - a.a || a.n - b.n)
    .slice(0, 3)
    .map((x) => x.s);
};

const items = [];
const audioNeeded = new Set();     // Tatoeba sentence ids: audio.tatoeba.org/sentences/yue/<id>.mp3
const examples = {};
for (const [i, e] of chosen.entries()) {
  const rnd = seeded('w' + e.w);
  const exs = examplesFor(e.w, i);
  if (exs.length) {
    examples[i] = exs.map((ex) => ({ id: ex.id, t: ex.text, j: romanise(ex.text), e: ex.eng, a: ex.audio ? 1 : 0 }));
    // Only the first one's recording is bundled: three recordings per word for
    // six hundred words is more audio than the app is worth carrying.
    if (exs[0].audio && i < AUDIO_WORDS) audioNeeded.add(exs[0].id);
  }
  // Every character of this word is now something the learner has been taught,
  // for the words that come after it.
  for (const c of e.w) taught.add(c);
  const options = pickOthers(e.gloss[0], i, 3, rnd);
  if (options.length < 3) continue;
  const level = Math.min(9, Math.ceil((i + 1) / 700));
  // Hear it, and know what it means — the skill he wants first.
  items.push({ id: `wl/${e.w}`, k: 'word-listen', i, options, level });
  // See the meaning, say the word: the reveal gives the Jyutping and a model.
  items.push({ id: `ws/${e.w}`, k: 'word-say', i, level });
  // See the characters, know the word. Reading is not the priority, so it
  // covers the first WORDS only and arrives later in the schedule.
  if (i < READING) items.push({ id: `wr/${e.w}`, k: 'word-read', i, options, level: level + 1 });
}

// ── the gap: which word belongs here? ────────────────────────────────────
// Robert, 20 Sept: "maybe even some questions that have blanks in them, as in
// what is the correct word in this context to fill out the sentence — that
// would be something good and a type of question that I've not seen come up
// so far."
//
// He had not seen one because there were two in the whole deck: they were
// built only for grammar markers that had a named contrast, and only ten
// grammar points exist. This builds one for every word that appears exactly
// once in a sentence long enough to carry a context — which is also what he
// asked for in the same breath, "longer stretches of sentences".
//
// It is the hardest question in the app and the most useful: recognising a
// word is not the same as knowing where it goes. Nation calls this the
// difference between receptive and productive knowledge, and only production
// gets you talking.
const CLOZE_WORDS = 2000;     // how far down the list gap questions are built
const CLOZE_MIN = 6;          // characters — a gap needs a sentence around it

// Distractors are real words of the SAME length from nearby in the frequency
// list, and never a word already in the sentence — one that is already there
// reads as the answer.
const wordOthers = (i, text, n, rnd) => {
  const self = chosen[i].w;
  const len = chars(self);
  const lo = Math.max(0, i - 400), hi = Math.min(chosen.length, i + 400);
  const pool = [];
  const seen = new Set([self]);
  for (let k = lo; k < hi; k++) {
    if (k === i) continue;
    const w = chosen[k].w;
    if (seen.has(w) || chars(w) !== len || text.includes(w)) continue;
    seen.add(w);
    pool.push({ w, r: rnd() });
  }
  pool.sort((a, b) => a.r - b.r);
  return pool.slice(0, n).map((x) => x.w);
};

// The same sentence can carry more than one gap — seeing 唔該你唔好煩我 with the
// gap in three different places teaches the shape of it. Three in one round
// would just feel repetitive, so two is the limit.
const gapsPerSentence = new Map();
for (const [i, e] of chosen.entries()) {
  if (i >= CLOZE_WORDS) continue;
  // The word must appear exactly once, or blanking it leaves the answer
  // printed elsewhere in the same sentence. Longest first: the longer the
  // sentence, the more context there is to decide the gap from.
  const cands = (examples[i] || [])
    .filter((x) => chars(x.t) >= CLOZE_MIN && x.t.split(e.w).length === 2)
    .sort((a, b) => chars(b.t) - chars(a.t));
  const ex = cands.find((x) => (gapsPerSentence.get(x.id) || 0) < 2);
  if (!ex) continue;
  gapsPerSentence.set(ex.id, (gapsPerSentence.get(ex.id) || 0) + 1);
  const rnd = seeded('cz' + e.w);
  const options = wordOthers(i, ex.t, 3, rnd);
  if (options.length < 3) continue;
  const at = ex.t.indexOf(e.w);
  items.push({
    id: `cz/${e.w}`, k: 'word-cloze', i, sid: ex.id,
    text: ex.t, eng: ex.e, audio: ex.a, jyut: romanise(ex.t),
    blank: e.w, answer: e.w, options,
    // The reading line keeps the gap in its place, so the learner can hear
    // what goes either side of the missing word.
    blanked: (romanise(ex.t.slice(0, at)) + ' ___ ' + romanise(ex.t.slice(at + e.w.length))).replace(/\s+/g, ' ').trim(),
    reads: Object.fromEntries([e.w, ...options].map((w) => [w, spaced(readings.get(w) || '')])),
    level: Math.min(9, Math.ceil((i + 1) / 700)) + 2,
  });
}

// ── listening: real recorded sentences ───────────────────────────────────
// Short ones first, and only those made of words in the first 1,000 — so
// listening starts in week one rather than after months.
const known = new Set(LEX.slice(0, 1000).map((e) => e.w));
const knownChars = new Set([...known].flatMap((w) => [...w]));
const covered = (text) => {
  const cs = [...text.replace(/[^㐀-鿿]/g, '')];
  if (!cs.length) return 0;
  return cs.filter((c) => knownChars.has(c)).length / cs.length;
};
const listenPool = SENT.filter((s) => s.audio && s.eng && chars(s.text) <= 12)
  .map((s) => ({ s, cov: covered(s.text) }))
  .filter((x) => x.cov >= 0.85)
  .sort((a, b) => b.cov - a.cov || chars(a.s.text) - chars(b.s.text))
  .slice(0, 300)
  .map((x) => x.s);
const engPool = listenPool.map((s) => s.eng);
const pickEng = (self, pool, n, rnd) => {
  const len = words(self);
  const seen = new Set([self]);
  const cand = [];
  for (const x of pool) {
    if (seen.has(x)) continue;
    seen.add(x);
    cand.push({ x, d: Math.abs(words(x) - len), r: rnd() });
  }
  cand.sort((a, b) => a.d - b.d || a.r - b.r);
  return cand.slice(0, n).map((c) => c.x);
};
for (const s of listenPool) {
  const rnd = seeded('s' + s.id);
  const options = pickEng(s.eng, engPool, 3, rnd);
  if (options.length < 3) continue;
  audioNeeded.add(s.id);
  items.push({ id: `sl/${s.id}`, k: 'sentence-listen', sid: s.id, text: s.text, jyut: romanise(s.text), eng: s.eng, by: s.audio.by, options, level: 3 });
}

// ── tones: minimal pairs from words being learnt ─────────────────────────
// Same syllable, different tone, both inside the words he is learning: the
// contrast that matters is between words you will actually say.
const bySyll = new Map();
for (const [i, e] of chosen.slice(0, 1500).entries()) {
  if (!/^[a-z]+[1-6]$/.test(e.jyut)) continue;
  const k = e.jyut.slice(0, -1);
  if (!bySyll.has(k)) bySyll.set(k, []);
  if (!bySyll.get(k).some((x) => x.jyut === e.jyut)) bySyll.get(k).push({ ...e, i });
}
const toneSets = [...bySyll.entries()].filter(([, v]) => v.length >= 2)
  .sort((a, b) => b[1].length - a[1].length || a[1][0].i - b[1][0].i);
for (const [syll, group] of toneSets) {
  items.push({
    id: `tp/${syll}`, k: 'tone-pair', syll,
    choices: group.slice(0, 4).map((e) => ({ i: e.i, tone: +e.jyut.slice(-1) })),
    level: 2,
  });
  // Say it, not just hear it: the phone listens and checks the pitch shape.
  items.push({ id: `tsay/${syll}`, k: 'tone-say', syll, choices: group.slice(0, 4).map((e) => ({ i: e.i, tone: +e.jyut.slice(-1) })), level: 4 });
}

// ── grammar ──────────────────────────────────────────────────────────────
// Each point gets real examples: shortest, recorded where possible. Three item
// kinds — understand it, choose the right form, build the sentence.
const seg = (() => {
  // Longest-match segmentation against the words we know about, for the
  // build-the-sentence items. Punctuation is kept as its own piece.
  const vocab = new Set(LEX.map((e) => e.w));
  for (const e of LEX) for (const c of e.w) vocab.add(c);
  return (text) => {
    const out = [];
    let i = 0;
    while (i < text.length) {
      let took = 0;
      for (let n = Math.min(4, text.length - i); n >= 1; n--) {
        if (vocab.has(text.slice(i, i + n))) { out.push(text.slice(i, i + n)); took = n; break; }
      }
      if (!took) { out.push(text[i]); took = 1; }
      i += took;
    }
    return out;
  };
})();

const grammar = [];
for (const g of GRAMMAR) {
  const re = new RegExp(g.match), no = g.notMatch ? new RegExp(g.notMatch) : null;
  const hits = SENT.filter((s) => s.eng && re.test(s.text) && !(no && no.test(s.text)));
  const examples6 = hits.sort((a, b) => (b.audio ? 1 : 0) - (a.audio ? 1 : 0) || chars(a.text) - chars(b.text)).slice(0, 6);
  for (const s of examples6) if (s.audio) audioNeeded.add(s.id);
  grammar.push({ id: g.id, title: annotate(g.title), plain: annotate(g.plain), watch: annotate(g.watch) || null, corpus: g.corpus,
    examples: examples6.map((s) => ({ id: s.id, text: s.text, jyut: romanise(s.text), eng: s.eng, audio: s.audio ? 1 : 0 })) });
  for (const s of examples6.slice(0, 3)) {
    const rnd = seeded('g' + g.id + s.id);
    const options = pickEng(s.eng, engPool.concat(hits.map((h) => h.eng)), 3, rnd);
    if (options.length === 3) items.push({ id: `gm/${g.id}/${s.id}`, k: 'grammar-mean', gid: g.id, sid: s.id, text: s.text, jyut: romanise(s.text), eng: s.eng, audio: s.audio ? 1 : 0, options, level: 3 });
  }
  // Choose the right form: blank the marker in a real sentence, and offer the
  // markers it is confused with.
  if (g.contrast) {
    const marker = g.match.length <= 2 ? g.match : null;
    const ex = examples6.find((s) => marker && s.text.includes(marker));
    const opts = ex ? [g.contrast, '過', '住'].filter((x) => x !== marker).slice(0, 3) : [];
    if (ex) items.push({ id: `gp/${g.id}/${ex.id}`, k: 'grammar-pick', gid: g.id, sid: ex.id, text: ex.text, jyut: romanise(ex.text), eng: ex.eng, audio: ex.audio ? 1 : 0,
      blank: marker, answer: marker, options: opts,
      // The gap is in a Chinese sentence and the options are Chinese markers,
      // so without these the whole question is a picture. `blanked` is the
      // reading line with the gap kept in its place, so the learner can see
      // WHERE the missing word goes and hear what surrounds it.
      blanked: romanise(ex.text.slice(0, ex.text.indexOf(marker))) + ' ___ ' + romanise(ex.text.slice(ex.text.indexOf(marker) + marker.length)),
      reads: Object.fromEntries([marker, ...opts].map((x) => [x, romanise(x)])), level: 4 });
  }
  // Build the sentence: the pieces, shuffled. A production test that doesn't
  // ask you to type Chinese.
  for (const s of examples6.filter((x) => chars(x.text) <= 10).slice(0, 2)) {
    const pieces = seg(s.text.replace(/[。？！，]/g, ''));
    if (pieces.length >= 3 && pieces.length <= 7) {
      // Same again: the pieces to be put in order are Chinese, so each one
      // carries its reading or the question cannot be answered by someone who
      // reads only the romanisation.
      items.push({ id: `gb/${g.id}/${s.id}`, k: 'grammar-build', gid: g.id, sid: s.id, text: s.text, jyut: romanise(s.text), eng: s.eng, audio: s.audio ? 1 : 0, pieces, pieceReads: pieces.map(romanise), level: 4 });
    }
  }
}

// ── where the words come from ────────────────────────────────────────────
// Short cards on Cantonese in Canada and on the food the words name. They are
// not questions; they appear between rounds, and every one is either a quoted
// passage with its source or a set of words with the dictionary's own glosses.
const context = CONTEXT.map((c0) => {
  // The quote itself is never touched — it is someone else's words. The note
  // under it is mine, so it is annotated.
  const c = { ...c0, note: annotate(c0.note) };
  if (!c.words) return c;
  // A word card only shows words the corpus and dictionaries actually carry.
  const found = c.words.map((w) => {
    const e = LEX.find((x) => x.w === w);
    return e && e.gloss.length ? { w, jyut: e.jyut, gloss: e.gloss[0], src: e.glossSrc } : null;
  }).filter(Boolean);
  return { ...c, found };
}).filter((c) => !c.words || c.found.length >= 3);

// ── the order things are taught in ───────────────────────────────────────
// The scheduler introduces new questions in deck order, so deck order IS the
// syllabus. Left as built, the deck taught six thousand words before it ever
// mentioned a tone or a grammar point — the scheduler simulation played 120
// days and never once reached either.
//
// So each item gets a place in a teaching sequence:
//   - hearing a word comes first, saying it soon after, reading it much later
//     (reading is not the priority; conversation is);
//   - a tone pair arrives just after the second of its two words;
//   - grammar points open one at a time, in corpus-frequency order, from the
//     point where there are enough words to read the examples;
//   - recorded sentences are spread right through.
const place = (it) => {
  switch (it.k) {
    case 'word-listen': return it.i * 3;
    case 'word-say': return it.i * 3 + 1;
    case 'word-read': return it.i * 3 + 400;             // later, but still in rank order
    case 'tone-pair': return Math.max(...it.choices.map((c) => c.i)) * 3 + 2;
    case 'tone-say': return Math.max(...it.choices.map((c) => c.i)) * 3 + 90;
    case 'sentence-listen': return 150 + items.filter((x) => x.k === 'sentence-listen').indexOf(it) * 18;
    case 'grammar-mean': return 90 + GRAMMAR.findIndex((g) => g.id === it.gid) * 150;
    case 'grammar-pick': return 130 + GRAMMAR.findIndex((g) => g.id === it.gid) * 150;
    case 'grammar-build': return 160 + GRAMMAR.findIndex((g) => g.id === it.gid) * 150;
    // A note about two words can only be asked once both are taught.
    case 'note-pick': return Math.max(it.i, ...(NOTES.find((n) => n.id === it.nid)?.words || []).map((w) => index.get(w) ?? 0)) * 3 + 6;
    default: return 1e6;
  }
};
const order = new Map(items.map((it) => [it.id, place(it)]));
items.sort((a, b) => order.get(a.id) - order.get(b.id) || a.id.localeCompare(b.id));

// ── words that are easy to mix up ────────────────────────────────────────
// A note travels with every word it names, and becomes a question of its own
// that asks the distinction rather than the gloss. A note whose words are not
// all in the deck is dropped rather than half-taught.
const notes = [];
for (const n of NOTES) {
  const idx = n.words.map((w) => index.get(w));
  if (idx.some((i) => i == null)) continue;
  notes.push({ id: n.id, title: annotate(n.title), plain: annotate(n.plain), watch: annotate(n.watch) || null, words: idx });
  const answer = index.get(n.ask.answer);
  const others = n.ask.with.map((w) => index.get(w)).filter((i) => i != null);
  if (answer == null || !others.length) continue;
  items.push({
    id: `np/${n.id}`, k: 'note-pick', nid: n.id,
    prompt: annotate(n.ask.prompt), i: answer, options: others.map((i) => chosen[i].w),
    // The answers to this one ARE Chinese words, so the buttons read 唔該 and
    // 多謝 and nothing else. Robert cannot read characters — "I can't read
    // Chinese yet, the questions like this don't work" — so each option
    // carries its reading, which is the part he can actually tell apart.
    reads: Object.fromEntries([answer, ...others].map((i) => [chosen[i].w, spaced(chosen[i].jyut)])),
    level: 3,
  });
}

// ── a question with two right answers is not a question ──────────────────
// "Say this in Cantonese: to thank" has two answers, 多謝 and 唔該, and the app
// was not saying which it meant (Robert, playing it). 574 English meanings in
// this deck are carried by more than one word, so this is not one word's
// problem.
//
// Each word that shares its meaning with another gets a cue, and the cue goes
// into the question. Best first: a note that explains the pair, then the
// word's own second sense from the dictionary, and if neither exists the word
// keeps no cue and the accuracy audit lists it.
const cueFromNotes = new Map();
for (const n of NOTES) for (const [w, cue] of Object.entries(n.cues || {})) cueFromNotes.set(w, cue);
const byMeaning = new Map();
for (const [i, e] of chosen.entries()) {
  const key = e.gloss[0].toLowerCase().trim();
  if (!byMeaning.has(key)) byMeaning.set(key, []);
  byMeaning.get(key).push(i);
}
const cues = {};
let cued = 0, stillAmbiguous = 0;
for (const [, group] of byMeaning) {
  if (group.length < 2) continue;
  for (const i of group) {
    const e = chosen[i];
    const cue = cueFromNotes.get(e.w) || e.gloss[1] || null;
    if (cue) { cues[i] = cue; cued++; } else stillAmbiguous++;
  }
}
// And every word a note covers gets its cue whether or not the glosses
// literally collide. 多謝 is "to thank" and 唔該 is "please", which do not
// collide as strings and are the same question in a learner's head.
for (const [w, cue] of cueFromNotes) {
  const i = index.get(w);
  if (i != null && !cues[i]) { cues[i] = cue; cued++; }
}

// ── the stages, resolved to what is actually in the deck ─────────────────
// A stage carries the positions of its own words, so the app can measure the
// gate without knowing anything about the syllabus file.
const stages = SYLLABUS.map((st) => ({
  id: st.id,
  title: st.title,
  can: annotate(st.can),
  why: annotate(st.why),
  gate: st.gate,
  grammar: st.grammar,
  words: st.words.map((w) => index.get(w)).filter((i) => i != null),
}));
// Each item belongs to the stage that introduces its word or its grammar
// point; everything else belongs to no stage at all — the long tail that
// opens, in frequency order, once the course is finished.
const stageOfWord = new Map();
for (const [n, st] of stages.entries()) for (const i of st.words) if (!stageOfWord.has(i)) stageOfWord.set(i, n);
const stageOfGrammar = new Map();
for (const [n, st] of stages.entries()) for (const g of st.grammar) if (!stageOfGrammar.has(g)) stageOfGrammar.set(g, n);
// What each stage's learner can read by the time they reach it, as characters.
const charsByStage = [];
{
  const seen = new Set();
  for (const st of stages) {
    for (const k of st.words) for (const c of chosen[k].w) seen.add(c);
    charsByStage.push(new Set(seen));
  }
}
// The stage a sentence becomes worth hearing: the first one by which most of
// it is characters you have met. Without this, EVERY listening question and
// EVERY tone question was locked until all ten stages were passed — 590
// questions a learner would not see for months, including the whole of the
// listening skill (found by the variety audit).
//
// The threshold was 0.6, and 你唔好去死 cleared it exactly — 你 唔 好 are taught
// in stage one, 去 and 死 are not, which is three characters out of five. So a
// sentence two-fifths unknown was offered in a learner's second-ever round.
// Robert: "Is this question scaled or gated to my current level of learning?"
// It was, technically, and the gate was set too low to mean anything.
//
// Nation's coverage work puts comfortable listening at about 95% of the words
// known, and 80% is where comprehension starts to break down badly. A four-
// option question does not need 95%, but it does need more than three fifths,
// and it needs the unknown part to be SMALL rather than merely proportionate:
// two new characters in a five-character sentence is a different thing from
// two in a twenty-character one.
const KNOWN_ENOUGH = 0.8;
const NEW_AT_MOST = 2;
const stageForText = (text) => {
  const cs = [...text.replace(/[^㐀-鿿]/g, '')];
  if (!cs.length) return undefined;
  for (const [n, set] of charsByStage.entries()) {
    const unknown = cs.filter((c) => !set.has(c)).length;
    if (unknown > NEW_AT_MOST) continue;
    if ((cs.length - unknown) / cs.length >= KNOWN_ENOUGH) return n;
  }
  return undefined;               // still out of reach: it opens after the course
};
for (const it of items) {
  let n;
  if (it.i != null) n = stageOfWord.get(it.i);
  else if (it.gid != null) n = stageOfGrammar.get(it.gid);
  else if (it.choices) {
    // A tone pair belongs to the stage that teaches the later of its words —
    // and if those words are past the staged vocabulary, it opens as soon as
    // the learner has met them (see `needs`).
    const stagesOf = it.choices.map((c) => stageOfWord.get(c.i)).filter((x) => x != null);
    if (stagesOf.length === it.choices.length) n = Math.max(...stagesOf);
    else it.needs = it.choices.map((c) => c.i);
  } else if (it.text) n = stageForText(it.text);
  // A question that SHOWS a sentence is only in reach once the SENTENCE is.
  // Being about a word or a grammar point the learner has reached is not
  // enough, and treating it as enough is how a beginner was asked what
  // "SFX 啫係咩呀?" means as his third question (Robert, 20 Sept). The two
  // rules are combined rather than either one trusted alone.
  if (it.text && (it.i != null || it.gid != null)) {
    const ts = stageForText(it.text);
    n = n != null && ts != null ? Math.max(n, ts) : undefined;
  }
  if (n != null) it.stage = n;
}
// A stage is passed on its words AND its grammar points, so if a grammar
// point's only questions are locked behind a sentence the learner cannot
// reach yet, that stage can never be passed and the course stops dead. That
// is what the coverage rule above did on its first run: stage one asks for
// two grammar points, both of their questions were out of reach, and eight
// rounds of solid work passed no stage at all (caught by build/test-keen.mjs).
//
// So each grammar point keeps one question open at its own stage: the one
// whose sentence the learner can read most of. A taught example is not a
// listening test — it arrives with its reading line and its translation, and
// being shown a sentence slightly beyond you is how you get past it.
for (const [gid, gs] of stageOfGrammar) {
  const mine = items.filter((it) => it.gid === gid && it.text);
  if (!mine.length || mine.some((it) => it.stage != null && it.stage <= gs)) continue;
  const readable = (t) => {
    const cs = [...t.replace(/[^㐀-鿿]/g, '')];
    const set = charsByStage[gs] || new Set();
    return cs.length ? cs.filter((c) => set.has(c)).length / cs.length : 0;
  };
  const best = mine.slice().sort((a, b) => readable(b.text) - readable(a.text) || chars(a.text) - chars(b.text))[0];
  best.stage = gs;
}

mkdirSync(join(ROOT, 'app', 'data'), { recursive: true });
const deck = {
  built: new Date().toISOString().slice(0, 10),
  coverage: COVERAGE,
  stages,
  notes,
  cues,
  words: chosen.map((e) => ({ w: e.w, j: e.jyut, g: e.gloss[0], alt: e.gloss.slice(1, 3), r: e.rank, t: e.tier, c: e.glossConf, s: e.glossSrc })),
  examples,
  grammar,
  context,
  items,
  audio: [...audioNeeded],
};
writeFileSync(join(ROOT, 'app', 'data', 'deck.json'), JSON.stringify(deck));
const byKind = items.reduce((m, i) => ({ ...m, [i.k]: (m[i.k] || 0) + 1 }), {});
const size = (JSON.stringify(deck).length / 1e6).toFixed(1);
console.log(`deck: ${items.length.toLocaleString()} items from ${chosen.length.toLocaleString()} words (${size} MB)`);
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k.padEnd(16)} ${n.toLocaleString()}`);
console.log(`  tier 1 (recorded speech) ${chosen.filter((e) => e.tier === 1).length.toLocaleString()}, tier 2 (written frequency) ${chosen.filter((e) => e.tier === 2).length.toLocaleString()}`);
console.log(`  words with an example sentence: ${Object.keys(examples).length.toLocaleString()}`);
console.log(`grammar points: ${grammar.length}; context cards: ${context.length}; recordings to fetch: ${audioNeeded.size}`);
console.log(`words sharing a meaning with another: ${cued + stillAmbiguous} — ${cued} now carry a cue, ${stillAmbiguous} still ambiguous`);
console.log(`notes on confusable words: ${notes.length}`);
console.log(`the course: ${stages.length} stages, ${stages.reduce((n, s) => n + s.words.length, 0)} words gated, ${items.filter((i) => i.stage != null).length.toLocaleString()} questions inside them`);
