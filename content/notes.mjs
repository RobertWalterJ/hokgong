// Words that are easy to mix up, and the note that tells them apart.
//
// A gloss is a translation, not a usage. 多謝 and 唔該 both come out of a
// dictionary as "thank you", and a learner who takes that at face value will
// thank the waiter wrongly for the rest of his life. The dictionaries cannot
// fix this — the distinction is about WHEN you say it, which is not what a
// bilingual dictionary is for.
//
// So these notes are mine, the way the grammar explanations are mine, and they
// are labelled as such in the app. What is NOT mine: the words, their readings
// and their meanings, which still come from the sources and are still checked
// at every build. build/verify.mjs fails if a note names a word the deck does
// not teach, or if its question's answer is not one of the note's own words.
//
// Each note becomes:
//   - a "careful" panel on the word card for every word it names;
//   - a question of its own, which asks the distinction rather than the gloss.

export default [
  {
    id: 'thanks',
    title: 'Two ways to say thank you',
    words: ['多謝', '唔該'],
    plain: '多謝 (do1 ze6) thanks someone for a THING — a present, a red packet, a compliment. 唔該 (m4 goi1) thanks someone for something DONE — holding the lift, passing the soy sauce, bringing your tea.',
    watch: '唔該 does two more jobs: it is "excuse me" to get someone’s attention, and "please" when you ask for something. If you only remember one rule: a gift gets 多謝, a favour gets 唔該.',
    ask: { prompt: 'A waiter refills your tea. What do you say?', answer: '唔該', with: ['多謝'] },
    // Both words are glossed "to thank". When the app asks you to SAY one of
    // them, it has to say which — these cues go into the question itself.
    cues: { '多謝': 'for a gift, or a kindness', '唔該': 'for something someone did' },
  },
  {
    id: 'eat-drink',
    title: '食 covers more than eating',
    words: ['食', '飲'],
    plain: '飲 (jam2) is to drink, and 食 (sik6) is to eat — but 食 also takes in things English would not call eating: 食煙 is to smoke, 食藥 is to take medicine.',
    watch: 'Soup is the odd one out and it goes both ways: Hong Kong says 飲湯, drink soup.',
    ask: { prompt: 'Which verb goes with medicine — 食 or 飲?', answer: '食', with: ['飲'] },
    cues: { '食': 'eating, and also smoking or taking medicine', '飲': 'drinking' },
  },
  {
    id: 'know',
    title: 'Two ways to know',
    words: ['識', '知'],
    plain: '識 (sik1) is knowing HOW, or being acquainted: 我識講廣東話 — I can speak Cantonese; 我識佢 — I know him. 知 (zi1) is knowing a FACT: 我知 — I know (that).',
    watch: 'Asking 你知唔知佢 about a person sounds wrong; it is 你識唔識佢.',
    ask: { prompt: 'You want to say you know how to cook. Which verb?', answer: '識', with: ['知'] },
    cues: { '識': 'knowing how, or knowing a person', '知': 'knowing a fact' },
  },
  {
    id: 'look-see',
    title: 'Looking and seeing',
    words: ['睇', '見'],
    plain: '睇 (tai2) is to look at or watch, something you choose to do: 睇電視, 睇書. 見 (gin3) is to see or to meet: 見到 — caught sight of; 見面 — to meet someone.',
    watch: 'A doctor is 睇醫生 — literally "look at a doctor", which is the patient’s side of the visit.',
    ask: { prompt: 'Watching television: which verb?', answer: '睇', with: ['見'] },
    cues: { '睇': 'looking at something on purpose', '見': 'seeing, or meeting someone' },
  },
  {
    id: 'how-many',
    title: '幾 on its own is not "how many"',
    words: ['幾', '幾多'],
    plain: '幾多 (gei2 do1) asks how many or how much. 幾 (gei2) on its own usually means "quite": 幾好 is quite good, not "how good".',
    watch: 'With a measure word, 幾 does ask a number: 幾點 — what time; 幾歲 — how old.',
    ask: { prompt: 'Asking the price — how much is it?', answer: '幾多', with: ['幾'] },
    cues: { '幾多': 'asking how many or how much', '幾': 'quite, as in quite good' },
  },
];
