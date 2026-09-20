// Hok Gong 學講 — learning to talk.
//
// A Cantonese app built the way Palimpsest was: retrieval practice, spacing
// that adapts to what you actually remember, and measurement you can check.
// The difference is what is being learnt — five skills, not one — so the app
// asks about each of them and reports each of them separately.
//
// Screens live in browse.js; this file is the shell, the home screen and the
// round.

import { h, iconBtn, sayBtn, sheet, closeSheet, disclosure, show, route, back, currentScreen, repaint, ICON, applyReading, READ_DEFAULTS } from './ui.js';
import { initSpeech, say, unlock, available as speechAvailable, cantoneseAvailable, onSpeaking } from './speech.js';
import { playRecording, playWord, stopAudio, onAudio, canPlayWord, haveRecordings, probeRecordings } from './audio.js';
import { State, Round, cardState, isHolding, dayKey, newLeftToday, nextDueSentence, now, shuffle, DAY } from './schedule.js';
import { loadDeck, indexDeck, D, wordOf, exampleOf, allIds, askableIds, setAsideCount, SKILL, SELF_RATED } from './deck.js';
import { setProgress, setEnglishOnly, t } from './lang.js';
import { press as tick, right as correct, wrong, setSound as setSoundOn } from './sound.js';
import { attempt as toneAttempt, rank as toneRank, toneName, toneChao } from './pitch.js';
import { browseScreens, evidenceLine, wordCard, contextCard } from './browse.js';

export const VERSION = window.HOKGONG_BUILD || { v: 'dev', date: '', commit: '' };

// ── what the learner can answer, for the interface ladder ────────────────
export function knownWordSet() {
  const d = D();
  const out = new Set();
  let n = 0;
  for (const it of d.items) {
    if (it.i == null) continue;
    const c = State.card(it.id);
    if (c && c.st !== 'new' && c.ok) { const w = d.words[it.i].w; if (!out.has(w)) { out.add(w); n++; } }
  }
  return { words: out, n };
}
function refreshLadder() {
  const k = knownWordSet();
  setProgress(k);
  return k;
}

// ── settings ─────────────────────────────────────────────────────────────
const S = () => State.data.settings;
function settingsSheet() {
  const s = S();
  const row = (label, note, control) => h('div', { class: 'srow' },
    h('div', {}, h('div', { class: 'slabel' }, label), note ? h('div', { class: 'note' }, note) : null), control);
  const toggle = (key, on, onchange) => h('button', {
    class: 'toggle', type: 'button', role: 'switch', 'aria-checked': on ? 'true' : 'false',
    onclick: (e) => { const v = !on; s[key] = v; State.save(); onchange?.(v); e.currentTarget.setAttribute('aria-checked', v ? 'true' : 'false'); e.currentTarget.classList.toggle('on', v); },
  }, h('span', { class: 'knob' }));
  const box = sheet(
    h('h2', {}, 'Settings'),
    row('Sound', 'Small clicks when you answer.', toggle('sound', s.sound !== false, (v) => setSoundOn(v))),
    row('Always show Jyutping', 'The romanisation under every Cantonese word.', toggle('jyutping', s.jyutping !== false)),
    row('Keep the interface in English', 'Turns off the slow switch to Cantonese labels.', toggle('englishOnly', !!s.englishOnly, (v) => setEnglishOnly(v))),
    row('Larger text', 'Also available in your phone’s own settings.', toggle('big', !!s.big, (v) => document.documentElement.classList.toggle('big', v))),
    h('div', { class: 'srow col' },
      h('div', {}, h('div', { class: 'slabel' }, 'How fast to take on new words'),
        h('div', { class: 'note' }, 'New words are the part you choose. Reviews then arrive as they fall due — which is why a keen week makes a busy fortnight.')),
      h('div', { class: 'paces' }, ...Object.entries(PACES).map(([key, p]) => h('button', {
        class: 'pace' + ((s.pace || 'steady') === key ? ' on' : ''), type: 'button',
        onclick: (e) => {
          s.pace = key; State.save();
          for (const b of e.currentTarget.parentElement.children) b.classList.remove('on');
          e.currentTarget.classList.add('on');
        },
      }, h('span', { class: 'plabel' }, p.label), h('span', { class: 'note' }, p.note))))),
    h('div', { class: 'note' }, 'Everything is stored on this phone only. Nothing is sent anywhere, including what the microphone hears.'),
    h('button', { class: 'wide', type: 'button', onclick: () => { closeSheet(); show('about', browseScreens.about); } }, 'Sources, licences and version'),
  );
  for (const b of box.querySelectorAll('.toggle')) b.classList.toggle('on', b.getAttribute('aria-checked') === 'true');
  return box;
}

// ── the shell ────────────────────────────────────────────────────────────
function header(title, { home = false } = {}) {
  return h('header', { class: 'bar' },
    home ? h('div', { class: 'wordmark' },
      h('span', { class: 'han' }, '學講'),
      h('span', { class: 'name' }, 'Hok Gong'),
      // The rising line from the app's icon: tone 2, the contrast the app
      // spends most of its time teaching.
      h('span', { class: 'rise', html: ICON.rise }))
      : iconBtn('back', 'Back', back),
    h('h1', {}, title),
    iconBtn('settings', 'Settings', settingsSheet));
}

const phraseOfDay = () => {
  const d = D();
  const pool = d.words.slice(0, 400).map((w, i) => ({ w, i })).filter((x) => d.examples[x.i]);
  if (!pool.length) return null;
  const key = dayKey();
  let hash = 0;
  for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
};

// ── home ─────────────────────────────────────────────────────────────────
function homeScreen() {
  const d = D();
  const ids = askableIds(canPlayWord(), haveRecordings());
  const k = refreshLadder();
  const due = State.dueIds(ids).length;
  const fresh = ids.filter((id) => !State.card(id)).length;
  const room = newLeftToday(pace());
  const met = ids.filter((id) => State.card(id)).length;
  const run = State.runOfDays();

  const todayLine = due || room
    ? `${due ? `${due} to come back to` : 'Nothing due'}${room && fresh ? ` · ${Math.min(room, fresh)} new` : ''}`
    : 'Today’s words are done';

  const start = t('start');
  const startBtn = h('button', { class: 'start', type: 'button', onclick: () => startRound({}) },
    h('span', { class: 'han' }, start.text),
    start.sub ? h('span', { class: 'sub' }, start.sub) : null);

  const p = phraseOfDay();
  const dayCard = p ? h('section', { class: 'card sheet-card day' },
    h('div', { class: 'eyebrow' }, 'A word today'),
    wordCard(p.i, { example: true }),
  ) : null;

  const link = (label, note, to, render) => h('button', { class: 'row', type: 'button', onclick: () => show(to, render) },
    h('div', {}, h('div', { class: 'rlabel' }, label), h('div', { class: 'note' }, note)), h('span', { class: 'chev', html: ICON.chev }));

  return [
    header('', { home: true }),
    h('main', { class: 'home' },
      h('section', { class: 'today' },
        h('p', { class: 'lead' }, todayLine),
        startBtn,
        met >= 12 ? h('button', { class: 'ghost wide', type: 'button', onclick: () => startRound({ practice: true }) }, 'Recall test — the words most likely to have slipped') : null,
        run > 1 ? h('p', { class: 'note centre' }, `${run} days in a row.`) : null,
        !due && !room && fresh ? h('button', { class: 'link', type: 'button', onclick: () => startRound({ beyondDaily: true }) }, 'Learn more anyway') : null,
        !due && !fresh && met ? h('p', { class: 'note centre' }, nextDueSentence(State.nextDue(ids) || now())) : null),
      canPlayWord() && haveRecordings() ? null : noVoiceCard(),
      dayCard,
      h('nav', { class: 'rows' },
        link(t('words').text, `${d.words.length.toLocaleString()} words, in the order people say them`, 'words', browseScreens.words),
        link(t('tones').text, 'The six tones, and whether yours land', 'tones', browseScreens.tones),
        link(t('grammar').text, `${d.grammar.length} patterns, each with real examples`, 'grammar', browseScreens.grammar),
        link('Where the words come from', `${d.context.length} short cards: Cantonese in Canada, and at the table`, 'context', browseScreens.context),
        link('Progress', 'What you can answer, and how that has moved', 'progress', browseScreens.progress),
        link('About', 'Sources, licences, and what this app cannot do', 'about', browseScreens.about)),
    ),
  ];
}

// Said once, on the home screen, rather than inside a question the learner
// cannot answer: without a Cantonese voice, "which of these did you hear?"
// plays nothing at all.
// One plain line in the open; the troubleshooting folded behind a label. It
// used to open the app with eight lines of settings paths before a single word
// of Cantonese (design audit, 20 Sept).
function noVoiceCard() {
  const voice = canPlayWord(), recs = haveRecordings();
  const aside = setAsideCount(voice, recs);
  return h('section', { class: 'card notice' },
    h('p', { class: 'note' },
      `${aside.toLocaleString()} question${aside === 1 ? '' : 's'} need ${voice ? 'a recording this phone cannot reach' : 'a Cantonese voice this phone does not have'}, and ${aside === 1 ? 'is' : 'are'} set aside.`),
    disclosure(voice ? 'Why, and what still works' : 'How to add a Cantonese voice',
      voice ? null : h('p', { class: 'note' }, 'On Android: Settings → System → Languages → Text-to-speech, and install Chinese (Hong Kong). On iPhone: Settings → Accessibility → Spoken Content → Voices → Chinese, Cantonese. On Windows: Settings → Time & language → Speech → Manage voices.'),
      recs ? null : h('p', { class: 'note' }, 'This copy of the app carries no audio of its own and cannot reach Tatoeba’s. The installed version on your phone has all 545 recordings built in.'),
      h('p', { class: 'note' }, 'Everything else still works. A Mandarin voice is never used as a stand-in: it would teach the wrong language.')));
}

// ── pace ─────────────────────────────────────────────────────────────────
// Vocabulary apps that push new words regardless of the review backlog bury
// the learner. The pace is set by how much is waiting.
export const PACES = {
  gentle: { label: 'Gentle', note: 'About 8 new questions a day.', newPerRound: 3, newPerDay: 8 },
  steady: { label: 'Steady', note: 'About 18 a day — the default.', newPerRound: 5, newPerDay: 18 },
  keen: { label: 'Keen', note: 'Up to 40 a day. Expect a lot more reviewing tomorrow.', newPerRound: 8, newPerDay: 40 },
};
const pace = () => PACES[S().pace] || PACES.steady;

// ── the round ────────────────────────────────────────────────────────────
let session = { asked: new Set() };

function startRound(opts) {
  unlock();
  const r = new Round(askableIds(canPlayWord(), haveRecordings()), { ...opts, exclude: session.asked, pace: pace(), groupOf: D().groupOf });
  if (r.empty) { show('round', () => emptyRound()); return; }
  show('round', () => roundScreen(r, { practice: !!opts.practice }), { arg: null });
}

function emptyRound() {
  return [header('Round'), h('main', {}, h('section', { class: 'card' },
    h('p', {}, 'Nothing to ask just now — everything has been asked in the last few hours.'),
    h('p', { class: 'note' }, 'That wait is the point: a question you were shown ten minutes ago tests your short-term memory, not your Cantonese.'),
    h('button', { class: 'wide primary', type: 'button', onclick: () => show('home', homeScreen) }, 'Back to the start')))];
}

function roundScreen(round, { practice }) {
  const box = h('main', { class: 'round' });
  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' });
  const total = round.queue.length;
  let done = 0, right = 0;
  const tally = { };

  const paint = () => {
    dots.replaceChildren(...Array.from({ length: total }, (_, i) => h('span', { class: 'dot' + (i < done ? ' done' : '') })));
  };
  const finish = () => {
    State.snapshot(allIds());   // progress counts the whole deck, not just what is askable today
    refreshLadder();
    box.replaceChildren(summary());
    window.scrollTo(0, 0);
  };
  const summary = () => {
    const card = D().context[Math.floor(Math.random() * D().context.length)];
    const left = new Round(askableIds(canPlayWord(), haveRecordings()), { practice, exclude: session.asked, pace: pace(), groupOf: D().groupOf });
    return h('section', { class: 'card' },
      h('h2', {}, `${right} of ${done}`),
      h('p', { class: 'note' }, practice ? 'A recall test does not change when a word comes back — it only tells you where you stand.' : byline(tally)),
      card ? h('div', { class: 'ctx' }, contextCard(card, { compact: true })) : null,
      left.empty ? h('p', { class: 'note' }, nextDueSentence(State.nextDue(askableIds(canPlayWord(), haveRecordings())) || now()))
        : h('button', { class: 'wide primary', type: 'button', onclick: () => startRound({ practice }) }, t('onceMore').text),
      h('button', { class: 'ghost wide', type: 'button', onclick: () => show('home', homeScreen) }, t('done').text));
  };

  const ask = () => {
    const id = round.next();
    if (!id) { finish(); return; }
    const it = D().byId.get(id);
    session.asked.add(id);
    const onAnswer = (ok) => {
      done++; if (ok) right++;
      const s = SKILL[it.k] || 'other';
      tally[s] = tally[s] || { n: 0, ok: 0 };
      tally[s].n++; if (ok) tally[s].ok++;
      State.answer(id, ok, { practice });
      (ok ? correct : wrong)();
      paint();
    };
    box.replaceChildren(dots, question(it, { onAnswer, onNext: ask, practice }));
    paint();
    window.scrollTo(0, 0);
  };
  ask();
  return [header(practice ? 'Recall test' : t('learn').text), box];
}

const byline = (tally) => {
  const parts = Object.entries(tally).map(([s, v]) => `${SKILL_LABEL[s] || s} ${v.ok}/${v.n}`);
  return parts.join(' · ');
};
const SKILL_LABEL = { listening: 'listening', speaking: 'saying', tones: 'tones', reading: 'reading', grammar: 'grammar' };

// ── one question ─────────────────────────────────────────────────────────
function question(it, ctx) {
  switch (it.k) {
    case 'word-listen': return listenWord(it, ctx);
    case 'word-read': return readWord(it, ctx);
    case 'word-say': return sayWord(it, ctx);
    case 'sentence-listen': return listenSentence(it, ctx);
    case 'tone-pair': return tonePair(it, ctx);
    case 'tone-say': return toneSay(it, ctx);
    case 'grammar-mean': return grammarMean(it, ctx);
    case 'grammar-pick': return grammarPick(it, ctx);
    case 'grammar-build': return grammarBuild(it, ctx);
    default: return h('section', { class: 'card' }, h('p', {}, 'Unknown question.'));
  }
}

const prompt = (text) => h('p', { class: 'prompt' }, text, sayBtn(text));

// Four buttons, the right answer in a seeded-random place, and no colour-only
// feedback: right and wrong are marked with a word and a symbol as well.
function choices(options, answer, onPick) {
  const wrap = h('div', { class: 'choices' });
  const all = shuffle([answer, ...options]);
  for (const o of all) {
    const b = h('button', { class: 'choice', type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = o === answer;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark' }, ok ? '✓' : '✗'));
      if (!ok) for (const other of wrap.children) if (other.dataset.v === answer) { other.classList.add('right'); other.append(h('span', { class: 'mark' }, '✓')); }
      onPick(ok);
    } }, o);
    b.dataset.v = o;
    wrap.append(b);
  }
  return wrap;
}

function afterCard(kids, { onNext }) {
  return h('div', { class: 'after' }, ...[].concat(kids).filter(Boolean),
    h('button', { class: 'wide primary', type: 'button', onclick: onNext }, t('next').text));
}

// A play button that says what it is playing: a person, or a machine voice.
function playButton({ sentenceId = null, word = null, label = 'Play' }) {
  const b = h('button', { class: 'play', type: 'button' },
    h('span', { class: 'ico', html: ICON.play }), h('span', {}, label));
  const go = () => {
    unlock();
    if (sentenceId) playRecording(sentenceId);
    else if (word) playWord(word);
  };
  b.addEventListener('click', go);
  // Autoplay on arrival is what a listening question is for; browsers allow it
  // once the learner has tapped anything at all this session.
  setTimeout(go, 220);
  return b;
}

// Only says this when a machine voice actually spoke. On a phone with no
// Cantonese voice the question shows the characters instead, and crediting a
// voice that never spoke is the sort of small untruth this app is built to
// avoid.
const voiceNote = (kind) => (kind === 'tts' && canPlayWord()
  ? h('p', { class: 'note' }, 'Spoken by your phone’s Cantonese voice — a machine approximation, not a recording of a person.')
  : null);

const noVoice = () => h('p', { class: 'warn' },
  'This phone has no Cantonese voice installed, so there is nothing to play. The word and its Jyutping are shown instead — and every question with a real recording still works.');

// 1. Hear a word, know what it means.
function listenWord(it, ctx) {
  const w = wordOf(it);
  const card = h('section', { class: 'card q' },
    prompt(t('listen').stage ? `${t('listen').text} — what does it mean?` : 'What does this mean?'),
    canPlayWord() ? playButton({ word: w.w, label: t('listen').text }) : noVoice(),
    canPlayWord() ? null : h('p', { class: 'han big' }, w.w),
    canPlayWord() ? null : h('p', { class: 'jyut' }, w.j));
  card.append(choices(it.options, w.g, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([wordCard(it.i, { example: true, reveal: true }), voiceNote('tts')], ctx));
  }));
  return card;
}

// 2. See the characters, know the word. Reading, which comes later.
function readWord(it, ctx) {
  const w = wordOf(it);
  const card = h('section', { class: 'card q' },
    prompt('What does this say?'),
    h('p', { class: 'han big' }, w.w),
    S().jyutping !== false ? null : h('p', { class: 'note' }, 'Jyutping is hidden for this question.'));
  card.append(choices(it.options, w.g, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([wordCard(it.i, { example: true, reveal: true })], ctx));
  }));
  return card;
}

// 3. See the meaning, say the word. The app cannot mark this, and says so.
function sayWord(it, ctx) {
  const w = wordOf(it);
  const card = h('section', { class: 'card q' },
    prompt('Say this in Cantonese'),
    h('p', { class: 'gloss big' }, w.g));
  const reveal = h('button', { class: 'wide primary', type: 'button', onclick: () => {
    reveal.remove();
    card.append(
      wordCard(it.i, { example: true, reveal: true }),
      h('p', { class: 'note' }, 'Only you can hear whether that matched. Be honest with yourself — the schedule is only as good as the answer you give it.'),
      h('div', { class: 'choices two' },
        h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(true); card.append(afterCard([], ctx)); } }, t('iKnow').text),
        h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(false); card.append(afterCard([], ctx)); } }, t('iDont').text)));
  } }, 'Show me');
  card.append(reveal);
  return card;
}

// 4. A recorded sentence, by a person, with their name on it.
function listenSentence(it, ctx) {
  const card = h('section', { class: 'card q' },
    prompt('What is being said?'),
    playButton({ sentenceId: it.sid, label: t('listenAgain').stage ? t('listenAgain').text : 'Play again' }));
  card.append(choices(it.options, it.eng, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([
      h('p', { class: 'han big' }, it.text),
      h('p', { class: 'gloss' }, it.eng),
      evidenceLine({ sentence: it.sid, by: it.by }),
    ], ctx));
  }));
  return card;
}

// 5. Two words, one syllable, different tones: which did you hear?
function tonePair(it, ctx) {
  const d = D();
  const picks = it.choices.map((c) => ({ ...c, w: d.words[c.i] }));
  const target = picks[Math.floor(Math.random() * picks.length)];
  const card = h('section', { class: 'card q' },
    prompt(t('whichTone').stage ? t('whichTone').text : 'Which one did you hear?'),
    canPlayWord() ? playButton({ word: target.w.w, label: 'Play again' }) : noVoice(),
    h('p', { class: 'note' }, `All of these are ${it.syll} — only the tone differs.`));
  const wrap = h('div', { class: 'choices' });
  for (const p of shuffle(picks)) {
    const b = h('button', { class: 'choice tone', type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = p.w.w === target.w.w;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark' }, ok ? '✓' : '✗'));
      ctx.onAnswer(ok);
      card.append(afterCard([
        h('p', {}, `It was ${target.w.w} ${target.w.j} — ${target.w.g}.`),
        h('div', { class: 'tonelist' }, ...picks.map((x) => h('div', { class: 'trow' },
          h('span', { class: 'han' }, x.w.w), h('span', { class: 'jyut' }, x.w.j),
          h('span', { class: 'chao' }, `tone ${x.tone} · ${toneChao(x.tone)}`), h('span', { class: 'gloss' }, x.w.g)))),
      ], ctx));
    } }, h('span', { class: 'han' }, p.w.w), h('span', { class: 'jyut' }, p.w.j));
    wrap.append(b);
  }
  card.append(wrap);
  return card;
}

// 6. Say the tone, and let the phone measure the pitch it actually heard.
function toneSay(it, ctx) {
  const d = D();
  const pick = it.choices[Math.floor(Math.random() * it.choices.length)];
  const w = d.words[pick.i];
  const card = h('section', { class: 'card q' },
    prompt('Say this word out loud'),
    h('p', { class: 'han big' }, w.w),
    h('p', { class: 'jyut' }, w.j),
    h('p', { class: 'gloss' }, w.g),
    canPlayWord() ? playButton({ word: w.w, label: 'Hear it first' }) : null,
    h('p', { class: 'note' }, `Tone ${pick.tone}: ${toneName(pick.tone)} (${toneChao(pick.tone)}).`));
  const out = h('div', { class: 'toneout' });
  const rec = h('button', { class: 'wide primary', type: 'button', onclick: async () => {
    rec.disabled = true;
    rec.textContent = 'Listening…';
    let res;
    try { res = await toneAttempt(); } catch (err) { res = { ok: false, why: 'The microphone is not available: ' + err.message }; }
    rec.remove();
    if (!res.ok) {
      out.append(h('p', { class: 'warn' }, res.why),
        h('p', { class: 'note' }, 'You can still mark this yourself.'));
    } else {
      const best = res.ranking[0];
      const ok = best.tone === pick.tone;
      out.append(
        contour(res),
        h('p', { class: ok ? 'good' : 'warn' }, ok
          ? `That was ${res.movement}${res.calibrated ? ` and sat ${place(res.height)} in your range` : ''} — which is tone ${pick.tone}.`
          : `I measured a ${res.movement} pitch${res.calibrated ? `, sitting ${place(res.height)} in your range` : ''}. That is closest to tone ${best.tone} (${best.name}); tone ${pick.tone} is ${toneName(pick.tone)}.`),
        res.calibrated ? null : h('p', { class: 'note' }, 'Your pitch range is still being learnt, so for now only the movement — rising, falling or level — is reliable. After a few more attempts the height will be too.'),
        h('p', { class: 'note' }, 'This measures pitch only. It cannot hear your vowels or endings, and it is not a judgement of your accent.'));
    }
    out.append(h('div', { class: 'choices two' },
      h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(true); out.append(afterCard([], ctx)); } }, 'That was right'),
      h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(false); out.append(afterCard([], ctx)); } }, 'Not yet')));
  } }, 'Record me saying it');
  card.append(rec, out);
  return card;
}
const place = (h0) => (h0 > 0.8 ? 'high' : h0 < -0.6 ? 'low' : 'in the middle');

// A small picture of the pitch, because a number is not a shape.
function contour(res) {
  const pts = res.points;
  if (!pts.length) return null;
  const W = 260, H = 90;
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || 1;
  const xs = (p) => ((p.t - t0) / (t1 - t0 || 1)) * (W - 8) + 4;
  const ys = (p) => H / 2 - Math.max(-8, Math.min(8, p.v)) * (H / 2 - 6) / 8;
  const dpath = pts.map((p, i) => `${i ? 'L' : 'M'}${xs(p).toFixed(1)} ${ys(p).toFixed(1)}`).join(' ');
  return h('div', { class: 'contour', html:
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="The pitch of what you said, over time">
      <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" class="mid"/>
      <path d="${dpath}" class="line"/>
    </svg>` });
}

// 7–9. Grammar.
function grammarMean(it, ctx) {
  const card = h('section', { class: 'card q' },
    prompt('What does this sentence mean?'),
    h('p', { class: 'han big' }, it.text),
    it.audio ? playButton({ sentenceId: it.sid, label: 'Play' }) : null);
  card.append(choices(it.options, it.eng, (ok) => {
    ctx.onAnswer(ok);
    const g = D().grammarById.get(it.gid);
    card.append(afterCard([
      h('p', { class: 'gloss' }, it.eng),
      g ? h('div', { class: 'gpoint' }, h('h3', {}, g.title), h('p', {}, g.plain, sayBtn(g.plain))) : null,
      evidenceLine({ sentence: it.sid }),
    ], ctx));
  }));
  return card;
}

function grammarPick(it, ctx) {
  const blanked = it.text.replace(it.blank, '___');
  const card = h('section', { class: 'card q' },
    prompt('Which word goes in the gap?'),
    h('p', { class: 'han big' }, blanked),
    h('p', { class: 'gloss' }, it.eng));
  card.append(choices(it.options, it.answer, (ok) => {
    ctx.onAnswer(ok);
    const g = D().grammarById.get(it.gid);
    card.append(afterCard([
      h('p', { class: 'han' }, it.text),
      g ? h('div', { class: 'gpoint' }, h('h3', {}, g.title), h('p', {}, g.plain), g.watch ? h('p', { class: 'watch' }, g.watch) : null) : null,
      evidenceLine({ sentence: it.sid }),
    ], ctx));
  }));
  return card;
}

// Build the sentence from its pieces: production without typing Chinese.
function grammarBuild(it, ctx) {
  const card = h('section', { class: 'card q' },
    prompt('Put this in order'),
    h('p', { class: 'gloss big' }, it.eng));
  const line = h('div', { class: 'built' });
  const tray = h('div', { class: 'tray' });
  const chosen = [];
  const check = () => {
    if (chosen.length !== it.pieces.length) return;
    const ok = chosen.join('') === it.pieces.join('');
    line.classList.add(ok ? 'right' : 'wrong');
    ctx.onAnswer(ok);
    card.append(afterCard([
      h('p', { class: 'han big' }, it.text),
      h('p', { class: 'gloss' }, it.eng),
      it.audio ? playButton({ sentenceId: it.sid, label: 'Hear it' }) : null,
      evidenceLine({ sentence: it.sid }),
    ], ctx));
  };
  for (const piece of shuffle(it.pieces)) {
    const b = h('button', { class: 'piece', type: 'button', onclick: () => {
      if (b.disabled) return;
      b.disabled = true;
      chosen.push(piece);
      const back0 = h('button', { class: 'piece', type: 'button', onclick: () => {
        if (line.classList.contains('right') || line.classList.contains('wrong')) return;
        const i = chosen.lastIndexOf(piece);
        if (i >= 0) chosen.splice(i, 1);
        back0.remove(); b.disabled = false;
      } }, piece);
      line.append(back0);
      check();
    } }, piece);
    tray.append(b);
  }
  card.append(line, tray);
  return card;
}

// ── boot ─────────────────────────────────────────────────────────────────
async function boot() {
  State.load();
  applyReading(READ_DEFAULTS);
  initSpeech();
  setSoundOn(S().sound !== false);
  setEnglishOnly(!!S().englishOnly);
  if (S().big) document.documentElement.classList.add('big');
  onSpeaking((on) => document.documentElement.classList.toggle('speaking', on));
  onAudio((on) => document.documentElement.classList.toggle('playing', on));
  try {
    await loadDeck();
    indexDeck();
  } catch (err) {
    document.getElementById('app').replaceChildren(h('main', {}, h('section', { class: 'card' },
      h('h2', {}, 'The word list did not load'), h('p', {}, String(err.message)))));
    return;
  }
  refreshLadder();
  // Whether the recordings can be played here decides which questions can be
  // asked, but it must not hold up the first screen: awaiting it left the app
  // on "Loading the words…" for four seconds on a slow connection. It runs in
  // the background and the home screen redraws when the answer arrives.
  probeRecordings(D().audio[0], { timeout: 2500 }).then(() => { if (currentScreen() === "home") repaint(); });
  route('home', homeScreen);
  route('round', emptyRound);
  for (const [name, render] of Object.entries(browseScreens)) route(name, render);
  document.addEventListener('pointerdown', () => unlock(), { once: true });
  show('home', homeScreen, { replace: true });
}
boot();

export { header, homeScreen, playButton, S };
