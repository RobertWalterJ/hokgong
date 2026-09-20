# Progression audit — 20 September 2026

Run it yourself: `node audits/run-progression.mjs`, `node audits/run-personas.mjs`

The question: does working through this app, in the order it teaches, build
towards holding a conversation?

## What it found

**The order was wrong, and the corpus was why.** HKCanCor is 125,000 words of
adult conversation recorded in 1997. People who already know each other do not
say good morning into a tape recorder, and nobody discusses a one-year-old's
bath. So the app was teaching:

| word | meaning | taught at word |
|---|---|---|
| 早晨 | good morning | 2,523 |
| 唔該 | thank you / excuse me | 1,144 |
| 對唔住 | sorry | 1,065 |
| 媽媽 | mum | 2,589 |
| 爸爸 | dad | 1,615 |
| 嚟 | to come | 2,598 |
| 你好 | hello | never — not in the corpus at all |
| 六 | six | never — no usable gloss |

Every one of those is correct by frequency and absurd by any measure a learner
would recognise. 早晨 appears **twice** in the whole corpus; 媽媽 twice.

**Worse, the words that build a sentence were scattered.** A learner could know
the hundred commonest words and still not be able to say anything, because 個
(the measure word), 嘅 (the possessive) and the question words were spread
across hundreds of positions, each arriving alone with nothing to attach to.

**And nothing ever reached tones or grammar.** The scheduler simulation played
120 days and never once asked a tone question, because new material was
introduced in deck order and the deck was all words first.

## What changed

**A course, in ten stages, each with a gate.** `content/syllabus.mjs`. Each
stage is a small vocabulary plus the grammar that turns those words into
sentences, and each ends with something you can do:

1. **Hello, yes, and no** — greet, thank, apologise, answer yes or no. 係, 唔.
2. **Me, you, and who** — pronouns and the one plural rule.
3. **The people at your table** — family, and 嘅 for whose.
4. **Counting things** — one to ten, and the measure words a number needs.
5. **Asking things** — the question words, 有冇 and V-唔-V.
6. **At the table** — food and drink, and 咗 for something finished.
7. **When** — today, tomorrow, the clock, and 緊 for something in progress.
8. **Getting about** — going, coming, and 返 for going back.
9. **How it feels** — liking, wanting, and the particles that carry attitude.
10. **A day at home** — the ordinary business of a day.

A stage opens only when the one before it is passed: three-quarters of its own
words answerable, and each of its grammar points met. Reviews of anything
already met keep coming regardless — the gate governs only what is NEW.

After stage ten the remaining 5,800 words open in frequency order, which is
where a frequency list finally belongs.

The result, measured the same way as before: 你好 is now word 1, 早晨 word 2,
唔該 word 3, the family at 26–31, the numbers at 59–68, the measure words at
69–75. **Every skill now starts inside the first 300 questions.**

## How fast it actually goes

From `run-personas.mjs`, which plays the real scheduler against a forgetting
curve for a year:

| how you play | minutes a day | words after a year |
|---|---|---|
| One sitting a day | 2 | 126 |
| Three short sittings | 5 | 301 |
| Three sittings, after Pimsleur | 5 | 393 |
| Six sittings | 11 | 537 |
| Twelve sittings | 22 | 1,060 |
| Three sittings, two days off a week | 4 | 220 |

**The pace setting is nearly a placebo.** "Keen" (40 new a day) produced 299
words against "Steady"'s 301, because the limit is not the daily allowance —
it is how many questions fit in the time you play. Time is the lever. The app
says so in Settings rather than implying otherwise.

**The honest conclusion about 4,000–6,000 words.** At five minutes a day this
app alone will not get you there: 300 words a year is 20 years. At twenty
minutes a day it is about 1,000 words a year, which reaches the first 1,000 —
90.7% of the words in recorded conversation — inside a year, and 2,000 in
three. That is a real result and it is not the 6,000-word goal. The 6,000-word
vocabulary comes from this plus the rest of a life with the language: your
wife, the YouTube, the classes when they are possible, and the boy.

## Still open

- 公公 and 唔得 are in no source that gives a Cantonese reading, so they cannot
  be taught yet. words.hk would have them.
- The stage vocabularies are 10–21 words each, which is small. They are the
  spine, not the whole of a stage — the frequency list fills in around them.
