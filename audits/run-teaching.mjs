// Is anything tested before it is taught?
//
//   node audits/run-teaching.mjs
//
// Every word in this app used to be met for the first time as a question. 妹
// arrived as "what does this mean?" with four options; you guessed, and then
// you were told. That is testing something never taught, and it is why a day
// read as an undifferentiated quiz rather than a lesson (Robert, 23 Sept: "it
// isn't like we make progress").
//
// Retrieval practice is the right engine and its own literature is explicit
// that retrieval acts on material already ENCODED — Roediger & Karpicke test
// what was studied; Bloom's mastery sequence presents before it checks. So the
// app now shows a word before it asks about it.
//
// A card that introduces a word is only worth showing if there is something on
// it. This checks there is: a reading, a meaning, and at least one of the
// things that make a word stick — a sentence it lives in, a note that separates
// it from its neighbour, or a recording.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const APP = readFileSync(join(ROOT, 'app', 'js', 'app.js'), 'utf8');
const SYLLABUS = (await import(pathToFileURL(join(ROOT, 'content', 'syllabus.mjs')).href)).default;

const fails = [];
const notes = [];
let checks = 0;
const check = (ok, what, detail) => { checks++; if (!ok) fails.push(`${what}: ${detail}`); };

// ── 1. the app really does introduce before it asks ──────────────────────
// A structural check, so this cannot be quietly removed later.
check(/function meetCard\(/.test(APP), 'the app has no card for meeting a word', '');
check(/needsIntroduction\(it\)/.test(APP), 'the round never checks whether a word needs introducing', '');
check(/if \(!practice && needsIntroduction/.test(APP), 'a recall test would introduce words, which makes its score a lie', '');
// The card must not be scoreable. Meeting a word is not an answer.
const meetBody = (APP.match(/function meetCard\(([\s\S]*?)\n}/) || [])[1] || '';
check(!/onAnswer|State\.answer/.test(meetBody), 'the card for meeting a word records an answer', '');
check(!/setTimeout|setInterval/.test(meetBody), 'the card for meeting a word is on a timer', '');

// ── 2. every word the app can introduce has something to introduce it with ─
const cues = DECK.cues || {};
const noteWords = new Set((DECK.notes || []).flatMap((n) => n.words));
const asked = new Set(DECK.items.filter((it) => it.i != null).map((it) => it.i));
let bare = 0;
const bareEg = [];
for (const i of asked) {
  const w = DECK.words[i];
  if (!w) continue;
  checks++;
  check(!!w.j, 'a word can be asked about but has no reading', w.w);
  check(!!w.g, 'a word can be asked about but has no meaning', w.w);
  // Reading and meaning alone is a flashcard. One of these three is what makes
  // the introduction worth stopping for.
  const rich = (DECK.examples[i] || []).length > 0 || noteWords.has(i) || cues[i];
  if (!rich) { bare++; if (bareEg.length < 6) bareEg.push(w.w); }
}
const bareShare = bare / (asked.size || 1);
console.log(`teaching audit: ${checks.toLocaleString()} checks`);
console.log(`  words the app can ask about: ${asked.size.toLocaleString()}`);
console.log(`  introduced with a sentence, a note or a cue: ${(asked.size - bare).toLocaleString()} (${((1 - bareShare) * 100).toFixed(0)}%)`);
console.log(`  introduced with the reading and meaning only: ${bare.toLocaleString()}${bareEg.length ? ` — e.g. ${bareEg.join(' ')}` : ''}`);

// ── 3. the course words are the ones that must be taught properly ────────
// These are the first weeks. A bare card here is a bare first impression.
const course = new Set(SYLLABUS.flatMap((s) => s.words));
const idxOf = new Map(DECK.words.map((w, i) => [w.w, i]));
let bareCourse = 0;
const bareCourseEg = [];
for (const word of course) {
  const i = idxOf.get(word);
  if (i == null) continue;
  checks++;
  const rich = (DECK.examples[i] || []).length > 0 || noteWords.has(i) || cues[i];
  if (!rich) { bareCourse++; if (bareCourseEg.length < 8) bareCourseEg.push(word); }
}
console.log(`  of the ${course.size} course words, ${bareCourse} have nothing but a reading and a meaning${bareCourseEg.length ? `: ${bareCourseEg.join(' ')}` : ''}`);
if (bareCourse > course.size * 0.35) fails.push(`${bareCourse} of ${course.size} course words have nothing to introduce them with beyond a reading and a meaning`);
if (bareShare > 0.8) notes.push(`${(bareShare * 100).toFixed(0)}% of all words have no sentence, note or cue — fine for the tail, worth watching`);

for (const n of notes) console.log(`  note: ${n}`);
if (fails.length) {
  console.error('\nteaching audit FAILED:');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('teaching audit: nothing is asked about before it is shown.');
