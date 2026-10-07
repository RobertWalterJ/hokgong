// The six tones, as something to be taught rather than looked up.
//
// Robert, 7 Oct: "I want something for listening to tones and for understanding
// various tones. Even an instructional thing about the tones in Cantonese and
// what the tones are and recognising the tones across various words."
//
// The app already had two tone questions and a reference screen. What it did
// not have was a LESSON — somewhere that says what the six are, what makes
// each one what it is, and which pairs are actually going to catch you out.
//
// WHICH PAIRS. The confusions below are not a ranking of difficulty, which
// would need evidence this project does not have. They are the pairs that
// share a SHAPE and differ only in where they sit: two level tones at
// different heights, two rising tones from different starting points. That is
// a statement about the Chao values themselves (55, 25, 33, 21, 23, 22 —
// Bauer & Benedict, Modern Cantonese Phonology, 1997), not a claim about
// learners. A question offers the right answer beside the tones it shares a
// shape with, because "was that 55 or 33" is a real question and "was that 55
// or 21" is not.
//
// Every example word is one the app teaches, picked at build time from the
// deck, so nothing here invents a word or a reading.
//
// The claim in `watch` about English speakers is not mine. Wu, Baker, Fletcher
// and Bundgaard-Nielsen (2016, Proceedings of TAL 2016, free from the ISCA
// archive) had Mandarin speakers, English speakers, English speakers with L2
// Mandarin and native Cantonese speakers imitate all six tones: the English
// speakers did better on the level tones than the contour ones and produced
// the contours with too little pitch movement. An earlier draft of this file
// said the opposite — that hearing held-against-climbing gets you most of the
// way and height is the remainder — which is the wrong advice for him.

export const TONES = [
  {
    n: 1, chao: '55', name: 'high, level',
    is: 'Held high and flat, near the top of your voice.',
    like: 'The pitch you use for the last word of a list — "one, two, THREE" — but held, not falling.',
  },
  {
    n: 2, chao: '25', name: 'rising, ending high',
    is: 'Starts low and climbs to the top.',
    like: 'An English question: "really?" The whole word does that.',
  },
  {
    n: 3, chao: '33', name: 'mid, level',
    is: 'Held flat in the middle of your range.',
    like: 'Your ordinary speaking pitch, with no movement in it at all.',
  },
  {
    n: 4, chao: '21', name: 'low, falling',
    is: 'Starts low and sinks further. Often creaky at the bottom.',
    like: 'The sound of being unimpressed.',
  },
  {
    n: 5, chao: '23', name: 'low, rising to mid',
    is: 'Starts low and comes up — but only to the middle, not the top.',
    like: 'Tone 2 cut short: the same climb, stopping halfway.',
  },
  {
    n: 6, chao: '22', name: 'low, level',
    is: 'Held flat, low in your range.',
    like: 'Tone 3 moved down a step.',
  },
];

// Tones that share a shape, and so are a real question to tell apart. Used to
// choose the wrong answers: offering 55 against 21 teaches nothing, because
// nobody confuses the top of their voice with the bottom of it.
export const CONFUSABLE = {
  1: [3, 2],      // level against level; and the one that ends as high as it
  2: [5, 3],      // rising against rising
  3: [6, 1],      // level against level
  4: [6, 5],      // low against low
  5: [2, 6],      // rising against rising; and low against low
  6: [3, 4],      // level against level; low against low
};

// What the lesson says before any of it is asked.
export const LESSON = {
  title: 'The six tones',
  what: 'Cantonese says the same syllable at six different pitches, and they are six different words. Not emphasis, not mood — a different word. 詩 si1 is a poem, 史 si2 is history, 試 si3 is to try.',
  how: 'Think of your speaking range as a ladder with five rungs, 1 at the bottom and 5 at the top. Each tone is where it starts and where it ends: 55 begins and ends at the top; 25 climbs from the bottom to the top; 21 starts low and sinks.',
  watch: 'Three of the six are LEVEL — held flat, at the top, the middle and the bottom. Two RISE. One FALLS. If English is your first language the three LEVEL ones are where your first wins will be: English ears are good at how high something sat and poor at how it moved, and English mouths flatten a tone that was supposed to climb. The rises are the work.',
  honest: 'It takes months, and the app will not pretend otherwise. What it can do is let you hear the same tone on many different words until the shape comes loose from the word.',
};
