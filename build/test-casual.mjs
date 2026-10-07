// What does a fortnight look like for someone who plays once a day?
//
//   node build/test-casual.mjs
//
// The pace is a ceiling of forty new questions a day, and the keen-learner
// test proves the app keeps up with someone who wants all of it. This is the
// other end, and it is the end Robert actually lives at: one short round in
// the morning, sometimes two, sometimes none.
//
// The failure this guards against is the opposite of the one that bit in
// September. There the app throttled a willing learner to a standstill. Here
// the risk is subtler: a round full of SECOND LOOKS and practice fill can be a
// perfectly full eighteen questions and contain almost nothing new, so a
// casual learner stops moving while the app reports a healthy-looking day.
//
// So: one to three short rounds a day, fourteen days, and the learner must
// come out of it having met a real number of new words. Fifteen to twenty new
// questions a day is what one round should give — not the ceiling, and not
// nothing.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let mseed = 19;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
const S = await import('../app/js/schedule.js');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
globalThis.window = { HOKGONG_DECK: deck };
const D = await import('../app/js/deck.js');
await D.loadDeck(); D.indexDeck();

const byId = new Map(deck.items.map((it) => [it.id, it]));
const groupOf = (id) => { const it = byId.get(id); if (!it) return null; if (it.i != null) return 'w' + it.i; if (it.gid) return 'g' + it.gid; if (it.syll) return 't' + it.syll; return 's' + it.id; };
const metCard = (id) => !!S.State.card(id);
const wordMet = (i) => ['wl/', 'ws/', 'wr/', 'cz/'].some((p) => S.State.card(p + deck.words[i]?.w));

// The shipped settings. SITTINGS.usual and PACES.steady in app/js/app.js.
const SITTING = 25;
const PACE = { newPerRound: 9, newPerDay: 40 };
const DAYS = 14;

let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let t = new Date(2026, 9, 7, 8, 0).getTime();
S.__setClock(() => t);
S.State.load();

let stage = 0;
const recount = () => {
  const wr = new Set(), gr = new Set();
  for (const it of deck.items) { const c = S.State.card(it.id); if (!c || c.st === 'new' || !c.ok) continue; if (it.i != null) wr.add(it.i); if (it.gid != null) gr.add(it.gid); }
  let cur = 0;
  for (const st of deck.stages) {
    const have = st.words.filter((i) => wr.has(i)).length;
    if (have >= Math.max(1, Math.ceil(st.words.length * st.gate)) && st.grammar.every((g) => gr.has(g))) cur++; else break;
  }
  return Math.max(stage, cur);
};

const newByDay = [];
const wordsMet = new Set();
let roundsPlayed = 0, shortRounds = 0;

for (let day = 0; day < DAYS; day++) {
  // One round most mornings; two now and then; a day off every week.
  const rounds = day % 7 === 6 ? 0 : day % 4 === 1 ? 2 : 1;
  const asked = new Set();
  let newToday = 0;
  for (let r = 0; r < rounds; r++) {
    t += 6 * 3600e3;
    const ids = D.askableIds(true, true, stage, metCard, wordMet);
    const round = new S.Round(ids, { exclude: asked, pace: PACE, size: SITTING, groupOf, stageOf: (id) => byId.get(id)?.stage });
    if (round.empty) continue;
    roundsPlayed++;
    if (round.queue.length < SITTING) shortRounds++;
    let id;
    while ((id = round.next())) {
      const card = S.State.card(id);
      if (!card) { newToday++; const it = byId.get(id); if (it.i != null) wordsMet.add(deck.words[it.i].w); }
      asked.add(id);
      S.State.answer(id, rand() < (card && card.st !== 'new' ? 0.88 : 0.6), { practice: round.extra.has(id) });
      t += 12e3;
    }
    S.State.snapshot(ids);
  }
  newByDay.push(newToday);
  stage = recount();
  t = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1, 8, 0).getTime();
}

const played = newByDay.filter((_, i) => i % 7 !== 6);
const totalNew = newByDay.reduce((a, b) => a + b, 0);
const perPlayedDay = totalNew / (played.length || 1);
console.log(`test-casual: ${DAYS} days, ${roundsPlayed} short rounds (one most mornings, two now and then, a day off a week)`);
console.log(`  new questions: ${totalNew} in the fortnight, ${perPlayedDay.toFixed(1)} on a day he played`);
// The number behind the number. A word is taught four ways — heard, said,
// read, and picked from its meaning — and each of those is a question, so the
// pace's "forty a day" buys about ten new WORDS a day at the ceiling and about
// three and a half on one short round. That is the honest exchange rate, and
// it is printed rather than left to be discovered: if the words-a-day figure
// is ever the disappointing one, the lever is the round length, not the pace.
console.log(`  distinct words met: ${wordsMet.size} (${(wordsMet.size / played.length).toFixed(1)} a day, at ${(totalNew / Math.max(1, wordsMet.size)).toFixed(1)} questions per word)`);
console.log(`  stage reached: ${stage + 1} of ${deck.stages.length}`);
console.log(`  rounds that came up short of ${SITTING}: ${shortRounds}`);

const fails = [];
// One round should be worth something. Fifteen to twenty new questions is what
// the pace promises for a single sitting; well under that and a casual learner
// is being given a full round of things he has already seen.
if (perPlayedDay < 12) fails.push(`only ${perPlayedDay.toFixed(1)} new questions on a day he played — one round should give about fifteen`);
// Three words a day is what one eighteen-question round buys once each word
// costs four questions. Below forty in a fortnight something has gone wrong
// with the supply, not with the pace.
if (wordsMet.size < 40) fails.push(`only ${wordsMet.size} distinct words met in a fortnight of daily rounds`);
if (stage < 1) fails.push('a fortnight of daily rounds passed no stage at all');
// And the ceiling still holds at this end too.
if (newByDay.some((n) => n > PACE.newPerDay + 2)) fails.push(`a day went past the pace of ${PACE.newPerDay}: ${Math.max(...newByDay)}`);
if (shortRounds > roundsPlayed * 0.2) fails.push(`${shortRounds} of ${roundsPlayed} rounds came up short`);

if (fails.length) {
  console.error('\ntest-casual FAILED:');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('test-casual: one round a day still gets somewhere.');
