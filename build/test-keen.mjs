// Can a willing learner actually learn for as long as they want?
//
//   node build/test-keen.mjs
//
// Robert, 20 Sept 2026, on his phone at stage one: "I can't get it to serve me
// up 25 questions back to back if I try my hardest." He was right, and three
// separate rules were doing it:
//
//   - the day's allowance of 18 new questions, which a 25-question sitting
//     spends in one round;
//   - the four-hour cool-down, which put every question he had just answered
//     out of reach of the top-up, so the next round had nothing to fill with;
//   - the stage gate, which at stage one opens 62 questions in total.
//
// Together they produced "Today's words are done. The next question comes
// round tomorrow" after about twenty minutes. This plays a learner who keeps
// pressing the button and fails the build if the app stops serving them.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let mseed = 11;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
const S = await import('../app/js/schedule.js');

const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
// The app's own reach rule, not a copy of it. This file reimplemented
// `inReach` and so never saw the horizon that widens past the current stage —
// it reported 47 questions in reach where the app offers 150+, which is the
// same class of mistake as the repetition audit measuring a pace the app does
// not ship. A test that reimplements the thing it is testing tests nothing.
globalThis.window = { HOKGONG_DECK: deck };
const D = await import('../app/js/deck.js');
await D.loadDeck(); D.indexDeck();
const byId = new Map(deck.items.map((it) => [it.id, it]));
const groupOf = (id) => {
  const it = byId.get(id);
  if (!it) return null;
  if (it.i != null) return 'w' + it.i;
  if (it.gid) return 'g' + it.gid;
  if (it.syll) return 't' + it.syll;
  return 's' + it.id;
};

// The course gate, as app.js computes it: a word counts once the last answer
// about it was right; a stage opens when enough of its words do.
const wordRight = new Set(), grammarRight = new Set();
const recount = () => {
  wordRight.clear(); grammarRight.clear();
  for (const it of deck.items) {
    const c = S.State.card(it.id);
    if (!c || c.st === 'new' || !c.ok) continue;
    if (it.i != null) wordRight.add(it.i);
    if (it.gid != null) grammarRight.add(it.gid);
  }
  let cur = 0;
  for (const st of deck.stages) {
    const have = st.words.filter((i) => wordRight.has(i)).length;
    const need = Math.max(1, Math.ceil(st.words.length * st.gate));
    if (have >= need && st.grammar.every((g) => grammarRight.has(g))) cur++; else break;
  }
  return cur;
};
const metCard = (id) => !!S.State.card(id);
const wordMet = (i) => ['wl/', 'ws/', 'wr/'].some((p) => S.State.card(p + deck.words[i]?.w));
const inPlay = (current) => D.askableIds(true, true, current, metCard, wordMet);

let seed = 5;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let t = new Date(2026, 8, 20, 16, 30).getTime();
S.__setClock(() => t);
S.State.load();

const SITTING = 25;
const fails = [];
const lengths = [];
let stage = 0;

// Eight rounds back to back, the way someone with a free evening plays. The
// app must serve a full sitting every time.
for (let r = 0; r < 8; r++) {
  const ids = inPlay(stage);
  const due = S.State.dueIds(ids).length;
  const fresh = ids.filter((id) => !S.State.card(id)).length;
  const room = S.newLeftToday();
  // What home would do: a normal round while something is owed, otherwise the
  // "Keep going" button, which lifts the day's allowance.
  const owed = due || Math.min(room, fresh);
  const round = new S.Round(ids, { beyondDaily: !owed && fresh > 0, practice: !owed && fresh === 0, groupOf, size: SITTING });
  const n = round.queue.length;
  lengths.push(n);
  if (n < SITTING) fails.push(`round ${r + 1}: only ${n} questions, with ${ids.length} in reach at stage ${stage + 1}`);
  let id;
  while ((id = round.next())) {
    const c = S.State.card(id);
    S.State.answer(id, rand() < (c && c.st !== 'new' ? 0.9 : 0.75), { practice: round.practice || round.extra.has(id) });
    t += 11e3;
  }
  S.State.snapshot(ids);
  const was = stage;
  stage = recount();
  if (stage > was) console.log(`  round ${r + 1}: ${n} questions — stage ${was + 1} passed`);
  else console.log(`  round ${r + 1}: ${n} questions (stage ${stage + 1}, ${ids.length} in reach)`);
  t += 4 * 60e3;   // a short break, well inside the cool-down
}

console.log(`\ntest-keen: eight rounds back to back, ${lengths.reduce((a, b) => a + b, 0)} questions, shortest ${Math.min(...lengths)}`);
console.log(`  stages passed in one evening: ${stage}`);
// The point of the whole exercise: a determined learner must be able to move.
if (stage < 1) fails.push('an evening of solid work did not pass a single stage');
if (fails.length) {
  console.error('\ntest-keen FAILED:');
  for (const f of fails.slice(0, 8)) console.error('  - ' + f);
  process.exit(1);
}
console.log('test-keen: the app keeps up with a learner who wants to keep going.');
