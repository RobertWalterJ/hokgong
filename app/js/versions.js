// What changed, and when. Shown on the About page under the version stamp, so
// "a new version is ready" can be followed by "and here is what it is".
//
// The number in package.json is the one the build stamps into the page; this
// list explains it. Newest first.

export default [
  {
    v: '1.6.0', date: '2026-09-20',
    what: [
      'Removed sentences that should never have been taught. The listening questions come from Tatoeba, a general corpus of whatever people have contributed, and nothing in the build was reading them for what they SAY — only for their length, their recording and which characters they use. So "You might as well go kill yourself" passed every check there was. 533 sentences about death, violence, illness, sex, politics and religion are now set aside before anything else looks at them, and the build fails if one reaches the deck.',
      'Questions whose answers are Chinese words now show the reading under each one — 唔該 m4 goi1 against 多謝 do1 ze6 — instead of two characters and nothing else. Same for the gap-filling sentences and the pieces you put in order. The build now fails if any Chinese button has no reading beside it.',
      'A sentence is no longer offered until you know more of it. The old rule let one through if three fifths of its characters were familiar, which is how a sentence two-fifths unknown turned up in a second-ever round. It now wants four fifths known AND at most two new characters, so the unknown part is small rather than merely proportionate.',
    ],
  },
  {
    v: '1.5.1', date: '2026-09-20',
    what: [
      'Fixed the app scrolling sideways. The row of dashes at the top of a round — one per question — was sized when a round was ten questions: eighteen pixels each came to 216px, which fits a phone. A round became twenty-five and can be set to forty, which is 546px and 870px, so the whole page could be dragged left and every screen looked half cut off. The dashes now share whatever width they are given.',
      'The page can no longer be scrolled sideways at all, whatever goes wrong in future, and the build now fails if anything is wider than a 320px phone.',
    ],
  },
  {
    v: '1.5.0', date: '2026-09-20',
    what: [
      'The app no longer stops you learning. There is always a button: when nothing is owed it carries on with new words past the day’s pace, and when there are none left in reach it carries on with recall. "Today’s words are done" used to hide the button and offer a faint link underneath, which read as "you are finished".',
      'A round now fills to the length you chose, every time. Three separate rules were stopping it — the eighteen-new-questions-a-day pace, the four-hour cool-down that put everything you had just answered out of reach, and a trickle of five new questions a round that made a first sitting five questions long. A determined evening now passes four stages instead of none.',
      'Under the button, how long until the next review comes round, counted in minutes rather than "tomorrow". It refreshes once a minute and nothing waits on it.',
      'The recall test says what it covers: everything you have met, weakest memory first, and how many it still has to go through.',
      'Words get up to three example sentences instead of one, and the later ones are longer — up to twenty-four characters — and built from words you have already been taught.',
      'Fixed: every listening question and every tone question was locked until all ten stages were passed. That was 590 questions a learner could not reach.',
    ],
  },
  {
    v: '1.4.0', date: '2026-09-20',
    what: [
      'Every Chinese sentence now carries its Jyutping underneath, and every Chinese word in the app’s own explanations is written with its reading beside it. A sentence in characters is a picture of a sentence if you cannot read them.',
      'Read-aloud no longer hands characters to the English voice, which pronounced them as Mandarin. It speaks the romanisation instead.',
      'An answer says what happened in words — "Right", or "Not quite — it is X" — with a short sound and a soft green or red wash across the screen.',
      'The button that moves you on sits in the same place on every question and stays within reach without scrolling to find it.',
      'Each question says which number it is, and the end of a round reads as a summary rather than as another question.',
      'A sitting is now about 25 questions rather than 10 — roughly five minutes, so three of them make fifteen minutes a day. Short and longer sittings are in Settings.',
      'A round no longer runs out after two questions. When nothing is new or due, it fills up with words you have already met, and those answers are logged as practice so filling the time never moves the schedule.',
    ],
  },
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
      'The app no longer speaks on its own when you open it. Sound plays when you press it, or inside a listening question where hearing it is the question.',
      'The word of the day comes from the stage you are on, instead of anywhere in six thousand words.',
      'Speaking can be checked by the phone, if you turn it on: "say this in Cantonese" becomes a question the app marks. Off by default, because it is the one thing here that leaves your phone.',
      'Notes for words a gloss cannot separate — 多謝 thanks for a thing given, 唔該 for something done — each with a question that asks the distinction.',
      'Your progress can be saved to a file and restored from one, in Settings.',
      'The app notices when a new version is deployed and offers to reload.',
      'The ten stages appear on Progress with a mark against each.',
    ],
  },
  {
    v: '1.0.0', date: '2026-09-20',
    what: [
      'First version. Six thousand words from recorded Hong Kong conversation, 585 recordings by a person, nine kinds of question across five skills, and tone production measured by pitch tracking.',
      'A course in ten stages, each gated on the one before it.',
      'Every reading, meaning, sentence and quotation checked against its source at every build, with twelve deliberate faults planted to prove the checks can fail.',
    ],
  },
];
