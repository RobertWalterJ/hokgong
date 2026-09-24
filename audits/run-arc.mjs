// Does a sitting have a shape?
//
//   node audits/run-arc.mjs
//
// A round used to be `shuffle([...reviews, ...add])` — twenty-five questions
// in a heap. Nothing in the order said "this is the new part"; a word met at
// question four was not seen again for a day; and a sitting that opened on
// something you had never seen opened as an examination rather than a lesson.
//
// The shape now is warm-up, teaching, consolidation, review. This checks it
// really is that, in a real round built from the real deck, because an
// ordering is exactly the kind of thing that quietly stops happening.
//
// The consolidation rule is the one worth defending: a word met in a sitting
// comes back once more in the SAME sitting, as a different question, in the
// back half. That is Bjork's expanding retrieval — first test close to the
// teaching, next test further away. One encounter a day is the flat part of
// the spacing curve; this is the useful part of it.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
let mseed = 3;
Math.random = () => ((mseed = (mseed * 16807) % 2147483647) / 2147483647);
const S = await import('../app/js/schedule.js');
const deck = JSON.parse(readFileSync(join(ROOT, 'app', 'data', 'deck.json'), 'utf8'));
globalThis.window = { HOKGONG_DECK: deck };
const D = await import('../app/js/deck.js');
await D.loadDeck(); D.indexDeck();

const byId = new Map(deck.items.map((it) => [it.id, it]));
const groupOf = (id) => { const it = byId.get(id); if (!it) return null; if (it.i != null) return 'w' + it.i; if (it.gid) return 'g' + it.gid; if (it.syll) return 't' + it.syll; return 's' + it.id; };
const wordOf = (id) => { const it = byId.get(id); return it && it.i != null ? deck.words[it.i].w : null; };
const metCard = (id) => !!S.State.card(id);
const wordMet = (i) => ['wl/', 'ws/', 'wr/', 'cz/'].some((p) => S.State.card(p + deck.words[i]?.w));
const PACE = { newPerRound: 9, newPerDay: 30 };

let seed = 11;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
let t = new Date(2026, 8, 24, 8, 30).getTime();
S.__setClock(() => t); S.State.load();

const fails = [];
const SIZE = 25;
let stage = 0;
const shapes = [];

// Six sittings across three days: the first is all-new, the later ones have a
// review pile, which is where an arc is harder to hold.
for (let n = 0; n < 6; n++) {
  const ids = D.askableIds(true, true, stage, metCard, wordMet);
  const round = new S.Round(ids, { pace: PACE, groupOf, stageOf: (id) => byId.get(id)?.stage, size: SIZE });
  const q = round.queue.slice();
  const fresh = new Set(q.filter((id) => !S.State.card(id)));
  // Where in the round each kind of question falls.
  const pos = q.map((id, i) => ({ i, id, isNew: fresh.has(id), word: wordOf(id) }));
  const firstNew = pos.find((x) => x.isNew);
  const warm = firstNew ? firstNew.i : q.length;
  // A word taught in this round and asked again later in it.
  const seenAt = new Map();
  let consolidated = 0, gaps = [];
  for (const x of pos) {
    if (!x.word) continue;
    if (seenAt.has(x.word)) { consolidated++; gaps.push(x.i - seenAt.get(x.word)); }
    else seenAt.set(x.word, x.i);
  }
  const newCount = pos.filter((x) => x.isNew).length;
  shapes.push({ n: n + 1, len: q.length, warm, newCount, consolidated, gap: gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0 });

  // ── the rules ──────────────────────────────────────────────────────────
  // 1. A sitting with reviews available opens on one. Not on a word you have
  //    never seen: that is an examination, not a lesson.
  const hasReviews = q.some((id) => S.State.card(id));
  if (hasReviews && warm === 0 && n > 0) fails.push(`sitting ${n + 1}: opened on new material with reviews available`);
  // 2. The teaching is not one long wall. Counted over FIRST SIGHTS only: a
  //    consolidation question has no card either, but a second look at a word
  //    taught ten questions ago is not the same demand as another stranger.
  const firstSeen = new Set();
  let run = 0, worstRun = 0;
  for (const x of pos) {
    const stranger = x.isNew && x.word && !firstSeen.has(x.word);
    if (x.word) firstSeen.add(x.word);
    run = stranger ? run + 1 : 0;
    worstRun = Math.max(worstRun, run);
  }
  // …and only a fault when there were reviews spare to break it up with.
  const reviewsHere = q.length - newCount;
  if (worstRun > 3 && reviewsHere >= Math.floor(newCount / 2)) fails.push(`sitting ${n + 1}: ${worstRun} unfamiliar words in a row, with ${reviewsHere} reviews available to space them`);
  // 3. The second look is a real gap away, not the next question.
  if (gaps.some((g) => g < 3)) fails.push(`sitting ${n + 1}: a word came back only ${Math.min(...gaps)} questions later`);
  // 4. No question twice. Consolidation is a DIFFERENT question.
  if (new Set(q).size !== q.length) fails.push(`sitting ${n + 1}: the same question twice in one round`);

  let id;
  while ((id = round.next())) {
    const c = S.State.card(id);
    S.State.answer(id, rand() < (c && c.st !== 'new' ? 0.9 : 0.7), { practice: round.extra.has(id) });
    t += 11e3;
  }
  S.State.snapshot(ids);
  // recount the stage the way the app does
  const wr = new Set(), gr = new Set();
  for (const it of deck.items) { const c = S.State.card(it.id); if (!c || c.st === 'new' || !c.ok) continue; if (it.i != null) wr.add(it.i); if (it.gid != null) gr.add(it.gid); }
  let cur = 0;
  for (const st of deck.stages) { const have = st.words.filter((i) => wr.has(i)).length; if (have >= Math.max(1, Math.ceil(st.words.length * st.gate)) && st.grammar.every((g) => gr.has(g))) cur++; else break; }
  stage = Math.max(stage, cur);
  if (n % 3 === 2) t = new Date(new Date(t).getFullYear(), new Date(t).getMonth(), new Date(t).getDate() + 1, 8, 30).getTime();
  else t += 3 * 3600e3;
}

console.log('sitting | length | warm-up | new | asked twice in it | average gap');
for (const s of shapes) {
  console.log(`${String(s.n).padStart(7)} | ${String(s.len).padStart(6)} | ${String(s.warm).padStart(7)} | ${String(s.newCount).padStart(3)} | ${String(s.consolidated).padStart(17)} | ${String(s.gap).padStart(11)}`);
}
const totalConsolidated = shapes.reduce((a, s) => a + s.consolidated, 0);
console.log(`\nwords given a second look inside their own sitting: ${totalConsolidated}`);
// Consolidation is the point of the whole exercise; if it stops happening the
// round is a heap again.
if (totalConsolidated === 0) fails.push('no word was ever asked a second time inside its own sitting');

if (fails.length) {
  console.error('\narc audit FAILED:');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('arc audit: a sitting opens on what you know, teaches, comes back to it, and reviews.');
