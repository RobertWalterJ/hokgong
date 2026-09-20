// The accuracy audit — is what the app teaches actually right?
//
//   node audits/run-accuracy.mjs
//   node audits/run-accuracy.mjs --sample 40     a random sample to read by eye
//
// build/verify.mjs already proves the deck matches its sources. That is a
// different question from whether the sources were read correctly, which is
// what this measures:
//
//   1. WHERE THE MEANINGS COME FROM. A Cantonese dictionary is better evidence
//      than a Mandarin one, and the mix should be visible rather than assumed.
//   2. THREE-WAY AGREEMENT ON READINGS. The corpus recorded a reading, rime
//      publishes one, and Unihan publishes one. Where all three agree the
//      reading is as sure as an open source can make it; where they differ,
//      the app should be able to say so.
//   3. AMBIGUITY. If two words carry the same English gloss, a question with
//      one as the answer and the other as a wrong answer cannot be answered.
//   4. GLOSSES THAT ARE NOT MEANINGS — notes about usage, cross-references,
//      anything a learner cannot act on.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const DECK = read('app/data/deck.json');
const LEX = read('corpus/lexicon.json');
const lexBy = new Map(LEX.map((e) => [e.w, e]));

// Unihan, read again here so this audit does not depend on the extractor's
// own reading of it — an independent check has to be independent.
const uni = new Map();
for (const line of readFileSync(join(ROOT, 'sources', 'unihan', 'Unihan_Readings.txt'), 'utf8').split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const [cp, field, ...rest] = line.split('\t');
  if (field !== 'kCantonese') continue;
  uni.set(String.fromCodePoint(parseInt(cp.replace('U+', ''), 16)), rest.join(' ').trim().split(/\s+/));
}

const pct = (n, d) => `${((n / d) * 100).toFixed(1)}%`;
const say = (...a) => console.log(...a);

// ── 1. where the meanings come from ──────────────────────────────────────
say('WHERE THE MEANINGS COME FROM\n');
const bySrc = {};
for (const w of DECK.words) bySrc[w.s || 'none'] = (bySrc[w.s || 'none'] || 0) + 1;
for (const [src, n] of Object.entries(bySrc).sort((a, b) => b[1] - a[1])) {
  say(`  ${String(n).padStart(5)}  ${pct(n, DECK.words.length).padStart(6)}  ${src}`);
}
const CANTONESE_SRC = ['CC-Canto', 'Wiktionary (Cantonese sense)'];
const canto = DECK.words.filter((w) => CANTONESE_SRC.includes(w.s)).length;
say(`\n  ${pct(canto, DECK.words.length)} of taught words have their meaning from a source that marks it as Cantonese.`);

say('\nHOW WELL THE MEANING FITS THE READING\n');
const byConf = {};
for (const w of DECK.words) byConf[w.c || 'none'] = (byConf[w.c || 'none'] || 0) + 1;
const CONF_MEANS = {
  exact: 'the dictionary prints that very reading',
  sandhi: 'same word, another tone (Cantonese changes tone constantly)',
  inferred: 'no reading printed, but only one reading exists',
  standard: 'taught under the standard reading, not the recorded variant',
};
for (const [c, n] of Object.entries(byConf).sort((a, b) => b[1] - a[1])) {
  say(`  ${String(n).padStart(5)}  ${pct(n, DECK.words.length).padStart(6)}  ${c} — ${CONF_MEANS[c] || ''}`);
}

// ── 2. three sources on one reading ──────────────────────────────────────
say('\nTHREE-WAY AGREEMENT ON READINGS (single characters, where all three speak)\n');
let all3 = 0, agree3 = 0, toneOnly = 0, realDiff = 0;
const diffs = [];
for (const w of DECK.words) {
  if ([...w.w].length !== 1) continue;
  const e = lexBy.get(w.w);
  const u = uni.get(w.w);
  if (!e || !u || !e.rimeJyut?.length || !e.said) continue;
  all3++;
  const taught = w.j;
  const inRime = e.rimeJyut.includes(taught);
  const inUni = u.includes(taught);
  if (inRime && inUni) agree3++;
  else if (u.some((x) => x.replace(/[1-6]/g, '') === taught.replace(/[1-6]/g, '')) || e.rimeJyut.some((x) => x.replace(/[1-6]/g, '') === taught.replace(/[1-6]/g, ''))) toneOnly++;
  else { realDiff++; if (diffs.length < 12) diffs.push(`${w.w} taught ${taught} · rime ${e.rimeJyut.join('/')} · Unihan ${u.join('/')}`); }
}
say(`  ${all3.toLocaleString()} characters checked against both rime-cantonese and Unihan`);
say(`  ${agree3.toLocaleString()} (${pct(agree3, all3)}) all three agree exactly`);
say(`  ${toneOnly.toLocaleString()} (${pct(toneOnly, all3)}) agree on the syllable, differ on the tone`);
say(`  ${realDiff.toLocaleString()} (${pct(realDiff, all3)}) genuinely differ:`);
for (const d of diffs) say('     ' + d);

// ── 3. ambiguity: can the question be answered at all? ───────────────────
say('\nAMBIGUITY\n');
const byGloss = new Map();
for (const [i, w] of DECK.words.entries()) {
  const key = w.g.toLowerCase().trim();
  if (!byGloss.has(key)) byGloss.set(key, []);
  byGloss.get(key).push({ ...w, i });
}
const shared = [...byGloss.entries()].filter(([, ws]) => ws.length > 1);
say(`  ${shared.length} English meanings are carried by more than one taught word (${shared.reduce((n, [, ws]) => n + ws.length, 0)} words in all).`);
for (const [g, ws] of shared.sort((a, b) => b[1].length - a[1].length).slice(0, 8)) {
  say(`     "${g}" — ${ws.map((w) => w.w + ' ' + w.j).join(', ')}`);
}
// The fault that matters: a question whose wrong answers include its own
// meaning, which makes it unanswerable however well you know the word.
let broken = 0;
const brokenEx = [];
for (const it of DECK.items) {
  if (!it.options || it.i == null) continue;
  const answer = DECK.words[it.i].g.toLowerCase().trim();
  if (it.options.some((o) => o.toLowerCase().trim() === answer)) {
    broken++;
    if (brokenEx.length < 6) brokenEx.push(`${it.id} (${DECK.words[it.i].w})`);
  }
}
say(`  ${broken} questions offer their own answer as a wrong answer${broken ? ': ' + brokenEx.join(', ') : ' — none.'}`);

// ── 4. glosses that are not meanings ─────────────────────────────────────
say('\nMEANINGS THAT ARE NOT MEANINGS\n');
const suspicious = [
  [/^used\b/i, 'describes a use rather than translating'],
  [/\bvariant\b/i, 'a cross-reference to another form'],
  [/^see\b/i, 'a cross-reference'],
  [/^\(?(cantonese|mandarin|classical)\)?$/i, 'a label with no meaning attached'],
  [/^[A-Z][a-z]+ (dynasty|province|County|City)/, 'a place or period, not everyday vocabulary'],
  [/^surname\b/i, 'a surname'],
  [/^\W*$/, 'empty or punctuation only'],
];
let flagged = 0;
for (const [re, why] of suspicious) {
  const hits = DECK.words.filter((w) => re.test(w.g));
  if (!hits.length) continue;
  flagged += hits.length;
  say(`  ${String(hits.length).padStart(4)}  ${why}`);
  say(`        ${hits.slice(0, 5).map((w) => `${w.w} "${w.g}"`).join(' · ')}`);
}
say(`  ${flagged} of ${DECK.words.length.toLocaleString()} (${pct(flagged, DECK.words.length)}) flagged for a human to look at.`);

// The first 200 words matter more than the rest: they are what a beginner
// meets, and a wrong one there is a wrong one learnt properly.
const firstBad = DECK.words.slice(0, 200).filter((w) => suspicious.some(([re]) => re.test(w.g)));
say(`  In the first 200 words: ${firstBad.length}${firstBad.length ? ' — ' + firstBad.map((w) => `${w.w} "${w.g}"`).join(', ') : ''}`);

// ── 5. a sample to read by eye ───────────────────────────────────────────
const n = Number((process.argv.find((a) => a.startsWith('--sample')) || '').split('=')[1] || (process.argv[process.argv.indexOf('--sample') + 1] || 0));
if (n > 0) {
  say(`\nA SAMPLE OF ${n}, SPREAD ACROSS THE LIST — read these by eye\n`);
  const step = Math.floor(DECK.words.length / n);
  for (let i = 0; i < DECK.words.length && i / step < n; i += step) {
    const w = DECK.words[i];
    say(`  ${String(i + 1).padStart(5)}  ${w.w.padEnd(5)} ${w.j.padEnd(12)} ${(w.c || '').padEnd(9)} ${w.g}`);
  }
}
