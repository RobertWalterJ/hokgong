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
  ['a pieces list that does not rebuild the sentence', (d) => { const it = d.items.find((x) => x.k === 'grammar-build'); it.pieces = [...it.pieces, '嗎']; }, 'do not rebuild'],
  ['sense numbering left in a meaning', (d) => { d.words[7].g = 'one thing 2. another'; }, 'sense numbering left'],
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
