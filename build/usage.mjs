// What a word is actually used to mean, counted from graded reading.
//
//   node build/usage.mjs      → corpus/usage.json
//
// The dictionaries tell us what a word CAN mean. Nothing in this build told us
// which of those meanings a learner needs, and that gap produced every gloss
// failure this project has had: 水 taught as "money", 四 as "labourer", 杯 as
// "to boycott", and — worst, because the whole of stage one rests on it — 係
// taught as "to bind", which is the literary Mandarin 係 xì.
//
// Ranking senses by how many dictionaries agree could not fix that, because
// agreement is about a shape of characters: more dictionaries record 係's
// literary sense than its Cantonese one. What was missing was usage.
//
// Hambaanglaang 冚唪唥 (hambaanglaang.hk, CC BY 4.0) is a series of 229 graded
// Cantonese readers, levels 1 to 7, written for people learning to read
// Cantonese. The machine-readable build by chinvocab carries 116,835
// word-level glosses: every Cantonese word in every sentence, with the English
// it means IN THAT SENTENCE. Counted up, that is a sense-frequency table for
// 7,500 words, from running Cantonese written for exactly this purpose.
//
//   係 → is (930), am (25), yes (25)
//   水 → water (135)
//   湯 → soup (13)          ← the word no dictionary here could gloss at all
//   點 → how (75), o'clock (46)
//
// IT IS NOT USED AS THE GLOSS. These are contextual translations from
// children's books, so function words arrive as 咗 → "-en" and 咩 →
// "(particle)". It is used to RANK and to VETO the senses the dictionaries
// give, which keeps the app's contract — every meaning taught is still one a
// published dictionary gives that word at that reading — while letting real
// usage choose between them.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'sources', 'hambaanglaang');
const G = JSON.parse(readFileSync(join(SRC, 'glosses.json'), 'utf8'));
const BOOKS = JSON.parse(readFileSync(join(SRC, 'books.json'), 'utf8'));

// The file is column-major: parallel arrays, one entry per gloss.
const need = ['C', 'E', 'id'];
for (const k of need) if (!Array.isArray(G[k])) throw new Error(`glosses.json has no ${k} column`);

// Which level each book is written at, so a word's first appearance can be
// placed on the same 1-7 scale the readers use.
const level = new Map();
if (Array.isArray(BOOKS.id) && Array.isArray(BOOKS.lvl)) {
  for (let i = 0; i < BOOKS.id.length; i++) level.set(String(BOOKS.id[i]), Number(BOOKS.lvl[i]));
}

const byWord = new Map();
for (let i = 0; i < G.C.length; i++) {
  const w = (G.C[i] || '').trim();
  const e = (G.E[i] || '').trim();
  if (!w || !e) continue;
  if (!byWord.has(w)) byWord.set(w, { n: 0, senses: new Map(), first: Infinity });
  const rec = byWord.get(w);
  rec.n++;
  rec.senses.set(e, (rec.senses.get(e) || 0) + 1);
  const lv = level.get(String(G.id[i]));
  if (lv && lv < rec.first) rec.first = lv;
}

const out = {};
for (const [w, rec] of byWord) {
  const senses = [...rec.senses].sort((a, b) => b[1] - a[1]).slice(0, 8);
  out[w] = { n: rec.n, lvl: Number.isFinite(rec.first) ? rec.first : null, s: senses };
}

mkdirSync(join(ROOT, 'corpus'), { recursive: true });
writeFileSync(join(ROOT, 'corpus', 'usage.json'), JSON.stringify(out));
const words = Object.keys(out);
const heavy = words.filter((w) => out[w].n >= 20);
console.log(`usage: ${G.C.length.toLocaleString()} glosses from ${level.size || '?'} graded readers`);
console.log(`  ${words.length.toLocaleString()} words with a recorded usage; ${heavy.length.toLocaleString()} seen 20 times or more`);
for (const w of ['係', '水', '湯', '點', '杯']) {
  const r = out[w];
  if (r) console.log(`  ${w}  level ${r.lvl ?? '?'}, ${r.n} uses — ${r.s.slice(0, 3).map(([e, n]) => `${e} (${n})`).join(', ')}`);
}
