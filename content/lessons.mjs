// The readings: what the tones are for, where the language came from, and why
// it sounds the way it does.
//
// Robert, 7 Oct: "I don't think that they should read as the AI style, they
// need to be based on what people actually need to know about the importance
// of the tones to the Cantonese language and their differentiation from
// Mandarin and some of the cultural sing-songyness of the language… these
// types of lessons that give the cultural background… should be interspersed
// and taught as the user progresses."
//
// So: eleven readings, each unlocking at a point in the course, each one of
// them answerable to a source. The prose is mine and labelled as mine. Every
// NUMBER in it, and every claim that is not a plain statement of the tone
// system, carries a `cite` to the list at the bottom of this file.
//
// WHAT I HAD TO THROW AWAY. A research pass over the open-access literature
// killed several things that would have made nicer reading:
//
//   - that adult learners get tone CONTOUR before tone HEIGHT. For English
//     speakers this is backwards. Wu et al. (2016) had speakers of four
//     backgrounds imitate the six tones and found English speakers do BETTER
//     on the level tones and under-produce pitch movement on the contour ones,
//     while being relatively sensitive to height. The asymmetry depends on
//     your first language; it is not an order of acquisition. Reading 2 now
//     says the true thing, which is also the more useful thing to be told.
//   - that tone 4 is creaky. Genuinely disputed. Ho (2023) finds creak tracks
//     low pitch rather than tone 4 in particular; Zhang & Kirby (2020) find
//     phonation cues matter much less than pitch and question the study the
//     claim rests on. Reading 6 says they disagree, and says who.
//   - the Tang-dynasty migration origin of Yue, the 1757–1842 Canton System
//     dates, the 1974 Cantopop watershed, and the 8/發 4/死 number lore. All
//     true-sounding, all traceable in my searching only to Wikipedia, blogs or
//     paywalled books. They are not here. A reading that cannot name its
//     source does not go in.
//   - "Cantonese kept the final consonants -p -t -k -m -n -ng that Mandarin
//     lost." The narrow version — the checked syllables and their three
//     allotones — is openly sourced and is what Reading 3 says. The broad
//     version is in paywalled work only.
//
// HOW CHINESE APPEARS. Not in the prose. Every character is in a `shows`
// row with its reading and its meaning, because Robert cannot read characters
// and a character dropped into a sentence is a hole in it. build/verify.mjs
// checks each row against the deck where the deck has the word, and requires a
// `from` naming a source where it does not.

// ── sources ──────────────────────────────────────────────────────────────
// `quote` means I have the text on disk and build/verify.mjs compares it
// character for character. `cite` means the claim is the source's and the
// words are mine.
export const SOURCES = {
  'bauer-2003': {
    author: 'Robert S. Bauer', year: 2003,
    title: 'The impact of English loanwords on the Cantonese syllabary',
    pub: 'in Language Variation: Papers in Honour of James A. Matisoff (Pacific Linguistics 555), 253–262',
    licence: 'CC BY-SA 4.0',
    url: 'https://openresearch-repository.anu.edu.au/items/d9b2d464-a8f2-44d5-95cc-9ff42c252f5c',
    file: 'bauer-2003-loanwords',
  },
  'li-2022': {
    author: 'David C. S. Li', year: 2022,
    title: 'Trilingual and biliterate language education policy in Hong Kong: past, present and future',
    pub: 'Asian-Pacific Journal of Second and Foreign Language Education 7:41',
    licence: 'CC BY 4.0',
    url: 'https://doi.org/10.1186/s40862-022-00168-z',
    file: 'li-2022-hk-policy',
  },
  'mok-wong-prod': {
    author: 'Peggy Pik-Ki Mok and Peggy Wai-Yi Wong', year: 2010,
    title: 'Production of the merging tones in Hong Kong Cantonese',
    pub: 'Proceedings of Speech Prosody 2010',
    licence: 'free to read; no reuse licence stated',
    url: 'https://www.isca-archive.org/speechprosody_2010/mok10_speechprosody.pdf',
  },
  'mok-wong-perc': {
    author: 'Peggy Pik-Ki Mok and Peggy Wai-Yi Wong', year: 2010,
    title: 'Perception of the merging tones in Hong Kong Cantonese',
    pub: 'Proceedings of Speech Prosody 2010',
    licence: 'free to read; no reuse licence stated',
    url: 'http://ling.cuhk.edu.hk/people/peggy/SP2010_perception.pdf',
  },
  'zhang-2021': {
    author: 'Caicai Zhang and colleagues', year: 2021,
    title: 'Dissociation of tone merger and congenital amusia in Hong Kong Cantonese',
    pub: 'PLOS ONE 16(7): e0253982',
    licence: 'CC BY 4.0',
    url: 'https://doi.org/10.1371/journal.pone.0253982',
  },
  'wu-2016': {
    author: 'Mengyue Wu, Brett Baker, Janet Fletcher and Rikke Bundgaard-Nielsen', year: 2016,
    title: 'How Pitch Moves: Production of Cantonese Tones by Speakers with Different Tonal Experiences',
    pub: 'Proceedings of the 5th International Symposium on Tonal Aspects of Languages',
    licence: 'free to read; no reuse licence stated',
    url: 'https://www.isca-archive.org/tal_2016/wu16_tal.pdf',
  },
  'ho-2023': {
    author: 'Chu-Yan Ho', year: 2023,
    title: 'The role of creaky voice in Cantonese tonal production',
    pub: 'Proceedings of the 20th International Congress of Phonetic Sciences',
    licence: 'free to read; no reuse licence stated',
    url: 'https://www.internationalphoneticassociation.org/icphs-proceedings/ICPhS2023/full_papers/519.pdf',
  },
  'zhang-kirby-2020': {
    author: 'Yubin Zhang and James Kirby', year: 2020,
    title: 'The role of F0 and phonation cues in Cantonese low tone perception',
    pub: 'Journal of the Acoustical Society of America 148(1): EL40–EL45',
    licence: 'free from the author; all rights reserved',
    url: 'https://pkuzyb.github.io/documents/Zhang2020role.pdf',
  },
  'leung-2010': {
    author: 'Wai-Mun Leung', year: 2010,
    title: 'On the Identity and Uses of Cantonese Sentence-final Particles: The Case of wo and bo',
    pub: 'Asian Social Science 6(1)',
    licence: 'CC BY 4.0',
    url: 'https://doi.org/10.5539/ass.v6n1p13',
  },
  'gu-peng-2025': {
    author: 'Xueping Gu and Changxin Peng', year: 2025,
    title: 'Hangs and trading posts: The global development of the Thirteen Factories in Guangzhou',
    pub: 'Journal of Chinese Architecture and Urbanism 7(1)',
    licence: 'CC BY-NC 4.0',
    url: 'https://doi.org/10.36922/jcau.3676',
  },
  wiktionary: {
    author: 'Wiktionary contributors', year: 2026,
    title: 'English Wiktionary, Cantonese entries',
    pub: 'Wikimedia Foundation',
    licence: 'CC BY-SA 4.0',
    url: 'https://en.wiktionary.org/',
  },
};

// ── the readings ─────────────────────────────────────────────────────────
// `at` is the number of words you can answer when the reading opens. They are
// spaced so one turns up every week or two of ordinary use, not in a heap.
export default [
  {
    id: 'six-tones',
    strand: 'The tones',
    title: 'Six tones, and why they are six words',
    at: 0,
    read: [
      'Cantonese says a syllable at six different pitches, and the six are six different words. This is not emphasis and it is not mood. It is the same difference English makes between "bat" and "bad" — change it and you have said something else.',
      'Three of the six are held flat: high, middle, low. Two rise. One falls. That is the whole system, and it is worth learning as three shapes before you learn six numbers.',
      'The numbers you will see after every syllable in this app are those six, in the order linguists write them. They are not a difficulty rating and they are not an order to learn them in.',
    ],
    shows: [
      ['醫', 'ji1', 'to cure — held high and flat'],
      ['意', 'ji3', 'meaning, intention — held flat in the middle'],
      ['二', 'ji6', 'two — held flat, low'],
      ['耳', 'ji5', 'ear — starts low, rises to the middle'],
    ],
    honest: 'The same four syllables with two more tones on them, ji2 and ji4, are also words. The app only shows you the four it teaches.',
    cite: ['mok-wong-prod', 'mok-wong-perc'],
  },

  {
    id: 'flat-ones',
    strand: 'The tones',
    title: 'Start with the flat ones',
    at: 18,
    read: [
      'If English is your first language you have an advantage and a weakness, and they are both well documented. The advantage is pitch height: you are good at hearing whether something sat high or low. The weakness is pitch movement: asked to imitate a tone that climbs or falls, English speakers flatten it.',
      'That was measured directly. Wu and colleagues had Mandarin speakers, English speakers, English speakers who had studied Mandarin, and native Cantonese speakers imitate all six tones. The English speakers did better on the three level tones than on the moving ones, and produced the moving ones with too little movement in them.',
      'So the three flat tones — high, middle, low — are where your first wins will be, and the rising pair is the work. When you get a tone question wrong, check first whether you flattened something that was supposed to move.',
      'One more finding from the same study, if you ever wondered whether your bit of Mandarin was wasted: the English speakers who had studied Mandarin produced the most native-like Cantonese tones of any non-native group.',
    ],
    shows: [
      ['三', 'saam1', 'three — high and flat'],
      ['四', 'sei3', 'four — flat, in the middle'],
      ['二', 'ji6', 'two — flat, low'],
      ['五', 'ng5', 'five — this one moves: low, then up to the middle'],
    ],
    cite: ['wu-2016'],
  },

  {
    id: 'not-mandarin',
    strand: 'Where it stands',
    title: 'Not a dialect of Mandarin',
    at: 40,
    read: [
      'Cantonese and Mandarin are usually called dialects of Chinese. In speech they are not mutually intelligible, and the tone systems are different in kind, not only in count.',
      'Mandarin has four tones and all four differ by their SHAPE — the way the pitch moves. Cantonese has six, and they differ by shape and by HEIGHT: three of them are the same flat shape at three different heights. A Mandarin ear has no use for that distinction and has to learn it.',
      'The second difference matters more than it sounds. Mandarin has a neutral tone: unstressed syllables, including a lot of grammatical words, lose their tone. Cantonese has no neutral tone at all. Every syllable in every sentence, including the little words, carries one of the six. There is nowhere to rest.',
      'You will also hear that Cantonese kept endings that Mandarin lost. The part of that which is well established: Cantonese has syllables that stop dead on a p, t or k sound, and the tones on those are shortened versions of three of the six rather than extra tones. That is why you may see Cantonese described as having nine tones and then written with only six numbers. Six is right; the other three are the same three tones, cut short.',
    ],
    shows: [
      ['一', 'jat1', 'one — stops on a t, and is tone 1 cut short'],
      ['六', 'luk6', 'six — stops on a k, and is tone 6 cut short'],
      ['八', 'baat3', 'eight — stops on a t, and is tone 3 cut short'],
    ],
    cite: ['mok-wong-prod', 'mok-wong-perc', 'wu-2016'],
  },

  {
    id: 'three-hundred-years',
    strand: 'Where it comes from',
    title: 'Three hundred years of English',
    at: 65,
    read: [
      'Cantonese is named for Canton, which is Guangzhou, which is the city English-speaking traders sailed to for silver, tea, porcelain and silk. Foreign merchants were confined to a strip of warehouses on the Pearl River known as the Thirteen Factories.',
      'No other kind of Chinese has been in contact with English for as long or as closely, and the words are still in the language.',
    ],
    quote: {
      text: 'No Chinese variety has had more intimate and longer contact with English than Cantonese. Their contact began just over 300 years ago when the early English-speaking traders arrived in Guangzhou to exchange silver for Chinese tea, porcelain, silk, and other goods.',
      source: 'bauer-2003',
    },
    shows: [
      ['廣東話', 'gwong2 dung1 waa2', 'Cantonese — literally the speech of Guangdong'],
      ['香港', 'hoeng1 gong2', 'Hong Kong'],
    ],
    cite: ['bauer-2003', 'gu-peng-2025'],
  },

  {
    id: 'came-by-ship',
    strand: 'Where it comes from',
    title: 'Words that came in on a ship',
    at: 95,
    read: [
      'Several words you already know are English, rebuilt with Cantonese sounds and Cantonese tones. Most speakers do not think of them as English at all.',
      'Some of them are old. Robert Morrison\'s Vocabulary of the Canton Dialect, printed in 1828, already records the words for beer and for ball — which means they were in ordinary speech in Canton before photography existed.',
      'Two warnings, because this is an area where the internet is confidently wrong. The Cantonese word for a card is kaat1, not the Mandarin-borrowed character you may see. And "popcorn" is not a borrowing at all: it is a native Cantonese coinage meaning burst grain, and it is listed in no loanword corpus.',
    ],
    shows: [
      ['巴士', 'baa1 si2', 'bus'],
      ['的士', 'dik1 si2', 'taxi'],
      ['芝士', 'zi1 si2', 'cheese — first written down in 1828'],
      ['啤酒', 'be1 zau2', 'beer — the be1 is the English word'],
      ['咭', 'kaat1', 'card'],
      ['冷', 'laang5', 'knitting wool — from French laine, by way of English'],
    ],
    honest: 'Two things to carry away. be1 is a busy syllable: as well as beer it carries pear, bear, press, bearing and pair, so learn it inside a word and not on its own. And the word for knitting wool is listed as laang5 but said with a high tone, laang1 — Cantonese shifts the tone of a lot of everyday nouns like that, and the dictionary form is not always the spoken one.',
    cite: ['bauer-2003', 'wiktionary'],
  },

  {
    id: 'crowded-bottom',
    strand: 'The tones',
    title: 'The bottom of your voice is crowded',
    at: 135,
    read: [
      'The six tones are not spread evenly. Four of them start at about the same low pitch, and two pairs sit so close together that native speakers are losing the difference.',
      'Tone 3 and tone 6 are both flat and differ by about thirty hertz for a woman\'s voice — a third of a tone on a piano. Tone 4 and tone 6 are both low and differ mainly by whether the end sags. Tone 2 and tone 5 are both rising and differ by how far up they get.',
      'Those last two are merging in Hong Kong, and this has been counted. In a study of a hundred and twenty speakers aged twenty to fifty-eight, about one in six had merged tone 2 and tone 5 in both hearing and speaking, and another one in six in speaking only. For tone 3 against tone 6, nearly half merged them in speech while still hearing the difference.',
      'The practical consequence is worth saying plainly: if you cannot hear the difference between tone 2 and tone 5 in a particular word, you may be listening to a speaker who no longer makes it. That is a change in progress, not your failure.',
    ],
    honest: 'You will read elsewhere that tone 4 is creaky, as a rule. The researchers disagree. Ho (2023) found that when speakers were asked to talk at a low pitch, creak went up on the OTHER tones too, which suggests it follows low pitch rather than belonging to tone 4; Zhang and Kirby (2020) found pitch far more important than voice quality for telling the low tones apart. The honest statement is that low tones are sometimes creaky and nobody has settled why.',
    cite: ['zhang-2021', 'mok-wong-prod', 'mok-wong-perc', 'ho-2023', 'zhang-kirby-2020'],
  },

  {
    id: 'sounds-like-singing',
    strand: 'The sound of it',
    title: 'Why it sounds like singing',
    at: 185,
    read: [
      'People who do not speak Cantonese describe it as sing-song, and it is worth knowing that no study says why. What there is, is three facts that between them account for the impression.',
      'First, the tones differ in height as well as shape, so the pitch of the voice is doing two jobs at once rather than one.',
      'Second, there is no neutral tone. In Mandarin, and in English stress, small grammatical words flatten out and get out of the way. In Cantonese they do not: every particle, every classifier, every "the" and "of" equivalent carries a full tone of its own. The pitch never goes quiet.',
      'Third, the low half of the range is crowded, so a lot of the movement happens in a narrow band and the voice keeps stepping between near neighbours.',
      'That is the explanation the evidence supports. The musical analysis you may find online is mostly about Cantonese opera and Cantopop, where melodies really are written to follow the tones of the words — a different thing, and a fascinating one, but not about ordinary speech.',
    ],
    cite: ['mok-wong-prod', 'mok-wong-perc', 'wu-2016'],
  },

  {
    id: 'little-words',
    strand: 'The sound of it',
    title: 'The little words at the end',
    at: 245,
    read: [
      'Cantonese puts a great deal of its feeling in one or two syllables at the end of the sentence. They are not translatable one for one; they do the work English does with intonation, eyebrows and "...right?"',
      'There are a lot of them. Thirty or more basic forms have been catalogued; one count found over forty-five possible clusters, because they stack. Seventeen are common in everyday speech, used two, three and four at a time.',
      'They are also almost absent from formal writing, which is why a learner who reads can still be lost in a conversation. And they change: wo3 and bo3 were once the same particle, and in a corpus of Hong Kong conversation wo3 now outnumbers bo3 six hundred and two to sixteen.',
    ],
    shows: [
      ['喎', 'wo3', 'the one in the paragraph above: marks something as news, or as not your own idea'],
      ['咩', 'me1', 'turns a statement into "really?"'],
      ['啫', 'ze1', 'only, no more than that — plays a whole sentence down'],
      ['添', 'tim1', 'and on top of that'],
    ],
    cite: ['leung-2010'],
  },

  {
    id: 'no-new-sounds',
    strand: 'Where it comes from',
    title: 'Borrowed words, but no borrowed sounds',
    at: 330,
    read: [
      'When Cantonese took hundreds of words from English, it took no new sounds at all. What it did instead was build new syllables out of pieces it already had — an existing beginning joined to an existing ending, in a combination nobody had used before.',
      'The count has been made three times, and it goes up: twenty-six loanword-only syllables in 1985, forty by 1997, forty-nine by 2002. All of them use endings that were already in the language.',
      'About eighty-five of every hundred borrowed words are pure sound-for-sound transliteration. The other fifteen are hybrids, where one syllable carries the sound and another carries the meaning — "beer" plus the word for alcohol, "cheese" plus the word for cake.',
    ],
    quote: {
      text: 'syllables that did not exist prior to the borrowing of the loanword have been constructed through the combination of existing initial consonants and rimes to form new syllables',
      source: 'bauer-2003',
    },
    cite: ['bauer-2003'],
  },

  {
    id: 'write-and-say',
    strand: 'Where it stands',
    title: 'What is written is not what is said',
    at: 430,
    read: [
      'A Hong Kong child speaks Cantonese and learns to write a different language. Standard Written Chinese is the written form taught and examined, and it follows Mandarin grammar and Mandarin vocabulary. The everyday Cantonese words a child has used all their life have to be swapped out on the page.',
      'This is not a small adjustment and it is not only about writing: it applies when reading aloud, and silently. It is part of why literacy in Chinese takes Hong Kong pupils longer than it takes children on the mainland.',
      'Written Cantonese does exist, with its own characters for its own words, and it is everywhere in advertising, subtitles, comics and messaging. It is not what gets marked in an exam.',
    ],
    quote: {
      text: 'that schoolchildren must learn to substitute for Cantonese-specific colloquialisms, in writing as well as in speech (i.e., when reading, silently or aloud). Many performance indicators of primary pupils have shown that such a task is extremely time-consuming.',
      source: 'li-2022',
    },
    shows: [
      ['唔', 'm4', 'not — the Cantonese negative, not used in Standard Written Chinese'],
      ['嘅', 'ge3', 'possessive and descriptive marker'],
      ['咗', 'zo2', 'marks something finished'],
      ['佢', 'keoi5', 'he, she, it'],
    ],
    cite: ['li-2022'],
  },

  {
    id: 'ninety-per-cent',
    strand: 'Where it stands',
    title: 'Ninety per cent, and no school subject',
    at: 560,
    read: [
      'Hong Kong\'s language policy asks for two written languages and three spoken ones: written Chinese and English, spoken Cantonese, Putonghua and English. Most primary schools teach in Cantonese; from secondary school about a third of pupils move into an English-medium stream and the rest carry on in Cantonese for everything but the language subjects.',
      'Cantonese is in the policy as a medium and almost nowhere as a subject. There is no school subject called Cantonese. The thing that holds the whole arrangement together is the one part of it nobody is responsible for.',
      'And it is held together: Cantonese is at home, at school, in government, in the papers, in broadcast and social media, in Cantopop and opera and film and standup.',
    ],
    quote: {
      text: 'makes it the unmarked language of identity for over ninety percent of Chinese Hongkongers',
      source: 'li-2022',
    },
    cite: ['li-2022'],
  },
];
