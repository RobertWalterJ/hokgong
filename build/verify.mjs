// Check the deck against its sources before it can be built.
//
//   node build/verify.mjs
//
// The contract this enforces is the whole point of the app: every word carries
// the reading and meaning a published source gives it, every sentence is
// quoted exactly as Tatoeba has it, every history card is quoted exactly as
// Belshaw wrote it, and every question is answerable.
//
// A failure here stops the build. Each check has been negative-tested — broken
// on purpose once, to confirm it actually fires — because a check that cannot
// fail is worse than no check: it reassures.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const LEX = read('corpus/lexicon.json');
const SENT = read('corpus/sentences.json');
const DECK = read('app/data/deck.json');
const GRAMMAR = (await import(pathToFileURL(join(ROOT, 'content', 'grammar.mjs')).href)).default;
const { PHRASES } = await import(pathToFileURL(join(ROOT, 'app', 'js', 'lang.js')).href);

const problems = [];
const fail = (what, detail) => problems.push(`${what}: ${detail}`);
let checks = 0;
const check = (ok, what, detail) => { checks++; if (!ok) fail(what, detail); };

const lexByWord = new Map(LEX.map((e) => [e.w, e]));
const sentById = new Map(SENT.map((s) => [s.id, s]));

// ── 1. every word says what a source says it says ────────────────────────
for (const w of DECK.words) {
  const e = lexByWord.get(w.w);
  if (!e) { fail('word not in the corpus', w.w); continue; }
  check(e.jyut === w.j, 'reading changed between corpus and deck', `${w.w}: ${e.jyut} vs ${w.j}`);
  check(e.gloss.includes(w.g), 'meaning not one the source gives', `${w.w}: "${w.g}"`);
  check(e.glossMatchesSaid, 'meaning belongs to another reading', `${w.w} (${w.j})`);
  check(!!w.s, 'no source named for the meaning', w.w);
  check(w.g.length > 0 && w.g.length <= 64, 'meaning too long to be an answer', `${w.w}: ${w.g.length} characters`);
  // The dictionary's own layout should not leak through: no stray sense
  // numbers, no pinyin in brackets, no unclosed parenthesis.
  check(!/\d[.)]\s/.test(w.g), 'sense numbering left in a meaning', `${w.w}: "${w.g}"`);
  check(!/\[[^\]]*\]/.test(w.g), 'pinyin bracket left in a meaning', `${w.w}: "${w.g}"`);
  check((w.g.match(/\(/g) || []).length === (w.g.match(/\)/g) || []).length, 'unbalanced brackets in a meaning', `${w.w}: "${w.g}"`);
}

// ── 2. every sentence is Tatoeba's, word for word ────────────────────────
const sentenceItems = DECK.items.filter((it) => it.text && it.sid);
for (const it of sentenceItems) {
  const s = sentById.get(it.sid);
  if (!s) { fail('sentence not in the corpus', it.id); continue; }
  check(s.text === it.text, 'sentence text does not match the source', `#${it.sid}`);
  check(!it.eng || s.eng === it.eng, 'translation does not match the source', `#${it.sid}`);
}
for (const [i, ex] of Object.entries(DECK.examples)) {
  const s = sentById.get(ex.id);
  if (!s) { fail('example sentence not in the corpus', `word ${i}`); continue; }
  check(s.text === ex.t, 'example text does not match the source', `#${ex.id}`);
  check(s.eng === ex.e, 'example translation does not match the source', `#${ex.id}`);
  check(s.text.includes(DECK.words[i].w), 'example does not contain its word', `${DECK.words[i].w} / #${ex.id}`);
}

// ── 3. every question can be answered ────────────────────────────────────
for (const it of DECK.items) {
  if (it.i != null) check(DECK.words[it.i], 'item points at a word that is not there', it.id);
  if (!it.options) continue;
  // A note question is a choice between the two or three words the note is
  // about, so it has fewer wrong answers by design — and its answer is the
  // word itself rather than an English meaning.
  const pair = it.k === 'note-pick';
  const answer = it.k === 'sentence-listen' || it.k === 'grammar-mean' ? it.eng
    : it.k === 'grammar-pick' ? it.answer
      : pair ? DECK.words[it.i]?.w
        : DECK.words[it.i]?.g;
  check(pair ? it.options.length >= 1 && it.options.length <= 3 : it.options.length === 3, 'wrong number of wrong answers', `${it.id}: ${it.options.length}`);
  check(new Set(it.options).size === it.options.length, 'the same wrong answer twice', it.id);
  check(!it.options.includes(answer), 'the right answer is also offered as a wrong one', it.id);
  if (pair) continue;   // the length rule below is about English options
  // Option length gives the answer away if one is much longer than the rest —
  // the oldest tell in multiple choice.
  const len = (s) => String(s).split(/\s+/).length;
  const all = [answer, ...it.options].map(len);
  check(Math.max(...all) - Math.min(...all) <= Math.max(2, Math.min(...all)), 'one option is much longer than the others', `${it.id}: ${all.join('/')}`);
}

// ── 4. tone questions really are tone questions ──────────────────────────
for (const it of DECK.items.filter((x) => x.k === 'tone-pair' || x.k === 'tone-say')) {
  const words = it.choices.map((c) => DECK.words[c.i]);
  check(words.every(Boolean), 'tone question points at a word that is not there', it.id);
  check(words.every((w) => w.j.slice(0, -1) === it.syll), 'tone question mixes different syllables', `${it.id}: ${words.map((w) => w.j).join(', ')}`);
  check(new Set(words.map((w) => w.j)).size === words.length, 'the same tone offered twice', it.id);
  check(it.choices.every((c, k) => c.tone === +words[k].j.slice(-1)), 'tone number does not match the reading', it.id);
}

// ── 5. grammar examples show the pattern they claim ──────────────────────
const byId = new Map(GRAMMAR.map((g) => [g.id, g]));
for (const g of DECK.grammar) {
  const spec = byId.get(g.id);
  check(!!spec, 'grammar point not in the syllabus', g.id);
  check(g.examples.length > 0, 'grammar point with no example', g.id);
  for (const ex of g.examples) {
    const s = sentById.get(ex.id);
    if (!s) { fail('grammar example not in the corpus', `${g.id} #${ex.id}`); continue; }
    check(s.text === ex.text && s.eng === ex.eng, 'grammar example does not match the source', `#${ex.id}`);
    check(new RegExp(spec.match).test(ex.text), 'grammar example does not contain the pattern', `${g.id} #${ex.id}: ${ex.text}`);
    if (spec.notMatch) check(!new RegExp(spec.notMatch).test(ex.text), 'grammar example contains the form the point excludes', `${g.id} #${ex.id}`);
  }
}
for (const it of DECK.items.filter((x) => x.k === 'grammar-build')) {
  check(it.pieces.join('') === it.text.replace(/[。？！，]/g, ''), 'the pieces do not rebuild the sentence', it.id);
}
for (const it of DECK.items.filter((x) => x.k === 'grammar-pick')) {
  check(it.text.includes(it.answer), 'the blanked word is not in the sentence', it.id);
}

// ── 6. the history cards are quoted exactly ──────────────────────────────
// The quote has to appear character for character in the source file. HTML
// entities are decoded first, because the source is a web page and the card is
// plain text.
const sourceText = {};
const loadSource = (name) => {
  if (sourceText[name]) return sourceText[name];
  const f = join(ROOT, 'sources', 'belshaw', name + '.html');
  if (!existsSync(f)) { fail('source file missing', name); return (sourceText[name] = ''); }
  const html = readFileSync(f, 'utf8');
  const text = html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8217;|&#039;|&rsquo;/g, '’')
    .replace(/&#8216;/g, '‘')
    .replace(/&#8220;/g, '“').replace(/&#8221;/g, '”')
    .replace(/&#8212;|&mdash;/g, '—').replace(/&#8211;|&ndash;/g, '–')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
  return (sourceText[name] = text);
};
for (const c of DECK.context) {
  if (c.kind === 'quote') {
    const text = loadSource(c.source.file);
    const needle = c.quote.replace(/\s+/g, ' ').trim();
    check(text.includes(needle), 'quote is not in the source word for word', `${c.id}: "${needle.slice(0, 60)}…"`);
    check(!!c.source.author && !!c.source.licence, 'quote with no attribution', c.id);
  } else {
    check(c.found.length >= 3, 'word card with too few words', c.id);
    for (const f of c.found) {
      const e = lexByWord.get(f.w);
      check(!!e, 'card word not in the corpus', `${c.id}: ${f.w}`);
      check(!e || (e.jyut === f.jyut && e.gloss.includes(f.gloss)), 'card word does not match the dictionary', `${c.id}: ${f.w}`);
    }
  }
}

// ── 7. the interface ladder only says real Cantonese ─────────────────────
// Every word a phrase needs has to exist in the corpus, and the phrase has to
// be built from those words and nothing else — so the app cannot quietly
// invent Cantonese at the learner.
const deckWords = new Set(DECK.words.map((w) => w.w));
for (const [key, p] of Object.entries(PHRASES)) {
  for (const w of p.needs) {
    check(lexByWord.has(w), 'interface phrase needs a word the corpus does not have', `${key}: ${w}`);
    check(deckWords.has(w), 'interface phrase needs a word the deck never teaches', `${key}: ${w}`);
  }
  const stripped = p.yue.replace(/[？！。，]/g, '');
  const joined = p.needs.join('');
  check(stripped === joined, 'interface phrase is not made of the words it lists', `${key}: ${stripped} vs ${joined}`);
  check(p.at > 0, 'interface phrase with no threshold', key);
}

// ── 7b. the course is a course ───────────────────────────────────────────
// The syllabus chooses the order, never the facts: every word it names has to
// be one the deck actually teaches, no word may appear in two stages, and a
// stage must be able to open the one after it.
const SYLLABUS = (await import(pathToFileURL(join(ROOT, 'content', 'syllabus.mjs')).href)).default;
const seenInStage = new Map();
check(DECK.stages.length === SYLLABUS.length, 'a stage went missing between the syllabus and the deck', `${SYLLABUS.length} written, ${DECK.stages.length} built`);
for (const [n, st] of SYLLABUS.entries()) {
  const built = DECK.stages[n];
  if (!built) continue;
  check(built.id === st.id, 'stages are out of order', `${n}: ${built.id} vs ${st.id}`);
  check(!!st.can && !!st.why, 'a stage with no purpose written down', st.id);
  check(st.gate > 0 && st.gate <= 1, 'a stage gate outside 0–1', `${st.id}: ${st.gate}`);
  for (const w of st.words) {
    check(deckWords.has(w), 'a stage names a word the deck does not teach', `${st.id}: ${w}`);
    check(!seenInStage.has(w), 'a word appears in two stages', `${w}: ${seenInStage.get(w)} and ${st.id}`);
    seenInStage.set(w, st.id);
  }
  for (const g of st.grammar) check(DECK.grammar.some((x) => x.id === g), 'a stage names a grammar point that does not exist', `${st.id}: ${g}`);
  // A gate you cannot pass is a wall.
  const need = Math.max(1, Math.ceil(built.words.length * st.gate));
  check(built.words.length >= need, 'a stage gate cannot be reached', `${st.id}: needs ${need} of ${built.words.length}`);
  check(built.words.length >= 8, 'a stage too small to teach anything', `${st.id}: ${built.words.length} words`);
  // Every gated word needs a question, or it can never be answered.
  const askable = new Set(DECK.items.filter((it) => it.i != null).map((it) => it.i));
  const orphan = built.words.filter((i) => !askable.has(i));
  check(orphan.length === 0, 'a stage word with no question', `${st.id}: ${orphan.length}`);
}
// Every grammar point should belong to a stage, or it opens only after the
// course is finished — which for 咗 or 嘅 would be absurd.
const staged = new Set(SYLLABUS.flatMap((st) => st.grammar));
const unstaged = DECK.grammar.filter((g) => !staged.has(g.id)).map((g) => g.id);
check(unstaged.length === 0, 'a grammar point belongs to no stage', unstaged.join(', '));

// ── 7c. the notes about confusable words ─────────────────────────────────
// A note is my own writing, so the check is that it is ABOUT real words: every
// word it names must be one the deck teaches, and its question's answer must
// be one of the note's own words rather than something invented for it.
const NOTES = (await import(pathToFileURL(join(ROOT, 'content', 'notes.mjs')).href)).default;
for (const n of NOTES) {
  const built = (DECK.notes || []).find((x) => x.id === n.id);
  const inDeck = n.words.every((w) => deckWords.has(w));
  check(!inDeck || !!built, 'a note whose words are all taught was dropped from the deck', n.id);
  if (!built) continue;
  check(!!n.plain && n.plain.length > 40, 'a note with no explanation', n.id);
  check(n.words.length >= 2, 'a note about fewer than two words', n.id);
  for (const w of n.words) check(deckWords.has(w), 'a note names a word the deck does not teach', `${n.id}: ${w}`);
  check(n.words.includes(n.ask.answer), 'a note question whose answer is not one of its own words', `${n.id}: ${n.ask.answer}`);
  for (const w of n.ask.with) check(n.words.includes(w), 'a note question offering a word the note does not cover', `${n.id}: ${w}`);
  check(!n.ask.with.includes(n.ask.answer), 'a note question offering its own answer twice', n.id);
  check(n.ask.prompt.includes('?'), 'a note question that is not a question', n.id);
}
const notePicks = DECK.items.filter((it) => it.k === 'note-pick');
check(notePicks.length === (DECK.notes || []).length, 'a note without a question', `${notePicks.length} questions for ${(DECK.notes || []).length} notes`);
for (const it of notePicks) {
  check(!!DECK.words[it.i], 'a note question pointing at no word', it.id);
  check(!it.options.includes(DECK.words[it.i].w), 'a note question offering its own answer', it.id);
}

// ── 8. the recordings are recordings ─────────────────────────────────────
const audioDir = join(ROOT, 'app', 'audio');
const have = existsSync(audioDir) ? new Set(readdirSync(audioDir).map((f) => +f.replace('.mp3', ''))) : new Set();
let missing = 0;
for (const id of DECK.audio) if (!have.has(id)) missing++;
check(missing === 0, 'recordings named in the deck but not downloaded', `${missing} missing — run sh build/fetch-audio.sh`);
// An HTML error page saved as .mp3 is silent and looks fine in a file listing;
// 307 of them got into the repo once. Every file is checked for an mp3 header.
let notAudio = 0;
for (const f of have.size ? readdirSync(audioDir) : []) {
  const b = readFileSync(join(audioDir, f));
  const ok = (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
  if (!ok) notAudio++;
}
check(notAudio === 0, 'files in app/audio that are not mp3s', `${notAudio} files`);

// ── 9. the deck is big enough to be worth playing ────────────────────────
check(DECK.words.length >= 4000, 'the word list is short of a conversational vocabulary', `${DECK.words.length} words`);
check(DECK.items.filter((i) => i.k === 'sentence-listen').length >= 100, 'too little listening practice', '');
check(DECK.grammar.length >= 8, 'too few grammar points', '');

// ── report ───────────────────────────────────────────────────────────────
console.log(`verify: ${checks.toLocaleString()} checks on ${DECK.words.length.toLocaleString()} words, ${DECK.items.length.toLocaleString()} questions, ${DECK.context.length} cards`);
if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
  for (const p of problems.slice(0, 40)) console.error('  - ' + p);
  if (problems.length > 40) console.error(`  …and ${problems.length - 40} more`);
  process.exit(1);
}
console.log('verify: everything checks out against its source');
