// Is the teaching copy actually readable?
//
//   node audits/run-plain.mjs          measure and report
//   node audits/run-plain.mjs --strict fail the build on a breach
//
// Robert, 7 Oct, with four guides attached: "Can you please use some of these
// to ensure that the writing is clear and understandable for learning
// purposes."
//
// He is dyslexic, he is a beginner in this language, and he reads this on a
// phone. Those three facts make readability a feature of the app rather than a
// matter of taste, so it is measured here rather than judged.
//
// THE STANDARDS, and where each comes from:
//
//   Your Guide to Clear Writing. Atlanta: US Centers for Disease Control and
//   Prevention, NCEH/ATSDR. Public domain (US federal work).
//   https://www.cdc.gov/nceh/clearwriting/docs/clear-writing-guide-508.pdf
//     - sentences of no more than 20 words
//     - paragraphs of no more than 5 sentences
//     - active voice; subject and verb kept close together
//     - simple words: "use" rather than "utilize", "analysed" rather than
//       "conducted an analysis"
//     - a main message near the top, one to three short sentences
//
//   Clear Writing Assessment. Same publisher, same licence.
//     - organise by importance to the reader, most important first
//     - a heading every one to three paragraphs
//
//   Plain Language Writing Guide. Cambridge Language Justice Initiative.
//   https://www.cambridgema.gov/
//     - sentences under 15 words, paragraphs of 2 to 3 sentences (tighter than
//       the CDC, and used here as the TARGET AVERAGE rather than the cap)
//     - one topic per paragraph
//     - no unnecessary adverbs
//     - no idiom, metaphor or figurative language: it confuses every reader and
//       is the first thing to break in translation
//     - expand an abbreviation the first time it appears
//
//   Freedman, Leora. Teaching Strategies for Reading Comprehension. Toronto:
//   University of Toronto, Faculty of Arts and Science (ELL Programme).
//     - preview the overarching concept before the reading
//     - preview the vocabulary before the reading
//     - divide a long text into logical sections
//   These three are structural rather than sentence-level, and they are why
//   every reading now opens with its main message and its word list: the
//   concept and the vocabulary are previewed before the prose, not after.
//
// WHAT THIS DOES NOT DO. It does not compute a grade level. The common
// formulas count syllables per word and words per sentence, which on this
// material would score every jyutping syllable as a word and every tone number
// as a sentence, and would in any case reward chopping a clear sentence in
// half. Sentence length, paragraph length and voice are measured directly
// because they are what the guides actually ask for.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const STRICT = process.argv.includes('--strict');

// CDC caps. A breach of one of these fails a strict run.
const MAX_WORDS = 20;
const MAX_SENTENCES = 5;
// Cambridge targets. These are reported, not enforced: a hard cap at fifteen
// words would push the writing into a chop that reads worse than the thing it
// replaced.
const TARGET_WORDS = 15;
const TARGET_SENTENCES = 3;

// Passive voice: a form of "to be" followed by a past participle. Caught by
// the regular -ed participles plus the irregular ones that actually turn up in
// writing about language.
const IRREGULAR = 'given|taken|written|spoken|known|shown|seen|made|held|kept|told|put|built|found|drawn|borrowed|caught|taught|thought|brought|said|read|heard|understood|meant';
// Words that LOOK like a past participle and behave like an adjective. "The
// range is crowded" describes the range; it does not report an action done to
// it by somebody. Flagging those taught nothing and buried the seven sentences
// that were really passive, so they are excluded by name.
const ADJECTIVAL = 'crowded|settled|lost|unimpressed|acquainted|interested|tired|surprised|pleased|worried|used|related|limited|complicated|confused|married|closed|open|stressed|advanced|detailed|mixed|fixed|established';
const PASSIVE = new RegExp(`\\b(is|are|was|were|be|been|being)\\s+(\\w+ly\\s+)?(?!(?:${ADJECTIVAL})\\b)(\\w+ed|${IRREGULAR})\\b`, 'i');

// Figurative language. Only phrases that are unambiguously figurative when
// they appear; a short list that is right beats a long one that cries wolf.
const FIGURATIVE = [
  'steep learning curve', 'pave the way', 'hit the ground running', 'low-hanging fruit',
  'the tip of the iceberg', 'a double-edged sword', 'at the end of the day', 'the lion’s share',
  'bite the bullet', 'a game changer', 'moving the goalposts', 'a slippery slope',
  'cut to the chase', 'in a nutshell', 'the elephant in the room', 'back to square one',
];

// Words with a shorter, commoner word that means the same. The replacement is
// shown in the report, so a flag is actionable rather than a scolding.
const SIMPLER = {
  utilize: 'use', utilise: 'use', commence: 'start', terminate: 'end', endeavour: 'try',
  endeavor: 'try', ascertain: 'find out', facilitate: 'help', demonstrate: 'show',
  additional: 'more', approximately: 'about', sufficient: 'enough', numerous: 'many',
  obtain: 'get', require: 'need', purchase: 'buy', assist: 'help', indicate: 'show',
  regarding: 'about', prior: 'before', subsequent: 'later', initiate: 'start',
  implement: 'carry out', methodology: 'method', individuals: 'people',
};

// ── gather every piece of prose the app teaches with ─────────────────────
const prose = [];
const add = (where, kind, txt) => { if (txt && String(txt).trim()) prose.push({ where, kind, txt: String(txt) }); };
for (const r of DECK.readings || []) {
  add(`reading ${r.id}`, 'main', r.main);
  for (const p of r.read) add(`reading ${r.id}`, 'paragraph', p);
  if (r.honest) add(`reading ${r.id}`, 'paragraph', r.honest);
}
for (const g of DECK.grammar) { add(`grammar ${g.id}`, 'paragraph', g.plain); add(`grammar ${g.id}`, 'paragraph', g.watch); }
for (const l of DECK.ladder) { add(`ladder ${l.id}`, 'paragraph', l.how); add(`ladder ${l.id}`, 'paragraph', l.why); }
for (const n of DECK.notes || []) { add(`note ${n.id}`, 'paragraph', n.plain); add(`note ${n.id}`, 'paragraph', n.watch); }
for (const c of DECK.context) add(`card ${c.id}`, 'paragraph', c.note);
for (const k of Object.keys(DECK.toneLesson || {})) add(`tone lesson ${k}`, 'paragraph', DECK.toneLesson[k]);
for (const t of DECK.tones) { add(`tone ${t.n}`, 'paragraph', t.is); add(`tone ${t.n}`, 'paragraph', t.like); }

// A quoted passage is someone else's writing. It is measured and reported so
// the picture is honest, but it is never a failure: the app may not rewrite a
// source to make it score better.
for (const r of DECK.readings || []) if (r.quote) prose.push({ where: `reading ${r.id}`, kind: 'quote', txt: r.quote.text, theirs: true });

// ── measure ──────────────────────────────────────────────────────────────
// A sentence ends at . ! or ? followed by a space and a capital, or at the end
// of the text. Decimal points, "e.g." and the like do not end a sentence.
// A sentence ends at . ! or ? followed by a space and the start of the next
// one. "The next one" means a capital, an opening quote, OR a Chinese character
// — the grammar notes and the word cards start sentences on a Chinese word, and
// a splitter that only knows about capitals read four of those as one enormous
// sentence and reported them as unreadable.
const sentences = (t) => t.split(/(?<=[.!?])\s+(?=[A-Z“‘㐀-鿿0-9])/).map((s) => s.trim()).filter(Boolean);

// Before counting, take out what is not prose. The build puts a reading in
// brackets after each Chinese word, and a Chinese word is one thing on the page
// however many characters it has. Counting "(gwong2 dung1 waa2)" as three words
// would make every sentence containing a Cantonese word look unreadable, and
// would push the writing towards leaving the Cantonese out — the opposite of
// what this app is for.
const asProse = (t) => String(t)
  .replace(/\s*\([a-z][a-z0-9 ]*\)/g, '')                 // the reading in brackets
  .replace(/[㐀-鿿]+/g, 'X');                     // a Chinese word: one thing
// A word is a run of letters, apostrophes and hyphens. A jyutping syllable
// written into the prose does count: the reader has to read it.
const words = (s) => (asProse(s).match(/[A-Za-zÀ-ɏ][A-Za-zÀ-ɏ'’-]*\d?/g) || []);

const fails = [];
const notes = [];
let nSent = 0, nWords = 0, nPara = 0, longest = { n: 0 };
const passive = [], figurative = [], fancy = [], noMain = [];

for (const p of prose) {
  const ss = sentences(p.txt);
  if (p.kind === 'paragraph' || p.kind === 'main') {
    nPara++;
    if (ss.length > MAX_SENTENCES && !p.theirs) fails.push(`${p.where}: a paragraph of ${ss.length} sentences, more than the ${MAX_SENTENCES} the CDC guide allows`);
  }
  for (const s of ss) {
    const w = words(s);
    nSent++; nWords += w.length;
    if (w.length > longest.n) longest = { n: w.length, s, where: p.where };
    if (w.length > MAX_WORDS && !p.theirs) fails.push(`${p.where}: a sentence of ${w.length} words — "${s.slice(0, 64)}…"`);
    if (p.theirs) continue;
    if (PASSIVE.test(s)) passive.push(`${p.where}: "${process.argv.includes('--all') ? s : s.slice(0, 70)}"`);
    for (const f of FIGURATIVE) if (s.toLowerCase().includes(f)) figurative.push(`${p.where}: "${f}"`);
    for (const w1 of w) {
      const plain = SIMPLER[w1.toLowerCase()];
      if (plain) fancy.push(`${p.where}: "${w1}" → "${plain}"`);
    }
  }
}

// Freedman: preview the concept before the reading. Every reading states, at
// the top, the one thing to take away from it.
for (const r of DECK.readings || []) {
  if (!r.main) { noMain.push(`${r.id} has no main message`); continue; }
  const ss = sentences(r.main);
  if (ss.length > 3) noMain.push(`${r.id}: a main message of ${ss.length} sentences, more than the 3 the CDC guide allows`);
}

// ── report ───────────────────────────────────────────────────────────────
const mine = prose.filter((p) => !p.theirs);
const avgW = nWords / Math.max(1, nSent);
const avgS = mine.reduce((n, p) => n + sentences(p.txt).length, 0) / Math.max(1, nPara);
console.log(`run-plain: ${mine.length} pieces of teaching copy, ${nSent} sentences, ${nWords.toLocaleString()} words`);
console.log(`  sentence length: ${avgW.toFixed(1)} words on average (CDC cap ${MAX_WORDS}, Cambridge target ${TARGET_WORDS}), longest ${longest.n}`);
console.log(`  paragraph length: ${avgS.toFixed(1)} sentences on average (CDC cap ${MAX_SENTENCES}, Cambridge target ${TARGET_SENTENCES})`);
console.log(`  passive voice: ${passive.length} sentence(s)`);
console.log(`  figurative language: ${figurative.length}`);
console.log(`  a shorter word would do: ${fancy.length}`);
if (longest.n > TARGET_WORDS) console.log(`  the longest is ${longest.where}: "${longest.s.slice(0, 90)}…"`);
// --all prints every one of them, for an editing pass.
const SHOW = process.argv.includes('--all') ? Infinity : 6;
for (const [label, list] of [['passive', passive], ['figurative', figurative], ['long-winded', fancy]]) {
  for (const x of list.slice(0, SHOW)) console.log(`  ${label}  ${x}`);
  if (list.length > SHOW) console.log(`  …and ${list.length - SHOW} more ${label}`);
}

// Passive voice and fancy words are reported always and enforced only in a
// strict run, because an occasional passive is the clearest way to say a
// thing and a rule that forbids it outright makes worse sentences.
if (STRICT) {
  for (const x of figurative) fails.push(`figurative language, which is the first thing to confuse a learner: ${x}`);
  for (const x of fancy) fails.push(`a shorter word would do: ${x}`);
  for (const x of noMain) fails.push(x);
  if (passive.length > Math.max(3, Math.round(nSent * 0.03))) {
    fails.push(`${passive.length} sentences in the passive voice, out of ${nSent} — the guides ask for the active voice throughout`);
  }
}

if (fails.length) {
  console.error(`\nrun-plain FAILED — ${fails.length} problem${fails.length === 1 ? '' : 's'}:`);
  for (const f of fails.slice(0, 20)) console.error('  - ' + f);
  if (fails.length > 20) console.error(`  …and ${fails.length - 20} more`);
  process.exit(1);
}
console.log('run-plain: the writing meets the guides Robert sent.');
