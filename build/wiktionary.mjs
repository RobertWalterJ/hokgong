// Boil the English Wiktionary's Chinese entries down to Cantonese readings and
// English senses.
//
//   node build/wiktionary.mjs
//
// Input:  sources/wiktionary/kaikki-chinese.jsonl  (1.2 GB, not committed —
//         fetch it from https://kaikki.org/dictionary/Chinese/ )
// Output: corpus/wiktionary.json  (small, committed)
//
// Why this source. CC-Canto is a good Cantonese dictionary but it stops; the
// gaps it leaves are exactly the everyday words — 六 "six" had no usable gloss
// at all. words.hk would be better still, but it comes through a signed data
// request, so until that arrives this is the best open Cantonese-aware
// dictionary there is: English Wiktionary tags senses by variety, so a sense
// marked Cantonese can be told apart from a Mandarin-only one, and it prints
// Jyutping for the Cantonese reading.
//
// Licence: CC BY-SA 3.0 (Wiktionary), via wiktextract/kaikki.org (Tatu Ylonen).
// The app credits it on the About page like every other source.

import { createReadStream, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IN = join(ROOT, 'sources', 'wiktionary', 'kaikki-chinese.jsonl');
if (!existsSync(IN)) {
  console.error('sources/wiktionary/kaikki-chinese.jsonl is missing.');
  console.error('Fetch it (1.2 GB):  curl -L -o sources/wiktionary/kaikki-chinese.jsonl https://kaikki.org/dictionary/Chinese/kaikki.org-dictionary-Chinese.jsonl');
  process.exit(1);
}

// Wiktionary prints tones as superscripts: buk¹, not buk1.
const SUP = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁰': '0' };
const toJyutping = (s) => s.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (c) => SUP[c]).replace(/\s+/g, '').trim();
const han = /^[㐀-䶿一-鿿豈-﫿]+$/;

// Senses that describe rather than translate, or that belong to a name.
const uselessGloss = /^(alternative form|alternative spelling|obsolete|used in|only used in|a surname|surname|abbreviation of|short for|the *\d|classifier for)/i;

const out = new Map();                  // word -> { jyut -> { canto: [glosses], any: [glosses] } }
let lines = 0, kept = 0;
const rl = createInterface({ input: createReadStream(IN, { encoding: 'utf8' }), crlfDelay: Infinity });
for await (const line of rl) {
  lines++;
  if (lines % 200000 === 0) process.stdout.write(`\r  ${(lines / 1000).toFixed(0)}k lines, ${kept.toLocaleString()} Cantonese entries`);
  if (!line.startsWith('{')) continue;
  let d;
  try { d = JSON.parse(line); } catch { continue; }
  const word = d.word;
  if (!word || !han.test(word) || [...word].length > 4) continue;
  // The Jyutping reading, where Wiktionary gives one.
  const readings = new Set();
  for (const s of d.sounds || []) {
    const tags = s.tags || [];
    if (!s.zh_pron || !tags.includes('Cantonese') || !tags.includes('Jyutping')) continue;
    // A reading may be given as "jat1, jat6" for a word with two pronunciations.
    for (const part of String(s.zh_pron).split(/[,/]/)) {
      const j = toJyutping(part);
      if (/^[a-z]+[1-6]([a-z]+[1-6])*$/.test(j)) readings.add(j);
    }
  }
  if (!readings.size) continue;
  const entry = out.get(word) || {};
  for (const j of readings) {
    const slot = entry[j] || { canto: [], any: [] };
    for (const sense of d.senses || []) {
      for (const g of sense.glosses || []) {
        const text = String(g).trim();
        if (!text || text.length > 64 || uselessGloss.test(text)) continue;
        const isCanto = (sense.tags || []).includes('Cantonese');
        const bucket = isCanto ? slot.canto : slot.any;
        if (!bucket.includes(text) && bucket.length < 4) bucket.push(text);
      }
    }
    if (slot.canto.length || slot.any.length) entry[j] = slot;
  }
  if (Object.keys(entry).length) { out.set(word, entry); kept++; }
}
process.stdout.write('\r');

mkdirSync(join(ROOT, 'corpus'), { recursive: true });
const obj = Object.fromEntries(out);
writeFileSync(join(ROOT, 'corpus', 'wiktionary.json'), JSON.stringify(obj));
const withCanto = [...out.values()].filter((e) => Object.values(e).some((s) => s.canto.length)).length;
console.log(`wiktionary: ${lines.toLocaleString()} lines read, ${out.size.toLocaleString()} words with a Jyutping reading and an English sense`);
console.log(`  ${withCanto.toLocaleString()} of them have at least one sense Wiktionary marks as Cantonese`);
console.log(`  wrote corpus/wiktionary.json (${(statSync(join(ROOT, 'corpus', 'wiktionary.json')).size / 1e6).toFixed(1)} MB)`);
