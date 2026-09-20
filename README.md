# 學講 Hok Gong — learning to talk

A Cantonese app built on recorded speech. It teaches in ten gated stages, asks
you to produce as well as recognise, listens to your tones and tells you what
it measured, and only ever teaches what a published source actually says.

**Use it:** https://robertwalterj.github.io/hokgong/ — add it to your home
screen and it works offline, recordings and all.

## What it does

- **6,000 words**, ordered by a course rather than by a frequency list. Ten
  stages, each a small vocabulary plus the grammar that turns those words into
  sentences, each ending with something you can do, each gated on the one
  before it. After the course, the rest of the list in frequency order.
- **Nine kinds of question across five skills** — hear a word, read it, say it,
  understand a recorded sentence, tell two tones apart, produce a tone, and
  three grammar kinds including building a sentence from its pieces. 45% of
  questions ask you to produce rather than recognise.
- **585 recordings of a person**, bundled, so listening works with no signal.
- **Tone production, measured.** The phone tracks the pitch of what you said by
  normalised autocorrelation, converts it to semitones relative to your own
  range (learnt from your attempts), and reports the contour against the
  standard Chao values. Nothing leaves the device.
- **Spaced retrieval.** Every question is scheduled on its own; nothing is
  asked twice in a session, and nothing asked in the last four hours comes back
  — so when it returns it tests memory, not the screen you just looked at.
- **Progress you can check**, per skill, with what each number does *not* mean
  stated on the same page.
- **Where the words come from** — short cards on Cantonese in Canada, quoted
  from an open-licensed history, and on the food the words name.

## Running it

```
npm install
node build/extract.mjs      # corpus + dictionaries -> corpus/
node build/items.mjs        # the deck -> app/data/deck.json
sh build/fetch-audio.sh     # the Tatoeba recordings -> app/audio/
node build/single.mjs       # gates, then dist/hokgong.html
node build/make-deploy.mjs  # docs/ for GitHub Pages
```

`build/wiktionary.mjs` prepares `corpus/wiktionary.json` from the kaikki.org
Chinese dump; the 1.2 GB dump is not committed and the script prints the
command to fetch it.

## The gates

`node build/single.mjs` refuses to build if any of these fail:

| gate | what it checks |
|---|---|
| `build/verify.mjs` | 101,869 checks that every reading, meaning, sentence, translation, grammar example and history quote matches its source, that every question is answerable, and that the course is passable |
| `build/test-verify.mjs` | breaks twelve things on purpose and requires all twelve to be caught |
| `build/audit-colour.mjs` | no meaning rides on hue alone, under deuteranopia, protanopia, tritanopia or no colour at all |
| `audits/run-dyslexia.mjs` | no capitals, no centred prose, no timers, read-aloud throughout |
| `build/test-schedule.mjs` | plays 120 days and fails if the loop stalls, buries the learner, or never reaches a skill |

Audits that report rather than gate: `audits/run-accuracy.mjs`,
`run-progression.mjs`, `run-personas.mjs`. Written up in `audits/*.md`.

## Sources

Everything the app teaches comes from one of these, and the app credits them on
its own About page. Full detail and limitations in [SOURCES.md](SOURCES.md).

| source | what for | licence |
|---|---|---|
| [HKCanCor](https://github.com/fcbond/hkcancor) | 125,119 words of recorded Hong Kong conversation — the frequency is *spoken* | CC BY 4.0 |
| [rime-cantonese](https://github.com/rime/rime-cantonese) | Jyutping readings, written-Cantonese frequency | CC BY 4.0 |
| [CC-Canto](https://cantonese.org) / CC-CEDICT | meanings | CC BY-SA 3.0 / 4.0 |
| [English Wiktionary](https://kaikki.org/dictionary/Chinese/) via kaikki.org | meanings, tagged by variety | CC BY-SA 3.0 |
| [Unihan](https://www.unicode.org/charts/unihan.html) | character readings, and an independent check on them | Unicode licence |
| [Tatoeba](https://tatoeba.org) | every example sentence, its translation, and the recordings | CC BY 2.0 FR / CC BY 4.0 |
| Belshaw, *Canadian History* (BCcampus) | the history on the context cards, quoted verbatim | CC BY 4.0 |

## What it cannot do

It cannot hear whether you pronounced a word correctly — it measures the pitch
of a syllable, which is part of that and not the whole. It cannot teach you to
hold a conversation on its own. The recorded corpus is from 1997–98, so
everyday grammar holds up and anything about technology or slang may be dated.
And at five minutes a day it will not reach a conversational vocabulary: see
[the progression audit](audits/2026-09-20-progression.md) for the arithmetic.

## Licence

The code is Robert Walter-Joseph's, under the MIT licence ([LICENSE](LICENSE)).
The data belongs to the projects above and is used under their licences, which
require attribution — hence the About page, SOURCES.md and the table above.
