// Building a sentence up from its end.
//
// Pimsleur's oldest trick, and the one worth stealing. To teach a long phrase
// you do not start at the beginning and add to the end; you start at the END
// and add to the front:
//
//   煩我              faan4 ngo5                     bother me
//   唔好煩我           m4 hou2 faan4 ngo5             don't bother me
//   你唔好煩我         nei5 m4 hou2 faan4 ngo5        you, don't bother me
//   唔該你唔好煩我      m4 goi1 nei5 m4 hou2 faan4 ngo5  please don't bother me
//
// Why backwards. The hard part of saying a long phrase is not remembering the
// words, it is holding the shape — where it rises, where it falls, where it
// speeds up. That shape lives at the END of the phrase. Build forwards and the
// learner practises the beginning over and over while the ending is new every
// time and the melody collapses. Build backwards and every attempt FINISHES on
// something already said twice, so the ending is the most practised part and
// the new chunk is always at the front, where there is most attention.
//
// For a tone language this matters more than it does for French. A Cantonese
// phrase's tones are only stable in context, and the last syllables are where
// a learner's pitch drifts.
//
// THIS MODULE IS PURE. It takes the pieces and gives back the steps, with no
// deck, no DOM and no state, so build/test-buildup.mjs can hold it to its
// properties in Node: every step ends the sentence, each step grows, the last
// step IS the sentence.

// Pieces that cannot begin a phrase. They attach to the word in FRONT of them:
// 嘅 makes the thing before it a possessor, 咗 and 緊 mark the verb before them,
// 哋 pluralises the pronoun before it. A step starting on one of these is not a
// phrase a Cantonese speaker would ever say on its own, and the whole point of
// building backwards is that every step is sayable.
// Checked against the whole PIECE, never the first character: 返 on its own is
// a verb suffix (行返 — walk back), and 返工 is a word meaning "go to work" that
// begins phrases all day long.
const CANNOT_START = new Set(['嘅', '咗', '緊', '過', '住', '返', '埋', '哋', '噃']);

// How many steps a build-up should have. Two is not a build-up; seven is a
// chore, and this app is used in short sittings on a phone.
export const MIN_STEPS = 2;
export const MAX_STEPS = 5;

// `parts` are the sentence's pieces in order, each [word, reading]. They must
// rebuild the sentence exactly — build/verify.mjs checks that where they are
// stored, so this module can trust it.
export function buildUp(parts, { max = MAX_STEPS } = {}) {
  const pieces = (parts || []).filter((p) => p && p[0]);
  if (pieces.length < 2) return [];

  // Where the steps start, counted from the end. One piece at a time while the
  // sentence is short; for a longer one the pieces are grouped, because five
  // steps of a ten-piece sentence is better teaching than ten steps of it —
  // and the last step must always be the whole thing.
  const n = pieces.length;
  const steps = Math.max(MIN_STEPS, Math.min(max, n));
  const cuts = [];
  for (let s = 1; s <= steps; s++) {
    // Evenly spaced cuts from the right, always ending at the whole sentence.
    const take = Math.round((n * s) / steps);
    const from = n - Math.max(1, take);
    if (!cuts.length || from < cuts[cuts.length - 1]) cuts.push(from);
  }
  // Move every cut left until it lands somewhere a phrase can begin, and make
  // the first step worth saying aloud — a single piece of one character is a
  // syllable, not a phrase.
  for (let k = 0; k < cuts.length; k++) {
    while (cuts[k] > 0 && CANNOT_START.has(pieces[cuts[k]][0])) cuts[k] -= 1;
  }
  if (cuts.length > 1 && [...pieces[cuts[0]][0]].length < 2 && cuts[0] > 0) {
    cuts[0] -= 1;
    while (cuts[0] > 0 && CANNOT_START.has(pieces[cuts[0]][0])) cuts[0] -= 1;
  }
  // Moving cuts can land one on top of another, which would give a step no
  // longer than the one before it — a build-up that does not build. Keep only
  // the ones still strictly decreasing, and always keep the whole sentence.
  const kept = [];
  for (const c of cuts) if (!kept.length || c < kept[kept.length - 1]) kept.push(c);
  cuts.length = 0;
  cuts.push(...kept);
  if (cuts[cuts.length - 1] !== 0) cuts.push(0);

  const out = [];
  for (const from of cuts) {
    const run = pieces.slice(from);
    out.push({
      from,
      text: run.map((p) => p[0]).join(''),
      jyut: run.map((p) => p[1]).filter(Boolean).join(' '),
      pieces: run.length,
      // The piece added at this step, which is what the learner is being asked
      // to put on the front.
      added: out.length ? pieces.slice(from, out[out.length - 1].from).map((p) => p[0]).join('') : null,
    });
  }
  return out;
}

// A sentence is worth building up only if it is long enough to be hard. A
// four-character sentence is one breath and the technique has nothing to do.
export const worthBuilding = (parts) => (parts || []).filter((p) => p && p[0]).length >= 4;
