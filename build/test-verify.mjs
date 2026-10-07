// Break the deck on purpose, and check that build/verify.mjs notices.
//
//   node build/test-verify.mjs
//
// Every check in verify.mjs is only worth having if it can fail. This breaks
// one thing at a time, runs the verifier, and requires it to exit non-zero
// with the expected complaint. The deck is restored afterwards whatever
// happens — and rebuilt from source if the restore itself fails.

import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = join(ROOT, 'app', 'data', 'deck.json');
const BAK = join(ROOT, 'build', '_deck.bak');

const cases = [
  ['a meaning the source does not give', (d) => { d.words[3].g = 'a badger'; }, 'meaning not one the source gives'],
  ['a reading quietly changed', (d) => { d.words[5].j = 'zzz9'; }, 'reading changed'],
  ['a sentence edited after the fact', (d) => { const it = d.items.find((x) => x.k === 'sentence-listen'); it.text = it.text + '吧'; }, 'sentence text does not match'],
  ['a translation edited after the fact', (d) => { const it = d.items.find((x) => x.k === 'sentence-listen'); it.eng = 'Something else entirely.'; }, 'translation does not match'],
  ['the right answer offered twice', (d) => { const it = d.items.find((x) => x.k === 'word-listen'); it.options[0] = d.words[it.i].g; }, 'right answer is also offered'],
  ['one option much longer than the rest', (d) => { const it = d.items.find((x) => x.k === 'word-listen'); it.options[0] = 'a very long answer indeed with many words in it'; }, 'much longer'],
  ['a tone question mixing syllables', (d) => { const it = d.items.find((x) => x.k === 'tone-pair'); it.syll = 'zzz'; }, 'mixes different syllables'],
  ['a grammar example without its pattern', (d) => { const g = d.grammar[0]; g.examples[0] = { ...g.examples[0], text: '你好', eng: 'Hello' }; }, 'does not match the source'],
  ['a history quote with a word changed', (d) => { const c = d.context.find((x) => x.kind === 'quote'); c.quote = c.quote.replace('Canada', 'Canadia'); }, 'not in the source word for word'],
  ['a word card meaning that drifted', (d) => { const c = d.context.find((x) => x.kind === 'words'); c.found[0] = { ...c.found[0], gloss: 'a kind of hat' }; }, 'does not match the dictionary'],
  // A grammar point you are gated on, rationed back to one question: the shape
  // of the fault that let an evening of work pass no stage at all.
  // A rung hung off one above it: the ladder with its bottom rung removed.
  // A book re-edited upstream, so a clip now belongs to different words. This
  // is the failure the sources research warned about: ranks and sentence
  // numbers shift, filenames do not.
  // A tone question that asks about a tone the word does not have — the one
  // way this question kind can be quietly wrong.
  ['a tone question naming the wrong tone', (d) => {
    const it = d.items.find((x) => x.k === 'tone-hear');
    if (it) it.tone = it.tone === 1 ? 2 : 1;
  }, 'names a tone the word does not have'],
  ['a graded-reader question that no longer matches its recording', (d) => {
    const it = d.items.find((x) => x.src === 'hbl');
    if (it) it.text = it.text + '呀';
  }, 'does not match the catalogue'],
  ['a grammar rung that stands on a rung above it', (d) => {
    const l = d.ladder.find((x) => !x.builds.length);
    if (l) l.builds = [d.ladder[d.ladder.length - 1].id];
  }, 'stands on a rung ABOVE it'],
  ['a gated grammar point with only one question in reach', (d) => {
    const gid = d.stages.find((st) => st.grammar.length)?.grammar[0];
    const mine = d.items.filter((it) => it.gid === gid && it.stage != null);
    for (const it of mine.slice(1)) it.stage = null;
  }, 'too few questions in reach'],
  ['a pieces list that does not rebuild the sentence', (d) => { const it = d.items.find((x) => x.k === 'grammar-build'); it.pieces = [...it.pieces, '嗎']; }, 'do not rebuild'],
  ['sense numbering left in a meaning', (d) => { d.words[7].g = 'one thing 2. another'; }, 'sense numbering left'],
  // The readings.
  ['a reading quote with a word changed', (d) => {
    const r = d.readings.find((x) => x.quote);
    r.quote.text = r.quote.text.replace(/ the /, ' every ');
  }, 'not in its paper word for word'],
  ['a reading quoting a paper nobody licensed for reuse', (d) => {
    const r = d.readings.find((x) => x.quote);
    d.readingSources[r.quote.source] = { ...d.readingSources[r.quote.source], licence: 'free to read; no reuse licence stated' };
  }, 'no reuse licence'],
  ['a reading with a Chinese character loose in its prose', (d) => {
    d.readings[0].read[0] += ' For example 多謝.';
  }, 'prints a Chinese character in its prose'],
  ['a reading giving an example the wrong reading', (d) => {
    const r = d.readings.find((x) => (x.shows || []).length);
    r.shows[0] = { ...r.shows[0], jyut: 'zyu1' };
  }, 'wrong reading'],
  ['a reading that cites nothing', (d) => { d.readings[0].cite = []; }, 'cites nothing'],
  ['a deck built before a content file was edited', (d) => { d.contentHash['tones.mjs'] = 'deadbeef0000'; }, 'older than its content'],
];

copyFileSync(DECK, BAK);
let passed = 0;
const failures = [];
try {
  for (const [name, breakIt, expect] of cases) {
    const deck = JSON.parse(readFileSync(BAK, 'utf8'));
    breakIt(deck);
    writeFileSync(DECK, JSON.stringify(deck));
    let out = '';
    let exited = 0;
    try {
      out = execFileSync(process.execPath, [join(ROOT, 'build', 'verify.mjs')], { encoding: 'utf8' });
    } catch (err) {
      exited = err.status || 1;
      out = (err.stdout || '') + (err.stderr || '');
    }
    if (exited === 0) failures.push(`${name}: verify passed when it should have failed`);
    else if (!out.includes(expect)) failures.push(`${name}: verify failed, but not with "${expect}"`);
    else passed++;
  }
} finally {
  copyFileSync(BAK, DECK);
  unlinkSync(BAK);
}

// And the restored deck must still pass, or the test left damage behind.
try {
  execFileSync(process.execPath, [join(ROOT, 'build', 'verify.mjs')], { encoding: 'utf8' });
} catch {
  failures.push('the deck did not survive the test — rebuild with node build/items.mjs');
}

console.log(`test-verify: ${passed} of ${cases.length} deliberate faults were caught`);
if (failures.length) {
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
if (existsSync(BAK)) unlinkSync(BAK);
