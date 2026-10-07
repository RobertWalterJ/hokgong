// Does the build-up actually build up?
//
//   node build/test-buildup.mjs
//
// app/js/buildup.js is pure — pieces in, steps out — so it can be held to its
// properties directly rather than inspected on a phone. The properties are the
// whole technique: if a step is not the END of the sentence, the learner is
// practising a fragment that does not finish where the sentence finishes, and
// the melody it is there to teach is the thing that gets lost.
//
// Run against every sentence the app can actually build up, not a handful of
// made-up ones.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { buildUp, worthBuilding, MIN_STEPS, MAX_STEPS } = await import('../app/js/buildup.js');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));

const withParts = deck.items.filter((it) => Array.isArray(it.parts) && it.parts.length);
const fails = [];
let built = 0, skipped = 0, stepTotal = 0;

for (const it of withParts) {
  const parts = it.parts;
  const whole = parts.map((p) => p[0]).join('');
  // The pieces must rebuild the sentence, or everything below is about a
  // different sentence.
  if (whole !== it.text.replace(/[。，、？！「」：；…—]/g, '')) {
    // Punctuation is kept out of the pieces; compare on the characters only.
    const a = whole.replace(/[^㐀-鿿]/g, '');
    const b = it.text.replace(/[^㐀-鿿]/g, '');
    if (a !== b) { fails.push(`${it.id}: the pieces do not rebuild the sentence`); continue; }
  }

  if (!worthBuilding(parts)) { skipped++; continue; }
  const steps = buildUp(parts);
  built++;
  stepTotal += steps.length;

  if (steps.length < MIN_STEPS) fails.push(`${it.id}: only ${steps.length} step(s)`);
  if (steps.length > MAX_STEPS) fails.push(`${it.id}: ${steps.length} steps, more than ${MAX_STEPS}`);

  const full = parts.map((p) => p[0]).join('');
  for (const [k, s] of steps.entries()) {
    // THE PROPERTY. Every step must be the end of the sentence — that is what
    // makes it a backward build-up rather than a list of fragments.
    if (!full.endsWith(s.text)) fails.push(`${it.id} step ${k + 1}: "${s.text}" is not the end of "${full}"`);
    if (!s.text) fails.push(`${it.id} step ${k + 1}: empty`);
    if (!s.jyut) fails.push(`${it.id} step ${k + 1}: no reading, and the reading is the part he can read`);
    // Each step is strictly longer than the one before it.
    if (k && s.text.length <= steps[k - 1].text.length) fails.push(`${it.id} step ${k + 1}: no longer than the step before`);
    if (k && !s.text.endsWith(steps[k - 1].text)) fails.push(`${it.id} step ${k + 1}: does not contain the step before it`);
    // A step must be a phrase someone could say. 嘅 and the aspect markers
    // attach to the word in front of them, so a step starting on one is not a
    // unit of Cantonese and teaches the wrong shape.
    // The first PIECE, not the first character. 返工 is a word meaning "go to
    // work"; its first character is the suffix 返, and reading characters here
    // flagged a hundred perfectly good phrases.
    const CANNOT_START = ['嘅', '咗', '緊', '過', '住', '返', '埋', '哋'];
    // …and not the last step, which IS the sentence. 過咗一陣 — "after a while"
    // — begins a real sentence with 過 as a head verb, and a sentence begins
    // how it begins; the rule is about the fragments we invent, not the text.
    const firstPiece = parts[s.from] && parts[s.from][0];
    if (k < steps.length - 1 && CANNOT_START.includes(firstPiece)) fails.push(`${it.id} step ${k + 1}: "${s.text}" begins on ${firstPiece}, which attaches leftwards`);
    // What was added is genuinely at the front.
    if (k && s.added && !s.text.startsWith(s.added)) fails.push(`${it.id} step ${k + 1}: the added piece is not at the front`);
  }
  // And it has to arrive at the whole sentence, or the learner never says it.
  if (steps.length && steps[steps.length - 1].text !== full) {
    fails.push(`${it.id}: the last step is "${steps[steps.length - 1].text}", not the whole sentence`);
  }
  // The first step should be worth saying out loud.
  if (steps.length && [...steps[0].text].length < 2) fails.push(`${it.id}: the first step is a single character`);
}

// A worked example in the output, so the technique is legible in the log.
const eg = withParts.find((it) => worthBuilding(it.parts) && it.parts.length >= 6);
if (eg) {
  console.log(`for example — ${eg.text}`);
  for (const s of buildUp(eg.parts)) console.log(`  ${s.text.padEnd(12)} ${s.jyut}`);
  console.log('');
}
console.log(`test-buildup: ${built.toLocaleString()} sentences built up, ${skipped.toLocaleString()} too short to bother, ${built ? (stepTotal / built).toFixed(1) : 0} steps on average`);

if (!built) fails.push('no sentence in the deck carries the pieces needed to build one up');
if (fails.length) {
  console.error('\ntest-buildup FAILED:');
  for (const f of fails.slice(0, 10)) console.error('  - ' + f);
  if (fails.length > 10) console.error(`  …and ${fails.length - 10} more`);
  process.exit(1);
}
console.log('test-buildup: every step ends the sentence, grows, and arrives at the whole of it.');
