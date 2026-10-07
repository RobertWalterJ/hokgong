// The grammar ladder: what each pattern is made of, and what it stands on.
//
// content/grammar.mjs already explains ten patterns and the app can look them
// up. A list is not a ladder, though, and a learner asking "what should I work
// on" got a screen of ten equal things sorted by how often they turn up in
// recorded speech. Frequency is the right order to MEET words in and the wrong
// order to learn patterns in: 咩 at the end of a sentence is very common and
// makes no sense before you can make the statement it is attached to.
//
// So each rung names the rungs it stands on. From that the app can say which
// patterns are open, which are next, and why — and a lesson can show you the
// ones underneath it with how you are doing on each.
//
// WHAT IS MINE AND WHAT IS THE SOURCES'. The `how` lines and the order are
// mine, like the explanations in grammar.mjs and the notes in notes.mjs, and
// they are labelled as mine in the app. Every EXAMPLE shown in a lesson is a
// real Tatoeba sentence that build/verify.mjs has already checked contains the
// pattern and matches its source word for word. No example is written here, so
// there is nothing here that could drift from a source.
//
// `builds` may only name a rung that comes EARLIER in this file. A ladder with
// a rung hanging off one above it is not a ladder, and build/verify.mjs
// refuses to build one.

export default [
  {
    id: 'hai6',
    how: 'thing + 係 + thing. It joins two nouns and nothing else — never a noun to an adjective.',
    builds: [],
    why: 'Everything else is said about something. This is how you say what that something is.',
  },
  {
    id: 'm4',
    how: '唔 + verb. It goes in front, and nowhere else.',
    builds: ['hai6'],
    why: 'The first thing you do with 係 is contradict it: 唔係 is the commonest two-word sentence in Cantonese.',
  },
  {
    id: 'go3-di1',
    how: 'number (or 呢/嗰) + measure word + noun. 一個人, 呢啲嘢, 一隻狗.',
    builds: [],
    why: 'You cannot count anything in Cantonese without one, and counting comes up on the first day.',
  },
  {
    id: 'ge3',
    how: 'owner + 嘅 + thing, or a whole description + 嘅 + thing. 我嘅書; 佢買嘅嘢.',
    builds: ['go3-di1'],
    why: 'Once you can point at a thing, the next thing you need is whose it is and which one.',
  },
  {
    id: 'a-not-a',
    how: 'verb + 唔 + the same verb. 食唔食, 好唔好. The answer is one half of it.',
    builds: ['m4'],
    why: 'It is 唔 used twice, and it is how most yes-or-no questions are actually asked.',
  },
  {
    id: 'jau5-mou5',
    how: '有冇 + thing, or 有冇 + verb. It asks whether something exists or has happened.',
    builds: ['m4', 'a-not-a'],
    why: 'The same either-way shape as V唔V, built on the one verb that negates with 冇 instead of 唔.',
  },
  {
    id: 'zo2',
    how: 'verb + 咗. It marks the action as done, not the time it happened.',
    builds: ['m4'],
    why: 'The first thing most learners want after the present tense, and the first place English tense habits go wrong.',
  },
  {
    id: 'gan2',
    how: 'verb + 緊. It marks the action as going on.',
    builds: ['zo2'],
    why: 'The opposite number to 咗, and much easier to hold once you have that one.',
  },
  {
    id: 'faan1',
    how: 'verb + 返 / 埋 / 住. They attach to the verb and shade what it means: back, as well, keep on.',
    builds: ['zo2', 'gan2'],
    why: 'The same slot after the verb that 咗 and 緊 occupy, so it is one idea extended rather than a new one.',
  },
  {
    id: 'particles',
    how: 'a whole sentence + 啊 / 喇 / 咩 / 喎. It does not change what you said, it changes how you said it.',
    builds: ['hai6', 'ge3'],
    why: 'It attaches to a finished sentence, so it is worth very little until you can finish one. It is also what makes Cantonese sound Cantonese.',
  },
];

// A rung opens when the one it stands on is largely met and mostly right.
// Deliberately generous: this gates what the app SUGGESTS, never what it will
// let you look at, and any rung can be opened by hand from the ladder.
export const OPEN_MET = 0.5;     // half its questions met…
export const OPEN_RIGHT = 0.6;   // …and three in five of those answered right
