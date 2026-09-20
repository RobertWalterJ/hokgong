// Gong Gong — build a citable Cantonese corpus from open sources.
//
//   node build/extract.mjs
//
// Same contract as Palimpsest: nothing is invented. Every word the app teaches
// comes with the pronunciation and gloss a published source gives it, and
// every sentence is quoted verbatim from Tatoeba with its author and licence.
//
// Sources (all open, see SOURCES.md):
//   HKCanCor   230k words of recorded Hong Kong conversation, word-segmented
//              with Jyutping and part of speech (Luke & Wong, CC BY 4.0).
//              This is what makes the word list *spoken* Cantonese rather than
//              written Chinese: frequency comes from people talking.
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
const han = /^[㐀-䶿一-鿿豈-﫿]+$/;
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
// headword -> [{ jyut, glosses, src }] — entries kept apart, because a
// character's meaning depends on how it is SAID: 噉 is "to eat" as daam6 and
// "like this" as gam2, and the corpus says which one people used.
const dict = new Map();
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
    const glosses = defs ? defs.split('/').map((d) => d.trim()).filter(Boolean) : [];
    for (const head of new Set([trad, simp])) {
      if (!dict.has(head)) dict.set(head, []);
      dict.get(head).push({ jyut: (jyut || '').replace(/\s+/g, ''), glosses, src });
    }
  }
};
readEntries('cccanto-webdist.txt', 'CC-Canto');
readEntries('cccedict-canto-readings-150923.txt', 'CC-Canto readings');
readEntries('cedict.txt', 'CC-CEDICT');

// ── the word list: spoken frequency, joined to the dictionaries ──────────
const lexicon = [...counts.entries()]
  .sort((a, b) => b[1].n - a[1].n)
  .map(([w, e], i) => {
    const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const said = top(e.jyut);                              // as spoken in the corpus
    const entries = (dict.get(w) || []).filter((x) => x.glosses.length);
    // The gloss for the pronunciation actually used, Cantonese dictionary
    // first; only if nothing matches does any other sense stand in, and the
    // app says so rather than pretending.
    const pick = entries.filter((x) => x.jyut === said).sort((a, b) => (a.src === 'CC-Canto' ? -1 : 1) - (b.src === 'CC-Canto' ? -1 : 1))[0]
      || entries.find((x) => x.src === 'CC-Canto') || entries[0];
    return {
      w, rank: i + 1, n: e.n,
      jyut: said,
      jyutAll: [...e.jyut.keys()],
      pos: top(e.pos),
      gloss: pick ? pick.glosses.slice(0, 3) : [],
      glossSrc: pick ? pick.src : null,
      glossMatchesSaid: pick ? pick.jyut === said : false,   // false = the sense may be for another reading
      dictJyut: [...new Set(entries.map((x) => x.jyut).filter(Boolean))],
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
writeFileSync(join(ROOT, 'corpus', 'coverage.json'), JSON.stringify({ tokens, texts, types: lexicon.length, coverage }));

const withGloss = lexicon.filter((e) => e.gloss.length).length;
const top1000 = lexicon.slice(0, 1000);
console.log('of the top 1,000 spoken words: ' + top1000.filter((e) => e.glossSrc === 'CC-Canto' && e.glossMatchesSaid).length + ' have a Cantonese gloss for the pronunciation used, ' + top1000.filter((e) => e.glossSrc !== 'CC-Canto' && e.glossMatchesSaid).length + ' a Mandarin-dictionary gloss for it, ' + top1000.filter((e) => e.glossSrc && !e.glossMatchesSaid).length + ' only a gloss for another reading, ' + top1000.filter((e) => !e.glossSrc).length + ' none at all');
console.log(`HKCanCor: ${texts} transcripts, ${tokens.toLocaleString()} word tokens, ${lexicon.length.toLocaleString()} distinct words`);
console.log(`dictionaries: ${dict.size.toLocaleString()} headwords; ${withGloss.toLocaleString()} of the corpus words have an English gloss (${Math.round((withGloss / lexicon.length) * 100)}%)`);
console.log(`Tatoeba: ${sentences.length.toLocaleString()} usable sentences — ${sentences.filter((s) => s.audio).length.toLocaleString()} with recorded audio, ${sentences.filter((s) => s.eng).length.toLocaleString()} with an English translation`);
console.log('\nWhat the first N spoken words cover, in real conversation:');
for (const c of coverage) console.log(`  ${String(c.words).padStart(6)} words  ${String(c.pct).padStart(5)}%`);
console.log('\ntop 12 by frequency:');
for (const e of lexicon.slice(0, 12)) console.log(`  ${String(e.rank).padStart(3)}. ${e.w} ${e.jyut.padEnd(10)} ${e.n.toString().padStart(5)}  ${(e.gloss[0] || '—').slice(0, 48)}`);
