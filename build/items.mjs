// Build the deck: every question the app can ask, from the corpus.
//
//   node build/items.mjs
//
// Nothing is invented. A word carries the Jyutping the corpus recorded and the
// gloss a dictionary gives that pronunciation; a sentence is a Tatoeba sentence
// with its own human translation, and, where one exists, its recording.
// build/verify.mjs checks all of that again before the app is built.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const LEX = read('corpus/lexicon.json');
const SENT = read('corpus/sentences.json');
const GRAMMAR = (await import(pathToFileURL(join(ROOT, 'content', 'grammar.mjs')).href)).default;

const WORDS = 400;                       // how far down the frequency list v1 goes
const words = (s) => s.split(/\s+/).length;
const chars = (s) => [...s.replace(/[^㐀-鿿]/g, '')].length;
// A seeded shuffle, so the deck is the same every build.
const seeded = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); };
const pickOthers = (pool, self, n, rnd, key = (x) => x) => {
  const len = words(key(self));
  return pool.filter((x) => key(x) !== key(self) && Math.abs(words(key(x)) - len) <= Math.max(2, len * 0.5))
    .map((x) => ({ x, r: rnd() })).sort((a, b) => a.r - b.r).slice(0, n).map((o) => o.x);
};

// ── the words worth learning first ───────────────────────────────────────
// Frequency order, but only words whose gloss belongs to the pronunciation the
// corpus recorded — the rest wait for a Cantonese speaker to check them.
const pool = LEX.filter((e) => e.gloss.length && e.glossMatchesSaid && chars(e.w) <= 3
  && !/^[A-Za-z]/.test(e.gloss[0]) === false ? true : true);
const usable = LEX.filter((e) => e.gloss.length && e.glossMatchesSaid && chars(e.w) <= 3);
const chosen = usable.slice(0, WORDS);
const glossPool = chosen.map((e) => e.gloss[0]);

// A sentence that shows the word, with its translation and, if there is one,
// its recording: Tatoeba, shortest first.
const exampleFor = (w) => SENT.filter((s) => s.eng && s.text.includes(w) && chars(s.text) <= 14)
  .sort((a, b) => (b.audio ? 1 : 0) - (a.audio ? 1 : 0) || chars(a.text) - chars(b.text))[0] || null;

const items = [];
const audioNeeded = new Set();
for (const e of chosen) {
  const rnd = seeded('w' + e.w);
  const ex = exampleFor(e.w);
  if (ex?.audio) audioNeeded.add(ex.id);
  const options = pickOthers(glossPool, e.gloss[0], 3, rnd);
  if (options.length < 3) continue;
  const base = { w: e.w, jyut: e.jyut, gloss: e.gloss[0], rank: e.rank, pos: e.pos, ex: ex ? { id: ex.id, text: ex.text, eng: ex.eng, audio: ex.audio?.audioId || null } : null };
  // Hear it, and know what it means (the phone speaks the word).
  items.push({ id: `wl/${e.w}`, kind: 'word-listen', ...base, options, level: Math.ceil(e.rank / 100) });
  // See it, say it: the reveal gives the Jyutping and the model pronunciation.
  items.push({ id: `ws/${e.w}`, kind: 'word-say', ...base, level: Math.ceil(e.rank / 100) });
}

// ── listening: real recorded sentences ───────────────────────────────────
// Short ones first, and only those made of words in the first 1,000 — so
// listening starts in week one rather than after months.
const known = new Set(LEX.slice(0, 1000).map((e) => e.w));
const covered = (text) => {
  const cs = [...text.replace(/[^㐀-鿿]/g, '')];
  if (!cs.length) return 0;
  return cs.filter((c) => [...known].some((w) => w.includes(c))).length / cs.length;
};
const listenPool = SENT.filter((s) => s.audio && s.eng && chars(s.text) <= 12)
  .map((s) => ({ s, cov: covered(s.text) }))
  .filter((x) => x.cov >= 0.85)
  .sort((a, b) => b.cov - a.cov || chars(a.s.text) - chars(b.s.text))
  .slice(0, 250)
  .map((x) => x.s);
const engPool = listenPool.map((s) => s.eng);
for (const s of listenPool) {
  const rnd = seeded('s' + s.id);
  const options = pickOthers(engPool, s.eng, 3, rnd);
  if (options.length < 3) continue;
  audioNeeded.add(s.id);
  items.push({ id: `sl/${s.id}`, kind: 'sentence-listen', sid: s.id, text: s.text, eng: s.eng, audio: s.audio.audioId, by: s.audio.by, options, level: 3 });
}

// ── tones: minimal pairs from words being learnt ─────────────────────────
// Same syllable, different tone, both inside the first 600 words: the contrast
// that matters is between words you will actually say.
const bySyll = new Map();
for (const e of usable.slice(0, 600)) {
  if (!/^[a-z]+[1-6]$/.test(e.jyut)) continue;
  const k = e.jyut.slice(0, -1);
  if (!bySyll.has(k)) bySyll.set(k, []);
  if (!bySyll.get(k).some((x) => x.jyut === e.jyut)) bySyll.get(k).push(e);
}
const toneSets = [...bySyll.entries()].filter(([, v]) => v.length >= 2)
  .sort((a, b) => b[1].length - a[1].length || a[1][0].rank - b[1][0].rank);
for (const [syll, group] of toneSets) {
  items.push({
    id: `tp/${syll}`, kind: 'tone-pair', syll,
    choices: group.slice(0, 4).map((e) => ({ w: e.w, jyut: e.jyut, gloss: e.gloss[0], tone: +e.jyut.slice(-1) })),
    level: 2,
  });
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
  const examples = hits.sort((a, b) => (b.audio ? 1 : 0) - (a.audio ? 1 : 0) || chars(a.text) - chars(b.text)).slice(0, 6);
  grammar.push({ id: g.id, title: g.title, plain: g.plain, watch: g.watch || null, corpus: g.corpus,
    examples: examples.map((s) => ({ id: s.id, text: s.text, eng: s.eng, audio: s.audio?.audioId || null })) });
  for (const s of examples.slice(0, 3)) {
    const rnd = seeded('g' + g.id + s.id);
    if (s.audio) audioNeeded.add(s.id);
    const options = pickOthers(engPool.concat(hits.map((h) => h.eng)), s.eng, 3, rnd);
    if (options.length === 3) items.push({ id: `gm/${g.id}/${s.id}`, kind: 'grammar-mean', gid: g.id, sid: s.id, text: s.text, eng: s.eng, audio: s.audio?.audioId || null, options, level: 3 });
  }
  // Choose the right form: blank the marker in a real sentence, and offer the
  // markers it is confused with.
  if (g.contrast) {
    const marker = g.match.length <= 2 ? g.match : null;
    const ex = examples.find((s) => marker && s.text.includes(marker));
    if (ex) items.push({ id: `gp/${g.id}/${ex.id}`, kind: 'grammar-pick', gid: g.id, sid: ex.id, text: ex.text, eng: ex.eng, audio: ex.audio?.audioId || null,
      blank: marker, answer: marker, options: [g.contrast, '過', '住'].filter((x) => x !== marker).slice(0, 3), level: 4 });
  }
  // Build the sentence: the pieces, shuffled. A production test that doesn't
  // ask you to type Chinese.
  for (const s of examples.filter((x) => chars(x.text) <= 10).slice(0, 2)) {
    const pieces = seg(s.text.replace(/[。？！，]/g, ''));
    if (pieces.length >= 3 && pieces.length <= 7) {
      items.push({ id: `gb/${g.id}/${s.id}`, kind: 'grammar-build', gid: g.id, sid: s.id, text: s.text, eng: s.eng, audio: s.audio?.audioId || null, pieces, level: 4 });
    }
  }
}

mkdirSync(join(ROOT, 'app', 'data'), { recursive: true });
const deck = {
  built: new Date().toISOString().slice(0, 10),
  words: chosen.length,
  coverage: read('corpus/coverage.json'),
  grammar,
  items,
  audio: [...audioNeeded],
};
writeFileSync(join(ROOT, 'app', 'data', 'deck.json'), JSON.stringify(deck));
const byKind = items.reduce((m, i) => ({ ...m, [i.kind]: (m[i.kind] || 0) + 1 }), {});
console.log(`deck: ${items.length} items from ${chosen.length} words`);
for (const [k, n] of Object.entries(byKind)) console.log(`  ${k.padEnd(16)} ${n}`);
console.log(`grammar points: ${grammar.length}; recordings needed: ${audioNeeded.size}`);
