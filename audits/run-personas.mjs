// The journeys audit — where does a year of this actually get you?
//
//   node audits/run-personas.mjs
//
// The scheduler test proves the loop does not break. This asks the question
// underneath it: if a real person plays the way they say they will, what do
// they know a year later, and is it worth the time?
//
// The memory model is the one calibrated for Palimpsest, not a new one:
// each answer lays a trace of strength S days, recall after t days is
// exp(-t/S), and the chance of answering is recall + (1 - recall) x p0, where
// p0 is what the learner can manage without remembering — a four-option
// question can be guessed, and prior knowledge helps. A retrieval that was
// hard (low recall) multiplies S by up to 3.5; an easy one barely moves it;
// a miss resets it to a day and a half.
//
// Writing a model from scratch here gave a learner 49 words after answering
// eleven thousand questions, which is not a finding about the app but a
// finding about a badly parameterised model. This one has been used before.
//
// It is a MODEL. It cannot tell you whether Robert will enjoy it, whether his
// wife will understand him, or whether a word learnt here comes out of his
// mouth in a kitchen. Read the numbers as arithmetic about the schedule.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));

const PERSONAS = [
  {
    name: 'From scratch, three short sittings a day',
    sittings: () => 3,
    // p0: what this learner manages without remembering. A four-option
    // question can be guessed at 0.25; a little English-side logic lifts it.
    firstSight: () => 0.35,
    pace: { newPerRound: 5, newPerDay: 18 },
  },
  {
    name: 'From scratch, one sitting a day',
    sittings: () => 1,
    firstSight: () => 0.35,
    pace: { newPerRound: 5, newPerDay: 18 },
  },
  {
    name: 'After Pimsleur — the first 400 words are half-known already',
    sittings: () => 3,
    firstSight: (rank) => (rank <= 400 ? 0.7 : 0.35),
    pace: { newPerRound: 5, newPerDay: 18 },
  },
  {
    name: 'Keen: three sittings a day, pace set to keen',
    sittings: () => 3,
    firstSight: () => 0.35,
    pace: { newPerRound: 8, newPerDay: 40 },
  },
  {
    // The question the pace setting cannot answer: is the limit the daily cap
    // on new words, or simply how long you play?
    name: 'Ten minutes a day — six sittings',
    sittings: () => 6,
    firstSight: () => 0.35,
    pace: { newPerRound: 5, newPerDay: 18 },
  },
  {
    name: 'Twenty minutes a day — twelve sittings, keen pace',
    sittings: () => 12,
    firstSight: () => 0.35,
    pace: { newPerRound: 8, newPerDay: 40 },
  },
  {
    name: 'A real life: three sittings, but nothing at all two days a week',
    sittings: (day) => (day % 7 < 2 ? 0 : 3),
    firstSight: () => 0.35,
    pace: { newPerRound: 5, newPerDay: 18 },
  },
];

const DAYS = 365;
const SECONDS_PER_QUESTION = 11;

const coverageFor = (words) => {
  const rows = DECK.coverage.coverage;
  const below = rows.filter((r) => r.words <= words).pop();
  return below ? below.pct : 0;
};

const run = async (persona) => {
  // A fresh module instance per persona, so state does not leak between runs.
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  let mseed = 11;
  Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
  const S = await import(`../app/js/schedule.js?persona=${encodeURIComponent(persona.name)}`);
  const ids = DECK.items.map((it) => it.id);
  const byId = new Map(DECK.items.map((it) => [it.id, it]));
  const groupOf = (id) => {
    const it = byId.get(id);
    return it?.i != null ? 'w' + it.i : it?.gid ? 'g' + it.gid : it?.syll ? 't' + it.syll : 's' + id;
  };

  let t = new Date(2026, 8, 1, 8, 0).getTime();
  S.__setClock(() => t);
  S.State.load();

  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  // strength in days, and when it was last retrieved
  const mem = new Map();
  let answered = 0;
  const marks = {};

  for (let day = 0; day < DAYS; day++) {
    const sittings = persona.sittings(day);
    const asked = new Set();
    for (let s = 0; s < sittings; s++) {
      t += 4.5 * 3600e3;
      const round = new S.Round(ids, { exclude: asked, pace: persona.pace, groupOf });
      if (round.empty) continue;
      let id;
      while ((id = round.next())) {
        asked.add(id);
        answered++;
        const it = byId.get(id);
        const rank = it?.i != null ? it.i + 1 : 9999;
        const m = mem.get(id);
        const recall = m ? Math.exp(-((t - m.last) / 864e5) / m.S) : 0;
        const p0 = persona.firstSight(rank);
        const right = rand() < recall + (1 - recall) * p0;
        // A retrieval that was easy (recall near 1) adds almost nothing; one
        // after a real gap multiplies the trace by up to 3.5. A miss resets it.
        mem.set(id, { S: m ? (right ? m.S * (1 + 2.5 * (1 - recall)) : 1.5) : (right ? 3 : 1.5), last: t });
        S.State.answer(id, right, {});
        t += SECONDS_PER_QUESTION * 1000;
      }
      S.State.snapshot(ids);
    }
    // A monthly mark, and the count that matters: words you could answer.
    if ((day + 1) % 30 === 0) {
      const words = new Set();
      for (const it of DECK.items) {
        if (it.i == null) continue;
        const c = S.State.card(it.id);
        if (c && c.st !== 'new' && c.ok) words.add(DECK.words[it.i].w);
      }
      marks[(day + 1) / 30] = { words: words.size, known: ids.filter((x) => ['known', 'secure'].includes(S.cardState(S.State.card(x)))).length };
    }
    const d = new Date(t);
    t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 8, 0).getTime();
  }

  const last = marks[12] || marks[Math.max(...Object.keys(marks).map(Number))];
  const minutes = Math.round((answered * SECONDS_PER_QUESTION) / 60);
  return { persona, marks, last, answered, minutes };
};

console.log(`A YEAR OF PLAYING, by the schedule and a forgetting curve\n`);
for (const p of PERSONAS) {
  const r = await run(p);
  const perDay = Math.round(r.minutes / DAYS);
  console.log(p.name);
  console.log(`  ${r.answered.toLocaleString()} questions answered — about ${perDay} minutes a day, ${Math.round(r.minutes / 60)} hours in the year`);
  const line = [1, 3, 6, 9, 12].filter((m) => r.marks[m]).map((m) => `${m}mo ${r.marks[m].words}`).join('  ·  ');
  console.log(`  words you can answer:  ${line}`);
  console.log(`  after a year: ${r.last.words.toLocaleString()} words — about ${coverageFor(r.last.words)}% of the words in recorded conversation; ${r.last.known.toLocaleString()} questions held past three weeks\n`);
}

console.log('What this does not say: whether any of it comes out of your mouth in a kitchen.');
console.log('It is arithmetic about the schedule, not evidence about you.');
