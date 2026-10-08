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
// HOW IT IS WRITTEN. To the four guides Robert sent on 7 October, measured by
// audits/run-plain.mjs at every build: sentences of twenty words at most,
// paragraphs of five sentences at most, the active voice, plain words, and no
// figurative language. Each reading opens with `main` — the one thing to carry
// away — because the CDC guide asks for a main message at the top and Leora
// Freedman's reading-comprehension guide asks for the concept to be previewed
// before the text. The word table is previewed before the prose for the same
// reason.
//
// And: say what a thing IS. An earlier draft opened this file with "this is not
// emphasis and it is not mood", which denies something nobody had suggested.
// build/verify.mjs now fails a build over it.
//
// WHAT I HAD TO THROW AWAY. A research pass over the open-access literature
// killed several things that would have made nicer reading:
//
//   - that adult learners get tone CONTOUR before tone HEIGHT. For English
//     speakers this is backwards. Wu et al. (2016) had speakers of four
//     backgrounds imitate the six tones and found English speakers do BETTER
//     on the level tones and under-produce pitch movement on the contour ones,
//     while being relatively sensitive to height. The asymmetry depends on
//     your first language; it is not an order of acquisition.
//   - that tone 4 is creaky. Genuinely disputed. Ho (2023) finds creak tracks
//     low pitch rather than tone 4 in particular; Zhang & Kirby (2020) find
//     phonation cues matter much less than pitch.
//   - the Tang-dynasty migration origin of Yue, the 1757–1842 Canton System
//     dates, the 1974 Cantopop watershed, and the 8/發 4/死 number lore. All
//     true-sounding, all traceable in my searching only to Wikipedia, blogs or
//     paywalled books. A reading that cannot name its source does not go in.
//   - "Cantonese kept the final consonants -p -t -k -m -n -ng that Mandarin
//     lost." The narrow version — the checked syllables and their three
//     allotones — is openly sourced and is what Reading 3 says.
//
// HOW CHINESE APPEARS. Not in the prose. Every character is in a `shows` row
// with its reading and its meaning, because Robert cannot read characters and a
// character dropped into a sentence is a hole in it. build/verify.mjs checks
// each row against the deck.

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
// spaced so one turns up every week or two of ordinary use.
export default [
  {
    id: 'six-tones',
    strand: 'The tones',
    title: 'Six tones, and why they are six words',
    at: 0,
    main: 'Cantonese says a syllable at six pitches. Each one is a different word.',
    read: [
      'Say the pitch wrong and you have said a different word. English does the same thing with "bat" and "bad": one small change, two words.',
      'Three of the six tones are held flat — high, middle, low. Two rise. One falls.',
      'That is the whole system. Learn it as three shapes first, and the six numbers after.',
      'The numbers run down your voice. Tone 1 sits at the top of your range and tone 6 near the bottom.',
    ],
    shows: [
      ['醫', 'ji1', 'to cure — held high and flat'],
      ['意', 'ji3', 'meaning, intention — held flat in the middle'],
      ['二', 'ji6', 'two — held flat, low'],
      ['耳', 'ji5', 'ear — starts low, rises to the middle'],
    ],
    honest: 'Two more tones fit on the same syllable, ji2 and ji4, and both are words. The app shows you the four it teaches.',
    cite: ['mok-wong-prod', 'mok-wong-perc'],
  },

  {
    id: 'flat-ones',
    strand: 'The tones',
    title: 'Start with the flat ones',
    at: 18,
    main: 'English ears hear pitch height well and pitch movement poorly. The three flat tones will come first. The rises are the work.',
    read: [
      'That is measured, not guessed. Wu and colleagues asked four groups of speakers to imitate all six tones.',
      'The groups were Mandarin speakers, English speakers, English speakers who had studied Mandarin, and native Cantonese speakers.',
      'The English speakers did better on the three level tones than on the moving ones. On the moving ones they flattened the pitch.',
      'So when you get a tone question wrong, check one thing first. Did you flatten something that was meant to climb?',
      'One more finding, if you ever wondered whether your bit of Mandarin was wasted. The English speakers who had studied Mandarin sounded the most native-like of any non-native group.',
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
    main: 'Cantonese and Mandarin are two spoken languages, and a Cantonese speaker and a Mandarin speaker cannot understand each other.',
    read: [
      'Mandarin has four tones, and all four differ by their shape — the way the pitch moves.',
      'Cantonese has six, and they differ by shape and by height. Three of them are the same flat shape at three different heights.',
      'A Mandarin ear has no use for that difference, so a Mandarin speaker has to learn it too.',
      'The second difference matters more than it sounds. Mandarin has a neutral tone, so unstressed syllables lose their pitch. Cantonese has none.',
      'Every syllable in a Cantonese sentence carries one of the six, the little words included. The pitch never rests.',
      'You will also hear that Cantonese kept endings Mandarin lost. Here is the part that is well established.',
      'Some Cantonese syllables stop dead on a p, t or k sound. The tones on those are three of the six, cut short.',
      'That is why you may see Cantonese described as having nine tones and then written with six numbers. Six is right.',
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
    main: 'Cantonese has been in contact with English for three hundred years, longer than any other kind of Chinese.',
    read: [
      'Cantonese is named for Canton, which is Guangzhou. English-speaking traders sailed there for silver, tea, porcelain and silk.',
      'The Qing government kept foreign merchants to one strip of warehouses on the Pearl River. People called it the Thirteen Factories.',
      'The words from that trade are still in the language, and you will meet several of them in this app.',
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
    main: 'Several words you already know are English, rebuilt with Cantonese sounds and Cantonese tones.',
    read: [
      'Most speakers do not think of them as English at all. They are simply Cantonese words now.',
      'Some are old. Robert Morrison printed his Vocabulary of the Canton Dialect in 1828. It already records the words for beer and for ball.',
      'That puts them in ordinary speech in Canton before photography existed.',
      'Two warnings, because the internet is confidently wrong here. The Cantonese word for a card is kaat1, not the Mandarin one you may see.',
      'And "popcorn" came from no ship. It is a Cantonese coinage meaning burst grain, and no loanword corpus lists it.',
    ],
    shows: [
      ['巴士', 'baa1 si2', 'bus'],
      ['的士', 'dik1 si2', 'taxi'],
      ['芝士', 'zi1 si2', 'cheese — first written down in 1828'],
      ['啤酒', 'be1 zau2', 'beer — the be1 is the English word'],
      ['咭', 'kaat1', 'card'],
      ['冷', 'laang5', 'knitting wool — from French laine, by way of English'],
    ],
    honest: 'Two things to carry away. be1 is a busy syllable. It also carries pear, bear, press, bearing and pair, so learn it inside a word. And the word for knitting wool is listed as laang5 but said high, as laang1. Cantonese shifts the tone of many everyday nouns, so the dictionary form is not always the spoken one.',
    cite: ['bauer-2003', 'wiktionary'],
  },

  {
    id: 'crowded-bottom',
    strand: 'The tones',
    title: 'The bottom of your voice is crowded',
    at: 135,
    main: 'Four of the six tones start at about the same low pitch. Two pairs sit so close that Hong Kong speakers are losing the difference.',
    read: [
      'Tone 3 and tone 6 are both flat. For a woman\'s voice they differ by about thirty hertz, which is a third of a tone on a piano.',
      'Tone 4 and tone 6 are both low. They differ mainly by whether the end sags.',
      'Tone 2 and tone 5 both rise. They differ by how far up they get.',
      'That last pair is merging, and researchers have counted it. One study followed a hundred and twenty speakers aged twenty to fifty-eight.',
      'About one in six had merged tone 2 and tone 5 in both hearing and speaking. Another one in six had merged them in speaking only.',
      'For tone 3 against tone 6, nearly half merged them in speech while still hearing the difference.',
      'So you may fail to hear tone 2 from tone 5 in some word. You may be listening to someone who no longer says it. That is a change in progress, and your ear is fine.',
    ],
    honest: 'You will read elsewhere that tone 4 is creaky as a rule. The researchers disagree. Ho (2023) asked speakers to talk at a low pitch, and creak went up on the other tones too. Zhang and Kirby (2020) found pitch far more important than voice quality here. The honest statement: low tones are sometimes creaky, and nobody has settled why.',
    cite: ['zhang-2021', 'mok-wong-prod', 'mok-wong-perc', 'ho-2023', 'zhang-kirby-2020'],
  },

  {
    id: 'sounds-like-singing',
    strand: 'The sound of it',
    title: 'Why it sounds like singing',
    at: 185,
    main: 'People call Cantonese sing-song. No study explains why, but three facts about the language account for it.',
    read: [
      'First, the tones differ in height as well as shape. The pitch of the voice is doing two jobs at once.',
      'Second, there is no neutral tone. In Mandarin, and under English stress, small grammatical words flatten out and get out of the way.',
      'Cantonese keeps them. Every particle and every classifier carries a full tone. The pitch never goes quiet.',
      'Third, the low half of the range is crowded. Much of the movement happens in a narrow band, and the voice keeps stepping between near neighbours.',
      'The musical analysis you may find online is about Cantonese opera and Cantopop. There, composers really do write the melody to follow the tones of the words. It is a fascinating thing, and a different one.',
    ],
    cite: ['mok-wong-prod', 'mok-wong-perc', 'wu-2016'],
  },

  {
    id: 'little-words',
    strand: 'The sound of it',
    title: 'The little words at the end',
    at: 245,
    main: 'Cantonese carries the feeling of a sentence in one or two syllables at the end of it.',
    read: [
      'They do the work English does with intonation, eyebrows and "...right?". The translation of one is usually a tone of voice.',
      'There are a lot of them. Catalogues list thirty or more basic forms, and one count found over forty-five clusters, because they stack.',
      'Seventeen are common in everyday speech, used two, three and four at a time.',
      'They are almost absent from formal writing. A learner who reads well can still be lost in a conversation.',
      'And they change. wo3 and bo3 were once the same particle. In a corpus of Hong Kong conversation, wo3 now outnumbers bo3 by six hundred and two to sixteen.',
    ],
    shows: [
      ['喎', 'wo3', 'the one above: marks something as news, or as not your own idea'],
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
    main: 'Cantonese took hundreds of words from English and no sounds at all.',
    read: [
      'It built new syllables out of pieces it already had. An existing beginning joined an existing ending, in a combination nobody had used before.',
      'Researchers have counted them three times, and the number goes up. Twenty-six loanword-only syllables in 1985, forty by 1997, forty-nine by 2002.',
      'All of them use endings the language already had.',
      'About eighty-five of every hundred borrowed words copy the English sound and nothing else.',
      'The other fifteen are hybrids. One syllable carries the sound and another carries the meaning. So: "beer" plus the word for alcohol, "cheese" plus the word for cake.',
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
    main: 'A Hong Kong child speaks Cantonese and learns to write a different language.',
    read: [
      'Standard Written Chinese is the written form taught and examined. It follows Mandarin grammar and Mandarin vocabulary.',
      'So on the page, a child has to swap out the everyday Cantonese words they have used all their life.',
      'The swap runs deeper than writing. It happens when reading too, aloud and silently.',
      'It is part of why literacy in Chinese takes Hong Kong pupils longer than it takes children on the mainland.',
      'Written Cantonese does exist, with its own characters for its own words. It fills advertising, subtitles, comics and messaging. Exams mark the other one.',
    ],
    quote: {
      text: 'that schoolchildren must learn to substitute for Cantonese-specific colloquialisms, in writing as well as in speech (i.e., when reading, silently or aloud). Many performance indicators of primary pupils have shown that such a task is extremely time-consuming.',
      source: 'li-2022',
    },
    shows: [
      ['唔', 'm4', 'not — the Cantonese negative, absent from Standard Written Chinese'],
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
    main: 'Cantonese holds Hong Kong together, and no school there teaches it as a subject.',
    read: [
      'The policy asks for two written languages and three spoken ones: written Chinese and English, spoken Cantonese, Putonghua and English.',
      'Most primary schools teach in Cantonese. From secondary school about a third of pupils move into an English-medium stream.',
      'The rest carry on in Cantonese for every subject but the language subjects.',
      'So Cantonese is in the policy as a medium and almost nowhere as a subject. The part that holds the arrangement together is the part nobody is responsible for.',
      'And it does hold. Cantonese is at home, at school, in government and in the papers. It is in broadcast and social media, in Cantopop and opera, in film and standup.',
    ],
    quote: {
      text: 'makes it the unmarked language of identity for over ninety percent of Chinese Hongkongers',
      source: 'li-2022',
    },
    cite: ['li-2022'],
  },
];
