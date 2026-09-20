// Build a citable Cantonese corpus from open sources.
//
//   node build/extract.mjs
//
// Same contract as Palimpsest: nothing is invented. Every word the app teaches
// comes with the pronunciation and gloss a published source gives it, and
// every sentence is quoted verbatim from Tatoeba with its author and licence.
//
// Sources (all open, see SOURCES.md):
//   HKCanCor   125k words of recorded Hong Kong conversation, word-segmented
//              with Jyutping and part of speech (Luke & Wong, CC BY 4.0).
//              This is what makes the word list *spoken* Cantonese rather than
//              written Chinese: frequency comes from people talking.
//   rime-cantonese  a Jyutping lexicon and a written-Cantonese frequency list
//              (CC BY 4.0), used to confirm pronunciations and to carry the
//              word list past the 6,399 words the corpus happened to record.
//   CC-Canto   Cantonese dictionary, Jyutping + English (Pleco, CC BY-SA 3.0)
//   CC-CEDICT  Chinese-English dictionary (CC BY-SA 4.0) with the CC-Canto
//              Cantonese readings file for Jyutping
//   Tatoeba    Cantonese sentences, English translations, and 1,784 sentences
//              with recorded audio (CC BY 2.0 FR / CC BY 4.0 per sentence)
//
// Output: corpus/lexicon.json, corpus/sentences.json, corpus/coverage.json.

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'sources');
mkdirSync(join(ROOT, 'corpus'), { recursive: true });

// ── HKCanCor: word/POS/jyutping, one token per line ──────────────────────
// Tokens are tagged with the Linguistic Society of Hong Kong's romanisation.
// Punctuation carries a made-up "pronunciation" (VQ6 and friends) and is
// dropped; so are English words and numbers, which are not what we teach.
const DIR = join(SRC, 'hkcancor-master', 'data', 'utf8');
const tok = /^([^/]+)\/([^/]*)\/([^/]*)\/$/;
const han = /^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]+$/;   // CJK: main block, extension A, compatibility
const counts = new Map();          // word -> { n, pos: Map, jyut: Map }
let tokens = 0, texts = 0;
for (const f of readdirSync(DIR)) {
  texts++;
  for (const line of readFileSync(join(DIR, f), 'utf8').split('\n')) {
    const m = tok.exec(line.trim());
    if (!m) continue;
    const [, w, pos, jyut] = m;
    if (!han.test(w) || !jyut || !/^[a-z1-6]+$/.test(jyut)) continue;
    tokens++;
    const e = counts.get(w) || { n: 0, pos: new Map(), jyut: new Map() };
    e.n++;
    e.pos.set(pos, (e.pos.get(pos) || 0) + 1);
    e.jyut.set(jyut, (e.jyut.get(jyut) || 0) + 1);
    counts.set(w, e);
  }
}

// ── the dictionaries ─────────────────────────────────────────────────────
// CC-CEDICT line: 傳統 简体 [pin1 yin1] /gloss/gloss/
// CC-Canto adds  : 傳統 简体 [pin1 yin1] {jyut ping} /gloss/gloss/
// headword -> [{ jyuts, glosses, src }] — entries kept apart, because a
// character's meaning depends on how it is SAID: 噉 is "to eat" as daam6 and
// "like this" as gam2, and the corpus says which one people used.
const dict = new Map();
// Split on a separator, but only outside brackets. CC-Canto writes part of
// speech as "(noun / adverb) tomorrow", so splitting the definitions on every
// slash cut the bracket in half and left words glossed "(noun".
const splitOutside = (text, isSep) => {
  const out = [];
  let depth = 0, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0) {
      const cut = isSep(c, i, text);
      if (cut) { out.push(text.slice(from, i)); from = cut === 'keep' ? i : i + 1; }
    }
  }
  out.push(text.slice(from));
  return out.filter((s) => s.trim());
};
const readEntries = (file, src) => {
  // CC-CEDICT ships with Windows line endings; a stray \r is a line terminator
  // in JS regex, so `(.*)$` rejected every line of it.
  for (const line of readFileSync(join(SRC, file), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    // Head, Mandarin reading, optional {jyutping}, then the definitions. Not
    // every CC-Canto line closes its last definition with a slash, and some
    // carry a "# adapted from cc-cedict" note; requiring a closing slash threw
    // away the whole entry, which is how 係 lost "(Cantonese) to be" and fell
    // back to the Mandarin "to connect".
    const m = /^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s*(?:\{([^}]*)\})?\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, trad, simp, , jyut, rest] = m;
    const defs = rest.replace(/\s*#.*$/, '').replace(/^\//, '').replace(/\/\s*$/, '');
    const glosses = defs ? splitOutside(defs, (c) => c === '/').map((d) => d.trim()).filter(Boolean) : [];
    // A single entry may offer two readings — 來 is written {lai4 / loi4} — so
    // the readings are kept as a list rather than one run-together string.
    const jyuts = (jyut || '').split('/').map((j) => j.replace(/\s+/g, '')).filter(Boolean);
    for (const head of new Set([trad, simp])) {
      if (!dict.has(head)) dict.set(head, []);
      dict.get(head).push({ jyuts, glosses, src });
    }
  }
};
readEntries('cccanto-webdist.txt', 'CC-Canto');
readEntries('cccedict-canto-readings-150923.txt', 'CC-Canto readings');
readEntries('cedict.txt', 'CC-CEDICT');

// ── rime-cantonese: an independent pronunciation authority ───────────────
// A rime line is `word <TAB> jyutping [<TAB> share%]`. The reading with NO
// percentage is the main one; a percentage marks a minority reading. Reading
// the file without that rule taught 搵 as man5 "to wipe away tears" instead of
// wan2 "to look for", and 說 as an archaic jyut6 — so the order matters.
const RIME = join(SRC, 'rime');
const readRime = (file) => {
  const out = new Map();                    // word -> [jyutping, ...] best first
  const text = readFileSync(join(RIME, file), 'utf8');
  for (const line of text.slice(text.indexOf('\n...\n') + 5).split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const [w, jyut, share] = line.split('\t');
    if (!w || !jyut) continue;
    if (!out.has(w)) out.set(w, []);
    out.get(w).push({ jyut: jyut.replace(/\s+/g, ''), share: share ? parseFloat(share) : 101 });
  }
  for (const [w, list] of out) out.set(w, list.sort((a, b) => b.share - a.share).map((x) => x.jyut));
  return out;
};
const rimeWords = readRime('jyut6ping3.words.dict.yaml');
const rimeChars = readRime('jyut6ping3.chars.dict.yaml');
const rimeSays = (w) => ([...w].length === 1 ? rimeChars.get(w) : rimeWords.get(w) || rimeChars.get(w)) || [];

// ── which sense is the right one ─────────────────────────────────────────
// Matching the pronunciation is not enough. 都 is dou1 both as "all/also" (what
// people say every other sentence) and as the noun "capital city", and the
// dictionary offered the city. Dictionary entries also pack several senses into
// one string — 就 arrives as "(verb)1. obey; (adverb) 1. since…then; 2. because
// of (something), then…" — so each sense is separated out, tidied, and the ones
// that agree with the part of speech the corpus recorded are put first.
const POS_CLASS = { n: 'noun', t: 'noun', s: 'noun', f: 'noun', v: 'verb', a: 'adjective', d: 'adverb', r: 'pronoun', m: 'numeral', q: 'classifier', p: 'preposition', c: 'conjunction', u: 'particle', y: 'particle', e: 'interjection', o: 'interjection' };
const classOf = (t) => {
  t = t.toLowerCase();
  if (/measure word|classifier/.test(t)) return 'classifier';
  // Longest first: 'adverb' contains 'verb' and 'pronoun' contains 'noun', so a
  // plain substring test in the wrong order files every adverb as a verb.
  for (const c of ['adverb', 'adjective', 'pronoun', 'preposition', 'conjunction', 'interjection', 'particle', 'numeral', 'noun', 'verb']) if (t.includes(c)) return c;
  if (t.includes('determiner')) return 'pronoun';
  if (t.includes('number')) return 'numeral';
  return null;
};
// What a learner should read: no pinyin in square brackets, no "as opposed to
// 您nín" asides, no "1." numbering left over from the dictionary's own layout.
const tidy = (s) => s
  .replace(/\[[^\]]*\]/g, '')
  .replace(/\([^)]*[\u3400-\u9FFF][^)]*\)/g, '')
  .replace(/^\s*\([^)]{1,24}\)\s*/, '')
  .replace(/^\s*\d+\s*[.)]\s*/, '')
  .replace(/\s+/g, ' ')
  .replace(/^[;,\s]+|[;,\s]+$/g, '')
  .trim();
// Senses are separated by a semicolon, by a numbered marker, or by both — but
// only outside brackets. Splitting on every semicolon cut "(phrase; said when…)"
// in half and left 33 words glossed "(phrase".
const splitSenses = (g) => splitOutside(g, (c, i, text) => {
  if (c === ';') return true;                                   // drop the semicolon
  if (/\s/.test(c) && /^\d+[.)]\s/.test(text.slice(i + 1))) return 'keep';   // keep the number for tidy() to strip
  return false;
});

// One entry becomes a list of senses, each carrying the part of speech the
// dictionary last declared — the tag applies until another one appears.
const sensesOf = (entry) => {
  const out = [];
  let cls = null;
  for (const g of entry.glosses) {
    for (const piece of splitSenses(g)) {
      const m = /^\s*\(([^)]{1,24})\)/.exec(piece);
      if (m) { const c = classOf(m[1]); if (c) cls = c; }
      const text = tidy(piece);
      if (text && text.length <= 64 && !out.some((o) => o.text === text)) out.push({ text, cls });
    }
  }
  return out;
};
const scoreEntry = (senses, src, cls) => {
  const declared = senses.map((s) => s.cls).filter(Boolean);
  let s = src === 'CC-Canto' ? 1 : 0;
  // Agreement is rewarded. Disagreement is mostly ignored, because the two
  // vocabularies differ — the corpus tags 唔 an adverb, the dictionary calls it
  // a verb, and both mean the same negation. The exception is a sense offered
  // only as a noun for a word people use as a function word: that is a
  // different word, not a different label, and it is how 都 (all, also) was
  // being taught as "capital city".
  const FUNCTION = ['adverb', 'particle', 'pronoun', 'preposition', 'conjunction', 'classifier'];
  if (cls && declared.includes(cls)) s += 3;
  else if (FUNCTION.includes(cls) && declared.length && declared.every((d) => d === 'noun')) s -= 2;
  return s;
};

// How sure we are that the gloss belongs to the word as it is said:
//   exact     a dictionary entry carries that very Jyutping
//   sandhi    the entry's reading differs only in tone, and rime confirms the
//             reading the corpus recorded — Cantonese changes tone constantly
//             (到 dou3 said as dou2) without changing what the word means
//   inferred  the entry gives no Cantonese reading at all, but rime gives the
//             word one reading only, so there is no other sense to confuse it
//             with (其實 "actually", 如果 "if", 自己 "oneself")
//   other     the only gloss belongs to a different reading — not taught
const toneless = (j) => j.replace(/[1-6]/g, '');
const confidenceFor = (entry, said, rime) => {
  if (entry.jyuts.includes(said)) return 'exact';
  if (rime.includes(said) && entry.jyuts.some((j) => toneless(j) === toneless(said))) return 'sandhi';
  if (!entry.jyuts.length && rime.length === 1 && rime[0] === said) return 'inferred';
  return 'other';
};
const RANK = { exact: 3, sandhi: 2, inferred: 1, other: 0 };

// ── the word list: spoken frequency, joined to the dictionaries ──────────
const lexicon = [...counts.entries()]
  .sort((a, b) => b[1].n - a[1].n)
  .map(([w, e], i) => {
    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const said = top(e.jyut);                              // as spoken in the corpus
    const pos = top(e.pos);
    const cls = POS_CLASS[pos[0]] || null;
    const rime = rimeSays(w);
    const entries = (dict.get(w) || []).filter((x) => x.glosses.length)
      .map((x, k) => ({ ...x, k, senses: sensesOf(x), conf: confidenceFor(x, said, rime) }))
      .filter((x) => x.senses.length);
    // Best evidence first: the reading has to fit before the sense is weighed.
    const ranked = [...entries].sort((a, b) =>
      RANK[b.conf] - RANK[a.conf]
      || scoreEntry(b.senses, b.src, cls) - scoreEntry(a.senses, a.src, cls)
      || a.k - b.k);
    const pick = ranked[0];
    const ordered = pick ? [...pick.senses].sort((a, b) => (b.cls === cls ? 1 : 0) - (a.cls === cls ? 1 : 0)).map((s) => s.text) : [];
    return {
      w, rank: i + 1, n: e.n,
      jyut: said,
      jyutAll: [...e.jyut.keys()],
      rimeJyut: rime,
      pos,
      gloss: ordered.slice(0, 3),
      glossSrc: pick ? pick.src : null,
      glossConf: pick ? pick.conf : null,
      glossMatchesSaid: pick ? pick.conf !== 'other' : false,
      dictJyut: [...new Set(entries.flatMap((x) => x.jyuts))],
    };
  });

// How much of real conversation the first N words cover — the number that says
// what a vocabulary is worth (Nation's coverage method, computed here on
// Cantonese speech rather than assumed from English).
const coverage = [];
let run = 0;
for (const [i, e] of lexicon.entries()) {
  run += e.n;
  if ([100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, lexicon.length].includes(i + 1)) {
    coverage.push({ words: i + 1, tokens: run, pct: +((run / tokens) * 100).toFixed(1) });
  }
}

// ── beyond the corpus: rime-cantonese, to reach a conversational vocabulary ──
// HKCanCor only ever recorded 6,399 distinct words, and a good part of those
// are too rare or too 1997 to teach. A conversational vocabulary is usually put
// at 4,000–6,000 words, so the list continues past the corpus with the
// written-Cantonese frequency list.
//
// The two tiers are kept apart and labelled, because they are not the same kind
// of evidence: tier 1 is what people were recorded saying; tier 2 is how often
// a word is written in Cantonese. Tier 1 is always taught first.

// Glosses that teach nothing on their own, or that belong to a name or an old
// form rather than to the word as it is used.
const uselessGloss = /^(variant of|old variant of|surname |abbr\. for|see |used in|erhua variant|another name for|an alternative form|alternative form|\(archaic\)|\(literary\))/i;
const properNoun = /^[A-Z][a-z]+( [A-Z][a-z]+)*( \(|,|$)/;
// Written-Mandarin function characters. A Cantonese learner saying 就是 or 他們
// is speaking Mandarin with a Cantonese accent, so those compounds are left out.
const mandarin = /[是了他她們沒很嗎這那麼誰怎]/;
// Swear words. Real Cantonese, and high-frequency in the forum text the written
// corpus is built from — but not what this app puts in front of a learner who
// is teaching his child to talk. Kept out of the deck, not pretended away.
const vulgar = /屌|撚|閪|屄|鳩|柒|仆街|撲街|冚家|粉腸|躝/;

const spoken = new Set(lexicon.map((e) => e.w));
const essay = [];
for (const line of readFileSync(join(RIME, 'essay-cantonese.txt'), 'utf8').split(/\r?\n/)) {
  const [w, f] = line.split('\t');
  if (!w || !f || spoken.has(w)) continue;
  const freq = +f;
  if (!(freq >= 10)) continue;              // the tail is transcription noise
  if (!han.test(w)) continue;
  const len = [...w].length;
  if (len < 1 || len > 4) continue;
  if (mandarin.test(w) || vulgar.test(w)) continue;
  // A single character gets only its main reading; a multi-character word may
  // match any reading rime lists for it, best first.
  const says = len === 1 ? rimeSays(w).slice(0, 1) : rimeSays(w);
  if (!says.length) continue;
  const entries = (dict.get(w) || []).filter((x) => x.glosses.length);
  // The gloss has to belong to a pronunciation rime gives the word — the same
  // rule tier 1 uses, so a Mandarin sense never sneaks in under a Cantonese
  // reading. Here the evidence has to be exact: there is no corpus tag to fall
  // back on, so an inferred reading is not good enough.
  let best = null;
  for (const said of says) {
    const hit = entries.filter((x) => x.jyuts.includes(said))
      .sort((a, b) => (a.src === 'CC-Canto' ? -1 : 1) - (b.src === 'CC-Canto' ? -1 : 1))[0];
    if (hit) { best = { said, hit }; break; }
  }
  if (!best) continue;
  const glosses = sensesOf(best.hit).map((x) => x.text)
    .filter((g) => !uselessGloss.test(g) && !properNoun.test(g) && g.length <= 60)
    .slice(0, 3);
  if (!glosses.length) continue;
  essay.push({ w, freq, jyut: best.said, jyutAll: says, rimeJyut: says, pos: null, gloss: glosses, glossSrc: best.hit.src, glossConf: 'exact', glossMatchesSaid: true, dictJyut: [...new Set(entries.flatMap((x) => x.jyuts))] });
}
essay.sort((a, b) => b.freq - a.freq);
for (const [i, e] of essay.entries()) { e.rank = lexicon.length + i + 1; e.tier = 2; e.n = 0; }
for (const e of lexicon) { e.tier = 1; e.freq = null; }
lexicon.push(...essay);

// ── Tatoeba: sentences, translations, and recorded audio ─────────────────
const T = (f) => readFileSync(join(SRC, 'tatoeba', f), 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
const yue = new Map(T('yue_sentences.tsv').map(([id, , text]) => [id, text]));
const eng = new Map(T('eng_sentences.tsv').map(([id, , text]) => [id, text]));
const links = new Map();
for (const [a, b] of T('yue-eng_links.tsv')) if (!links.has(a) && eng.has(b)) links.set(a, eng.get(b));
const audio = new Map();
for (const [id, audioId, user, licence] of T('yue_sentences_with_audio.tsv')) audio.set(id, { audioId, by: user, licence });

const sentences = [...yue.entries()].map(([id, text]) => ({
  id: +id, text,
  eng: links.get(id) || null,
  audio: audio.get(id) || null,
})).filter((s) => s.eng || s.audio);

writeFileSync(join(ROOT, 'corpus', 'lexicon.json'), JSON.stringify(lexicon));
writeFileSync(join(ROOT, 'corpus', 'sentences.json'), JSON.stringify(sentences));
const t1 = lexicon.filter((e) => e.tier === 1), t2 = lexicon.filter((e) => e.tier === 2);
const teachable = t1.filter((e) => e.glossMatchesSaid && e.gloss.length).length;
writeFileSync(join(ROOT, 'corpus', 'coverage.json'), JSON.stringify({ tokens, texts, types: t1.length, spokenTeachable: teachable, writtenTeachable: t2.length, coverage }));

const by = (c) => t1.slice(0, 1000).filter((e) => e.glossConf === c).length;
console.log(`of the top 1,000 spoken words: ${by('exact')} have a gloss for the very reading recorded, ${by('sandhi')} for the same word in another tone, ${by('inferred')} from a dictionary that gives no reading but only one meaning, ${by('other')} only a gloss for a different reading, ${t1.slice(0, 1000).filter((e) => !e.glossSrc).length} none at all`);
console.log(`HKCanCor: ${texts} transcripts, ${tokens.toLocaleString()} word tokens, ${t1.length.toLocaleString()} distinct words`);
console.log(`dictionaries: ${dict.size.toLocaleString()} headwords; ${t1.filter((e) => e.gloss.length).length.toLocaleString()} of the corpus words have an English gloss`);
console.log(`teachable: ${teachable.toLocaleString()} spoken words + ${t2.length.toLocaleString()} from written-Cantonese frequency = ${(teachable + t2.length).toLocaleString()} words`);
console.log(`Tatoeba: ${sentences.length.toLocaleString()} usable sentences — ${sentences.filter((s) => s.audio).length.toLocaleString()} with recorded audio, ${sentences.filter((s) => s.eng).length.toLocaleString()} with an English translation`);
console.log('\nWhat the first N spoken words cover, in real conversation:');
for (const c of coverage) console.log(`  ${String(c.words).padStart(6)} words  ${String(c.pct).padStart(5)}%`);
console.log('\ntop 12 by frequency:');
for (const e of t1.slice(0, 12)) console.log(`  ${String(e.rank).padStart(3)}. ${e.w} ${e.jyut.padEnd(10)} ${e.n.toString().padStart(5)}  ${(e.glossConf || '—').padEnd(8)} ${(e.gloss[0] || '—').slice(0, 40)}`);
