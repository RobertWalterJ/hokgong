// Hok Gong — what to ask, and when.
//
// Ported from Palimpsest's scheduler, which came from Landfall's, keeping the rules that were measured there
// rather than re-deriving them:
//   - SM-2-lite intervals, ease 1.35–3.0, capped at 270 days;
//   - no repeats inside a session: a miss comes back on a later day
//     (Cepeda et al. 2006 — retrieval spread across sessions is what lasts;
//     Robert, 18 Sept 2026: repeats made the pack feel small);
//   - ease can recover toward its start after three clean reviews, but never
//     climbs past it (the "pawl");
//   - practice never moves the schedule;
//   - days are the player's local calendar days, not UTC's.
// A card here is one question about one word, sentence, tone or grammar
// point. `groupOf` is the word, so hearing a word and then saying it do not
// land in the same round.

const KEY = 'hokgong.v1';

export const MAX_INTERVAL = 270;
export const EASE_START = 2.2;
export const EASE_MIN = 1.35;
export const EASE_MAX = 3.0;
export const KNOWN_AT = 21;          // days — "known" means you will still have it in three weeks
export const SECURE_AT = 90;
export const DAY = 864e5;
// A round is at most ROUND questions, each asked ONCE. In-round repeats were
// removed on 18 Sept 2026: Robert found the same questions coming back inside
// a session, and it made the pack feel small. A miss now simply comes back on
// a later day — the spacing that actually builds memory.
const NEW_PER_ROUND = 9;
const MIN_NEW = 6;                   // new questions per round while some reviews are due
const ROUND = 25;              // about five minutes at ten seconds a question
// Palimpsest's pack was 317 questions and these numbers suited it. This deck
// is 13,826 questions towards a 6,000-word vocabulary, and a backlog threshold
// of 14 throttled new words to three a day — sixteen years to the end of the
// list. The thresholds now scale to what a language learner actually carries:
// a few dozen reviews a day is ordinary, not a crisis.
// A third of a day being new material is the ratio that feels like progress;
// a fifth is the ratio that feels like a loop. At three sittings of 25 that
// puts the day's allowance around thirty.
const NEW_PER_DAY = 32;              // new questions per day, across all rounds
const EASING = 70;                   // due reviews above which a round eases to MIN_NEW
const BACKLOG = 160;                 // …and above which it takes just one new question
// Robert plays in short bursts while waiting, several times a day. A question
// answered in the last COOLDOWN hours is not asked again — not in another
// round, not in practice, not after closing and reopening the app — so its
// next appearance is a test of recall, not of what was on screen minutes ago.
export const COOLDOWN = 4 * 3600e3;
const PER_GROUP = 1;                 // at most this many questions about one word in a round

let clock = () => Date.now();
export const now = () => clock();
export function __setClock(fn) { clock = fn; }   // tests

export const dayKey = (t = now()) => {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const newCard = () => ({ iv: 0, e: EASE_START, reps: 0, lapses: 0, due: 0, last: 0, st: 'new', step: 0, ok: false, run: 0, lapseRep: -9 });

export function cardState(c) {
  if (!c || c.st === 'new') return 'unseen';
  // KNOWN means what the app tells the learner: you answered right after at
  // least three weeks away (`proven`, in days). It used to mean "the next check
  // is three weeks out", which is set right after a ten-day gap — the claim
  // ran ahead of the evidence (learning audit).
  if (c.st === 'review' && c.ok && (c.proven || 0) >= SECURE_AT) return 'secure';
  if (c.st === 'review' && c.ok && (c.proven || 0) >= KNOWN_AT) return 'known';
  return 'met';
}
// Settled but not yet proven: in review, last answer right, next check a week
// or more out. Shown as progress between "met" and "known", so the first three
// weeks are not a flat line.
export const isHolding = (c) => !!c && c.st === 'review' && c.ok && c.iv >= 7 && cardState(c) === 'met';

const tomorrow = () => { const d = new Date(now()); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 4, 0).getTime(); };

function blank() {
  return {
    v: 1, cards: {}, days: {},
    settings: { sound: true, readAloud: 'manual', rate: 0.97, theme: 'system' },
  };
}

// Storage can be absent (private windows, blocked site data). The app must
// still work; it just forgets.
export const State = {
  data: blank(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.v === 1) this.data = { ...blank(), ...d, settings: { ...blank().settings, ...d.settings } };
      }
    } catch { /* keep the blank state */ }
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* nothing to do */ } },
  card(id) { return this.data.cards[id] || null; },

  answer(id, right, { practice = false, repeat = false } = {}) {
    const day = this.data.days[dayKey()] || (this.data.days[dayKey()] = { n: 0, right: 0 });
    // When it was last asked, in any mode — for the cool-down and the recall
    // test. Kept apart from the card so practice still changes nothing else.
    (this.data.seen || (this.data.seen = {}))[id] = now();
    // Practice changes nothing about the card — not its status, not its
    // streak, not its "last seen". A practice miss used to knock a known card
    // back to "met" (both audits). It is logged on its own.
    if (practice) {
      day.pn = (day.pn || 0) + 1; if (right) day.pr = (day.pr || 0) + 1;
      this.save();
      return this.data.cards[id] || newCard();
    }
    const c = this.data.cards[id] || newCard();
    const wasReview = c.st === 'review';
    // Growth, from what actually happened: how the player did the first time
    // they met a question, and the day a first miss was first answered right
    // on a LATER day ("turned around") — then vs now.
    if (c.st === 'new') { c.first = right ? 1 : 0; c.firstAt = now(); }
    else if (right && c.first === 0 && !c.turnedAt && dayKey(c.firstAt) !== dayKey()) c.turnedAt = now();
    const gapDays = c.last ? (now() - c.last) / DAY : 0;
    // The daily log, by kind of answer, so accuracy can be read against the
    // 80–85% target: first-try reviews only, not new cards or in-round repeats.
    day.n++; if (right) day.right++;
    if (wasReview && !repeat) { day.rn = (day.rn || 0) + 1; if (right) day.rr = (day.rr || 0) + 1; }
    if (c.st === 'new') day.newN = (day.newN || 0) + 1;

    c.last = now();
    c.ok = right;
    c.run = right ? c.run + 1 : 0;
    if (right && wasReview) c.proven = Math.max(c.proven || 0, Math.floor(gapDays));

    if (right) {
      c.reps++;
      if (c.st === 'new' || c.st === 'learning') {
        c.st = 'learning';
        c.step++;
        // Right on two separate days graduates it; the next look is three
        // days out. (Right twice in one sitting was recognition, not memory.)
        if (c.step > 1) { c.st = 'review'; c.iv = 3; c.due = now() + 3 * DAY; c.step = 0; }
        else c.due = tomorrow();
      } else if (c.st === 'relearning') {
        c.iv = Math.max(1, Math.round((c.ivBefore || c.iv || 1) * 0.35));
        c.st = 'review';
        c.due = now() + c.iv * DAY;
      } else {
        c.iv = Math.min(MAX_INTERVAL, Math.max(1, Math.round(c.iv * c.e)));
        c.due = now() + c.iv * DAY;
        if (c.reps - c.lapseRep >= 3 && c.e < EASE_START) c.e = Math.min(EASE_START, c.e + 0.05);
      }
    } else {
      if (c.st === 'review' || c.st === 'relearning') {
        if (c.st === 'review') { c.ivBefore = c.iv; c.lapses++; c.lapseRep = c.reps; c.proven = 0; }
        c.st = 'relearning';
        c.e = clamp(c.e - 0.25, EASE_MIN, EASE_MAX);
      } else {
        c.st = 'learning';
        c.step = 0;
      }
      c.due = tomorrow();
    }
    this.data.cards[id] = c;
    this.save();
    return c;
  },

  // What the player can answer: questions whose last (non-practice) answer
  // was right. Recorded once a day it's looked at, so Progress can draw it
  // rising — observed, not modelled.
  seenAt(id) { return this.data.seen?.[id] || this.card(id)?.last || 0; },
  // How likely the player still remembers it: exp(-time since last asked /
  // the card's interval), lower after a miss. The recall test starts with the
  // lowest — the questions most at risk of being forgotten.
  recall(id, t = now()) {
    const c = this.card(id);
    if (!c) return 1;
    const r = Math.exp(-(t - this.seenAt(id)) / (Math.max(1, c.iv || 0) * DAY));
    return c.ok ? r : r * 0.6;
  },
  canAnswer(ids) { return ids.filter((id) => { const c = this.card(id); return c && c.st !== 'new' && c.ok; }).length; },
  snapshot(ids) {
    const day = this.data.days[dayKey()];
    if (!day) return;             // only days the player actually played
    const known = ids.filter((id) => ['known', 'secure'].includes(cardState(this.card(id)))).length;
    day.snap = { can: this.canAnswer(ids), met: ids.filter((id) => this.card(id)).length, holding: ids.filter((id) => isHolding(this.card(id))).length, known };
    this.save();
  },
  // The snapshot nearest to (at or before) a past day, for "this week".
  snapAt(t) {
    const key = dayKey(t);
    const keys = Object.keys(this.data.days).filter((k) => k <= key && this.data.days[k].snap).sort();
    return keys.length ? this.data.days[keys[keys.length - 1]].snap : null;
  },

  dueIds(ids) {
    const t = now();
    return ids.filter((id) => { const c = this.card(id); return c && c.st !== 'new' && c.due <= t; })
      .sort((a, b) => this.card(a).due - this.card(b).due);
  },
  nextDue(ids) {
    let soonest = Infinity;
    for (const id of ids) { const c = this.card(id); if (c && c.st !== 'new' && c.due > now() && c.due < soonest) soonest = c.due; }
    return Number.isFinite(soonest) ? soonest : null;
  },
  runOfDays() {
    let run = 0;
    for (let i = 0; i < 400; i++) { if (this.data.days[dayKey(now() - i * DAY)]) run++; else if (i > 0) break; }
    return run;
  },
};

// A round: what is due, oldest first; then new questions in the order the
// story is told — the pack is authored as a narrative, so "new" follows it
// rather than being shuffled; nothing new at all once reviews pile up.
// How many new questions today still allows, at the player's pace. Screens
// must ask this rather than count unseen questions: Home once promised
// "5 new questions waiting" after the day's allowance was spent, and the round
// it opened was empty (Robert, 19 Sept 2026).
export function newLeftToday(pace = null) {
  return Math.max(0, (pace?.newPerDay ?? NEW_PER_DAY) - (State.data.days[dayKey()]?.newN || 0));
}

export class Round {
  // `exclude`: questions already asked this session.
  // `pace`: { newPerRound, newPerDay } from the placement check.
  // `groupOf(id)`: the big question a question serves; `parasOf(id)`: the
  // paragraphs its evidence quotes. Used to keep similar questions apart.
  // `beyondDaily`: the player chose to keep going — the day's allowance of new
  // questions is lifted AND the per-round trickle of five is lifted with it.
  // Lifting only the daily one gave a five-question round, which is what
  // Robert met on 20 Sept: "I can't get it to serve me up 25 questions back to
  // back if I try my hardest."
  // `stageOf(id)`: which stage of the course a question belongs to, so new
  // material can lead with the stage being worked on rather than with whatever
  // the widened horizon happens to offer.
  constructor(ids, { practice = false, exclude = new Set(), pace = null, groupOf = null, parasOf = null, stageOf = null, beyondDaily = false, perGroup = PER_GROUP, size = ROUND } = {}) {
    this.size = size;
    this.extra = new Set();
    this.beyondDaily = beyondDaily;
    this.practice = practice;
    this.queue = [];
    this.asked = 0;
    const t = now();
    const cooling = (id) => t - (State.data.seen?.[id] || 0) < COOLDOWN;
    const pool = ids.filter((id) => !exclude.has(id) && !cooling(id));
    // One question per word per round keeps a round from feeling like a drill
    // on six words — but it is a cap, and early in the course it binds. Stage
    // one opens fourteen words and two grammar points: sixteen groups, so
    // "at most one each" makes a 25-question round arithmetically impossible,
    // however willing the learner is. The rule gives way in proportion: with
    // sixteen groups open it allows two each, and #spread still keeps them
    // apart. Once the course has opened enough words it is back to one.
    const openGroups = groupOf ? new Set(ids.map(groupOf).filter(Boolean)).size : Infinity;
    if (openGroups && openGroups < Infinity) perGroup = Math.max(perGroup, Math.ceil(size / openGroups));
    this.perGroup = perGroup;
    // Picks from candidates in priority order, skipping one that would be a
    // third from the same big question, or that quotes a paragraph another
    // pick already quotes (one would give the other away). Skipped ones
    // simply wait for a later round.
    const picked = [];
    const groups = new Map();
    const paras = new Set();
    const take = (cands, n) => {
      const out = [];
      for (const id of cands) {
        if (out.length >= n) break;
        const g = groupOf?.(id);
        if (g && (groups.get(g) || 0) >= perGroup) continue;
        const ps = parasOf?.(id) || [];
        if (ps.some((p) => paras.has(p))) continue;
        out.push(id); picked.push(id);
        if (g) groups.set(g, (groups.get(g) || 0) + 1);
        for (const p of ps) paras.add(p);
      }
      return out;
    };

    if (practice) {
      // The recall test: questions met before, likeliest-forgotten first
      // (ties shuffled), so each reappearance tests memory.
      const seen = shuffle(pool.filter((id) => State.card(id)));
      seen.sort((x, y) => State.recall(x, t) - State.recall(y, t));
      take(seen, size);
      // The cool-down is a preference, never a wall (Robert: "I don't want to
      // 100% exhaust questions"). If a long spell of play has used up what's
      // cooled, fill from the cooling ones asked longest ago, then — only as
      // a last resort — from this session; the similarity limits give way
      // before the round comes up short.
      const met = ids.filter((id) => State.card(id));
      const byAge = (list) => list.sort((x, y) => State.seenAt(x) - State.seenAt(y));
      const tiers = [
        byAge(met.filter((id) => !exclude.has(id) && cooling(id))),
        byAge(met.filter((id) => exclude.has(id))),
      ];
      for (const tier of tiers) if (picked.length < size) take(tier.filter((id) => !picked.includes(id)), size - picked.length);
      if (picked.length < Math.min(size, met.length)) {
        const loose = byAge(met.filter((id) => !picked.includes(id)));
        picked.push(...loose.slice(0, Math.min(size, met.length) - picked.length));
      }
      this.early = picked.filter((id) => cooling(id) || exclude.has(id)).length;
      this.queue = this.#spread(picked.slice(), groupOf);
      return;
    }
    const due = State.dueIds(pool);
    // Unseen questions, the stage being worked on first. A stable sort, so
    // within a stage the pack's own teaching order is kept.
    const fresh = pool.filter((id) => !State.card(id));
    if (stageOf) fresh.sort((a, b) => (stageOf(a) ?? 99) - (stageOf(b) ?? 99));
    // At most NEW_PER_DAY new a day: five "another round"s used to mean
    // twenty-five new questions and a wall of reviews tomorrow.
    const newToday = State.data.days[dayKey()]?.newN || 0;
    const perRound = pace?.newPerRound ?? NEW_PER_ROUND;
    const newRoom = beyondDaily ? Infinity : Math.max(0, (pace?.newPerDay ?? NEW_PER_DAY) - newToday);
    // New questions scale with the reviews waiting: five when little is due,
    // three when some is, and one — never none — under a backlog. (Forcing
    // three into every round starved the reviews: persona study, 18 Sept.)
    // …unless the learner has explicitly asked for more, in which case the
    // round is theirs to fill: new material up to the whole sitting.
    const allowance = beyondDaily ? size
      : due.length > BACKLOG ? 1 : due.length > EASING ? Math.min(MIN_NEW, perRound) : perRound;
    const nNew = Math.min(allowance, fresh.length, newRoom);
    // Reviews by due date, then new questions in the pack's teaching order.
    // What is owed is never displaced by new material: when the learner has
    // asked for a full round, the reviews still go in first and the new words
    // fill whatever is left.
    // How many of the new words get a second look inside this sitting. Capped
    // at a quarter of the round so the reviews are not starved to pay for it.
    const nAgain = practice ? 0 : Math.min(nNew, Math.floor(size / 4));
    const reviews = take(due, beyondDaily ? size : Math.max(0, size - nNew - nAgain));
    const add = take(fresh, Math.min(nNew, size - picked.length));
    // A second question about each word just taught, to be asked later in this
    // same round. It is a DIFFERENT question — met by ear, come back to by
    // eye — so it is consolidation rather than the in-round repetition that
    // made the pack feel small (Robert, 18 Sept). Reserved here, before the
    // fill spends the round's budget on anything else.
    const again = [];
    if (!practice && groupOf) {
      for (const id of add) {
        if (again.length >= nAgain || picked.length >= size) break;
        const g = groupOf(id);
        if (!g) continue;
        const sib = pool.find((x) => x !== id && groupOf(x) === g && !picked.includes(x) && !State.card(x));
        if (!sib) continue;
        picked.push(sib);
        groups.set(g, (groups.get(g) || 0) + 1);
        again.push(sib);
      }
    }
    // A round that runs out is a round that ends after two questions. Robert
    // wants fifteen minutes a day in three sittings, and between the stage
    // gate, the daily allowance of new words and the four-hour cool-down,
    // there is often nothing "owed" left to ask. So the round is topped up
    // with words already met, likeliest-forgotten first — and those answers
    // are logged as PRACTICE, so filling the time never distorts the
    // schedule or inflates what the app claims you know.
    //
    // The fill runs in four steps, in the order a teacher would use, and each
    // one only when the one before it is exhausted:
    //
    //   1. words met and out of their cool-down, likeliest-forgotten first;
    //   2. more new material — the day's allowance governs how much new work
    //      ARRIVES on its own, but it does not get to cut a sitting short once
    //      the learner has started one. This is what a first round is: nothing
    //      due, nothing met, so the trickle of five new questions was the whole
    //      sitting, and then "come back tomorrow";
    //   3. the cooling ones, asked longest ago first — the cool-down is a
    //      preference, not a wall;
    //   4. this session's, and only then, because a question asked twice in an
    //      evening is what made the pack feel small (Robert, 18 Sept).
    //
    // Everything drawn by the fill is logged as PRACTICE, so filling the time
    // never moves the schedule or inflates what the app claims you know.
    this.extra = new Set();
    const byAge = (list) => list.slice().sort((x, y) => State.seenAt(x) - State.seenAt(y));
    const metAll = ids.filter((id) => State.card(id) && !due.includes(id));
    const fillWith = (cands) => {
      if (picked.length >= size) return;
      const top = take(cands.filter((id) => !picked.includes(id)), size - picked.length);
      for (const id of top) this.extra.add(id);
      reviews.push(...top);
    };
    // Least recently asked first, NOT weakest recall. Weakest-recall was the
    // obvious choice and it made the loop: a practice answer deliberately does
    // not move the schedule, so the weakest questions were still the weakest
    // tomorrow, and the fill handed back the same ones every single day. Going
    // by when a question was last asked rotates through everything met, which
    // is what spacing across material actually means.
    fillWith(byAge(metAll.filter((id) => !exclude.has(id) && !cooling(id))));
    if (picked.length < size) add.push(...take(fresh.filter((id) => !picked.includes(id)), size - picked.length));
    fillWith(byAge(metAll.filter((id) => !exclude.has(id) && cooling(id))));
    // The last two steps re-ask something the learner has already seen today,
    // so they are only for a learner who asked to keep going. An ordinary
    // round is allowed to come up short; home offers to carry on.
    if (practice || beyondDaily) {
      fillWith(byAge(metAll.filter((id) => exclude.has(id))));
      // Last of all, the one-per-word limit gives way before the sitting does.
      if (picked.length < size) {
        const loose = byAge(metAll.filter((id) => !picked.includes(id))).slice(0, size - picked.length);
        for (const id of loose) { picked.push(id); this.extra.add(id); reviews.push(id); }
      }
    }
    this.early = [...this.extra].filter((id) => cooling(id) || exclude.has(id)).length;
    this.queue = this.#arc(reviews, add, again, groupOf);
    // …except the very first round a player ever plays, which opens on the
    // pack's first word rather than on a review there cannot be one of.
    if (!Object.keys(State.data.cards).length && add.length) {
      this.queue = [add[0], ...this.queue.filter((x) => x !== add[0])];
    }
  }
  // warm-up, teaching, consolidation, review.
  //
  // Reviews open the sitting because starting on something you know is the
  // difference between a lesson and an examination; new material sits in the
  // middle where attention is; the second look at each new word lands in the
  // back half, far enough from the first to be a retrieval rather than an
  // echo; and the remaining reviews fill in around it.
  #arc(reviews, add, again, groupOf) {
    if (!add.length && !again.length) return this.#spread(shuffle(reviews), groupOf);
    const rest = reviews.slice();
    // Three to warm up, but never at the cost of having reviews left to space
    // the new material out with.
    const warm = rest.splice(0, Math.min(3, Math.max(0, rest.length - add.length)));
    // The new words, with a review between every second one so the teaching
    // is not one long wall of things you have never seen.
    const body = [];
    add.forEach((id, i) => {
      body.push(id);
      if (i % 2 === 1 && rest.length) body.push(rest.shift());
    });
    // Everything left, with the second looks among it.
    const tail = this.#spread(shuffle([...rest, ...again]), groupOf);
    return [...warm, ...body, ...tail];
  }
  // Reorders so no two neighbours serve the same big question, where that's
  // possible, keeping the order otherwise.
  #spread(list, groupOf) {
    if (!groupOf) return list;
    // Each step places, from a group other than the last one placed, the group
    // with most still waiting (first in list order among equals). Going
    // strictly front to back could leave two of a kind for the last places.
    const rest = list.slice();
    const out = [];
    while (rest.length) {
      const prev = out.length ? groupOf(out[out.length - 1]) : null;
      const left = new Map();
      for (const id of rest) left.set(groupOf(id), (left.get(groupOf(id)) || 0) + 1);
      let best = -1;
      for (let i = 0; i < rest.length; i++) {
        const g = groupOf(rest[i]);
        if (g === prev) continue;
        if (best < 0 || left.get(g) > left.get(groupOf(rest[best]))) best = i;
      }
      out.push(rest.splice(best < 0 ? 0 : best, 1)[0]);
    }
    return out;
  }
  get empty() { return this.queue.length === 0; }
  isRepeat() { return false; }
  next() { this.asked++; return this.queue.shift() || null; }
  after() { /* nothing is re-queued: each question once per session */ }
}

export function shuffle(a) {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// "The next one comes round Friday" — said on a Friday about a card due that
// afternoon was Landfall's bug. Name the day by the calendar.
// How long until the next review comes round, counted down in words. Robert
// asked for this on 20 Sept: when the app says "nothing else is due" he wants
// to know how long "nothing" lasts, rather than being told to come back
// tomorrow and left to guess.
//
// It counts in minutes, never seconds. A clock ticking down a second at a
// time is the thing he has asked every app here not to do, and a countdown to
// MORE WORK BEING AVAILABLE is not a deadline — nothing is lost by ignoring
// it, and the round below it is playable the whole time.
export function untilText(when, nowT = now()) {
  const ms = when - nowT;
  if (ms <= 0) return 'now';
  const mins = Math.ceil(ms / 60e3);
  if (mins < 2) return 'in under a minute';
  if (mins < 60) return `in ${mins} minutes`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return m ? `in ${h} hour${h === 1 ? '' : 's'} ${m} minute${m === 1 ? '' : 's'}` : `in ${h} hour${h === 1 ? '' : 's'}`;
  const days = Math.round(h / 24);
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

export function nextDueSentence(when, nowT = now()) {
  const due = new Date(when), today = new Date(nowT);
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((midnight(due) - midnight(today)) / DAY);
  const mins = Math.round((when - nowT) / 60e3);
  const hr = due.getHours(), mn = due.getMinutes();
  const clockText = `${hr % 12 || 12}${mn ? ':' + String(mn).padStart(2, '0') : ''} ${hr < 12 ? 'am' : 'pm'}`;
  if (days <= 0) {
    const at = mins < 60 ? `in about ${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}` : `later today, around ${clockText}`;
    return `Nothing else is due right now. The next question comes round ${at}.`;
  }
  const at = days === 1 ? 'tomorrow'
    : days < 7 ? due.toLocaleDateString('en-CA', { weekday: 'long' })
      : 'on ' + due.toLocaleDateString('en-CA', { day: 'numeric', month: 'long' });
  return `Nothing else is due today. The next question comes round ${at}.`;
}
