// Hambaanglaang's sentences, as a corpus the app can teach from.
//
//   node build/hbl-sentences.mjs      → corpus/hbl.json
//
// The app already uses these books for their word-level glosses — that is the
// sense-frequency table that stopped 係 being taught as "to bind". What was not
// being used is the sentences themselves, and they are the best beginner
// material in the project by some distance:
//
//   - 6,727 sentences, every one with a human English translation;
//   - GRADED, levels 1 to 7, written for people learning to read Cantonese;
//   - every one READ ALOUD by a person, one recording per sentence.
//
// Tatoeba, which the app has used until now, is a general corpus of whatever
// people contributed. It is honest and it is not written for a beginner — it
// is where "You might as well go kill yourself" came from, and where the
// sentences run to twenty characters with no notion of difficulty. These are
// children's readers with a reading level on every book.
//
// THE AUDIO IS NOT FETCHED HERE. 6,727 clips at 42 KB is 280 MB, against the
// 18 MB the app carries today. This file writes the catalogue and the exact
// URL of every clip; build/fetch-hbl-audio.mjs takes a capped subset.
//
// Source: hambaanglaang.hk, CC BY 4.0. Machine-readable build and audio hosted
// by chinvocab.com. Credited in SOURCES.md and in the app.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'sources', 'hambaanglaang');
const S = JSON.parse(readFileSync(join(SRC, 'sents.json'), 'utf8'));
const B = JSON.parse(readFileSync(join(SRC, 'books.json'), 'utf8'));
const { unsuitable } = await import(pathToFileURL(join(ROOT, 'content', 'unsuitable.mjs')).href);

const level = new Map();
const title = new Map();
for (let i = 0; i < B.id.length; i++) { level.set(String(B.id[i]), Number(B.lvl[i])); title.set(String(B.id[i]), B.title_C[i]); }

// The clip for a sentence is its own number inside the book, zero-padded:
// book 00001's fourteen sentences are 01.mp3 … 14.mp3. Verified against four
// books — sentence count equals file count in every one.
const clipUrl = (book, sent) => `https://chinvocab.com/hbl/stories/${book}/aud_norm/${String(sent).padStart(2, '0')}.mp3`;

const out = [];
const dropped = new Map();
const chars = (s) => [...String(s).replace(/[^㐀-鿿]/g, '')].length;

for (let i = 0; i < S.id.length; i++) {
  const book = String(S.id[i]);
  const text = (S.C[i] || '').trim();
  const eng = (S.E[i] || '').trim();
  if (!text || !eng) continue;
  // The same reading every other sentence in this app gets. Children's readers
  // are gentler than Tatoeba but they are still stories, with illness and
  // unkindness in them.
  const why = unsuitable(eng, text);
  if (why) { dropped.set(why, (dropped.get(why) || 0) + 1); continue; }
  out.push({
    // A namespace of its own, so an id can never be mistaken for a Tatoeba one.
    id: `hbl:${book}:${S.sent[i]}`,
    text,
    eng,
    lvl: level.get(book) ?? null,
    book,
    bookTitle: title.get(book) || '',
    n: chars(text),
    verified: !!S.verif_transl[i],
    clip: clipUrl(book, S.sent[i]),
  });
}

mkdirSync(join(ROOT, 'corpus'), { recursive: true });
writeFileSync(join(ROOT, 'corpus', 'hbl.json'), JSON.stringify(out));

const byLvl = {};
for (const s of out) byLvl[s.lvl ?? '?'] = (byLvl[s.lvl ?? '?'] || 0) + 1;
const lens = out.map((s) => s.n).sort((a, b) => a - b);
console.log(`hbl: ${out.length.toLocaleString()} sentences from ${level.size} graded readers, every one with a recording`);
console.log(`  by reading level: ${Object.entries(byLvl).sort().map(([k, v]) => `L${k} ${v}`).join(', ')}`);
console.log(`  length in characters: shortest ${lens[0]}, median ${lens[Math.floor(lens.length / 2)]}, longest ${lens[lens.length - 1]}`);
console.log(`  translations marked checked by the publisher: ${out.filter((s) => s.verified).length.toLocaleString()}`);
if (dropped.size) {
  console.log(`  set aside as unsuitable: ${[...dropped.values()].reduce((a, b) => a + b, 0)}`);
  for (const [why, n] of [...dropped].sort((a, b) => b[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${why}`);
}
