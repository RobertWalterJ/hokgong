// Words a learner would reasonably answer with each other, and what tells
// them apart.
//
// Robert, 24 Sept 2026: "there are several ways to say father in Cantonese. I
// recently did a speech question that asked me how to say dad… I said Baa baa
// and then it said, no the answer is Lau dau. Lau dau is a slang way to say
// dad. It's fine to have in the app but that needs to be noted that a) it's
// informal and b) there are obviously other ways and so if you ask for dad, it
// probably wouldn't be the first thing that people think of and neither should
// it be."
//
// He is right on every count, and the app was wrong in three ways at once:
//
//   1. It asked "say this in Cantonese: dad" when two taught words answer to
//      that, and marked the natural one wrong.
//   2. It never said 老豆 is colloquial. A learner who deploys it with his
//      wife's grandmother will find out the hard way.
//   3. Its automatic cue for 爸爸 was the word "dad" — taken from the word's
//      own SECOND dictionary sense, which is not a disambiguator at all. 阿哥,
//      an elder brother, was cued "dad". 細佬, a younger brother, was cued "I".
//      Worse than nothing, because a wrong cue is read as information.
//
// The existing cue machinery only fired when two words shared a gloss STRING.
// 爸爸 is "father" and 老豆 is "dad", which do not collide as strings and are
// the same question in a learner's head. So the families are named here by
// hand, for the words the course teaches, which are the ones he will actually
// be asked to produce.
//
// A cue is shown in the question itself, so "say this in Cantonese: dad"
// becomes "dad — informal, the one you use at home". It is not a definition;
// it is the smallest thing that makes the question have one answer.

export default [
  {
    why: 'Two words for a father, and they are not interchangeable.',
    words: {
      爸爸: 'the ordinary word, safe with anyone',
      老豆: 'informal and affectionate, for your own dad',
    },
  },
  {
    why: 'Two words for a mother, the same way round.',
    words: {
      媽媽: 'the ordinary word, safe with anyone',
      阿媽: 'informal, for your own mum',
    },
  },
  {
    why: 'Cantonese names a brother by whether he is older or younger than you.',
    words: {
      哥哥: 'an older brother',
      阿哥: 'an older brother, the more familiar word',
      細佬: 'a younger brother',
    },
  },
  {
    why: 'And a grandmother by whose side of the family she is on.',
    words: {
      阿婆: 'your mother’s mother',
      阿嫲: 'your father’s mother',
    },
  },
  {
    why: 'Two apologies, and they are not equally serious.',
    words: {
      對唔住: 'a real apology — you have done something',
      唔好意思: 'the light one — excuse me, sorry to bother you',
    },
  },
  {
    why: 'Wanting and thinking are one word apart.',
    words: {
      想: 'wanting to do something',
      要: 'wanting a thing, or needing to',
      諗: 'thinking, turning something over',
      覺得: 'feeling or reckoning — an opinion',
    },
  },
  {
    why: 'Eating, with and without the meal.',
    words: {
      食: 'the verb on its own — eat something',
      食飯: 'sitting down to a meal — rice and dishes',
      食嘢: 'to eat, to get something to eat',
    },
  },
  {
    why: 'Two ways to call food good.',
    words: {
      好味: 'tastes good — of the flavour',
      好食: 'good to eat — of the dish',
    },
  },
  {
    why: 'Sleeping, with and without the lying down.',
    words: {
      瞓: 'to sleep, to lie down',
      瞓覺: 'to go to sleep, to turn in',
    },
  },
  {
    why: 'Working and doing.',
    words: {
      做嘢: 'to work, to be doing something',
      工作: 'work as a thing — a job',
    },
  },
  {
    why: 'Buying, with and without the thing.',
    words: {
      買: 'to buy something particular',
      買嘢: 'to go shopping',
    },
  },
  {
    why: 'Asking how many.',
    words: {
      幾多: 'how many, how much — the question',
      幾: 'a few, quite — not a question on its own',
    },
  },
  {
    why: 'Two words for what.',
    words: {
      乜嘢: 'what — the plain question word',
      咩: 'what — and the particle that turns a statement into a question',
    },
  },
  {
    why: 'The house and the people in it.',
    words: {
      屋企: 'home, the place',
      屋企人: 'family, the people',
    },
  },
  {
    why: 'A child of yours, and a child.',
    words: {
      仔: 'your son — a boy of yours',
      小朋友: 'a child, any child',
    },
  },
  {
    why: 'Going back to work, and going back to school.',
    words: {
      返工: 'the one about work',
      返學: 'the one about school',
    },
  },
];
