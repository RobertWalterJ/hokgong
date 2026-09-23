// Hok Gong — everything you can look at rather than be asked.
//
// Words, tones, grammar, where the words come from, progress, and the about
// page that names every source. The design rule from Palimpsest holds: the
// long browsable lists sit at the foot of the home screen, so the app leans
// towards the thing worth doing rather than the thing worth reading.

import { h, sayBtn, sheet, disclosure, show, ICON , readable } from './ui.js';
import { State, cardState, isHolding, dayKey, DAY, now } from './schedule.js';
import { D, wordAt, allIds, examplesOf, SKILL, SKILL_NAMES } from './deck.js';
import { playRecording, playWord, canPlayWord } from './audio.js';
import { toneName, toneChao, voiceCentre, forgetVoice } from './pitch.js';
import { ladder } from './lang.js';
import VERSIONS from './versions.js';
import { header, playButton, S, VERSION, knownWordSet, course } from './app.js';

// ── small shared pieces ──────────────────────────────────────────────────
const SRC_NAME = {
  'CC-Canto': 'CC-Canto, a Cantonese dictionary',
  'CC-Canto readings': 'the CC-Canto Cantonese readings file',
  'CC-CEDICT': 'CC-CEDICT, a Mandarin-Chinese dictionary',
};
const CONF_NOTE = {
  exact: null,
  sandhi: 'The dictionary lists this word in a different tone. Cantonese changes tone constantly without changing the meaning, and the reading above is the one people were recorded using.',
  inferred: 'The dictionary that gives this meaning does not print a Cantonese reading. The reading above is the one recorded in conversation, and rime-cantonese lists no other, so there is no second sense it could belong to.',
};

export function evidenceLine({ sentence = null, by = null, word = null } = {}) {
  const bits = [];
  if (sentence) bits.push(h('span', {}, 'Sentence ',
    h('a', { href: `https://tatoeba.org/en/sentences/show/${sentence}`, target: '_blank', rel: 'noopener' }, `#${sentence}`),
    ' from Tatoeba, CC BY 2.0 FR', by ? `; recorded by ${by}, CC BY 4.0` : ''));
  if (word) bits.push(h('span', {}, 'Meaning from ', SRC_NAME[word] || word, '.'));
  return bits.length ? h('p', { class: 'evidence' }, ...bits) : null;
}

const stateDot = (id) => {
  const st = cardState(State.card(id));
  const label = { unseen: 'not met yet', met: 'met', known: 'known', secure: 'settled' }[st] || st;
  return h('span', { class: 'sdot ' + st, title: label, 'aria-label': label });
};

// The word, as the app knows it: nothing here is written by me.
export function wordCard(i, { example = false, reveal = false } = {}) {
  const d = D();
  const w = d.words[i];
  // Which example: the next one along each time this word comes back.
  const list = examplesOf(i);
  const seenTimes = State.card('wl/' + w.w)?.reps || State.card('ws/' + w.w)?.reps || 0;
  const ex = example && list.length ? list[seenTimes % list.length] : null;
  const showJyut = S().jyutping !== false || reveal;
  return h('div', { class: 'word' },
    h('div', { class: 'wline' },
      h('span', { class: 'han big' }, w.w),
      canPlayWord() ? h('button', { class: 'icon', type: 'button', 'aria-label': `Hear ${w.w}`, html: ICON.speak, onclick: () => playWord(w.w) }) : null),
    showJyut ? h('p', { class: 'jyut' }, readable(w.j)) : null,
    h('p', { class: 'gloss' }, w.g, sayBtn(w.g)),
    w.alt?.length ? h('p', { class: 'note' }, 'also: ' + w.alt.join('; ')) : null,
    ex ? h('div', { class: 'example' },
      h('p', { class: 'han' }, ex.t),
      ex.j ? h('p', { class: 'jyut' }, ex.j) : null,
      h('p', { class: 'gloss' }, ex.e),
      ex.a ? playButton({ sentenceId: ex.id, label: 'Hear this sentence' }) : null,
      evidenceLine({ sentence: ex.id }),
      list.length > 1 ? h('p', { class: 'note' }, `One of ${list.length} sentences this word turns up in.`) : null) : null,
    reveal ? h('p', { class: 'evidence' },
      `${w.t === 1 ? 'Recorded in conversation' : 'From written-Cantonese frequency'}, rank ${w.r.toLocaleString()}. Meaning from ${SRC_NAME[w.s] || w.s}.`) : null,
    reveal && CONF_NOTE[w.c] ? h('p', { class: 'note' }, CONF_NOTE[w.c]) : null,
    ...(d.notesForWord?.get(i) || []).map((n) => h('div', { class: 'gpoint' },
      h('h3', {}, n.title),
      h('p', {}, n.plain, sayBtn(n.plain)),
      n.watch ? h('p', { class: 'watch' }, n.watch) : null)));
}

export function contextCard(card, { compact = false } = {}) {
  if (card.kind === 'quote') {
    return h('article', { class: 'ccard' },
      h('h3', {}, card.title),
      h('blockquote', {}, card.quote, sayBtn(card.quote)),
      h('p', { class: 'evidence' }, `${card.source.author}, ${card.source.title} (${card.source.pub}), ${card.source.licence}.`),
      card.note ? h('p', { class: 'note' }, card.note) : null);
  }
  const words = compact ? card.found.slice(0, 5) : card.found;
  return h('article', { class: 'ccard' },
    h('h3', {}, card.title),
    card.note ? h('p', {}, card.note, sayBtn(card.note)) : null,
    h('div', { class: 'wordset' }, ...words.map((f) => h('button', { class: 'wchip', type: 'button', onclick: () => canPlayWord() && playWord(f.w) },
      h('span', { class: 'han' }, f.w), h('span', { class: 'jyut' }, readable(f.jyut)), h('span', { class: 'gloss' }, f.gloss)))),
    h('p', { class: 'evidence' }, 'Readings and meanings from CC-Canto and the recorded corpus; the words shown are only those the sources carry.'));
}

// ── words ────────────────────────────────────────────────────────────────
function wordsScreen() {
  const d = D();
  const list = h('div', { class: 'rows' });
  const count = h('p', { class: 'note' });
  const input = h('input', { type: 'search', placeholder: 'Search a word, a reading or a meaning', 'aria-label': 'Search the words' });
  const draw = (q = '') => {
    const needle = q.trim().toLowerCase();
    const hits = (needle
      ? d.words.map((w, i) => ({ w, i })).filter(({ w }) => w.w.includes(q.trim()) || w.j.includes(needle) || w.g.toLowerCase().includes(needle))
      : d.words.map((w, i) => ({ w, i }))).slice(0, 300);
    count.textContent = needle
      ? `${hits.length === 300 ? 'first 300 of many' : hits.length} matching`
      : `${d.words.length.toLocaleString()} words, most-spoken first. Showing the first 300 — search to go deeper.`;
    list.replaceChildren(...hits.map(({ w, i }) => h('button', { class: 'row word-row', type: 'button', onclick: () => sheet(wordCard(i, { example: true, reveal: true })) },
      h('span', { class: 'han' }, w.w),
      h('span', { class: 'jyut' }, readable(w.j)),
      h('span', { class: 'gloss' }, w.g),
      stateDot('wl/' + w.w))));
  };
  input.addEventListener('input', () => draw(input.value));
  draw();
  return [header('Words'), h('main', {},
    h('section', { class: 'card' }, input, count),
    list)];
}

// The shape of a tone, drawn from its Chao numbers: 55 is a line along the
// top, 25 climbs from near the bottom to the top, 21 falls. The same motif as
// the app icon, and the same picture the app draws of your own voice.
export function contourGlyph(tone) {
  const chao = toneChao(tone);
  const y = (n) => 15 - (n - 1) * 3.25;                 // 1 at the bottom, 5 at the top
  const a = y(+chao[0]), b = y(+chao[1]);
  return `<svg viewBox="0 0 34 18" fill="none" aria-hidden="true">
    <path d="M1 ${y(3)} H33" stroke="currentColor" stroke-width="1" opacity=".18"/>
    <path d="M3 ${a} C 12 ${a}, 22 ${b}, 31 ${b}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

// ── tones ────────────────────────────────────────────────────────────────
// Kept as constants so the same words are shown and read aloud — a read-aloud
// button that speaks a paraphrase of what is on screen is worse than none.
const TONE_INTRO = 'Cantonese has six tones on an open syllable. They are not decoration: 詩 si1 is a poem, 史 si2 is history, 試 si3 is to try, 時 si4 is time, 市 si5 is a market.';
const TONE_CHAO = 'The numbers in the middle are Chao pitch values, where 5 is the top of your own speaking range and 1 the bottom. A tone is a pitch relative to the speaker, which is why a child and an adult say the same tone an octave apart.';

function tonesScreen() {
  const d = D();
  // An example for each tone, taken from the words being learnt rather than
  // from the usual textbook set — so the examples are words he will meet.
  const example = (tone) => d.words.slice(0, 800).find((w) => /[1-6]$/.test(w.j) && +w.j.slice(-1) === tone && [...w.w].length === 1)
    || d.words.slice(0, 2000).find((w) => +w.j.slice(-1) === tone);
  const rows = [1, 2, 3, 4, 5, 6].map((tone) => {
    const w = example(tone);
    return h('div', { class: 'trow big' },
      h('span', { class: 'tnum' }, String(tone)),
      h('span', { class: 'chao' }, toneChao(tone)),
      h('span', { class: 'glyph', html: contourGlyph(tone) }),
      h('span', { class: 'tname' }, toneName(tone)),
      w ? h('button', { class: 'wchip', type: 'button', onclick: () => canPlayWord() && playWord(w.w) },
        h('span', { class: 'han' }, w.w), h('span', { class: 'jyut' }, readable(w.j)), h('span', { class: 'gloss' }, w.g)) : null);
  });
  const centre = voiceCentre();
  return [header('Tones'), h('main', {},
    h('section', { class: 'card' },
      h('p', {}, TONE_INTRO, sayBtn(TONE_INTRO)),
      h('p', { class: 'note' }, TONE_CHAO, sayBtn(TONE_CHAO)),
      h('div', { class: 'tonelist' }, ...rows)),
    h('section', { class: 'card' },
      h('h2', {}, 'Saying them'),
      h('p', {}, 'Recognising a tone and producing one are different skills, and listening practice never tests the second. When a round asks you to say a word, the phone tracks the pitch of what you said and reports the shape it measured.'),
      centre
        ? h('p', { class: 'note' }, `Your speaking range has been learnt from your own attempts — the centre of it is about ${Math.round(centre)} Hz. Height and movement are both reported.`)
        : h('p', { class: 'note' }, 'Your speaking range has not been learnt yet. Until it has, only the movement — rising, falling or level — is reported as reliable.'),
      h('p', { class: 'note' }, 'Nothing the microphone hears leaves the phone, and nothing is stored but a running estimate of your pitch range.'),
      centre ? h('button', { class: 'ghost wide', type: 'button', onclick: (e) => { forgetVoice(); e.currentTarget.replaceWith(h('p', { class: 'note' }, 'Forgotten. It will be learnt again from your next attempts.')); } }, 'Forget my pitch range') : null),
    h('section', { class: 'card' },
      h('h2', {}, 'The tone pairs in the deck'),
      h('p', { class: 'note' }, `${d.items.filter((i) => i.k === 'tone-pair').length} syllables in the words you are learning have two or more tones that change the meaning. They come round in ordinary rounds.`)))];
}

// ── grammar ──────────────────────────────────────────────────────────────
function grammarScreen() {
  const d = D();
  return [header('Grammar'), h('main', {},
    h('section', { class: 'card' },
      h('p', {}, 'Ten patterns, in the order they actually turn up in recorded Hong Kong conversation. The explanation is mine; every example is a real sentence with a human translation.'),
    ),
    ...d.grammar.map((g) => h('section', { class: 'card' },
      h('h2', {}, g.title),
      h('p', {}, g.plain, sayBtn(g.plain)),
      g.watch ? h('p', { class: 'watch' }, g.watch) : null,
      g.corpus ? h('p', { class: 'note' }, `${g.corpus.toLocaleString()} times in the 125,119-word spoken corpus.`) : null,
      h('div', { class: 'examples' }, ...g.examples.slice(0, 4).map((ex) => h('div', { class: 'example' },
        h('p', { class: 'han' }, ex.text),
        ex.jyut ? h('p', { class: 'jyut' }, ex.jyut) : null,
        h('p', { class: 'gloss' }, ex.eng),
        ex.audio ? playButton({ sentenceId: ex.id, label: 'Hear it' }) : null,
        evidenceLine({ sentence: ex.id })))))),
  )];
}

// ── where the words come from ────────────────────────────────────────────
function contextScreen() {
  const d = D();
  return [header('Where the words come from'), h('main', {},
    h('section', { class: 'card' },
      h('p', {}, 'Cantonese arrived in Canada before Canada did. These cards are the background to the words — quoted from an open-licensed history, or built from the dictionary’s own entries.')),
    ...d.context.map((c) => h('section', { class: 'card' }, contextCard(c))))];
}

// How fast this is actually going, from the days actually played — and what
// that rate means for the 4,000-to-6,000 words a conversation runs on. The
// app would rather say "at this rate, four years" than promise a number it
// has no way of delivering.
function paceCard(k) {
  const d = D();
  const days = Object.entries(State.data.days).sort(([a], [b]) => a.localeCompare(b));
  const recent = days.slice(-14);
  const newSeen = recent.reduce((n, [, v]) => n + (v.newN || 0), 0);
  const spanDays = Math.max(1, recent.length);
  const perDay = newSeen / spanDays;
  // Questions are not words: a word arrives with two or three questions, so
  // the rate is converted using what this deck actually contains.
  const perWord = d.items.length / d.words.length;
  const wordsPerDay = perDay / perWord;
  const toGo = (target) => (wordsPerDay > 0.05 ? Math.round((target - k.n) / wordsPerDay / 30.4) : null);
  const months = toGo(4000);
  return h('section', { class: 'card' },
    h('h2', {}, 'How fast this is going'),
    recent.length < 3
      ? h('p', {}, 'Too early to say. After a few days of playing this will report the rate you are actually going at, not a promise.')
      : h('div', {},
        h('p', {}, `Over the last ${spanDays} day${spanDays === 1 ? '' : 's'} you have taken on ${perDay.toFixed(1)} new questions a day — about ${wordsPerDay.toFixed(1)} words a day.`),
        months && months > 0
          ? h('p', {}, `At that rate, the 4,000 words usually reckoned the start of a conversational vocabulary are about ${months < 24 ? `${months} months` : `${(months / 12).toFixed(1)} years`} away.`)
          : h('p', {}, 'At that rate the list will not finish, which is fine: coverage matters more than completion.'),
        h('p', { class: 'note' }, 'That number moves with how long you play, not with how the app feels. Settings can raise how many new words a day it offers; the reviews that follow are the price.')),
  );
}

// ── look things up ───────────────────────────────────────────────────────
// The reference shelf, behind one door. Home used to list all six of these,
// which turned one thing worth doing into six equal-looking choices.
function lookupScreen() {
  const d = D();
  const link = (label, note, to, render) => h('button', { class: 'row', type: 'button', onclick: () => show(to, render) },
    h('div', {}, h('div', { class: 'rlabel' }, label), h('div', { class: 'note' }, note)), h('span', { class: 'chev', html: ICON.chev }));
  return [header('Look things up'), h('main', {},
    h('nav', { class: 'rows' },
      link('Words', `${d.words.length.toLocaleString()} words, in the order people say them`, 'words', wordsScreen),
      link('Tones', 'The six tones, and whether yours land', 'tones', tonesScreen),
      link('Grammar', `${d.grammar.length} patterns, each with real examples`, 'grammar', grammarScreen),
      link('Where the words come from', `${d.context.length} short cards: Cantonese in Canada, and at the table`, 'context', contextScreen),
      link('About', 'Sources, licences, and what this app cannot do', 'about', aboutScreen)))];
}

// ── the course ───────────────────────────────────────────────────────────
// The whole shape of it, open to read at any time. A learner who can see the
// map is not being gated for the sake of it; they can see what the gate is for.
function courseScreen() {
  const c = course();
  return [header('The course'), h('main', {},
    h('section', { class: 'card' },
      h('p', {}, COURSE_LEAD, sayBtn(COURSE_LEAD)),
      h('p', { class: 'note' }, 'Reviews of anything you have already met keep coming whatever stage you are on. The gate only decides what NEW material opens.')),
    ...c.stages.map((st, n) => h('section', { class: 'card' + (n === c.current ? ' notice' : '') },
      h('div', { class: 'eyebrow' }, st.passed ? `Stage ${n + 1} — passed` : n === c.current ? `Stage ${n + 1} — open now` : `Stage ${n + 1}`),
      h('h2', {}, st.title),
      h('p', {}, st.can),
      n <= c.current
        ? h('div', {},
          h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${Math.round((Math.min(st.have, st.need) / st.need) * 100)}%` })),
          h('p', { class: 'note' }, `${st.have} of ${st.need} words${st.grammarNeeded ? `, ${st.grammar} of ${st.grammarNeeded} grammar points` : ''}`),
          h('div', { class: 'wordset' }, ...st.words.map((i) => {
            const w = D().words[i];
            return h('button', { class: 'wchip', type: 'button', onclick: () => sheet(wordCard(i, { example: true, reveal: true })) },
              h('span', { class: 'han' }, w.w), h('span', { class: 'jyut' }, readable(w.j)), h('span', { class: 'gloss' }, w.g));
          })))
        : h('p', { class: 'note' }, `${st.words.length} words, waiting until the stage before it is passed.`),
      h('p', { class: 'note' }, st.why))),
    h('section', { class: 'card' },
      h('h2', {}, 'And after that'),
      h('p', {}, `The other ${(D().words.length - c.stages.reduce((n, s) => n + s.words.length, 0)).toLocaleString()} words, in the order people actually say them. No stages, no gates — by then the sentences hold themselves up.`)))];
}
const COURSE_LEAD = 'Ten stages, each a small vocabulary plus the grammar that turns those words into sentences, and each ending with something you can do. A stage stays shut until the one before it is passed — not to make a game of it, but because a measure word is no use before you can count.';

// ── progress ─────────────────────────────────────────────────────────────
// The rule carried over from Palimpsest: report what was observed, and say
// plainly what each number does and does not mean.
function progressScreen() {
  const d = D();
  const ids = allIds();
  const can = State.canAnswer(ids);
  const met = ids.filter((id) => State.card(id)).length;
  const known = ids.filter((id) => ['known', 'secure'].includes(cardState(State.card(id)))).length;
  const holding = ids.filter((id) => isHolding(State.card(id))).length;
  const k = knownWordSet();
  const cs = course();

  // What that vocabulary is worth, measured on the corpus rather than assumed.
  // The mark reached, and the next one. Before the first mark there is no band
  // to report, and saying "the first 100 words cover 66.6%" as though it had
  // been reached would be a small lie about the learner's own progress.
  const cov = d.coverage.coverage;
  const band = cov.filter((c) => c.words <= k.n).pop() || null;
  const next = cov.find((c) => c.words > k.n) || null;

  const bySkill = {};
  for (const it of d.items) {
    const s = SKILL[it.k];
    if (!s) continue;
    const c = State.card(it.id);
    bySkill[s] = bySkill[s] || { n: 0, met: 0, can: 0 };
    bySkill[s].n++;
    if (c) bySkill[s].met++;
    if (c && c.st !== 'new' && c.ok) bySkill[s].can++;
  }

  const lad = ladder();
  const days = Object.keys(State.data.days).sort();
  const firstSnap = State.snapAt(now() - 7 * DAY);

  return [header('Progress'), h('main', {},
    h('section', { class: 'card' },
      h('h2', {}, `${k.n.toLocaleString()} words you can answer`),
      band
        ? (() => { const line = `The first ${band.words.toLocaleString()} words of recorded Cantonese conversation cover ${band.pct}% of everything said in it.`; return h('p', {}, line, sayBtn(line)); })()
        : h('p', {}, `The first mark is ${next ? next.words.toLocaleString() : '100'} words — ${next ? next.pct : 66.6}% of everything said in recorded conversation. ${next ? (next.words - k.n).toLocaleString() : ''} to go.`),
      next && band ? h('p', { class: 'note' }, `The next mark is ${next.words.toLocaleString()} words, which covers ${next.pct}%.`) : null,
      h('p', { class: 'note' }, 'Coverage is counted on the 125,119 words of recorded conversation in the corpus — not borrowed from a study of English. It says how much of what you hear will be words you have met; it does not say you will follow the conversation.')),

    // The course, as a list of modules with a mark against each — the plainest
    // answer to "how far have I got".
    h('section', { class: 'card' },
      h('h2', {}, 'The ten stages'),
      ...cs.stages.map((st, n) => {
        const pctW = Math.round((Math.min(st.have, st.need) / st.need) * 100);
        return h('div', { class: 'skill' },
          h('div', { class: 'srow' },
            h('span', {}, `${st.passed ? '✓ ' : ''}${n + 1}. ${st.title}`),
            h('span', { class: 'num' }, st.passed ? 'passed' : n === cs.current ? `${st.have}/${st.need}` : 'not open yet')),
          h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${n < cs.current ? 100 : n === cs.current ? pctW : 0}%` })));
      }),
      h('p', { class: 'note' }, cs.done
        ? 'All ten passed. The rest of the word list is open, in frequency order.'
        : `Stage ${cs.current + 1} is open. A stage passes when you can answer ${Math.round((cs.stages[cs.current].gate) * 100)}% of its words and have met its grammar points.`)),

    h('section', { class: 'card' },
      h('h2', {}, 'Where each skill stands'),
      ...Object.entries(SKILL_NAMES).map(([key, name]) => {
        const s = bySkill[key] || { n: 0, met: 0, can: 0 };
        const pct = s.met ? Math.round((s.can / s.met) * 100) : 0;
        return h('div', { class: 'skill' },
          h('div', { class: 'srow' }, h('span', {}, name), h('span', { class: 'num' }, `${s.can.toLocaleString()} of ${s.met.toLocaleString()} met`)),
          h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${pct}%` })),
          s.met ? null : h('p', { class: 'note' }, 'Not started yet.'));
      }),
      h('p', { class: 'note' }, 'Met means the question has come up at least once. The bar is how many of those you answered right when they last came round.')),

    h('section', { class: 'card' },
      h('h2', {}, 'Held over time'),
      h('p', {}, `${known.toLocaleString()} questions are known — answered right after at least three weeks away. ${holding.toLocaleString()} more are settling: right, with the next check a week or more out.`),
      firstSnap ? h('p', { class: 'note' }, `A week ago you could answer ${firstSnap.can.toLocaleString()}; now ${can.toLocaleString()}.`)
        : h('p', { class: 'note' }, 'Come back in a week and this will say what moved.'),
      h('p', { class: 'note' }, `${met.toLocaleString()} of ${ids.length.toLocaleString()} questions have come up so far, over ${days.length} day${days.length === 1 ? '' : 's'} of playing.`)),

    paceCard(k),

    h('section', { class: 'card' },
      h('h2', {}, 'The interface'),
      h('p', {}, `${lad.on} of ${lad.total} interface phrases are in Cantonese now.`),
      lad.next ? h('p', { class: 'note' }, `The next one arrives at ${lad.next.at} words: ${lad.next.yue} (${lad.next.jyut}) — ${lad.next.en}.`) : h('p', { class: 'note' }, 'That is all of them.'),
      h('p', { class: 'note' }, 'A phrase only switches once you can answer its own words. Settings can put the whole interface back into English at any time.')),

    // Folded, not dropped: every caveat is still here, one tap behind a label
    // that says exactly what it holds.
    h('section', { class: 'card' },
      disclosure('What these numbers are not',
        h('p', { class: 'note' }, 'None of this measures whether you can hold a conversation. It measures whether you can answer these questions about these words — which is a real thing, and a narrower thing.'),
        h('p', { class: 'note' }, 'Vocabulary size here counts words you have answered in this app. It is not an estimate of your whole Cantonese vocabulary, and it does not count anything you learnt from Pimsleur, from your wife, or from Peppa Pig.'),
        h('p', { class: 'note' }, 'Tone feedback measures pitch only. Saying a word with the right pitch shape is not the same as saying it the way a Cantonese speaker would.'))),
  )];
}

// ── about ────────────────────────────────────────────────────────────────
// Held as constants so the read-aloud button speaks exactly what is on screen.
const ABOUT_LEAD = 'Learning to talk. A Cantonese app that only teaches what a published source actually says, and only claims progress it has measured.';
const CANNOT = [
  'It cannot hear whether you pronounced a word correctly. It measures the pitch of a syllable, which is a part of that and not the whole of it.',
  'It cannot teach you to hold a conversation on its own. It builds the vocabulary, the ear and the grammar patterns that a conversation runs on; the conversation still has to happen with a person.',
];
function aboutScreen() {
  const d = D();
  const src = (title, body, licence) => h('div', { class: 'source' }, h('h3', {}, title), h('p', {}, body), h('p', { class: 'evidence' }, licence));
  return [header('About'), h('main', {},
    h('section', { class: 'card' },
      h('h2', {}, '學講 Hok Gong'),
      h('p', {}, ABOUT_LEAD, sayBtn(ABOUT_LEAD)),
      h('p', { class: 'evidence' }, `Version ${VERSION.v}${VERSION.date ? ` · built ${VERSION.date}` : ''}${VERSION.commit ? ` · ${VERSION.commit}` : ''} · word list built ${d.built}`),
      disclosure('What changed, and when',
        ...VERSIONS.map((r) => h('div', { class: 'gpoint' },
          h('h3', {}, `${r.v} — ${r.date}`),
          h('ul', { class: 'changes' }, ...r.what.map((line) => h('li', {}, line))))))),

    h('section', { class: 'card' },
      h('h2', {}, 'Where everything comes from'),
      src('Hong Kong Cantonese Corpus (HKCanCor)',
        'Luke Kang Kwong and May Wong. 93 recordings of spontaneous Hong Kong conversation and radio, made in 1997–98, segmented into words and tagged with part of speech and Jyutping. 125,119 usable word tokens. This is what makes the word list spoken Cantonese rather than written Chinese: frequency is counted from people talking to each other.',
        'CC BY 4.0 · github.com/fcbond/hkcancor'),
      src('rime-cantonese',
        'A Jyutping lexicon and a written-Cantonese frequency list, used to confirm pronunciations and to carry the word list past the 6,399 words the corpus happened to record.',
        'CC BY 4.0 · github.com/rime/rime-cantonese'),
      src('CC-Canto and CC-CEDICT',
        'The dictionaries the meanings come from. CC-CEDICT is a Mandarin dictionary, so a gloss is only used when it belongs to the pronunciation the word actually has in Cantonese.',
        'CC BY-SA 3.0 / CC BY-SA 4.0 · cantonese.org'),
      src('Tatoeba',
        'Every example sentence, with its own human English translation, and 1,784 sentences recorded by a human speaker. Each keeps its id so it can be checked and credited.',
        'Sentences CC BY 2.0 FR · audio CC BY 4.0 · tatoeba.org'),
      src('John Douglas Belshaw, Canadian History: Pre- and Post-Confederation',
        'The history quoted on the cards about Cantonese in Canada. Quoted word for word, and checked against the source at every build.',
        'CC BY 4.0 · BCcampus, 2016')),

    h('section', { class: 'card' },
      h('h2', {}, 'How it decides what to ask'),
      h('p', {}, 'Every question is scheduled on its own. Answer it right and it comes back later; miss it and it comes back sooner. Nothing is asked twice in a session, and nothing asked in the last four hours comes back — so when it does return it is testing memory, not the screen you just looked at.'),
      h('p', {}, 'New words arrive only as fast as the reviews allow: five when little is waiting, one when a backlog has built up, and never more than twelve a day unless you ask for more.'),
      h('p', { class: 'note' }, 'This is spaced retrieval practice, the method with the strongest evidence behind it for vocabulary. The intervals here are a simple version of SM-2, adjusted by how you answer.')),

    h('section', { class: 'card' },
      h('h2', {}, 'What this app cannot do', sayBtn(CANNOT.join(' '))),
      h('p', {}, CANNOT[0]),
      h('p', {}, CANNOT[1]),
      h('p', {}, 'The recorded corpus is from 1997 and 1998. Everyday grammar and conversation hold up; anything about technology, money or slang may be dated.'),
      h('p', {}, 'Roughly a third of the most common words have no dictionary gloss that matches the way they are said. Those are left out rather than guessed at, which is why some very common words are missing.')),

    h('section', { class: 'card' },
      h('h2', {}, 'Licence'),
      h('p', {}, 'The code is Robert Walter-Joseph’s. The data belongs to the projects above and is used under their licences, which require attribution — hence this page.')),
  )];
}

export const browseScreens = { course: courseScreen, lookup: lookupScreen, words: wordsScreen, tones: tonesScreen, grammar: grammarScreen, context: contextScreen, progress: progressScreen, about: aboutScreen };
