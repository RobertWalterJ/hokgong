// Hok Gong — the deck, and the small questions asked of it everywhere.
//
// The deck is a word list plus items that point into it (build/items.mjs). It
// arrives either inlined by the single-file build or fetched beside the app.

let deck = null;
export const D = () => deck;

export async function loadDeck() {
  if (window.HOKGONG_DECK) { deck = window.HOKGONG_DECK; return deck; }
  const r = await fetch('data/deck.json');
  if (!r.ok) throw new Error('The word list did not load.');
  deck = await r.json();
  return deck;
}

export const wordAt = (i) => deck.words[i];
export const wordOf = (it) => (it.i != null ? deck.words[it.i] : null);
// A word can have up to three example sentences now. Which one you see turns
// over with each review, so a word met five times has been met in three
// different sentences rather than the same one five times.
export const examplesOf = (i) => { const e = deck.examples[i]; return Array.isArray(e) ? e : e ? [e] : []; };
export const exampleOf = (it, nth = 0) => { const list = examplesOf(it.i); return list.length ? list[nth % list.length] : null; };
export const itemById = (id) => deck.byId.get(id);

// The five things being learnt, so progress can be reported per skill rather
// than as one number that hides which one is lagging.
export const SKILL = {
  'word-listen': 'listening',
  'sentence-listen': 'listening',
  'word-say': 'speaking',
  'tone-say': 'tones',
  'tone-pair': 'tones',
  'word-read': 'reading',
  'grammar-mean': 'grammar',
  'grammar-pick': 'grammar',
  'grammar-build': 'grammar',
  'note-pick': 'grammar',
};
export const SKILL_NAMES = {
  listening: 'Understanding what you hear',
  speaking: 'Saying it yourself',
  tones: 'Tones',
  reading: 'Reading the characters',
  grammar: 'How sentences fit together',
};

// Items whose answer is judged by the learner, not by the app: there is no way
// for a phone to mark "did you say this word" — so it asks, and says so.
export const SELF_RATED = new Set(['word-say']);

export function indexDeck() {
  deck.byId = new Map(deck.items.map((it) => [it.id, it]));
  deck.wordIndex = new Map(deck.words.map((w, i) => [w.w, i]));
  deck.grammarById = new Map(deck.grammar.map((g) => [g.id, g]));
  deck.noteById = new Map((deck.notes || []).map((n) => [n.id, n]));
  // Every word a note names can show that note on its card.
  deck.notesForWord = new Map();
  for (const n of deck.notes || []) for (const i of n.words) {
    if (!deck.notesForWord.has(i)) deck.notesForWord.set(i, []);
    deck.notesForWord.get(i).push(n);
  }
  // The word an item is about, used to keep two questions on one word out of
  // the same round.
  deck.groupOf = (id) => {
    const it = deck.byId.get(id);
    if (!it) return null;
    if (it.i != null) return 'w' + it.i;
    if (it.gid) return 'g' + it.gid;
    if (it.syll) return 't' + it.syll;
    return 's' + it.id;
  };
  return deck;
}

export const allIds = () => deck.items.map((it) => it.id);

// Questions that need a Cantonese voice to be answerable at all. Without one,
// "which of these did you hear?" plays nothing and cannot be answered, and
// "what does this mean?" for a spoken word collapses into the reading question
// that already exists. Both are set aside rather than asked — and the home
// screen says so, with how to add a voice.
// ── the course, and where the learner has got to ─────────────────────────
// A stage is passed when enough of its own words can be answered and each of
// its grammar points has been met. Only NEW material is gated: reviews of
// anything already met keep coming whatever stage you are on.
export function stageState({ canAnswerWord, grammarMet }) {
  const stages = deck.stages.map((st) => {
    const have = st.words.filter(canAnswerWord).length;
    const need = Math.max(1, Math.ceil(st.words.length * st.gate));
    const grammar = st.grammar.filter(grammarMet).length;
    return { ...st, have, need, grammar, grammarNeeded: st.grammar.length, passed: have >= need && grammar >= st.grammar.length };
  });
  // The first stage not yet passed. Once they are all passed the course is
  // over and the rest of the word list opens, in the order people speak.
  const i = stages.findIndex((s) => !s.passed);
  const current = i < 0 ? stages.length : i;
  return { stages, current, done: current >= stages.length };
}

const NEEDS_VOICE = new Set(['tone-pair', 'word-listen']);
// And these need a recording: a sentence nobody can hear is not a listening
// question, it is a blank.
const NEEDS_RECORDING = new Set(['sentence-listen']);
const askable = (it, hasVoice, hasRecordings) =>
  (hasVoice || !NEEDS_VOICE.has(it.k)) && (hasRecordings || !NEEDS_RECORDING.has(it.k));
// A question is in reach if its stage is open, or if it has been met already —
// a card you have seen never disappears because of where you are in the
// course. Items belonging to no stage are the tail after the course.
const inReach = (it, current, met, wordMet) => {
  if (met(it.id)) return true;                       // already seen: never taken away
  if (it.stage != null) return it.stage <= current;
  // Some questions depend on particular words rather than on a stage — a tone
  // pair needs both of its words. Those open as soon as those words have been
  // met. Everything else waits for the end of the course.
  if (it.needs) return it.needs.every((i) => wordMet(i));
  return current >= deck.stages.length;
};
export const askableIds = (hasVoice, hasRecordings = true, current = Infinity, met = () => false, wordMet = () => false) =>
  deck.items.filter((it) => askable(it, hasVoice, hasRecordings) && inReach(it, current, met, wordMet)).map((it) => it.id);
export const setAsideCount = (hasVoice, hasRecordings = true) =>
  deck.items.filter((it) => !askable(it, hasVoice, hasRecordings)).length;
