// What changed, and when. Shown on the About page under the version stamp, so
// "a new version is ready" can be followed by "and here is what it is".
//
// The number in package.json is the one the build stamps into the page; this
// list explains it. Newest first.

export default [
  {
    v: '1.3.0', date: '2026-09-20',
    what: [
      'A banner at the head of the home screen, like the other apps have: the wordmark over your own Cantonese, faint — the words you most recently answered right, or the stage’s words before you have any.',
      'A rail of ten pips under it showing which stage you are on, and one line naming it that opens the course.',
      'Home simplified to four things: the banner, one button, three ways on, and a word to look at. The stage detail moved to The course, where you go when you want it.',
      'Words, tones, grammar and sources folded behind one entry, Look things up — six equal-looking choices had made the one thing worth doing look optional.',
    ],
  },
  {
    v: '1.2.0', date: '2026-09-20',
    what: [
      'A new palette: washed pink paper, pastel yellow and pastel blue washes, and one vibrant red that cuts through them. Dark mode is the inverse rather than a dimming — off-black with a plum cast, off-white type, and pastels that glow instead of pressing.',
      'The colours were searched rather than chosen by eye: the first pinks put the two answer washes 4.2 apart under tritanopia where the audit wants 6, so they moved until every pair passed.',
    ],
  },
  {
    v: '1.1.0', date: '2026-09-20',
    what: [
      'The home screen rebuilt around one journey: what there is to do, where that sits in the course, then everything else. It used to open with "Nothing due" above a Start button, which told a new learner there was nothing to do.',
      'The app no longer speaks on its own when you open it. Sound now only plays when you press it, or inside a listening question where hearing it is the question.',
      'The word of the day comes from the stage you are on, instead of anywhere in six thousand words.',
      'Dark mode softened: less weight, smaller headings, and a lighter verdict colour that stays distinct from the accent under every colour vision.',
      'Your progress can be saved to a file and restored from one, in Settings. It lives in this phone’s browser and nothing else keeps a copy.',
      'The app notices when a new version is deployed and offers to reload.',
      'The ten stages now appear on Progress with a mark against each.',
    ],
  },
  {
    v: '1.0.0', date: '2026-09-20',
    what: [
      'First version. Six thousand words from recorded Hong Kong conversation, 585 recordings by a person, nine kinds of question across five skills, and tone production measured by pitch tracking.',
      'A course in ten stages, each gated on the one before it.',
      'Every reading, meaning, sentence and quotation checked against its source at every build — 101,869 checks — with twelve deliberate faults planted to prove the checks can fail.',
    ],
  },
];
