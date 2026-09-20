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
export const exampleOf = (it) => (it.i != null ? deck.examples[it.i] || null : null);
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
