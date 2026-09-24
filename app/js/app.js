// Hok Gong 學講 — learning to talk.
//
// A Cantonese app built the way Palimpsest was: retrieval practice, spacing
// that adapts to what you actually remember, and measurement you can check.
// The difference is what is being learnt — five skills, not one — so the app
// asks about each of them and reports each of them separately.
//
// Screens live in browse.js; this file is the shell, the home screen and the
// round.

import { h, iconBtn, sayBtn, sheet, closeSheet, disclosure, flash, show, route, back, currentScreen, repaint, ICON, applyReading, READ_DEFAULTS, readable } from './ui.js';
import { initSpeech, say, unlock, available as speechAvailable, cantoneseAvailable, onSpeaking } from './speech.js';
import { playRecording, playWord, stopAudio, onAudio, canPlayWord, haveRecordings, probeRecordings } from './audio.js';
import { State, Round, cardState, isHolding, dayKey, newLeftToday, nextDueSentence, untilText, now, shuffle, DAY } from './schedule.js';
import { loadDeck, indexDeck, D, wordOf, exampleOf, examplesOf, allIds, askableIds, setAsideCount, stageState, SKILL, SELF_RATED, SPEAKING_ALOUD } from './deck.js';
import { setProgress, setEnglishOnly, t } from './lang.js';
import { press as tick, right as correct, wrong, setSound as setSoundOn } from './sound.js';
import { attempt as toneAttempt, rank as toneRank, toneName, toneChao } from './pitch.js';
import { asrSupported, listenFor, matches } from './asr.js';
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

// ── the course ───────────────────────────────────────────────────────────
// Where the learner has got to, measured from their own answers: a word
// counts when the last time the app asked, they got it right.
export function course() {
  const d = D();
  const wordRight = new Set();
  const grammarRight = new Set();
  for (const it of d.items) {
    const c = State.card(it.id);
    if (!c || c.st === 'new' || !c.ok) continue;
    if (it.i != null) wordRight.add(it.i);
    if (it.gid != null) grammarRight.add(it.gid);
  }
  const st = stageState({ canAnswerWord: (i) => wordRight.has(i), grammarMet: (g) => grammarRight.has(g), floor: State.data.maxStage || 0 });
  // The high-water mark, kept in the saved state so it survives a reload.
  if (st.current > (State.data.maxStage || 0)) { State.data.maxStage = st.current; State.save(); }
  return st;
}
const isMet = (id) => !!State.card(id);
// What the app may ask right now: what this phone can play, and what the
// course has opened.
// A word counts as met once any question about it has been asked.
const wordMet = (i) => ['wl/', 'ws/', 'wr/'].some((p) => State.card(p + D().words[i]?.w));
// "It becomes difficult to speak and be recorded in public… it's primarily the
// noise issue" (Robert, 24 Sept). Listening carries on; only the questions
// that ask him to say something out loud are set aside.
export const noSpeaking = () => !!State.data.settings?.quiet;
const inPlay = () => askableIds(canPlayWord(), haveRecordings(), course().current, isMet, wordMet, noSpeaking());

// ── a new version, and not losing your progress ──────────────────────────
// Everything you have learnt lives in this phone's browser storage. That is
// private and it works offline, and it is also one "clear site data" away from
// gone — so the app can hand you a copy of it, and take one back.
function backupProgress() {
  const blob = new Blob([JSON.stringify({ app: 'hokgong', version: VERSION.v, saved: new Date().toISOString(), data: State.data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hok-gong-progress-${dayKey()}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function restoreProgress(file, onDone) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const parsed = JSON.parse(String(r.result));
      const data = parsed?.data?.cards ? parsed.data : parsed?.cards ? parsed : null;
      if (!data) throw new Error('that file is not a Hok Gong progress file');
      const mine = Object.keys(State.data.cards || {}).length;
      const theirs = Object.keys(data.cards || {}).length;
      State.data = { ...State.data, ...data };
      State.save();
      onDone(`Restored ${theirs.toLocaleString()} questions${mine ? ` over the ${mine.toLocaleString()} that were here` : ''}.`);
    } catch (err) { onDone('Could not read that file: ' + err.message); }
  };
  r.readAsText(file);
}

// A new deploy is only useful if the phone notices. The service worker fetches
// the page network-first, so the new version is already there on the next
// open with signal; this says so rather than leaving you on an old one.
let updateShown = false;
async function watchForUpdates() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration().catch(() => null);
  if (!reg) return;
  const offer = () => {
    if (updateShown) return;
    updateShown = true;
    const bar = h('div', { class: 'update', role: 'status' },
      h('span', {}, 'A new version is ready.'),
      h('button', { class: 'link', type: 'button', onclick: () => location.reload() }, 'Reload'),
      iconBtn('back', 'Not now', () => bar.remove(), 'icon dismiss'));
    document.body.append(bar);
  };
  if (reg.waiting) offer();
  reg.addEventListener('updatefound', () => {
    const fresh = reg.installing;
    fresh?.addEventListener('statechange', () => {
      if (fresh.state === 'installed' && navigator.serviceWorker.controller) offer();
    });
  });
  const check = () => { if (!document.hidden) reg.update().catch(() => {}); };
  document.addEventListener('visibilitychange', check);
  check();
}

// The reading face. The British Dyslexia Association asks for sans-serif;
// this app uses a serif for meanings because that is what its sister reading
// apps use and Robert reads them happily — so the requirement is that it can
// be switched, and here it is.
const applyReadingFont = (sans) => document.documentElement.style.setProperty('--read-font', sans ? 'var(--ui)' : 'var(--read)');

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
    row('Not out loud', 'For a bus or a waiting room. Sets aside the questions that ask you to SAY something — listening carries on, so keep your headphones in. Also on the home screen.',
      toggle('quiet', !!s.quiet, () => repaint())),
    row('Always show Jyutping', 'The romanisation under every Cantonese word.', toggle('jyutping', s.jyutping !== false)),
    row('Keep the interface in English', 'Turns off the slow switch to Cantonese labels.', toggle('englishOnly', !!s.englishOnly, (v) => setEnglishOnly(v))),
    row('Larger text', 'Also available in your phone’s own settings.', toggle('big', !!s.big, (v) => document.documentElement.classList.toggle('big', v))),
    asrSupported() ? row('Let the phone check my speaking',
      'Turns "say this in Cantonese" into a question the app can mark. It uses the browser’s Cantonese speech recognition, which means your recorded speech is sent to the browser-maker’s servers to be transcribed — the only thing in this app that leaves your phone. Off unless you turn it on.',
      toggle('asr', s.asr === true)) : null,
    row('Plain sans-serif for meanings', 'Meanings and quotations are set in a serif by default. This swaps them for the interface face, which some readers find easier.', toggle('sans', !!s.sans, (v) => applyReadingFont(v))),
    h('div', { class: 'srow col' },
      h('div', {}, h('div', { class: 'slabel' }, 'How long a sitting is'),
        h('div', { class: 'note' }, 'When there is nothing new or due left, a round fills up with words you have already met, so a sitting is never cut short. Those answers are practice: they never change when a word comes back.')),
      h('div', { class: 'paces' }, ...Object.entries(SITTINGS).map(([key, p]) => h('button', {
        class: 'pace' + ((s.sitting || 'five') === key ? ' on' : ''), type: 'button',
        onclick: (e) => { s.sitting = key; State.save(); for (const b of e.currentTarget.parentElement.children) b.classList.remove('on'); e.currentTarget.classList.add('on'); },
      }, h('span', { class: 'plabel' }, p.label), h('span', { class: 'note' }, p.note))))),
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
    h('div', { class: 'srow col' },
      h('div', {}, h('div', { class: 'slabel' }, 'Your progress'),
        h('div', { class: 'note' }, 'Everything you have learnt is stored in this phone’s browser and nowhere else — which keeps it private, and means clearing site data would lose it. Keep a copy somewhere.')),
      h('div', { class: 'paces' },
        h('button', { class: 'wide', type: 'button', onclick: backupProgress }, 'Save a copy of my progress'),
        h('label', { class: 'wide filebtn' }, 'Restore from a copy',
          h('input', { type: 'file', accept: 'application/json,.json', onchange: (e) => {
            const f = e.target.files?.[0];
            if (f) restoreProgress(f, (msg) => { const n = h('p', { class: 'note' }, msg); e.target.parentElement.after(n); });
          } })))),
    h('div', { class: 'note' }, `Version ${VERSION.v}${VERSION.date ? ` · built ${VERSION.date}` : ''}${VERSION.commit ? ` · ${VERSION.commit}` : ''}. Nothing is sent anywhere, including what the microphone hears.`),
    h('button', { class: 'wide', type: 'button', onclick: () => { closeSheet(); show('about', browseScreens.about); } }, 'Sources, licences and version history'),
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

// A word worth looking at today: from the stage you are on, so it belongs to
// what you are learning. It used to be drawn from the first 400 words of the
// whole list, which on a first run offered 賺 "to earn" to someone on "hello".
const phraseOfDay = () => {
  const d = D();
  const c = course();
  const from = c.done ? d.words.map((_, i) => i).slice(0, 600) : d.stages[c.current].words;
  const pool = from.map((i) => ({ w: d.words[i], i })).filter((x) => x.w && d.examples[x.i]?.length);
  if (!pool.length) return null;
  const key = dayKey();
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
};

// ── the banner ───────────────────────────────────────────────────────────
// The same shape as Palimpsest's: a soft band at the head of the page with
// faint text behind the wordmark and a strip that says where you are. Here
// the faint text is YOUR Cantonese — the words you most recently answered
// right, or the stage's words before you have any — so the banner is about
// your journey rather than decoration.
//
// The undertext never sits behind anything you have to read: it has its own
// band that fades out before the wordmark starts. Text over text is the worst
// case for a dyslexic reader.
function hero() {
  const d = D();
  const c = course();
  // Recently answered right, newest first; the stage's own words if there is
  // nothing yet.
  const mine = d.items
    .filter((it) => it.i != null)
    .map((it) => ({ i: it.i, c: State.card(it.id) }))
    .filter((x) => x.c && x.c.ok && x.c.st !== 'new')
    .sort((a, b) => (b.c.last || 0) - (a.c.last || 0))
    .map((x) => d.words[x.i].w);
  const seed = [...new Set(mine)];
  const fill = (c.done ? d.words.slice(0, 60).map((w) => w.w) : c.stages[c.current].words.map((i) => d.words[i]?.w).filter(Boolean));
  const pool = [...seed, ...fill.filter((w) => !seed.includes(w))];
  const line = (from, n) => pool.slice(from, from + n).join('　') || '學講';
  const under = h('div', { class: 'undertext', 'aria-hidden': 'true' },
    h('p', {}, line(0, 6)), h('p', {}, line(6, 6)), h('p', {}, line(12, 6)));

  // Ten stages as a rail: filled behind you, ringed where you are.
  const rail = h('div', { class: 'stagerail', role: 'img', 'aria-label': c.done ? 'All ten stages passed' : `Stage ${c.current + 1} of ${c.stages.length}` },
    ...c.stages.map((st, n) => h('span', { class: 'pip' + (n < c.current ? ' done' : n === c.current ? ' here' : '') })));

  return h('header', { class: 'hero' },
    iconBtn('settings', 'Settings', settingsSheet, 'icon heroset'),
    under,
    h('div', { class: 'wordmark big' },
      h('span', { class: 'han' }, '學講'),
      h('span', { class: 'name' }, 'Hok Gong')),
    h('p', { class: 'tagline' }, 'Learning to talk.'),
    rail,
    h('button', { class: 'railline', type: 'button', onclick: () => show('course', browseScreens.course) },
      c.done ? 'All ten stages passed — the whole list is open'
        : `Stage ${c.current + 1} of ${c.stages.length} · ${c.stages[c.current].title}`,
      h('span', { class: 'chev', html: ICON.chev })));
}

// ── home ─────────────────────────────────────────────────────────────────
// One journey, in one order: where you are, the one thing to do, then
// everything else. The first version opened with "Nothing due · 18 new" above
// a Start button, which told a learner who had never played that there was
// nothing to do (Robert, first run on his phone).
function homeScreen() {
  const d = D();
  const ids = inPlay();
  refreshLadder();
  const due = State.dueIds(ids).length;
  const fresh = ids.filter((id) => !State.card(id)).length;
  const room = newLeftToday(pace());
  const met = ids.filter((id) => State.card(id)).length;
  const run = State.runOfDays();
  const first = met === 0;
  const c = course();
  const st = c.done ? null : c.stages[c.current];

  // What there is to do, said as a person would say it.
  const waiting = Math.min(room, fresh);
  const lead = first ? 'Ready when you are'
    : due && waiting ? `${due} to come back to, ${waiting} new`
      : due ? `${due} to come back to`
        : waiting ? `${waiting} new word${waiting === 1 ? '' : 's'} ready`
          : fresh ? 'Today’s pace is done'
            : 'You are up to date';
  const minutes = Math.max(2, Math.round((sitting().size * 11) / 60));

  // There is always a button. The first version hid it once the day's
  // allowance of new words was spent and offered "Learn more anyway" as a
  // faint link underneath — which reads as "you are finished" to someone who
  // wants to keep going (Robert, 20 Sept: "the app is really fighting me").
  // Nothing owed no longer means nothing to do: the button carries on with
  // new words if any remain in reach, and with recall if they do not.
  const start = t('start');
  const owed = due || waiting || first;
  const startBtn = (owed || fresh || met)
    ? h('button', { class: 'start', type: 'button', onclick: () => startRound(owed ? {} : fresh ? { beyondDaily: true } : { practice: true }) },
      h('span', { class: 'han' }, owed ? (first ? 'Start learning' : start.text) : fresh ? 'Keep going' : 'Keep practising'),
      h('span', { class: 'sub' }, owed ? (first ? `Your first round — about ${minutes} minutes` : `About ${minutes} minutes`)
        : fresh ? `${sitting().size} more questions, past today’s pace`
          : `${sitting().size} questions on what you have met`))
    : null;

  const link = (label, note, to, render) => h('button', { class: 'row', type: 'button', onclick: () => show(to, render) },
    h('div', {}, h('div', { class: 'rlabel' }, label), h('div', { class: 'note' }, note)), h('span', { class: 'chev', html: ICON.chev }));

  // Home is now four things: the banner that says where you are, the one
  // button, three ways on, and a word to look at. The stage detail that used
  // to sit here — what it will let you do, the count towards the gate, why
  // these words — is one tap away on The course, where a learner goes when
  // they want it rather than every time they open the app.
  return [
    hero(),
    h('main', { class: 'home' },
      h('section', { class: 'today' },
        h('p', { class: 'lead' }, lead),
        startBtn,
        !owed && met ? countdownLine(State.nextDue(ids)) : null,
        met >= 12 && !(startBtn && !owed && !fresh)
          ? h('button', { class: 'link', type: 'button', onclick: () => startRound({ practice: true }) }, 'Recall test') : null,
        // On the home screen, not buried in Settings: it is a decision made on
        // the way out of the door, about the room you are in, not a preference
        // you set once. It says what it costs, because setting aside the
        // speaking questions does mean the speaking strand stops moving.
        outLoudSwitch(),
        run > 1 ? h('p', { class: 'note centre' }, `${run} days in a row.`) : null),
      canPlayWord() && haveRecordings() ? null : noVoiceCard(),
      h('nav', { class: 'rows' },
        link('The course', c.done ? 'All ten stages behind you' : 'The ten stages, and what each one is for', 'course', browseScreens.course),
        link('Progress', 'What you can answer, and how it has moved', 'progress', browseScreens.progress),
        link('Look things up', 'Words, tones, grammar, sources', 'lookup', browseScreens.lookup)),
      wordToday(),
    ),
  ];
}

// What a recall test still has left to go through. Robert asked whether it
// runs everything that needs recalling or just a handful — so the app says.
// "Shakiest" is the scheduler's own estimate of how likely you are to still
// have a word right now, the same number it sorts the test by.
function recallScope() {
  const ids = inPlay();
  const t = now();
  const met = ids.filter((id) => State.card(id));
  if (met.length < 12) return null;
  const shaky = met.filter((id) => State.recall(id, t) < 0.9).length;
  return h('p', { class: 'note' }, shaky
    ? `${shaky.toLocaleString()} of your ${met.length.toLocaleString()} questions are the ones it would reach for next. Run it again to carry on through them.`
    : `All ${met.length.toLocaleString()} questions you have met are holding at the moment.`);
}

// Somewhere to say "not here". Robert, 24 Sept: "I have headphones and it's
// just fine to keep listening but it becomes difficult to speak and be
// recorded in public… best to just have a mode or a button/tab from the home
// screen to mute these question types."
function outLoudSwitch() {
  const on = noSpeaking();
  const n = D().items.filter((it) => SPEAKING_ALOUD.has(it.k) && it.stage != null).length;
  return h('button', {
    class: 'outloud' + (on ? ' on' : ''), type: 'button',
    'aria-pressed': on ? 'true' : 'false',
    onclick: () => { State.data.settings.quiet = !on; State.save(); repaint(); },
  },
  h('span', { class: 'sw' }, h('span', { class: 'knob' })),
  h('span', {}, on ? 'Not speaking out loud' : 'Ask me to speak'),
  h('span', { class: 'note' }, on ? 'Listening carries on — keep your headphones in' : 'Turn off on a bus or anywhere noisy'));
}

// How long until the next review comes round. Robert asked for this: when
// the app says nothing is due, he wants to know how long "nothing" lasts.
//
// It is deliberately NOT a clock. It counts in minutes, refreshes once a
// minute, and it sits UNDER the button rather than in place of it — nothing
// is waiting on it, because the round above is playable the whole time. A
// ticking countdown that gates the next thing you may do is what the standing
// rule about timers is there to prevent; this only answers "when".
function countdownLine(when) {
  if (!when) return null;
  const p = h('p', { class: 'note centre countdown' }, '');
  const paint = () => { p.textContent = `Next review ${untilText(when)}. You can carry on before then.`; };
  paint();
  const tick = setInterval(() => { if (!p.isConnected) return clearInterval(tick); paint(); }, 60e3);
  return p;
}

// A word from the stage you are on, quietly, at the foot of the page.
function wordToday() {
  const p = phraseOfDay();
  if (!p) return null;
  return h('section', { class: 'card sheet-card day' },
    h('div', { class: 'eyebrow' }, 'A word from this stage'),
    wordCard(p.i, { example: true }));
}

// ── where you are in the course ──────────────────────────────────────────
// One stage at a time, with what it will let you do and how far from the gate
// you are. The next stage is named but not opened: knowing what is coming is
// part of knowing why this one matters.
function stageCard() {
  const c = course();
  if (c.done) {
    return h('section', { class: 'card' },
      h('div', { class: 'eyebrow' }, 'The course is finished'),
      h('p', {}, 'All ten stages are behind you, so the rest of the word list is open — about 5,800 more words, in the order people actually say them.'),
      h('button', { class: 'wide', type: 'button', onclick: () => show('course', browseScreens.course) }, 'Look back over the stages'));
  }
  const st = c.stages[c.current];
  const pct = Math.round((Math.min(st.have, st.need) / st.need) * 100);
  const next = c.stages[c.current + 1];
  return h('section', { class: 'card' },
    h('div', { class: 'eyebrow' }, `Stage ${c.current + 1} of ${c.stages.length}`),
    h('h2', {}, st.title),
    h('p', { class: 'note' }, 'By the end: ' + st.can),
    h('div', { class: 'bar' }, h('div', { class: 'fill', style: `width:${pct}%` })),
    h('p', { class: 'note' }, st.have >= st.need && st.grammar < st.grammarNeeded
      ? `Words done. ${st.grammarNeeded - st.grammar} grammar point${st.grammarNeeded - st.grammar === 1 ? '' : 's'} to meet before the next stage opens.`
      : `${st.have} of ${st.need} words you can answer${st.grammarNeeded ? `, and ${st.grammar} of ${st.grammarNeeded} grammar points` : ''}.`),
    disclosure('Why these words now', h('p', { class: 'note' }, st.why),
      next ? h('p', { class: 'note' }, `Next: ${next.title}.`) : null,
      h('button', { class: 'wide', type: 'button', onclick: () => show('course', browseScreens.course) }, 'See the whole course')));
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
    h('p', { class: 'note' }, voice
      ? 'Some listening questions need recordings this phone cannot reach. Everything else works.'
      : 'This phone has no Cantonese voice, so some listening questions are set aside. Everything else works, including every sentence read by a person.'),
    disclosure(voice ? 'Why, and what still works' : 'How to add a Cantonese voice',
      voice ? null : h('p', { class: 'note' }, 'On Android: Settings → System → Languages → Text-to-speech, and install Chinese (Hong Kong). On iPhone: Settings → Accessibility → Spoken Content → Voices → Chinese, Cantonese. On Windows: Settings → Time & language → Speech → Manage voices.'),
      recs ? null : h('p', { class: 'note' }, 'This copy of the app carries no audio of its own and cannot reach Tatoeba’s. The installed version on your phone has all 545 recordings built in.'),
      h('p', { class: 'note' }, 'Everything else still works. A Mandarin voice is never used as a stand-in: it would teach the wrong language.')));
}

// ── pace ─────────────────────────────────────────────────────────────────
// Vocabulary apps that push new words regardless of the review backlog bury
// the learner. The pace is set by how much is waiting.
export const SITTINGS = {
  short: { label: 'Short', note: 'About 12 questions — two minutes.', size: 12 },
  five: { label: 'Five minutes', note: 'About 25 questions. Three of these is the fifteen minutes a day.', size: 25 },
  long: { label: 'Longer', note: 'About 40 questions — seven or eight minutes.', size: 40 },
};
const sitting = () => SITTINGS[State.data.settings.sitting] || SITTINGS.five;

// These OVERRIDE the scheduler's own constants, which is worth saying plainly:
// v1.8.0 retuned NEW_PER_DAY from 18 to 32 to break the repetition loop, and
// the app went on shipping 18, because `steady` is passed on every round and
// wins. The measurement that said the loop was fixed was run without a pace
// and so measured a regime nobody was in — 32% of a day new, where the real
// default gave 26%. These now carry the retuned numbers.
export const PACES = {
  gentle: { label: 'Gentle', note: 'About 12 new questions a day.', newPerRound: 4, newPerDay: 12 },
  steady: { label: 'Steady', note: 'About 30 a day — the default, and about a third of a sitting.', newPerRound: 9, newPerDay: 30 },
  keen: { label: 'Keen', note: 'Up to 60 a day. Expect a lot more reviewing tomorrow.', newPerRound: 14, newPerDay: 60 },
};
const pace = () => PACES[S().pace] || PACES.steady;

// ── the round ────────────────────────────────────────────────────────────
let session = { asked: new Set() };

function startRound(opts) {
  unlock();
  const r = new Round(inPlay(), { ...opts, exclude: session.asked, pace: pace(), groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.stage, size: sitting().size });
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
  // Where the course stood when the round began, so passing a gate during it
  // can be said out loud at the end.
  const stageBefore = course().current;
  // What was met for the first time in this round, so the end of it can say so.
  // "Nine new words" is the thing a learner actually wants to hear, and the
  // summary was only ever reporting a score.
  const metToday = new Set();

  const count = h('span', { class: 'n' });
  const paint = () => {
    count.textContent = done >= total ? '' : `Question ${Math.min(done + 1, total)} of ${total}`;
    dots.replaceChildren(...Array.from({ length: total }, (_, i) => h('span', { class: 'dot' + (i < done ? ' done' : '') })));
  };
  const finish = () => {
    State.snapshot(allIds());   // progress counts the whole deck, not just what is askable today
    refreshLadder();
    box.replaceChildren(summary());
    window.scrollTo(0, 0);
  };
  const summary = () => {
    const after = course();
    const passed = after.current > stageBefore ? after.stages[stageBefore] : null;
    const card = D().context[Math.floor(Math.random() * D().context.length)];
    const left = new Round(inPlay(), { practice, exclude: session.asked, pace: pace(), groupOf: D().groupOf, stageOf: (id) => D().byId.get(id)?.stage, size: sitting().size });
    // A summary has to look like a summary. This screen used to open with a
    // bare "3 of 5" and then a card about dim sum, which read as another
    // question (Robert, on his phone).
    return h('section', { class: 'card summary' },
      h('div', { class: 'eyebrow' }, practice ? 'Recall test finished' : 'Round finished'),
      h('p', { class: 'score' }, `${right} right, out of ${done}`),
      metToday.size ? h('p', { class: 'newwords' },
        `${metToday.size} new word${metToday.size === 1 ? '' : 's'}: `,
        h('span', { class: 'han' }, [...metToday].join('　'))) : null,
      h('p', { class: 'note' }, practice ? `A recall test goes through everything you have met, weakest memory first, ${sitting().size} at a time — it does not change when a word comes back, it only tells you where you stand.` : byline(tally)),
      practice ? recallScope() : null,
      passed ? h('div', { class: 'passed' },
        h('div', { class: 'eyebrow' }, 'Stage passed'),
        h('p', {}, `${passed.title}. You can now ${passed.can.charAt(0).toLowerCase()}${passed.can.slice(1)}`),
        after.stages[after.current] ? h('p', { class: 'note' }, `Next: ${after.stages[after.current].title} — ${after.stages[after.current].can}`) : null) : null,
      left.empty ? h('p', { class: 'note' }, nextDueSentence(State.nextDue(inPlay()) || now()))
        : h('button', { class: 'wide primary', type: 'button', onclick: () => startRound({ practice }) }, t('onceMore').text),
      h('button', { class: 'ghost wide', type: 'button', onclick: () => show('home', homeScreen) }, t('done').text),
      // Something to read, clearly labelled as that and put after the way out,
      // so it is an offer rather than another thing being asked of you.
      card ? h('div', { class: 'ctx' },
        h('div', { class: 'eyebrow' }, 'Something to read, if you like'),
        contextCard(card, { compact: true })) : null);
  };

  const ask = () => {
    const id = round.next();
    if (!id) { finish(); return; }
    const it = D().byId.get(id);
    session.asked.add(id);
    const onAnswer = (ok, { selfRated = false } = {}) => {
      done++; if (ok) right++;
      const s = SKILL[it.k] || 'other';
      tally[s] = tally[s] || { n: 0, ok: 0 };
      tally[s].n++; if (ok) tally[s].ok++;
      State.answer(id, ok, { practice: practice || round.extra.has(id) });
      if (selfRated) { const c = State.card(id); if (c) { c.self = (c.self || 0) + 1; State.save(); } }
      (ok ? correct : wrong)();
      flash(ok ? 'right' : 'wrong');
      paint();
    };
    const showQuestion = () => {
      box.replaceChildren(h('div', { class: 'qcount' }, count, dots), question(it, { onAnswer, onNext: ask, practice }));
      paint();
      window.scrollTo(0, 0);
    };
    // Taught before tested. A recall test never introduces anything — it is
    // there to tell you where you stand, and meeting a word inside it would
    // make the score a lie.
    if (!practice && needsIntroduction(it)) {
      metToday.add(D().words[it.i].w);
      box.replaceChildren(h('div', { class: 'qcount' }, count, dots), meetCard(it, showQuestion));
      paint();
      window.scrollTo(0, 0);
      return;
    }
    showQuestion();
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
    case 'word-pick': return wordPick(it, ctx);
    case 'word-cloze': return wordCloze(it, ctx);
    case 'grammar-pick': return grammarPick(it, ctx);
    case 'grammar-build': return grammarBuild(it, ctx);
    case 'note-pick': return notePick(it, ctx);
    default: return h('section', { class: 'card' }, h('p', {}, 'Unknown question.'));
  }
}

// A Chinese sentence as it should always be shown to someone who cannot read
// characters: the characters, the reading under them, and the meaning under
// that. The reading is built at build time from the same sources the words
// come from.
const sentenceBlock = (text, jyut, eng) => h('div', { class: 'sentence' },
  h('p', { class: 'han big-s' }, text),
  jyut ? h('p', { class: 'jyut' }, jyut) : null,
  eng ? h('p', { class: 'gloss' }, eng) : null);

const prompt = (text) => h('p', { class: 'prompt' }, text, sayBtn(text));

// Four buttons, the right answer in a seeded-random place, and no colour-only
// feedback: right and wrong are marked with a word and a symbol as well.
// `reads` maps a Chinese option to its Jyutping. Without it a question whose
// ANSWERS are Chinese words shows two buttons reading 唔該 and 多謝 and nothing
// else, which to a learner who cannot read characters is a coin toss between
// two pictures (Robert, 20 Sept: "I can't read Chinese yet. The questions like
// this don't work.").
function choices(options, answer, onPick, { reads = null } = {}) {
  const wrap = h('div', { class: 'choices' });
  const all = shuffle([answer, ...options]);
  const label = (o) => {
    const j = reads && reads[o];
    return j ? [h('span', { class: 'han' }, o), h('span', { class: 'jyut' }, readable(j))] : [o];
  };
  for (const o of all) {
    const b = h('button', { class: 'choice' + (reads && reads[o] ? ' withread' : ''), type: 'button', onclick: () => {
      if (wrap.classList.contains('locked')) return;
      wrap.classList.add('locked');
      const ok = o === answer;
      b.classList.add(ok ? 'right' : 'wrong');
      b.append(h('span', { class: 'mark' }, ok ? '✓' : '✗'));
      if (!ok) for (const other of wrap.children) if (other.dataset.v === answer) { other.classList.add('right'); other.append(h('span', { class: 'mark' }, '✓')); }
      onPick(ok);
    } }, ...label(o));
    b.dataset.v = o;
    wrap.append(b);
  }
  return wrap;
}

// What comes after an answer, in one order every time: the verdict in words,
// then the evidence, then the one button that moves you on — which sits in
// the same place on every question and stays within reach without hunting.
function afterCard(kids, { onNext, ok = null, answer = null }) {
  const verdict = ok === null ? null : h('p', { class: 'verdict ' + (ok ? 'right' : 'wrong') },
    h('span', { class: 'mark' }, ok ? '✓' : '✗'),
    h('span', {}, ok ? t('right').text : answer ? `${t('wrong').text} — it is ${answer}` : t('wrong').text));
  return h('div', { class: 'after' }, verdict, ...[].concat(kids).filter(Boolean),
    h('button', { class: 'wide primary', type: 'button', onclick: onNext }, t('next').text));
}

// A play button that says what it is playing: a person, or a machine voice.
//
// `autoplay` is for listening questions only, where hearing it IS the
// question. Everywhere else the learner presses it: the home screen used to
// start talking on its own, and a phone that says something in Cantonese at
// you unasked, when you cannot yet understand it, is startling rather than
// useful (Robert, first run).
function playButton({ sentenceId = null, word = null, label = 'Play', autoplay = false }) {
  const b = h('button', { class: 'play', type: 'button' },
    h('span', { class: 'ico', html: ICON.play }), h('span', {}, label));
  const go = () => {
    unlock();
    if (sentenceId) playRecording(sentenceId);
    else if (word) playWord(word);
  };
  b.addEventListener('click', go);
  if (autoplay) setTimeout(go, 220);
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
    canPlayWord() ? playButton({ word: w.w, label: t('listen').text, autoplay: true }) : noVoice(),
    canPlayWord() ? null : h('p', { class: 'han big' }, w.w),
    canPlayWord() ? null : h('p', { class: 'jyut' }, w.j));
  card.append(choices(it.options, w.g, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([wordCard(it.i, { example: true, reveal: true }), voiceNote('tts')], { ...ctx, ok, answer: w.g }));
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
    card.append(afterCard([wordCard(it.i, { example: true, reveal: true })], { ...ctx, ok, answer: w.g }));
  }));
  return card;
}

// 3. See the meaning, say the word.
//
// Two versions of this question, and the difference matters. With speech
// recognition turned on, the phone hears what you said and the answer is
// marked like any other. Without it, this is a flashcard you mark yourself —
// useful, but not the same kind of evidence, and the app both says so and
// records it separately (see Progress).
function sayWord(it, ctx) {
  const w = wordOf(it);
  const checked = asrSupported() && S().asr === true;
  const cue = D().cues?.[it.i];
  const card = h('section', { class: 'card q' },
    prompt('Say this in Cantonese'),
    h('p', { class: 'gloss big' }, w.g),
    // Two words can share a meaning; the cue says which one is wanted.
    cue ? h('p', { class: 'cue' }, cue) : null);
  const out = h('div', {});

  const selfRate = (lead) => h('div', {},
    lead ? h('p', { class: 'note' }, lead) : null,
    h('div', { class: 'choices two' },
      h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(true, { selfRated: true }); out.append(afterCard([], ctx)); } }, t('iKnow').text),
      h('button', { class: 'choice', type: 'button', onclick: () => { ctx.onAnswer(false, { selfRated: true }); out.append(afterCard([], ctx)); } }, t('iDont').text)));

  const reveal = (extra) => {
    out.append(wordCard(it.i, { example: true, reveal: true }), familyNote(it.i));
    if (extra) out.append(extra);
  };

  if (!checked) {
    const btn = h('button', { class: 'wide primary', type: 'button', onclick: () => {
      btn.remove();
      reveal();
      out.append(selfRate('Only you can hear whether that matched, so this one is marked by you. Speech checking can be turned on in Settings.'));
    } }, 'Show me');
    card.append(btn, out);
    return card;
  }

  const listen = h('button', { class: 'wide primary', type: 'button', onclick: async () => {
    listen.disabled = true;
    listen.textContent = 'Listening… say it now';
    const res = await listenFor({ seconds: 5 });
    listen.remove();
    if (!res.ok) {
      reveal(h('p', { class: 'warn' }, res.why));
      out.append(selfRate('Mark it yourself this time.'));
      return;
    }
    const m = matches(w.w, res.heard);
    reveal(h('div', {},
      h('p', { class: m.hit ? 'good' : 'warn' }, m.hit
        ? `Heard: “${m.on}” — that has ${w.w} in it.${m.partial ? ' Close enough to count.' : ''}`
        : `Heard: “${res.heard[0]}” — I could not find ${w.w} in that.`),
      h('p', { class: 'note' }, 'The recogniser is built for sentences spoken by native speakers, so a miss is not proof you said it wrong — which is why a miss hands the decision back to you.')));
    if (m.hit) {
      ctx.onAnswer(true);
      out.append(afterCard([], ctx));
    } else {
      out.append(selfRate(null));
    }
  } }, 'Say it, and let the phone check');
  const skip = h('button', { class: 'link', type: 'button', onclick: () => {
    listen.remove(); skip.remove();
    reveal();
    out.append(selfRate('Marked by you this time.'));
  } }, 'Just show me');
  card.append(listen, skip, out);
  return card;
}

// 3b. Two words a dictionary translates the same way, and the question is
// which one you actually say. 多謝 and 唔該 are both "thank you" and they are
// not interchangeable; no gloss can carry that, so a note does.
function notePick(it, ctx) {
  const w = wordOf(it);
  const note = D().noteById.get(it.nid);
  const card = h('section', { class: 'card q' },
    prompt('Which one do you say?'),
    h('p', { class: 'gloss big' }, it.prompt));
  card.append(choices(it.options, w.w, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([
      h('p', { class: 'han' }, w.w, ' ', h('span', { class: 'jyut' }, readable(w.j))),
      note ? h('div', { class: 'gpoint' },
        h('h3', {}, note.title),
        h('p', {}, note.plain, sayBtn(note.plain)),
        note.watch ? h('p', { class: 'watch' }, note.watch) : null,
        h('p', { class: 'evidence' }, 'The words and their readings come from the sources; this note about when to use which is mine.')) : null,
    ], { ...ctx, ok, answer: `${w.w} (${w.j})` }));
  }, { reads: it.reads }));
  return card;
}

// 4. A recorded sentence, by a person, with their name on it.
function listenSentence(it, ctx) {
  const card = h('section', { class: 'card q' },
    prompt('What is being said?'),
    playButton({ sentenceId: it.sid, label: t('listenAgain').stage ? t('listenAgain').text : 'Play again', autoplay: true }));
  card.append(choices(it.options, it.eng, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([
      sentenceBlock(it.text, it.jyut, it.eng),
      evidenceLine({ sentence: it.sid, by: it.by }),
    ], { ...ctx, ok, answer: it.eng }));
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
    canPlayWord() ? playButton({ word: target.w.w, label: 'Play again', autoplay: true }) : noVoice(),
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
    sentenceBlock(it.text, it.jyut, null),
    it.audio ? playButton({ sentenceId: it.sid, label: 'Play' }) : null);
  card.append(choices(it.options, it.eng, (ok) => {
    ctx.onAnswer(ok);
    const g = D().grammarById.get(it.gid);
    card.append(afterCard([
      sentenceBlock(it.text, it.jyut, it.eng),
      g ? h('div', { class: 'gpoint' }, h('h3', {}, g.title), h('p', {}, g.plain, sayBtn(g.plain))) : null,
      evidenceLine({ sentence: it.sid }),
    ], { ...ctx, ok, answer: it.eng }));
  }));
  return card;
}

// Has this WORD been met before, in any of the ways the app asks about it?
// Per word, not per question: 妹 is introduced once, not again when its
// reading question comes round a week later.
const wordSeen = (i) => {
  const w = D().words[i];
  return !!w && ['wl/', 'ws/', 'wr/', 'cz/'].some((pre) => State.card(pre + w.w));
};
const needsIntroduction = (it) => it.i != null && !State.card(it.id) && !wordSeen(it.i);

// Meeting a word. This is the only screen in the app that asks nothing.
function meetCard(it, onDone) {
  const d = D();
  const w = d.words[it.i];
  const ex = (examplesOf(it.i) || [])[0];
  const cue = d.cues?.[it.i];
  const notes = d.notesForWord?.get(it.i) || [];
  return h('section', { class: 'card q meet' },
    h('div', { class: 'eyebrow' }, 'A new word'),
    h('p', { class: 'han word' }, w.w),
    h('p', { class: 'jyut big-j' }, readable(w.j)),
    h('p', { class: 'gloss big' }, w.g),
    // A cue is the difference between two words a dictionary glosses the same
    // way — "for something someone did" against "for a gift". If the word has
    // one, meeting it is exactly when it is wanted.
    cue ? h('p', { class: 'cue' }, cue) : null,
    canPlayWord() ? playButton({ word: w.w, label: 'Hear it' }) : null,
    ex ? h('div', { class: 'sentence meet-eg' },
      h('p', { class: 'note' }, 'You might hear it like this'),
      h('p', { class: 'han big-s' }, ex.t),
      h('p', { class: 'jyut' }, ex.j),
      h('p', { class: 'gloss' }, ex.e)) : null,
    notes.length ? h('div', { class: 'gpoint' },
      h('h3', {}, notes[0].title),
      h('p', {}, notes[0].plain, sayBtn(notes[0].plain))) : null,
    h('button', { class: 'wide primary', type: 'button', onclick: onDone }, 'Got it — ask me'));
}

// "There are obviously other ways, and so if you ask for dad, it probably
// wouldn't be the first thing that people think of" (Robert, 24 Sept). When a
// word belongs to a family, the reveal names the others — otherwise a learner
// who answered 爸爸 and was told the answer was 老豆 has learnt something
// false, which is that 爸爸 was wrong.
function familyNote(i) {
  const d = D();
  const fam = (d.families || []).find((f) => f.words.includes(i));
  if (!fam) return null;
  const others = fam.words.filter((x) => x !== i);
  if (!others.length) return null;
  return h('div', { class: 'family' },
    h('p', { class: 'note' }, others.length === 1 ? 'There is another way to say this:' : 'There are other ways to say this:'),
    h('div', { class: 'famrow' }, ...others.map((x) => {
      const o = d.words[x];
      return h('span', { class: 'wchip' },
        h('span', { class: 'han' }, o.w),
        h('span', { class: 'jyut' }, readable(o.j)),
        h('span', { class: 'gloss' }, d.cues?.[x] || o.g));
    })),
    h('p', { class: 'note' }, fam.why));
}

// Meaning in, word out. The app's only auto-marked production question: every
// other vocabulary question gives the Cantonese and asks for the English,
// which is recognition. This gives the English and asks which of four
// Cantonese words it is — a real recall of the form, marked by the app rather
// than by the learner, and answerable with the microphone off.
function wordPick(it, ctx) {
  const w = wordOf(it);
  const cue = D().cues?.[it.i];
  const card = h('section', { class: 'card q' },
    prompt('Which one means this?'),
    h('p', { class: 'gloss big' }, w.g),
    // Two words can answer to one English meaning; the cue says which.
    cue ? h('p', { class: 'cue' }, cue) : null);
  // The readings are looked up rather than carried in the item.
  const d = D();
  const reads = Object.fromEntries([w.w, ...it.options].map((x) => {
    const at = d.wordIndex.get(x);
    return [x, at == null ? '' : readable(d.words[at].j)];
  }));
  card.append(choices(it.options, w.w, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([wordCard(it.i, { example: true, reveal: true }), familyNote(it.i)],
      { ...ctx, ok, answer: `${w.w} (${reads[w.w]})` }));
  }, { reads }));
  return card;
}

// The gap. Robert asked for this one by name: "what is the correct word in
// this context to fill out the sentence". Recognising a word and knowing where
// it goes are different things, and only the second gets you talking — so this
// shows a real sentence with one word taken out, the reading line with the gap
// kept in its place, and what the whole thing means.
function wordCloze(it, ctx) {
  const w = wordOf(it);
  const card = h('section', { class: 'card q' },
    prompt('Which word goes in the gap?'),
    h('p', { class: 'han big-s' }, it.text.replace(it.blank, '＿＿')),
    it.blanked ? h('p', { class: 'jyut' }, it.blanked) : null,
    h('p', { class: 'gloss' }, it.eng));
  card.append(choices(it.options, it.answer, (ok) => {
    ctx.onAnswer(ok);
    card.append(afterCard([
      sentenceBlock(it.text, it.jyut, it.eng),
      it.audio ? playButton({ sentenceId: it.sid, label: 'Hear the whole sentence' }) : null,
      w ? wordCard(it.i, { reveal: true }) : null,
      evidenceLine({ sentence: it.sid }),
    ], { ...ctx, ok, answer: `${it.answer} (${it.reads?.[it.answer] || ''})` }));
  }, { reads: it.reads }));
  return card;
}

function grammarPick(it, ctx) {
  const blanked = it.text.replace(it.blank, '___');
  const card = h('section', { class: 'card q' },
    prompt('Which word goes in the gap?'),
    h('p', { class: 'han big' }, blanked),
    // The gap is in a Chinese sentence, so without the reading line the
    // question is a picture with a hole in it. The gap keeps its place in the
    // reading, so you can hear what goes either side of the missing word.
    it.blanked ? h('p', { class: 'jyut' }, it.blanked) : null,
    h('p', { class: 'gloss' }, it.eng));
  card.append(choices(it.options, it.answer, (ok) => {
    ctx.onAnswer(ok);
    const g = D().grammarById.get(it.gid);
    card.append(afterCard([
      sentenceBlock(it.text, it.jyut, it.eng),
      g ? h('div', { class: 'gpoint' }, h('h3', {}, g.title), h('p', {}, g.plain), g.watch ? h('p', { class: 'watch' }, g.watch) : null) : null,
      evidenceLine({ sentence: it.sid }),
    ], { ...ctx, ok, answer: it.reads?.[it.answer] ? `${it.answer} (${it.reads[it.answer]})` : it.answer }));
  }, { reads: it.reads }));
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
      sentenceBlock(it.text, it.jyut, it.eng),
      it.audio ? playButton({ sentenceId: it.sid, label: 'Hear it' }) : null,
      evidenceLine({ sentence: it.sid }),
    ], ctx));
  };
  // Each piece carries its reading. Arranging six Chinese chunks you cannot
  // read is not a grammar question, it is a jigsaw (Robert, 20 Sept).
  const readOf = (p) => it.pieceReads?.[it.pieces.indexOf(p)] || null;
  const face = (p) => { const j = readOf(p); return j ? [h('span', { class: 'han' }, p), h('span', { class: 'jyut' }, j)] : [p]; };
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
      } }, ...face(piece));
      line.append(back0);
      check();
    } }, ...face(piece));
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
  applyReadingFont(!!S().sans);
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
  watchForUpdates();
  show('home', homeScreen, { replace: true });
}
boot();

export { header, homeScreen, playButton, S };
