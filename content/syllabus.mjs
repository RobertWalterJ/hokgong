// The course: ten stages, each with a gate.
//
// Frequency alone is not a syllabus. A corpus will happily teach you 即係
// before it teaches you 你好, because that is what adults say to each other on
// 1997 radio — and a learner who knows the hundred commonest words in
// isolation still cannot say anything, because the words that build a
// SENTENCE are spread across the list.
//
// So the app teaches in stages. Each stage is a small vocabulary plus the
// grammar that makes those words into sentences, and each ends with something
// you can actually do. A stage stays shut until the one before it is passed:
// not to gamify it, but because 個 is no use before you can count, and 咗 is
// no use before you have verbs to put it after.
//
// THE GATE. A stage is passed when you can answer `gate` of its words — "can
// answer" meaning the last time the app asked, you got it right — and have met
// each of its grammar points. Reviews of everything you have already met keep
// coming regardless; the gate only governs what NEW material is opened.
//
// After the last stage the app opens the rest of the list, in the order people
// actually speak, which is where the other 5,800 words live.
//
// Every word here still has to carry a reading and a meaning from a published
// source. build/verify.mjs checks each one and fails the build if it cannot,
// so this file chooses the ORDER and the SHAPE of the course, never the facts.

export default [
  {
    id: 'hello',
    title: 'Hello, yes, and no',
    can: 'Greet someone, thank them, apologise, and answer a yes-or-no question.',
    why: 'Cantonese has no word for "yes". You answer by repeating the verb — 係 or 唔係, 有 or 冇 — so the first thing to learn is not a word but a habit.',
    words: ['你好', '早晨', '唔該', '多謝', '對唔住', '拜拜', '好', '係', '唔係', '唔', '有', '冇', '得', '唔好意思'],
    grammar: ['hai6', 'm4'],
    gate: 0.8,
  },
  {
    id: 'me-you',
    title: 'Me, you, and who',
    can: 'Say who you are talking about, and ask who someone is.',
    why: 'The plural is one rule: 哋 on the end of a pronoun. Three words for the price of one.',
    words: ['我', '你', '佢', '我哋', '你哋', '佢哋', '大家', '人', '朋友', '邊個', '識', '叫', '名'],
    grammar: [],
    gate: 0.8,
  },
  {
    id: 'family',
    title: 'The people at your table',
    can: 'Name your family, and say whose something is.',
    why: 'Cantonese kinship is precise — your mother’s mother and your father’s mother have different names — and 嘅 is the possessive that ties a person to a thing.',
    words: ['媽媽', '爸爸', '阿媽', '老豆', '老公', '老婆', '仔', '女', '哥哥', '家姐', '細佬', '妹', '屋企人', '小朋友', '阿婆', '阿嫲', '阿哥'],
    grammar: ['ge3'],
    gate: 0.75,
  },
  {
    id: 'counting',
    title: 'Counting things',
    can: 'Count to ten, ask how many, and put a number in front of a noun properly.',
    why: 'A number cannot touch a noun in Cantonese: 一個人, never 一人. The measure word in between is not optional, and 個 will carry you when you do not know the right one.',
    words: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '幾多', '幾', '個', '啲', '隻', '張', '條', '本', '杯', '歲'],
    grammar: ['go3-di1'],
    gate: 0.75,
  },
  {
    id: 'asking',
    title: 'Asking things',
    can: 'Ask what, where, when, why, how, and how much — and ask a yes-or-no question two ways.',
    why: 'Cantonese leaves the question word where the answer would go: 你去邊度 is literally "you go where". Nothing moves, which makes questions easier than in English.',
    words: ['乜嘢', '咩', '邊度', '幾時', '點', '點解', '點樣', '有冇', '係唔係', '可以'],
    grammar: ['jau5-mou5', 'a-not-a'],
    gate: 0.75,
  },
  {
    id: 'eating',
    title: 'At the table',
    can: 'Order food and drink, say what you like eating, and say you have already eaten.',
    why: 'Food is the safest conversation in any language, and 咗 — the marker for something finished — is easiest to learn on a verb you use three times a day.',
    words: ['食', '飲', '食飯', '飲茶', '飯', '茶', '水', '奶茶', '咖啡', '麵', '肉', '魚', '菜', '湯', '好味', '好食', '飽', '餐', '早餐', '食嘢', '單'],
    grammar: ['zo2'],
    gate: 0.75,
  },
  {
    id: 'time',
    title: 'When',
    can: 'Say today, tomorrow and yesterday, tell the time roughly, and say what you are doing right now.',
    why: 'Cantonese has no tense. 緊 says an action is going on and 咗 says it finished, and the rest is carried by the word for when — which is why those words come now.',
    words: ['今日', '聽日', '尋日', '而家', '日', '月', '年', '今年', '時間', '分鐘', '鐘頭', '早', '晚', '夜', '遲', '快', '先', '之後', '得閒', '成日'],
    grammar: ['gan2'],
    gate: 0.75,
  },
  {
    id: 'going',
    title: 'Getting about',
    can: 'Say where you are going, how you are getting there, and that you are going back.',
    why: '返 is the word English keeps needing three for: go back, come back, go again. It is the first of the short words that hang off the end of a verb and change it.',
    words: ['去', '嚟', '返', '行', '搭', '車', '火車', '路', '街', '遠', '近', '入', '出', '上', '落', '返工', '返學', '旅行', '酒店', '屋企'],
    grammar: ['faan1'],
    gate: 0.75,
  },
  {
    id: 'feelings',
    title: 'How it feels',
    can: 'Say what you like, what you want, and how you are — and sound like you mean it.',
    why: 'The particle on the end of a Cantonese sentence is where the attitude lives. Leaving it off is what makes correct Cantonese sound blunt or foreign, so it comes once there are sentences to put it on.',
    words: ['鍾意', '開心', '想', '要', '希望', '覺得', '諗', '舒服', '攰', '怕', '有趣', '容易', '難', '玩', '唔錯'],
    grammar: ['particles'],
    gate: 0.75,
  },
  {
    id: 'day',
    title: 'A day at home',
    can: 'Talk about the ordinary business of a day: sleeping, washing, working, buying things, the weather.',
    why: 'The last stage before the list opens up. These are the words that fill the hours a conversation is usually about.',
    words: ['房', '門', '瞓', '瞓覺', '洗', '做嘢', '工作', '買', '買嘢', '錢', '舖頭', '天氣', '熱', '凍', '落雨', '起身', '乾淨'],
    grammar: [],
    gate: 0.7,
  },
];
