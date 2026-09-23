// The meanings the course words are taught with.
//
// Everything else in this app takes the dictionary's first-ranked sense. That
// works because the ranking was rebuilt to prefer the meaning several
// dictionaries agree on (build/extract.mjs) — which is what turned 水 from
// "money" into "water", 四 from "labourer" into "four", 杯 from "to boycott"
// into "cup". It gets the great majority right.
//
// It cannot get the last few right, because they are not errors of evidence.
// 麵 really does mean flour; it is just that a course teaching you to order
// lunch means noodles. 出 really can mean "to pay (salary)"; the course means
// "to go out". No amount of counting dictionaries decides that — only knowing
// which sense the lesson is for.
//
// So: for the 167 words the course teaches, and only those, the sense is
// chosen by hand. THE CHOICE IS A RE-ORDERING, NEVER AN INVENTION — every
// value below must already be one of the senses the sources give that word,
// and build/verify.mjs fails the build if one is not. The dictionary still
// decides what a word can mean; this decides which of those goes on the card.
//
// Robert, 23 Sept 2026: "there are some quirks and inaccuracies."

export default {
  // ── food and drink ──────────────────────────────────────────────────────
  麵: 'noodles',          // "flour" is first, and true, and not what you order
  熱: 'hot (of weather)', // "popular" is the figurative sense
  凍: 'cold',             // "Iced" is a menu word, capitalised by the source
  茶: 'tea',
  菜: 'vegetable',
  飯: 'cooked rice',      // "food" is the extended sense; the word is rice
  餐: 'meal',
  水: 'water',

  // ── coming and going ────────────────────────────────────────────────────
  出: 'to go out',        // "to pay (salary)" is the Hong Kong office sense
  上: 'to go up',         // the source's first is "chow", a different word
  落: 'to fall or drop',
  返: 'to return (to)',
  行: 'to walk',
  街: 'street',

  // ── time ────────────────────────────────────────────────────────────────
  時間: 'free time',      // "a point in time" is the abstract noun
  先: 'first',
  快: 'quick',
  早: 'early',            // 早晨 is the greeting; 早 on its own is early
  晚: 'evening',
  夜: 'night',
  遲: 'late',

  // ── people and manners ──────────────────────────────────────────────────
  多謝: 'thank you',      // "to thank" is the citation form, not what you say
  唔好意思: 'sorry',      // "embarrassed" is the etymology, not the errand
  對唔住: 'sorry',
  唔該: 'please',         // and the note teaches the rest of its work
  識: 'to know',          // "recognize" is first and narrower
  叫: 'to call',          // "to shout" is first; the course means being called
  名: 'name',

  // ── everything else the course leans on ─────────────────────────────────
  難: 'difficult',
  怕: 'to fear',
  點: 'point',
  個: 'individual',
  隻: 'one of pair',
  本: 'origin',
  條: 'strip',
  張: 'sheet of paper',
  得: 'Ok',
  房: 'room',
  車: 'vehicle',
  歲: 'age',              // "year" is right but ambiguous next to 年
};

// Words the course asks for and no open source can properly gloss. 湯 is soup.
// Not one of the dictionaries in this build gives that sense for the reading
// people say — CC-Canto has only "Chinese surname" — so the app would have to
// invent it, and it will not. They wait for words.hk.
export const UNGLOSSABLE = ['湯'];
