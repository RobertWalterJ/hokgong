// Where does this learner already stand?
//
// The course starts at stage one and everybody walks the same road. That is
// right for Robert, a beginner by his own account — "I really am not all that
// advanced in my knowledge of Cantonese" — and it is wrong for someone who has
// picked up a few hundred words at his wife's family table, which is also
// Robert. Both are true, and the honest answer is not to guess: ask.
//
// HOW IT FITS THE COURSE. It does not build a second progression. It produces
// one number — a FLOOR, the number of whole stages already comfortably known —
// and hands it to the course's existing high-water mark. Stages under the floor
// stop being taught as new material and are spot-checked instead. Nothing else
// about the ten stages changes.
//
// WHY IT ASKS STAGE WORDS DIRECTLY. The first design walked a staircase over
// ten frequency bands of the six thousand words, the way its sister app does.
// It could not work here, and the test said so before any of it shipped: all
// ten of Hok Gong's stages live inside the first hundred and seventy words of
// the teaching order, so every stage falls in the same band or two and the
// floor came out as 0 or 6 almost at random. The bands cannot see a thing that
// small. So the floor is measured where it lives — four words from each stage,
// bottom upwards, stopping at the first stage that is not already known.
//
// For a beginner that is four questions and an honest "we will start at the
// beginning". For someone with a few hundred words it is a dozen.
//
// FOUR THINGS IT WILL NOT DO:
//   - it never places a learner higher than his own answers do;
//   - "I don't know" costs nothing beyond not being right, and the interface
//     puts it there so a guess is never forced;
//   - a wrong answer teaches: the word is shown properly before moving on, so
//     a check is never a run of being told you are wrong;
//   - it asks by sound and romanisation, never by character. The app's one
//     learner cannot read characters, and a check he cannot read would measure
//     his reading rather than his Cantonese.

import { D } from './deck.js';

export const PER_STAGE = 8;        // words asked from each stage
export const RETRY = true;         // …and a second go at a stage that just misses
export const NEED = 7;             // …of which this many must be right
export const MAX_QUESTIONS = 40;

export class Placement {
  constructor() {
    this.stage = 0;                // the stage being checked
    this.inStage = [];             // results within it
    this.asked = new Set();        // word indices already used
    this.history = [];
    this.passed = 0;               // stages cleared so far
    this.total = 0;
    this.finished = false;
    this.stopped = false;          // the learner ended it early
    this.retried = false;          // whether this stage is on its second go
  }

  // A word that shares an English meaning with another — 爸爸 and 老豆 both
  // answering to "dad" — is a question with two right answers unless something
  // says which is wanted. The app's own questions carry a CUE for exactly this,
  // so the check carries it too. Skipping those words instead left stage three
  // with five of its seventeen and put a ceiling on the whole check.
  pick(rnd = Math.random) {
    const d = D();
    const st = d.stages[this.stage];
    if (!st) return null;
    const pool = st.words.filter((i) => {
      const w = d.words[i];
      return w && !this.asked.has(i) && w.g && w.g.length <= 32;
    });
    if (!pool.length) return null;
    const i = pool[Math.floor(rnd() * pool.length)];
    // Three wrong answers from nearby in the teaching order, so the choice is
    // between words he might plausibly know — never between a common word and
    // something from the far tail, which gives the answer away.
    const seen = new Set([d.words[i].g]);
    const order = [];
    const from = Math.max(0, i - 300), to = Math.min(d.words.length, i + 300);
    for (let k = from; k < to; k++) if (k !== i) order.push(k);
    for (let n = order.length - 1; n > 0; n--) { const m = Math.floor(rnd() * (n + 1)); [order[n], order[m]] = [order[m], order[n]]; }
    const others = [];
    for (const k of order) {
      const g = d.words[k]?.g;
      if (!g || seen.has(g) || g.length > 32) continue;
      seen.add(g);
      others.push(g);
      if (others.length === 3) break;
    }
    if (others.length < 3) return null;
    return { i, stage: this.stage, word: d.words[i], cue: d.cues?.[i] || null, options: others };
  }

  // `right` is true only for a right answer. "I don't know" arrives here as
  // false, which is what it means for the estimate; what it must never be is a
  // wrong answer anywhere the learner can see.
  record(i, right) {
    this.asked.add(i);
    this.inStage.push(right);
    this.history.push({ stage: this.stage, i, right });
    this.total++;

    const got = this.inStage.filter(Boolean).length;
    const left = PER_STAGE - this.inStage.length;
    if (got >= NEED) {
      // Passed. On to the next, with a clean slate and a fresh second chance.
      this.passed = this.stage + 1;
      this.stage++;
      this.inStage = [];
      this.retried = false;
    } else if (got + left < NEED) {
      // It cannot be reached even if the rest are right. Once is a slip; twice
      // is the floor.
      if (RETRY && !this.retried) { this.retried = true; this.inStage = []; }
      else this.finished = true;
    }
    if (this.stage >= D().stages.length) this.finished = true;
    if (this.total >= MAX_QUESTIONS) this.finished = true;
  }

  // "Start me at the beginning" — always available, costs nothing, and is the
  // right answer for most people who open this app.
  stop() { this.stopped = true; this.finished = true; }

  result() {
    // A stage half-answered is not a stage passed. Only completed stages count,
    // so ending the check early can never place anyone forward.
    return {
      floor: this.stopped ? Math.min(this.passed, this.stage) : this.passed,
      asked: this.total,
      stoppedEarly: this.stopped,
      history: this.history.slice(),
    };
  }
}

// How much of the six thousand words a floor implies, for something true to
// say at the end. Deliberately not a vocabulary-size estimate: the check looks
// at a hundred and seventy words and claiming a number for six thousand from
// that would be an invention.
export function wordsBehind(floor) {
  const d = D();
  let n = 0;
  for (let s = 0; s < floor && s < d.stages.length; s++) n += d.stages[s].words.length;
  return n;
}
