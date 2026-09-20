// Sentences this app will not teach.
//
// Robert, 20 Sept 2026, on question 2 of his second-ever round: the app played
// a recording and the right answer was "You might as well go kill yourself."
// 你唔好去死. He asked, reasonably, what he was supposed to do with that.
//
// The sentences come from Tatoeba, which is a general-purpose corpus of
// whatever people have contributed. It is a good corpus and an honest source,
// and it was never assembled to be taught to a beginner. Nothing in the build
// was reading the sentences for what they SAY — only for their length, their
// audio and which characters they use. So a sentence about suicide passed
// every check there was, and would have gone on passing them.
//
// This is the reading. It is deliberately blunt: a sentence that matches is
// dropped, and 6,000 words have no shortage of other sentences. Over-blocking
// costs a little coverage; under-blocking puts something like the above in
// front of someone learning to talk to their wife's family.
//
// Matched against the ENGLISH translation, which is the side the learner is
// asked about, and against the Chinese where a character carries the sense on
// its own. build/verify.mjs fails the build if anything here reaches the deck.

// Death, self-harm and violence. 死 (to die) is the character in the sentence
// that started this; 殺 kill, 自殺 suicide, 屍 corpse.
const HARM = [
  /\b(kill|killing|killed|murder|murdered|suicide|suicidal|die|dies|died|dying|dead|death|corpse|bury|buried|funeral|grave|coffin)\b/i,
  /\b(hang(ed|ing)? (him|her|my|your)self|shoot (him|her|my|your)self|take your own life|end (his|her|my|your) life)\b/i,
  /\b(stab|stabbed|shot|shoot|gun|rifle|bomb|explode|explosion|war|soldier|torture|beat (him|her|me|you) up|assault)\b/i,
  /\b(blood|bleeding|wound|injur(y|ed)|hospitalis|hospitaliz)\b/i,
];
// Illness and distress. A beginner's sentence about cancer is not wrong, it is
// just not what this app is for.
const DISTRESS = [
  /\b(cancer|tumour|tumor|stroke|heart attack|dement|alzheimer|terminal(ly)? ill|coma)\b/i,
  /\b(depress(ed|ion)|anxiet|panic attack|self.?harm|abuse[ds]?|abusive|rape|raped|molest)\b/i,
  /\b(divorce[ds]?|widow(ed|er)?|orphan|funeral|mourn)\b/i,
];
// Sex, and language Robert would not want read aloud on a bus.
const COARSE = [
  /\b(sex|sexual|porn|prostitut|brothel|virgin|penis|vagina|breast|naked|nude)\b/i,
  /\b(fuck|shit|bitch|bastard|damn|hell|arse|ass(hole)?|piss|cunt|whore|slut)\b/i,
];
// Politics, religion and anything that would make a language lesson an
// argument. Not because the topics are wrong, but because a four-option
// listening question is no place for them.
const CONTENTIOUS = [
  /\b(communis|capitalis|fascis|nazi|hitler|stalin|dictator|regime|protest|riot|revolution)\b/i,
  /\b(god|jesus|christ|allah|buddha|muslim|christian|jewish|jew|church|mosque|temple|pray(er|ing)?|sin(ful|ner)?|hell|heaven)\b/i,
  /\b(racist|racism|slave|slavery|immigrant|refugee|deport)\b/i,
];
// Characters that carry these senses on their own, so a bad translation cannot
// smuggle one past the English patterns.
const CHARS = /[死殺杀屍尸殯喪葬毒姦淫妓娼賭鴉煙槍炮砲刀劍癌瘤瘋癲獄囚罪犯]/;

export const UNSUITABLE = [...HARM, ...DISTRESS, ...COARSE, ...CONTENTIOUS];

// A sentence the app cannot fully romanise cannot be taught to someone who
// reads only the romanisation. "SFX 啫係咩呀?" came out as "ze1 hai6 me1 aa4" —
// the reading line silently dropped the part the question was ABOUT, and the
// answer was "What does SFX stand for?", which teaches no Cantonese at all
// (Robert, 20 Sept). Real Hong Kong speech does code-switch — 阿 Paul, out 咗 —
// and those sentences are perfectly good Cantonese; they just cannot carry an
// honest reading line, so they wait.
const LATIN = /[A-Za-z0-9]/;

// `eng` is the English translation, `text` the Chinese. Either can disqualify.
export function unsuitable(eng, text = '') {
  if (text && LATIN.test(text)) return 'Latin letters the reading line cannot show';
  if (text && CHARS.test(text)) return 'a character about death, crime or vice';
  for (const re of HARM) if (re.test(eng)) return 'harm or violence';
  for (const re of DISTRESS) if (re.test(eng)) return 'illness or distress';
  for (const re of COARSE) if (re.test(eng)) return 'sex or coarse language';
  for (const re of CONTENTIOUS) if (re.test(eng)) return 'politics or religion';
  return null;
}

export default unsuitable;
