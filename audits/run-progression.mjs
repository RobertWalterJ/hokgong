// The Cantonese fluency and progression audit — the evidence, not the prose.
//
//   node audits/run-progression.mjs
//
// The question this answers is the one Robert actually asked: does working
// through this app, in the order it teaches, build towards holding a
// conversation? Four things decide that, and each is measured here rather than
// asserted:
//
//   1. WHAT COMES FIRST. A conversational course opens with greetings, the
//      polite words, pronouns, question words, numbers and classifiers. If
//      those sit at rank 3,000, the order is wrong however good the corpus is.
//   2. COVERAGE. What the words learnt so far are worth, in real speech.
//   3. BALANCE. Whether all five skills are actually reached, and when.
//   4. THE LADDER. Whether the interface's switch to Cantonese arrives at a
//      point the learner will actually get to.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));
const DECK = read('app/data/deck.json');
const LEX = read('corpus/lexicon.json');
const { PHRASES } = await import(pathToFileURL(join(ROOT, 'app', 'js', 'lang.js')).href);

const pos = new Map(DECK.words.map((w, i) => [w.w, i + 1]));      // teaching position
const lexRank = new Map(LEX.map((e) => [e.w, e.rank]));
const say = (...a) => console.log(...a);

// ── 1. what a beginner needs, and where the app puts it ──────────────────
// The list is the everyday business of a first conversation: greeting someone,
// thanking them, apologising, saying yes and no, asking who/what/where/when/
// how much, counting, and the handful of verbs a day runs on.
const NEEDED = {
  'greeting and politeness': ['你好', '早晨', '唔該', '多謝', '對唔住', '拜拜', '再見'],
  'yes, no and maybe': ['係', '唔係', '有', '冇', '好', '得', '唔得', '可以'],
  'people': ['我', '你', '佢', '我哋', '你哋', '佢哋', '邊個'],
  'asking': ['乜嘢', '咩', '邊度', '幾時', '點', '點解', '幾多', '幾'],
  'numbers': ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千'],
  'classifiers': ['個', '啲', '隻', '張', '條', '本', '杯', '碗'],
  'the day’s verbs': ['食', '飲', '去', '嚟', '睇', '聽', '講', '做', '買', '瞓', '要', '想', '知'],
  'time and place': ['今日', '聽日', '尋日', '而家', '度', '屋企', '出面', '入面'],
  'family': ['媽媽', '爸爸', '仔', '女', '老婆', '老公', '公公', '婆婆'],
};

say('THE FIRST CONVERSATION: where the app teaches each of these\n');
const missing = [];
const late = [];
for (const [group, words] of Object.entries(NEEDED)) {
  const rows = words.map((w) => ({ w, at: pos.get(w) || null, rank: lexRank.get(w) || null }));
  const shown = rows.map((r) => `${r.w}${r.at ? ' ' + r.at : ' —'}`).join('  ');
  say(`  ${group.padEnd(22)} ${shown}`);
  for (const r of rows) {
    if (!r.at) missing.push({ ...r, group });
    else if (r.at > 900) late.push({ ...r, group });
  }
}
say('');
say(`not taught at all: ${missing.length}${missing.length ? ' — ' + missing.map((m) => `${m.w} (${m.rank ? 'in the corpus at rank ' + m.rank + ', but not teachable' : 'not in the corpus'})`).join(', ') : ''}`);
say(`taught after word 900: ${late.length}${late.length ? ' — ' + late.map((m) => `${m.w} at ${m.at}`).join(', ') : ''}`);

// ── 2. what the vocabulary is worth ──────────────────────────────────────
say('\nCOVERAGE OF REAL CONVERSATION\n');
for (const c of DECK.coverage.coverage.filter((c) => c.words <= 6000)) {
  const bar = '█'.repeat(Math.round(c.pct / 2.5));
  say(`  ${String(c.words).padStart(5)} words  ${String(c.pct).padStart(5)}%  ${bar}`);
}

// ── 3. when each skill starts, in teaching order ─────────────────────────
say('\nWHEN EACH SKILL FIRST APPEARS, counted in questions from the start\n');
const SKILL = { 'word-listen': 'hearing a word', 'word-say': 'saying a word', 'word-read': 'reading characters', 'sentence-listen': 'hearing a sentence', 'tone-pair': 'telling tones apart', 'tone-say': 'producing a tone', 'grammar-mean': 'grammar: meaning', 'grammar-pick': 'grammar: choosing', 'grammar-build': 'grammar: building' };
const firstAt = {};
for (const [i, it] of DECK.items.entries()) if (SKILL[it.k] && firstAt[it.k] === undefined) firstAt[it.k] = i + 1;
for (const [k, label] of Object.entries(SKILL)) say(`  ${label.padEnd(24)} ${String(firstAt[k] ?? '—').padStart(6)}`);

// How mixed the first 300 questions are — a course that is all one kind for a
// month teaches one skill.
const first300 = DECK.items.slice(0, 300).reduce((m, it) => ({ ...m, [it.k]: (m[it.k] || 0) + 1 }), {});
say('\n  the first 300 questions: ' + Object.entries(first300).map(([k, n]) => `${k} ${n}`).join(', '));

// ── 4. the grammar syllabus, in arrival order ────────────────────────────
say('\nGRAMMAR, in the order it opens\n');
for (const g of DECK.grammar) {
  const at = DECK.items.findIndex((it) => it.gid === g.id) + 1;
  say(`  ${String(at).padStart(5)}  ${g.title}${g.corpus ? `  (${g.corpus.toLocaleString()} times in the corpus)` : ''}`);
}

// ── 5. the interface ladder against a real pace ──────────────────────────
// The scheduler simulation settles at about 1.4 words a day for a learner
// playing three short sittings. The ladder's thresholds have to be read
// against that, not against an imagined pace.
const WORDS_PER_DAY = 1.4;
say('\nTHE INTERFACE LADDER, against 1.4 words a day (the measured pace)\n');
for (const [key, p] of Object.entries(PHRASES).sort((a, b) => a[1].at - b[1].at)) {
  const days = Math.round(p.at / WORDS_PER_DAY);
  const when = days > 550 ? `${(days / 365).toFixed(1)} years` : days > 60 ? `${Math.round(days / 30.4)} months` : `${days} days`;
  const needsTaught = p.needs.every((w) => pos.has(w));
  say(`  ${String(p.at).padStart(5)} words  ${when.padStart(10)}  ${p.yue.padEnd(6)} ${p.en}${needsTaught ? '' : '   [its own words are NOT all taught]'}`);
}

// ── 6. what the learner can say, not just recognise ──────────────────────
const produce = DECK.items.filter((it) => ['word-say', 'tone-say', 'grammar-build'].includes(it.k)).length;
const recognise = DECK.items.length - produce;
say(`\nPRODUCTION vs RECOGNITION: ${produce.toLocaleString()} questions ask you to produce, ${recognise.toLocaleString()} to recognise (${Math.round((produce / DECK.items.length) * 100)}% production)`);

const tier1 = DECK.words.filter((w) => w.t === 1).length;
say(`\nEVIDENCE BEHIND THE WORDS: ${tier1.toLocaleString()} of the ${DECK.words.length.toLocaleString()} taught words were recorded in conversation; ${(DECK.words.length - tier1).toLocaleString()} come from written-Cantonese frequency.`);
