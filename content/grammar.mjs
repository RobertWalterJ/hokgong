// The grammar syllabus, ordered by how often each pattern actually occurs in
// recorded Hong Kong conversation (HKCanCor counts, in `corpus` below).
//
// Every example is a real Tatoeba sentence with a human English translation —
// never invented, and preferably one with recorded audio. The explanations are
// mine; the examples and their translations are the sources'. build/items.mjs
// picks the examples, build/verify.mjs checks each one exists verbatim, carries
// the pattern, and has its translation.
//
//   match     what an example must contain to count as showing the pattern
//   contrast  the form it is most confused with, for "which is right?" items
//   corpus    how many times it appears in the 125,119-word spoken corpus

export default [
  {
    id: 'hai6', title: 'Saying what something is — 係', corpus: 5224,
    match: '係', notMatch: '唔係|係唔係|係咪',
    plain: 'Cantonese has no “am/is/are” before an adjective, but it needs 係 (hai6) to link two things: 我係加拿大人 — I am a Canadian. With an adjective you use 好 instead: 我好攰 — I am tired.',
    watch: 'Don’t put 係 before an adjective. 我係攰 is wrong; 我好攰 is right.',
  },
  {
    id: 'm4', title: 'Saying no — 唔', corpus: 2078,
    match: '唔',
    plain: '唔 (m4) goes straight in front of the verb: 我唔食 — I don’t eat. It is the everyday “not” for verbs and adjectives.',
    watch: 'For “don’t have” and “didn’t”, Cantonese uses 冇 (mou5), not 唔有.',
  },
  {
    id: 'go3-di1', title: 'Counting things — 個, 啲, 隻', corpus: 2624,
    match: '個|啲|隻',
    plain: 'A number or “this/that” needs a measure word before the noun. 個 (go3) is the general one: 一個人. 啲 (di1) covers “some” and plurals: 呢啲嘢. 隻 (zek3) is for animals and one of a pair: 一隻狗.',
    watch: '個 is the safe default when you don’t know the right measure word — speakers will understand you.',
  },
  {
    id: 'ge3', title: 'Whose and which — 嘅', corpus: 1707,
    match: '嘅',
    plain: '嘅 (ge3) joins a describer to a thing, like ’s and “that”: 我嘅書 — my book; 佢買嘅嘢 — the thing he bought.',
    watch: 'At the end of a sentence 嘅 does another job: it makes a statement sound settled.',
  },
  {
    id: 'zo2', title: 'Something finished — 咗', corpus: 869,
    match: '咗',
    plain: '咗 (zo2) sits right after the verb and marks the action as done: 我食咗飯 — I have eaten. It is about completion, not about the past: 聽日食咗飯先 — after eating tomorrow.',
    contrast: '緊', watch: 'It follows the verb. 我咗食飯 is wrong.',
  },
  {
    id: 'particles', title: 'The word that carries the attitude — 啊, 喇, 咩, 喎', corpus: 11000,
    match: '啊|呀|喇|咩|喎|嘅|囉|嘛|吖',
    plain: 'Cantonese puts the speaker’s attitude in a particle at the end. 啊/呀 softens. 喇 says something has changed or is settled. 咩 asks in surprise — 真係咩？ really? 喎 passes on what someone else said, or marks it as news.',
    watch: 'These are not decoration. Leaving them off is what makes correct Cantonese sound blunt or foreign.',
  },
  {
    id: 'gan2', title: 'Something in progress — 緊', corpus: null,
    match: '緊',
    plain: '緊 (gan2) after the verb means the action is going on right now: 我食緊飯 — I am eating. Same position as 咗, opposite meaning.',
    contrast: '咗',
    watch: 'The corpus of 1990s conversation barely tags 緊 on its own, but it is everywhere in Tatoeba’s sentences and in speech today — a reminder that the corpus is a sample, not the language.',
  },
  {
    id: 'a-not-a', title: 'Asking either way — V唔V', corpus: 353,
    match: '係唔係|好唔好|得唔得|去唔去|食唔食|啱唔啱|得閒唔得閒',
    plain: 'The same question shape with other verbs: 好唔好？ — is it good? 得唔得？ — will that do? Say the verb, 唔, then the verb again.',
    watch: 'With 係 this becomes 係唔係 — the ordinary way to ask “is it?”',
  },
  {
    id: 'jau5-mou5', title: 'Asking with “have or not” — 有冇', corpus: 169,
    match: '有冇',
    plain: 'Cantonese asks questions by offering both options: 你有冇時間？ — do you have time (have, not have)? The pattern works with any verb: 去唔去 — going or not?',
    watch: 'Answer by repeating the verb: 有 or 冇 — not “yes” or “no”.',
  },
  {
    id: 'faan1', title: 'Back, again, and along — 返, 埋, 住', corpus: 805,
    match: '返|埋|住',
    plain: 'Short words after the verb change what it means. 返 (faan1) is back or again: 返屋企 — go home. 埋 (maai4) adds the rest, or joins in: 食埋佢 — finish it. 住 (zyu6) holds the state for now: 等住 — wait (and stay waiting).',
    watch: 'They stack after the verb, before the object.',
  },
];
