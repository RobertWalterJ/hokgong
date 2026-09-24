// How often does the same question come back?
//
//   node audits/run-repetition.mjs
//
// Robert, 23 Sept 2026: "The same questions actually repeat a lot too, more
// than them being the same shape. That's actually the issue. It's difficult to
// play this because the same questions keep coming back over and over and over
// and over day after day after day."
//
// This is a fault I introduced. In v1.5.0 he could not get a full sitting, so
// a round now fills itself to the length he chose — from whatever has been met
// when nothing is new or due. That was right. What was missed is that the
// stage gate opens only about forty-five questions at stage one, so three
// sittings of twenty-five draw seventy-five questions from a pool of forty-
// five, every day, and the fill picks by weakest recall — which a practice
// answer does not change, so the same weakest questions are top of the pile
// again tomorrow.
//
// Spacing research is unambiguous that repetition is the point (Cepeda 2006),
// and equally unambiguous that it has to be spaced ACROSS material. Asking the
// same forty-five things three times a day is not spacing, it is a loop.
//
// So this plays fourteen honest days and measures the loop: how many distinct
// questions a day, how many times the average one comes back, and how much of
// a day is material the learner has seen before.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let mseed = 7;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
const S = await import('../app/js/schedule.js');
// The app's default pace, not the scheduler's bare constants. The first
// version of this audit passed no `pace` at all and so measured 32 new a day,
// while the app ships "steady" at 18 — so the gate built to catch Robert's
// complaint was measuring a regime he is not in.
const PACE = { newPerRound: 9, newPerDay: 30 };   // PACES.steady in app.js
const D = await import('../app/js/deck.js');

const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
// deck.js reads the deck off the window in the app; hand it the same object.
globalThis.window = { HOKGONG_DECK: deck };
await D.loadDeck();
D.indexDeck();
const byId = new Map(deck.items.map((it) => [it.id, it]));
const groupOf = (id) => { const it = byId.get(id); if (!it) return null; if (it.i != null) return 'w' + it.i; if (it.gid) return 'g' + it.gid; if (it.syll) return 't' + it.syll; return 's' + it.id; };

// The course gate, as the app computes it.
const recount = () => {
  const wordRight = new Set(), grammarRight = new Set();
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

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let t = new Date(2026, 8, 23, 8, 30).getTime();
S.__setClock(() => t);
S.State.load();

const DAYS = 14, SITTINGS = 3, SITTING = 25;
const askedEver = new Map();       // id -> times asked
const perDay = [];
let stage = 0;

for (let day = 0; day < DAYS; day++) {
  const today = new Set();
  let asks = 0, repeatsWithinDay = 0, seenBefore = 0, brandNew = 0;
  for (let s = 0; s < SITTINGS; s++) {
    t += 3 * 3600e3;
    const ids = D.askableIds(true, true, stage, metCard, wordMet);
    const due = S.State.dueIds(ids).length;
    const unseen = ids.filter((id) => !S.State.card(id)).length;
    const owed = due || Math.min(S.newLeftToday(PACE), unseen);
    const round = new S.Round(ids, { exclude: today, pace: PACE, beyondDaily: !owed && unseen > 0, practice: !owed && unseen === 0, groupOf, stageOf: (id) => byId.get(id)?.stage, size: SITTING });
    let id;
    while ((id = round.next())) {
      asks++;
      if (today.has(id)) repeatsWithinDay++;
      today.add(id);
      const seenTimes = askedEver.get(id) || 0;
      if (seenTimes) seenBefore++; else brandNew++;
      askedEver.set(id, seenTimes + 1);
      const card = S.State.card(id);
      S.State.answer(id, rand() < (card && card.st !== 'new' ? 0.88 : 0.6), { practice: round.practice || round.extra.has(id) });
      t += 11e3;
    }
    S.State.snapshot(ids);
  }
  stage = recount();
  perDay.push({ day: day + 1, asks, distinct: today.size, repeatsWithinDay, brandNew, seenBefore, stage });
  t = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1, 8, 30).getTime();
}

console.log('day | asked | distinct | asked twice in a day | brand new | seen before | stage');
for (const d of perDay) {
  console.log(`${String(d.day).padStart(3)} | ${String(d.asks).padStart(5)} | ${String(d.distinct).padStart(8)} | ${String(d.repeatsWithinDay).padStart(20)} | ${String(d.brandNew).padStart(9)} | ${String(d.seenBefore).padStart(11)} | ${d.stage + 1}`);
}

const times = [...askedEver.values()].sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)] || 0;
const worst = times[times.length - 1] || 0;
const totalAsks = perDay.reduce((a, d) => a + d.asks, 0);
const totalNew = perDay.reduce((a, d) => a + d.brandNew, 0);
const emptyDays = perDay.filter((d) => d.brandNew === 0).length;
const within = perDay.reduce((a, d) => a + d.repeatsWithinDay, 0);

console.log(`\nover ${DAYS} days: ${totalAsks.toLocaleString()} questions asked, ${askedEver.size.toLocaleString()} of them different`);
console.log(`  the same question came back ${median} times on the median, ${worst} times at worst`);
console.log(`  brand-new questions: ${totalNew.toLocaleString()} (${(totalNew / totalAsks * 100).toFixed(0)}% of everything asked)`);
console.log(`  days with nothing new at all: ${emptyDays}`);
console.log(`  asked twice inside one day: ${within}`);

// What a learner would call unbearable. These are deliberately generous: the
// point is to catch a loop, not to dictate a curriculum.
const fails = [];
if (median > 4) fails.push(`the median question was asked ${median} times in ${DAYS} days`);
if (within > 0) fails.push(`${within} questions were asked twice inside a single day`);
if (emptyDays > 2) fails.push(`${emptyDays} days had no new material at all`);
if (totalNew / totalAsks < 0.25) fails.push(`only ${(totalNew / totalAsks * 100).toFixed(0)}% of what was asked had never been seen before`);
if (fails.length) {
  console.error('\nrepetition audit FAILED:');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nrepetition audit: the deck keeps moving.');
