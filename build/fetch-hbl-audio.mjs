// Fetch a capped subset of the graded readers' recordings.
//
//   node build/fetch-hbl-audio.mjs [--mb 10] [--dry]
//
// Every one of the 6,179 graded sentences has a recording, and all of them
// would be 260 MB against the 18 MB the app carries today. So this takes the
// ones a learner will actually meet, in that order, until the budget is spent:
//
//   1. sentences within reach of the ten-stage course — the beginner's own
//      listening material, and the whole point of the exercise;
//   2. then by reading level, lowest first;
//   3. then shortest first, because a short sentence is a better first
//      listening question and a smaller file.
//
// PROVENANCE. Each clip is filed by the sentence it belongs to, and the
// manifest records the TEXT as it was when the clip was taken. Books upstream
// can be re-edited; if sentence seven of a book changes, the file called 07 is
// then a recording of something else, and nothing in a filename would ever say
// so. build/verify.mjs compares the manifest's text against the corpus and
// fails if they have drifted apart. This is the failure the sources research
// warned about — clip names do not move when the content does.

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'app', 'audio', 'hbl');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BUDGET = Number(arg('--mb', 10)) * 1024 * 1024;
const DRY = process.argv.includes('--dry');

const hbl = JSON.parse(readFileSync(join(ROOT, 'corpus', 'hbl.json'), 'utf8'));
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));

// What a learner can read by the end of the course.
const known = new Set();
for (const st of deck.stages) for (const i of st.words) for (const c of deck.words[i].w) known.add(c);
const inCourse = (text) => {
  const cs = [...text.replace(/[^㐀-鿿]/g, '')];
  if (!cs.length) return false;
  const unknown = cs.filter((c) => !known.has(c)).length;
  return unknown <= 2 && (cs.length - unknown) / cs.length >= 0.8;
};

const ranked = hbl
  .map((s) => ({ ...s, course: inCourse(s.text) }))
  .sort((a, b) => (b.course - a.course) || ((a.lvl ?? 9) - (b.lvl ?? 9)) || (a.n - b.n));

mkdirSync(OUT, { recursive: true });
const manifestPath = join(ROOT, 'corpus', 'hbl-audio.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const fileFor = (id) => id.replace(/[:]/g, '-') + '.mp3';
let spent = 0, got = 0, kept = 0, failed = 0;

for (const s of ranked) {
  if (spent >= BUDGET) break;
  const name = fileFor(s.id);
  const path = join(OUT, name);
  // Already here and already accounted for: keep it, and keep its text.
  if (existsSync(path) && manifest[s.id]?.text === s.text) { spent += statSync(path).size; kept++; continue; }
  if (DRY) { spent += 42000; got++; continue; }
  try {
    const res = await fetch(s.clip);
    if (!res.ok) { failed++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    // An HTML error page saved as .mp3 is silent and looks fine in a listing;
    // 307 of them got into this repo once.
    const ok = (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
    if (!ok) { failed++; continue; }
    writeFileSync(path, buf);
    manifest[s.id] = { file: name, text: s.text, lvl: s.lvl, book: s.book, from: s.clip, bytes: buf.length, got: new Date().toISOString().slice(0, 10) };
    spent += buf.length;
    got++;
  } catch { failed++; }
}

if (!DRY) writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
const n = Object.keys(manifest).length;
console.log(`hbl audio: ${got} fetched, ${kept} already here, ${failed} failed — ${(spent / 1024 / 1024).toFixed(1)} MB of a ${(BUDGET / 1024 / 1024).toFixed(0)} MB budget`);
console.log(`  manifest holds ${n} clips, each with the sentence it was taken for`);
const courseOnes = ranked.filter((s) => s.course && manifest[s.id]).length;
console.log(`  of the ${ranked.filter((s) => s.course).length} sentences within the course, ${courseOnes} have their recording`);
