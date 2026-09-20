// What changed, and when. Shown on the About page under the version stamp, so
// "a new version is ready" can be followed by "and here is what it is".
//
// The number in package.json is the one the build stamps into the page; this
// list explains it. Newest first.

export default [
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
