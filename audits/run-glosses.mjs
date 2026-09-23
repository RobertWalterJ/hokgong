// Are the meanings the ones a person would actually use?
//
//   node audits/run-glosses.mjs            the report
//   node audits/run-glosses.mjs --strict   fail the build on the hard faults
//
// Every check in build/verify.mjs asks whether a meaning is FAITHFUL — does a
// published dictionary give this word this meaning for this pronunciation. All
// of them pass. And yet Robert, 23 Sept 2026: "there are some quirks and
// inaccuracies. Like I think the translation of sorry is off."
//
// He is right, and faithfulness is exactly why. A dictionary's first sense is
// written for a READER looking a word up, not for a SPEAKER trying to say
// something. So the app was teaching:
//
//   對唔住   "sorry."        — the source's own full stop, printed on a button
//   唔好意思  "embarrassed"   — literally true, and not what anyone says it for
//   多謝    "to thank"      — the citation form; nobody says "to thank" to a waiter
//   唔該    "please"        — while the app's own note teaches it as thanks
//
// None of those is a mistranslation. Each is the wrong sense CHOSEN, or the
// right sense printed in dictionary clothing. This audit reads for usability
// rather than fidelity: the dictionary decides what a word can mean, and this
// decides which of those meanings goes on the button.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DECK = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
const SYLLABUS = (await import(pathToFileURL(join(ROOT, 'content', 'syllabus.mjs')).href)).default;
const strict = process.argv.includes('--strict');

// The words the course actually teaches. These are the ones a beginner meets
// in his first weeks, so they carry the whole first impression of the app —
// and they are few enough to be got right one at a time.
const course = new Set(SYLLABUS.flatMap((s) => s.words));
const idx = new Map(DECK.words.map((w, i) => [w.w, i]));

const hard = [];      // wrong enough to stop a build
const soft = [];      // worth a human eye
const note = (list, w, why, detail) => list.push({ w: w.w, g: w.g, why, detail });

for (const w of DECK.words) {
  const inCourse = course.has(w.w);
  const g = w.g || '';

  // ── printed artefacts: the dictionary's punctuation and layout ──────────
  // "sorry." is the source's sentence-final full stop. On a button it reads
  // as a typo, and in the "say this in Cantonese" prompt it is nonsense.
  if (/[.;,]$/.test(g)) note(hard, w, 'ends with the dictionary’s punctuation', JSON.stringify(g));
  if (/^\s|\s$/.test(w.g || '')) note(hard, w, 'has stray whitespace', JSON.stringify(g));
  if (/\s{2,}/.test(g)) note(soft, w, 'has a double space', JSON.stringify(g));
  // A gloss that is mostly qualifier is a gloss you cannot put on a button.
  const paren = (g.match(/\([^)]*\)/g) || []).join('');
  if (paren.length > g.length * 0.4) note(soft, w, 'is mostly bracketed qualifier', JSON.stringify(g));

  // ── prose where a translation belongs ──────────────────────────────────
  if (/^(used|a |an |the )\b/i.test(g) && g.length > 28) note(soft, w, 'describes the word instead of translating it', JSON.stringify(g));
  if (/^(see|cf\.|compare|variant of|short for)\b/i.test(g)) note(hard, w, 'is a cross-reference, not a meaning', JSON.stringify(g));
  if (g.length > 48) note(soft, w, 'is too long to sit on a button', `${g.length} characters`);
  if (!g.trim()) note(hard, w, 'has no meaning at all', '');

  // ── the citation-form problem ──────────────────────────────────────────
  // "to thank" is how a dictionary lists a verb. It is not how anyone speaks,
  // and for the social formulas it is actively wrong: the app asks "say this
  // in Cantonese: to thank", and the answer is what you say to a waiter.
  // Only flagged when the source itself offers a plainer alternative, so the
  // fix is always a re-ordering rather than an invention.
  if (inCourse && /^to /.test(g)) {
    const plain = (w.alt || []).find((a) => !/^to /.test(a) && a.length <= 32);
    if (plain) note(soft, w, 'is in citation form and the source offers a plainer sense', `"${g}" → "${plain}"`);
  }

  // ── the literal-but-useless sense ──────────────────────────────────────
  // 唔好意思 really does mean "embarrassed". That is the etymology, not the
  // errand. Where a course word's own source lists a social formula among its
  // senses and the app chose something else, the app chose wrong.
  const FORMULA = /^(sorry|thank you|thanks|please|excuse me|hello|hi|goodbye|bye|good morning|good night|you'?re welcome|no problem|never mind|of course|yes|no)\b/i;
  if (inCourse && !FORMULA.test(g)) {
    const formula = (w.alt || []).find((a) => FORMULA.test(a));
    if (formula) note(soft, w, 'is the literal sense where the source also gives a phrase people say', `"${g}" → "${formula}"`);
  }
}

// ── two words, one meaning ───────────────────────────────────────────────
// The app cannot ask "say this in Cantonese: sorry" when three words answer
// to it. There are cues for this, and this counts how far they reach.
const byGloss = new Map();
for (const w of DECK.words) {
  if (!byGloss.has(w.g)) byGloss.set(w.g, []);
  byGloss.get(w.g).push(w.w);
}
const cues = DECK.cues || {};
const clashes = [...byGloss.entries()].filter(([, ws]) => ws.length > 1);
const uncued = clashes.filter(([, ws]) => ws.some((x) => !cues[x]));
const courseClash = clashes.filter(([, ws]) => ws.some((x) => course.has(x)));

// ── report ───────────────────────────────────────────────────────────────
const show = (list, title) => {
  if (!list.length) return;
  console.log(`\n${title} — ${list.length}`);
  const seen = new Map();
  for (const f of list) seen.set(f.why, (seen.get(f.why) || 0) + 1);
  for (const [why, n] of [...seen].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${why}`);
    for (const f of list.filter((x) => x.why === why).slice(0, 4)) console.log(`         ${f.w}  ${f.detail}`);
  }
};
console.log(`gloss audit: ${DECK.words.length.toLocaleString()} words, ${course.size} of them taught by the course`);
show(hard, 'FAULTS');
show(soft, 'worth a human eye — candidates for content/glosses.mjs');
console.log(`\nSHARED MEANINGS: ${clashes.length.toLocaleString()} meanings are carried by more than one word`);
console.log(`  ${uncued.length.toLocaleString()} of those have at least one word with no cue to tell them apart`);
console.log(`  ${courseClash.length} involve a word the course teaches`);
for (const [g, ws] of courseClash.slice(0, 6)) console.log(`    "${g}" — ${ws.join(' ')}${ws.every((x) => cues[x]) ? '' : '   ← not all cued'}`);

// A sample for a Cantonese speaker to read down. Robert's wife is the check
// this app cannot perform on itself.
if (process.argv.includes('--sample')) {
  const n = +(process.argv[process.argv.indexOf('--sample') + 1] || 30);
  console.log(`\nA SAMPLE TO READ ALOUD TO SOMEONE WHO SPEAKS CANTONESE (${n})`);
  const pool = DECK.words.filter((w) => course.has(w.w));
  for (const w of pool.slice(0, n)) console.log(`  ${w.w}  ${w.j}  — "${w.g}"${(w.alt || []).length ? `   (also: ${w.alt.join('; ')})` : ''}`);
}

if (strict && hard.length) {
  console.error(`\ngloss audit FAILED: ${hard.length} meanings are wrong enough to teach badly.`);
  process.exit(1);
}
console.log(hard.length ? `\n${hard.length} faults. Run with --strict to fail the build on them.` : '\nNo faults.');
