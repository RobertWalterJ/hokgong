// Does the learning loop hold up over months, on a deck of 13,826 questions?
//
//   node build/test-schedule.mjs
//
// Plays the real scheduler against the real deck with a seeded learner, and
// fails the build if the loop misbehaves. The rules checked are the ones that
// actually broke in Palimpsest and Landfall:
//
//   - no question twice in one session (Robert: repeats made the pack feel
//     small);
//   - no round longer than the sitting the learner chose, and few shorter —
//     a sitting cut to two questions is what sent Robert back with 'the
//     lessons are way too short';
//   - new words keep arriving — at least one a day, every day, while any
//     remain unseen (forcing three a round starved the reviews instead);
//   - reviews are not buried: the due pile must not grow without limit;
//   - a burst of play does not run the app dry (he plays several times a day
//     while waiting, and "nothing to ask" is a dead end);
//   - every skill gets started, not just the easy one.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

// Fully seeded: the scheduler shuffles with Math.random, and an unseeded run
// drifts from one day to the next.
let mseed = 7;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
const S = await import('../app/js/schedule.js');

const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const ids = deck.items.map((it) => it.id);
const byId = new Map(deck.items.map((it) => [it.id, it]));
const groupOf = (id) => {
  const it = byId.get(id);
  if (!it) return null;
  if (it.i != null) return 'w' + it.i;
  if (it.gid) return 'g' + it.gid;
  if (it.syll) return 't' + it.syll;
  return 's' + it.id;
};
const SKILL = { 'word-listen': 'listening', 'sentence-listen': 'listening', 'word-say': 'speaking', 'word-pick': 'speaking', 'tone-say': 'tones', 'tone-pair': 'tones', 'word-read': 'reading', 'word-cloze': 'grammar', 'grammar-mean': 'grammar', 'grammar-pick': 'grammar', 'grammar-build': 'grammar' };

let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let t = new Date(2026, 8, 1, 8, 30).getTime();
S.__setClock(() => t);
S.State.load();

const fails = [];
const DAYS = 120;
const skillsSeen = new Set();
let worstBacklog = 0, roundsPlayed = 0, emptyRounds = 0, longestDryDay = 0, dryRun = 0, shortRounds = 0, topped = 0;
const newByDay = [];

for (let day = 0; day < DAYS; day++) {
  // He plays in bursts: two or three short sittings on most days, five on
  // some, one on others.
  const sittings = day % 7 === 3 ? 5 : day % 3 === 0 ? 1 : 3;
  const asked = new Set();
  let newToday = 0;
  for (let s = 0; s < sittings; s++) {
    t += 90 * 60e3;                                   // an hour and a half apart
    const round = new S.Round(ids, { exclude: asked, groupOf, stageOf: (id) => byId.get(id)?.stage });
    if (round.empty) { emptyRounds++; continue; }
    roundsPlayed++;
    if (round.queue.length > round.size) fails.push(`day ${day}: a round of ${round.queue.length}, longer than the sitting`);
    // A sitting cut to two questions is what sent Robert back with "the
    // lessons are way too short". After the first few days there is always
    // something to practise, so a round should fill.
    if (round.queue.length < round.size && day > 3) shortRounds++;
    const seenHere = new Set();
    let id;
    while ((id = round.next())) {
      if (seenHere.has(id)) fails.push(`day ${day}: ${id} asked twice in one round`);
      if (asked.has(id)) fails.push(`day ${day}: ${id} asked twice in one session`);
      seenHere.add(id); asked.add(id);
      const it = byId.get(id);
      if (SKILL[it.k]) skillsSeen.add(SKILL[it.k]);
      const card = S.State.card(id);
      if (!card) newToday++;
      // A learner who gets most new things wrong at first and most reviews
      // right: 55% on first sight, 88% on review.
      const right = rand() < (card && card.st !== 'new' ? 0.88 : 0.55);
      // A topped-up question is practice: it must not move the schedule.
      S.State.answer(id, right, { practice: round.extra.has(id) });
      if (round.extra.has(id)) topped++;
      t += 12e3;
    }
    S.State.snapshot(ids);
  }
  newByDay.push(newToday);
  const unseen = ids.filter((id) => !S.State.card(id)).length;
  if (newToday === 0 && unseen > 0) { dryRun++; longestDryDay = Math.max(longestDryDay, dryRun); } else dryRun = 0;
  worstBacklog = Math.max(worstBacklog, S.State.dueIds(ids).length);
  // Next day, morning.
  t = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1, 8, 30).getTime();
}

const met = ids.filter((id) => S.State.card(id)).length;
const known = ids.filter((id) => ['known', 'secure'].includes(S.cardState(S.State.card(id)))).length;
const canAnswer = S.State.canAnswer(ids);
const totalNew = newByDay.reduce((a, b) => a + b, 0);

if (longestDryDay > 1) fails.push(`no new questions at all on ${longestDryDay} days running, with plenty unseen`);
if (totalNew / DAYS < 1) fails.push(`only ${(totalNew / DAYS).toFixed(1)} new questions a day on average`);
if (worstBacklog > 400) fails.push(`the due pile reached ${worstBacklog} — reviews are being buried`);
if (emptyRounds > DAYS) fails.push(`${emptyRounds} sittings had nothing to ask`);
if (shortRounds > roundsPlayed * 0.25) fails.push(`${shortRounds} of ${roundsPlayed} rounds came up short of the sitting length`);
if (skillsSeen.size < 5) fails.push(`only ${skillsSeen.size} of the five skills were ever started: ${[...skillsSeen].join(', ')}`);
if (known < 100) fails.push(`only ${known} questions reached "known" in ${DAYS} days`);

console.log(`test-schedule: ${DAYS} days, ${roundsPlayed} rounds, ${met.toLocaleString()} questions met, ${canAnswer.toLocaleString()} answerable, ${known.toLocaleString()} known`);
console.log(`  new per day: ${(totalNew / DAYS).toFixed(1)} average, ${Math.max(...newByDay)} at most, ${Math.min(...newByDay)} at least`);
console.log(`  topped up with practice: ${topped.toLocaleString()} questions; rounds short of the sitting: ${shortRounds}`);
console.log(`  worst review backlog: ${worstBacklog}; sittings with nothing to ask: ${emptyRounds}`);
console.log(`  skills started: ${[...skillsSeen].sort().join(', ')}`);
if (fails.length) {
  console.error('\ntest-schedule FAILED:');
  for (const f of fails.slice(0, 10)) console.error('  - ' + f);
  if (fails.length > 10) console.error(`  …and ${fails.length - 10} more`);
  process.exit(1);
}
console.log('test-schedule: the loop holds.');
