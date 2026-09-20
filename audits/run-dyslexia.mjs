// The dyslexia audit — can this app be read by the person it was built for?
//
//   node audits/run-dyslexia.mjs
//
// Robert is dyslexic, and that is a standing constraint on everything built
// here, not a feature request. The British Dyslexia Association's style guide
// is the reference: sans-serif type, generous size and line spacing,
// left-aligned rather than justified or centred, no blocks of capitals, no
// italics for emphasis, off-white rather than pure white, and never anything
// that depends on reading quickly.
//
// Most of that can be checked mechanically, so it is — and a failure here
// fails the build, exactly like the colour audit.

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'app', 'index.html'), 'utf8');
const js = readdirSync(join(ROOT, 'app', 'js')).filter((f) => f.endsWith('.js'))
  .map((f) => ({ f, text: readFileSync(join(ROOT, 'app', 'js', f), 'utf8') }));
const allJs = js.map((x) => x.text).join('\n');

const problems = [];
const notes = [];
const passes = [];
const check = (ok, what, detail = '') => (ok ? passes.push(what) : problems.push(`${what}${detail ? ' — ' + detail : ''}`));

// ── type ─────────────────────────────────────────────────────────────────
const cssVar = (name) => (new RegExp(`${name}:\\s*([^;]+);`).exec(html) || [])[1]?.trim();
const size = parseFloat(cssVar('--read-size') || '0');
check(size >= 17, 'body text is at least 17px', `--read-size is ${size}px`);
const lh = parseFloat(cssVar('--read-lh') || '0');
check(lh >= 1.5, 'line spacing is at least 1.5', `--read-lh is ${lh}`);
check(/html\.big\s*\{[^}]*font-size:\s*1[12]\d%/.test(html), 'a larger-text setting exists');
check(/--bg:\s*#(?!FFFFFF|fff\b)/i.test(html), 'the page is off-white rather than pure white');

// Blocks of capitals are the single most common failure in a "clean" design.
// The stylesheet, read as rules rather than scanned with one loose pattern —
// which quoted a fragment of a font-size line back as a selector.
const rules = [...html.matchAll(/(?:^|\})\s*([^{}@]+)\{([^}]*)\}/g)]
  .map((m) => ({ sel: m[1].trim().split('\n').pop().trim(), body: m[2] }));
const selectorsWith = (re) => rules.filter((r) => re.test(r.body)).map((r) => r.sel);

const upper = selectorsWith(/text-transform:\s*uppercase/);
check(upper.length === 0, 'no text is set in capitals', upper.join(', '));

// Italics for emphasis are harder to read than bold.
const italics = selectorsWith(/font-style:\s*italic/);
check(italics.length === 0, 'nothing uses italics for emphasis', italics.join(', '));

// Justified text creates rivers of white space.
check(!/text-align:\s*justify/.test(html), 'nothing is justified');

// Long prose centred is hard to track back to the start of the next line.
// Short labels and single words are fine centred, so this looks for centring
// on the containers that hold paragraphs.
// A container that holds paragraphs must not be centred. Centring a short
// child of one — the character, its reading — is fine and is how the question
// screen is built, so the test is on the container's own selector.
const PROSE_CONTAINER = /^\.(card|note-card|ccard|word|example|gpoint)$/;
const centredProse = rules
  .filter((r) => /text-align:\s*center/.test(r.body))
  .map((r) => r.sel.split(',').map((s) => s.trim()))
  .flat()
  .filter((sel) => PROSE_CONTAINER.test(sel));
check(centredProse.length === 0, 'paragraphs are not centred', centredProse.join(', '));

// ── reading aloud ────────────────────────────────────────────────────────
check(/export const say\b/.test(allJs) && /speechSynthesis/.test(allJs), 'the app can read text aloud');
const sayButtons = (allJs.match(/sayBtn\(/g) || []).length;
check(sayButtons >= 6, 'read-aloud buttons are used widely', `${sayButtons} found`);
// Every screen that carries prose should offer it somewhere.
for (const screen of ['tonesScreen', 'grammarScreen', 'contextScreen', 'aboutScreen', 'progressScreen']) {
  const body = new RegExp(`function ${screen}[\\s\\S]*?\\n\\}`).exec(allJs)?.[0] || '';
  if (!body) continue;
  const has = /sayBtn|contextCard|wordCard/.test(body);
  if (!has) notes.push(`${screen} has no read-aloud button on its prose`);
}

// ── nothing that depends on reading fast ─────────────────────────────────
// A countdown, a timer, a question that disappears: all of them punish slow
// reading, and none of them measures knowing a word.
const timers = [...allJs.matchAll(/(setInterval\([^)]*)/g)].map((m) => m[1].slice(0, 40));
check(timers.length === 0, 'nothing runs on a repeating timer', timers.join(' | '));
check(!/countdown|timeLeft|secondsLeft|timeUp/i.test(allJs), 'nothing counts down');
// A delay that fires a sound or moves on by itself is different from one that
// starts audio the learner asked for; the audit lists them for a human.
const delays = [...allJs.matchAll(/setTimeout\(([^,]{0,40}),\s*(\d+)/g)].map((m) => `${m[2]}ms`);
if (delays.length) notes.push(`timeouts in the app (none should advance a question): ${delays.join(', ')}`);

// ── motion ───────────────────────────────────────────────────────────────
check(/prefers-reduced-motion/.test(html), 'animation is disabled for anyone who asks for less motion');

// ── the reading font ─────────────────────────────────────────────────────
// The style guide asks for sans-serif. This app uses a serif for meanings and
// quotations on purpose — it is what Palimpsest and the other reading apps
// use, and Robert has read them happily — so the requirement here is that it
// can be SWITCHED, not that it is absent.
const serifForProse = /--read-font:\s*var\(--read\)/.test(html);
const canSwitch = /applyReadingFont/.test(allJs) && /'sans'/.test(allJs);
check(!serifForProse || canSwitch, 'the serif reading face can be switched to sans', 'no setting found');

// ── report ───────────────────────────────────────────────────────────────
console.log(`dyslexia audit: ${passes.length} checks passed`);
for (const p of passes) console.log('  ok   ' + p);
for (const n of notes) console.log('  note ' + n);
if (problems.length) {
  console.error(`\ndyslexia audit FAILED — ${problems.length} problem(s):`);
  for (const p of problems) console.error('  x  ' + p);
  process.exit(1);
}
console.log('\nNothing here asks the reader to read quickly, in capitals, or in a straight line they cannot find.');
