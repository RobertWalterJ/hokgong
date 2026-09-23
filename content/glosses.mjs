// The meaning every course word is taught with.
//
// Everything past the course takes the dictionary's first-ranked sense, and
// that ranking is good: it prefers the meaning several dictionaries agree on,
// which is what turned 水 from "money" into "water", 四 from "labourer" into
// "four" and 杯 from "to boycott" into "cup".
//
// It cannot be trusted for the words the course teaches, and the reason is
// worth writing down. Agreement across dictionaries elects the COMMON sense of
// a shape of characters. For a concrete noun that is right. For a grammatical
// word it is precisely wrong, because what makes such a word Cantonese is that
// its sense is the minority one — so 係, the copula the whole of stage one is
// built on, came out as "to bind", which is the literary Mandarin 係 xì. I
// tried counting agreement only within the fitting reading instead: that fixed
// 係's neighbours 咩, 諗 and 攰, and put 四 back to "labourer". There is no
// setting that gets both.
//
// So these 166 do not depend on the setting. Each is chosen by hand.
//
// THE CHOICE IS A RE-ORDERING, NEVER AN INVENTION. Every value below must
// already be one of the senses the sources give that word, and build/verify.mjs
// fails the build if one is not — and fails it too if any course word is
// missing from this file. The dictionaries still decide what a word can mean;
// this decides which of those a beginner is taught.
//
// Robert, 23 Sept 2026: "there are some quirks and inaccuracies."

export default {
  // ── hello, yes and no ───────────────────────────────────────────────────
  你好: 'hello',
  早晨: 'good morning',
  唔該: 'please',          // and the note teaches the rest of its work
  多謝: 'thank you',       // "to thank" is the citation form, not what you say
  對唔住: 'sorry',
  唔好意思: 'sorry',       // "embarrassed" is the etymology, not the errand
  拜拜: 'bye-bye',
  好: 'good',
  係: 'to be',             // NOT "to bind" — that is the literary Mandarin 係
  唔係: 'to not be',
  唔: 'not',
  有: 'to have',
  冇: 'to not have',
  得: 'can',                 // usage: the readers use it as "can", not "Ok"

  // ── me and you ──────────────────────────────────────────────────────────
  我: 'I',
  你: 'you',
  佢: 'he',
  我哋: 'we',
  你哋: 'you (plural)',
  佢哋: 'they',
  大家: 'everyone',
  人: 'person',
  朋友: 'friend',
  邊個: 'who',
  識: 'to know',           // "recognize" is first and narrower
  叫: 'to call',
  名: 'name',

  // ── family ──────────────────────────────────────────────────────────────
  媽媽: 'mother',
  爸爸: 'father',
  阿媽: 'mum',
  老豆: 'dad',
  老公: 'husband',
  老婆: 'wife',
  仔: 'son',
  女: 'daughter',
  哥哥: 'elder brother',
  家姐: 'my older sister',
  細佬: 'younger brother',
  妹: 'younger sister',
  屋企人: 'family',
  小朋友: 'child',
  阿婆: 'grandmother',
  阿嫲: 'grandmother',
  阿哥: 'elder brother',

  // ── counting ────────────────────────────────────────────────────────────
  一: 'one',
  二: 'two',
  三: 'three',
  四: 'four',
  五: 'five',
  六: 'six',
  七: 'seven',
  八: 'eight',
  九: 'nine',
  十: 'ten',
  幾多: 'how much',
  幾: 'a few',               // 幾多 is "how much"; 幾 alone is "a few", "quite"
  個: 'individual',
  啲: 'some',
  隻: 'one of pair',
  張: 'sheet of paper',
  條: 'strip',
  本: 'origin',
  杯: 'cup',
  歲: 'classifier for years (of age)',

  // ── asking things ───────────────────────────────────────────────────────
  乜嘢: 'what',
  咩: 'what?',             // NOT "the bleating of sheep"
  邊度: 'where',
  幾時: 'when',
  點: 'point',
  點解: 'why',
  點樣: 'how?',
  有冇: 'is there?',
  係唔係: 'is it?',
  可以: 'to be able to',

  // ── eating ──────────────────────────────────────────────────────────────
  食: 'to eat',
  飲: 'to drink',
  食飯: 'to have a meal',
  飲茶: 'to go yum cha',
  飯: 'cooked rice',
  茶: 'tea',
  水: 'water',
  奶茶: 'milk tea',
  咖啡: 'coffee',
  麵: 'noodles',           // "flour" is first, and true, and not what you order
  肉: 'meat',
  魚: 'fish',
  菜: 'vegetable',
  好味: 'delicious',
  好食: 'delicious',
  飽: 'full',
  餐: 'meal',
  早餐: 'breakfast',
  食嘢: 'to eat',
  單: 'bill',              // "single" is the Mandarin sense

  // ── time ────────────────────────────────────────────────────────────────
  今日: 'today',
  聽日: 'tomorrow',
  尋日: 'yesterday',
  而家: 'now',
  日: 'day',               // "sun" is first; the course means the day
  月: 'month',
  年: 'year',
  今年: 'this year',
  時間: 'free time',
  分鐘: 'minute',
  鐘頭: 'hour',
  早: 'early',             // 早晨 is the greeting; 早 on its own is early
  晚: 'evening',
  夜: 'night',
  遲: 'late',
  快: 'fast',
  先: 'first',
  之後: 'after',
  得閒: 'to be free',
  成日: 'all day long',

  // ── going places ────────────────────────────────────────────────────────
  去: 'to go',
  嚟: 'to come',
  返: 'to return (to)',
  行: 'to walk',
  搭: 'to take (boat, train)',   // "to connect" is the Mandarin sense
  車: 'vehicle',
  火車: 'train',
  路: 'road',
  街: 'street',
  遠: 'far',
  近: 'near',
  入: 'to enter',
  出: 'to go out',         // "to pay (salary)" is the Hong Kong office sense
  上: 'to go up',
  落: 'to fall or drop',
  返工: 'to go to work',
  返學: 'to go to school',
  旅行: 'to travel',
  酒店: 'hotel',
  屋企: 'home',

  // ── how you feel ────────────────────────────────────────────────────────
  鍾意: 'to like',
  開心: 'happy',
  想: 'to want',           // 諗 is to think; these two were inverted
  要: 'to want',
  希望: 'to hope',
  覺得: 'to feel',
  諗: 'to think',
  舒服: 'comfortable',
  攰: 'tired',
  怕: 'to fear',
  有趣: 'interesting',
  容易: 'easy',
  難: 'difficult',
  玩: 'to play',
  唔錯: 'not bad',

  // ── the day ─────────────────────────────────────────────────────────────
  房: 'room',
  門: 'door',
  瞓: 'to sleep',
  瞓覺: 'to sleep',
  洗: 'to wash',
  做嘢: 'to work',
  工作: 'work (employment)',
  買: 'to buy',
  買嘢: 'shopping',
  錢: 'money',
  舖頭: 'a shop',
  天氣: 'weather',
  熱: 'hot (of weather)',  // "popular" is the figurative sense
  凍: 'cold',              // "Iced" is a menu word, capitalised by the source
  落雨: 'to rain',
  起身: 'to get up',
  乾淨: 'clean',
};

// Words the course asks for and no open source can properly gloss. 湯 is soup.
// Not one of the dictionaries in this build gives that sense for the reading
// people say — CC-Canto has only "Chinese surname" — so the app would have to
// invent it, and it will not. They wait for words.hk.
export const UNGLOSSABLE = ['湯'];
