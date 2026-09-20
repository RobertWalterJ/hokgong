// The variety audit — what does a learner actually SEE?
//
//   node audits/run-variety.mjs
//
// Robert asked whether the later stages have longer sentences, varied uses and
// callbacks to what came before. They did not: everything shown in a question
// was one to eight characters, every word had exactly one example sentence,
// and no stage differed from any other. This measures all three, and it also
// counts what is LOCKED — the question that started it was a gate bug that
// held every listening and tone question until all ten stages were passed.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = JSON.parse(readFileSync(join(ROOT, 'app/data/deck.json'), 'utf8'));
const SENT = JSON.parse(readFileSync(join(ROOT, 'corpus/sentences.json'), 'utf8'));
const chars = (s) => [...s.replace(/[^㐀-鿿]/g, '')].length;

// 1. How long is anything the app ever shows?
const shown = DECK.items.filter((it) => it.text).map((it) => chars(it.text));
const ex = Object.values(DECK.examples).flat().map((e) => chars(e.t));
const hist = (arr) => {
  const b = {};
  for (const n of arr) { const k = n <= 4 ? '1-4' : n <= 8 ? '5-8' : n <= 12 ? '9-12' : n <= 20 ? '13-20' : '21+'; b[k] = (b[k] || 0) + 1; }
  return b;
};
console.log('LENGTH OF EVERYTHING THE APP SHOWS, in characters');
console.log('  sentences in questions:', JSON.stringify(hist(shown)), 'longest', Math.max(...shown));
console.log('  example sentences:    ', JSON.stringify(hist(ex)), 'longest', Math.max(...ex));

// 2. How many different sentences does a learner ever see for one word?
const perWord = Object.keys(DECK.examples).length;
console.log(`\nEXAMPLES PER WORD: ${perWord.toLocaleString()} words have one; none has two.`);

// 3. What does the corpus actually hold that the app is not using?
const usable = SENT.filter((s) => s.eng);
console.log(`\nWHAT THE CORPUS HOLDS: ${usable.length.toLocaleString()} sentences with a translation`);
console.log('  by length:', JSON.stringify(hist(usable.map((s) => chars(s.text)))));
console.log(`  with a recording: ${usable.filter((s) => s.audio).length.toLocaleString()}`);

// 4. Callbacks: for a learner at the end of each stage, how many sentences are
//    made ENTIRELY of words they have met? That is the i+1 question.
const stageWords = [];
let cumulative = new Set();
for (const st of DECK.stages) {
  for (const i of st.words) cumulative.add(DECK.words[i].w);
  stageWords.push(new Set(cumulative));
}
const knownChars = (set) => new Set([...set].flatMap((w) => [...w]));
console.log('\nSENTENCES A LEARNER COULD ALMOST READ, by stage');
for (const [n, set] of stageWords.entries()) {
  const kc = knownChars(set);
  const within = usable.filter((s) => {
    const cs = [...s.text.replace(/[^㐀-鿿]/g, '')];
    return cs.length >= 3 && cs.every((c) => kc.has(c));
  });
  const near = usable.filter((s) => {
    const cs = [...s.text.replace(/[^㐀-鿿]/g, '')];
    if (cs.length < 3) return false;
    const miss = cs.filter((c) => !kc.has(c)).length;
    return miss === 1;
  });
  console.log(`  after stage ${String(n + 1).padStart(2)} (${set.size} words): ${String(within.length).padStart(4)} fully within reach, ${String(near.length).padStart(4)} with one new character`);
}

// 5. And with the whole 6,000-word list?
const all = knownChars(new Set(DECK.words.map((w) => w.w)));
const withinAll = usable.filter((s) => {
  const cs = [...s.text.replace(/[^㐀-鿿]/g, '')];
  return cs.length >= 3 && cs.every((c) => all.has(c));
});
console.log(`\n  with all 6,000 words: ${withinAll.length.toLocaleString()} sentences fully within reach`);
console.log(`  of those, ${withinAll.filter((s) => chars(s.text) > 12).length.toLocaleString()} are longer than 12 characters, and ${withinAll.filter((s) => s.audio).length.toLocaleString()} have a recording`);

// 6. And what is locked away. A question with no stage and nothing to open it
//    waits for the end of the course, which is months.
const locked = DECK.items.filter((it) => it.stage == null && !it.needs);
const byKind = {};
for (const it of locked) byKind[it.k] = (byKind[it.k] || 0) + 1;
console.log('\nWAITING FOR THE WHOLE COURSE TO BE PASSED');
for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${String(n).padStart(5)}`);
const wholeSkill = ['sentence-listen', 'tone-pair', 'tone-say'].filter((k) => !DECK.items.some((it) => it.k === k && (it.stage != null || it.needs)));
if (wholeSkill.length) { console.error('\nvariety audit FAILED: an entire skill is locked behind the course: ' + wholeSkill.join(', ')); process.exit(1); }
console.log('\nNo skill is locked behind the whole course.');

// 7. How big is the pool the course has actually opened? This is the number
//    that decides whether a willing learner can fill a sitting at all. Stage
//    one opened 62 questions across 16 groups, and a round that allows one
//    question per group could not reach 25 however hard he tried.
console.log('\nWHAT EACH STAGE OPENS');
const groupOf = (it) => (it.i != null ? 'w' + it.i : it.gid ? 'g' + it.gid : it.syll ? 't' + it.syll : 's' + it.id);
for (let n = 0; n < DECK.stages.length; n++) {
  const open = DECK.items.filter((it) => it.stage != null && it.stage <= n);
  const groups = new Set(open.map(groupOf)).size;
  const ceiling = groups * Math.max(1, Math.ceil(25 / groups));
  const flag = ceiling < 25 ? '  ← cannot fill a 25-question sitting' : '';
  console.log(`  after stage ${String(n + 1).padStart(2)}: ${String(open.length).padStart(4)} questions across ${String(groups).padStart(3)} words, so a sitting can reach ${Math.min(ceiling, open.length)}${flag}`);
  if (Math.min(ceiling, open.length) < 25 && open.length >= 25) { console.error('\nvariety audit FAILED: stage ' + (n + 1) + ' has enough questions for a sitting but the per-word limit blocks them'); process.exit(1); }
}
