# Sources

Everything the app teaches comes from one of these. Nothing is invented: each
word carries the pronunciation and gloss a published source gives it, and each
sentence is quoted verbatim with its author and licence.

## The spoken corpus — what Cantonese people actually say

**Hong Kong Cantonese Corpus (HKCanCor)**, Luke Kang Kwong and May Wong.
Recorded March 1997 – August 1998: 93 texts of spontaneous conversation and
radio programmes, word-segmented and tagged with part of speech and Jyutping
(LSHK romanisation). CC BY 4.0. https://github.com/fcbond/hkcancor
Transcripts in `sources/hkcancor-master/`; 58 UTF-8 files, 125,119 usable word
tokens after dropping punctuation, English and numbers.

This is what makes the word list *spoken* Cantonese rather than written
Chinese: frequency is counted from people talking to each other.

*Limitation, stated plainly:* the recordings are from 1997–98. Frequencies for
everyday grammar and conversation hold up; anything about technology, money or
slang may be dated.

## Dictionaries

- **CC-Canto**, Pleco Software, 2015–17. Cantonese dictionary with Jyutping and
  English, 34,335 entries. CC BY-SA 3.0. https://cantonese.org
- **CC-CEDICT Cantonese readings**, Pleco Software. Jyutping readings for
  CC-CEDICT headwords, 105,862 entries. CC BY-SA 3.0.
- **CC-CEDICT**, community-maintained Chinese–English dictionary, 125,083
  entries. CC BY-SA 4.0. https://www.mdbg.net/chinese/dictionary?page=cc-cedict

CC-CEDICT is a *Mandarin* dictionary: its gloss for a Cantonese word is often
the wrong word entirely (係 as "to connect", not "to be"). So glosses are
matched to the pronunciation the corpus actually uses, Cantonese dictionary
first, and the app marks any word whose only gloss belongs to another reading.

## Sentences and recorded audio

**Tatoeba**, https://tatoeba.org — 20,853 Cantonese sentences, 7,038 with an
English translation, and **1,784 with recorded audio** by a human speaker
(user `cantonesespoken`). Sentences are CC BY 2.0 FR; the audio is CC BY 4.0.
Each sentence keeps its id, so it can be credited and linked.

## The word list past the corpus

**rime-cantonese**, CanCLID. CC BY 4.0. https://github.com/rime/rime-cantonese
Two files are used: `essay-cantonese.txt`, a frequency list of written
Cantonese (266,870 entries), and `jyut6ping3.words.dict.yaml` /
`jyut6ping3.chars.dict.yaml`, a Jyutping lexicon (103,090 and 34,375 lines).

It does two jobs. It confirms pronunciations independently of the dictionaries —
a line with no percentage is the word's main reading, one with a percentage is a
minority reading, which is how 搵 is taught as wan2 "to look for" and not as the
rare man5 "to wipe away tears". And it carries the word list past the 6,399
words HKCanCor happened to record, which is well short of the 4,000–6,000 a
learner needs to hold a conversation.

*Limitation, stated plainly:* tier 2 is **written** Cantonese frequency, not
speech, and Hong Kong writing mixes in standard Chinese. Words built from
Mandarin function characters (就是, 他們) and swear words are left out, and the
app labels which tier a word comes from.

## The dictionaries that fill CC-Canto's gaps

**English Wiktionary**, via **kaikki.org** (Tatu Ylonen's wiktextract).
CC BY-SA 3.0. https://kaikki.org/dictionary/Chinese/
86,198 Chinese words that carry a Jyutping reading and an English sense. What
makes it worth 1.2 GB of download: Wiktionary **tags senses by variety**, so a
sense marked Cantonese can be told apart from a Mandarin-only one.
`build/wiktionary.mjs` boils the dump down to `corpus/wiktionary.json` (8 MB,
committed); the 1.2 GB dump itself is not committed, and the script prints the
command to fetch it again.

**Unihan**, the Unicode Consortium's character database. Unicode licence.
https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
Cantonese readings (`kCantonese`) for 29,936 characters and English
definitions (`kDefinition`) for 20,587. Terse, single characters only, and
authoritative on readings — which is why the accuracy audit uses it as an
independent check rather than only as a source.

*Why these two:* CC-Canto is a good Cantonese dictionary and it stops. The gaps
it leaves are not obscure words but everyday ones — 六 "six" had no gloss that
belonged to its Cantonese reading at all. These two took the top 1,000 spoken
words from 625 exact matches to 905.

## Considered, not yet used

- **words.hk (粵典)** — a proper Cantonese-to-Cantonese dictionary under a
  Non-Commercial Open Data Licence (attribution, the 特別鳴謝 list and a link
  required; no commercial use). Its definitions are better than CC-CEDICT's for
  everyday words. Fits this app, which is personal and not for sale.
- **Common Voice zh-HK** (CC0) — more recorded speech, many speakers, which is
  what tone training wants; a large download.
