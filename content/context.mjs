// Where the words come from: short cards shown between rounds.
//
// Two kinds, and the difference is the point:
//
//   quote  a passage copied word for word from an open-licensed history, with
//          its author, title and licence. build/verify.mjs checks every quote
//          against the source file in sources/belshaw/ and fails the build if a
//          character has moved.
//   words  a set of everyday words. The card shows nothing but the word, the
//          reading and the dictionary's own gloss; build/items.mjs drops any
//          word the corpus and dictionaries do not actually carry, so a card
//          can shrink but it cannot invent.
//
// The `note` line on a card is mine, the way the grammar explanations are mine.
// It says why the card is here; it never states a historical fact the quote
// does not already carry.
//
// Source for the quotes:
//   Belshaw, John Douglas. Canadian History: Pre-Confederation and Canadian
//   History: Post-Confederation. Victoria: BCcampus, 2016. CC BY 4.0.
//   https://opentextbc.ca/postconfederation/

const BELSHAW_POST = { author: 'John Douglas Belshaw', title: 'Canadian History: Post-Confederation', pub: 'BCcampus, 2016', licence: 'CC BY 4.0', file: 'post-confederation' };
const BELSHAW_PRE = { author: 'John Douglas Belshaw', title: 'Canadian History: Pre-Confederation', pub: 'BCcampus, 2016', licence: 'CC BY 4.0', file: 'pre-confederation' };

export default [
  {
    id: 'first-arrivals', kind: 'quote', title: 'Before the country existed',
    quote: 'People from China have been in what is today called Canada since before the country existed. Indeed, 50 carpenters and shipwrights from Canton became the first permanent resettlers on Canada’s West Coast when the English sea captain John Meares abandoned them at Nootka Sound in 1789.',
    source: BELSHAW_POST,
    note: 'Canton is Guangzhou, the city this language is named for. The English name for the language and the English name for the city are the same word.',
  },
  {
    id: 'taishan', kind: 'quote', title: 'Who came, and from where',
    quote: 'The boomtowns of Likely, Richfield, and Quesnel also appeared at this time, many of them heavily populated by Chinese miners from Taishan.',
    source: BELSHAW_PRE,
    note: 'Taishan (台山 Toi4saan1) is a county in Guangdong. Its people speak Taishanese, a Yue language close to Cantonese — which is why the Chinese spoken in early Canadian Chinatowns was not Mandarin.',
  },
  {
    id: 'head-tax', kind: 'quote', title: 'The Head Tax',
    quote: 'A fee levied by the British Columbian and then the federal government on Chinese immigrants, beginning in 1885 and continuing to 1923.',
    source: BELSHAW_POST,
    note: 'Belshaw’s glossary definition, quoted in full.',
  },
  {
    id: 'exclusion', kind: 'quote', title: 'Humiliation Day',
    quote: 'The 1923 Chinese Immigration Act terminated legal Chinese immigration and remained on the books until 1947. This complete ban on arrivals from a specified country was uniquely and exclusively applied to the Chinese. Prejudice might stand in the way of other groups but no others were treated this way in law.',
    source: BELSHAW_POST,
    note: 'The Act came into force on the 1st of July. Chinese Canadians called that day Humiliation Day for the twenty-four years it stood.',
  },
  {
    id: 'chinatowns', kind: 'quote', title: 'How Chinatowns were made',
    quote: 'Colloquial term for enclaves of Chinese immigrants. In Canada and primarily in British Columbia, these appeared from 1858 on, with the greatest increase occurring during the construction of the Canadian Pacific Railway. Created by external forces (Euro-Canadian civic authority limiting Chinese property ownership and business licenses to a small area) and internal needs (the concentration of Chinese financial and social institutions).',
    source: BELSHAW_POST,
    note: 'Worth reading twice: the enclave was partly chosen and partly imposed.',
  },
  {
    id: 'managed', kind: 'quote', title: 'Recruited, then restricted',
    quote: 'Probably no immigrant group has been as heavily managed as the Chinese. Sought out as cheap contract labour, they were recruited to meet finite economic and infrastructural goals. While some Chinese arrivals saw themselves as sojourners — temporary immigrants who would return to their country of origin once they’d amassed some money — many more were in for the long haul.',
    source: BELSHAW_POST,
    note: '',
  },
  {
    id: 'benevolent', kind: 'quote', title: 'The Benevolent Association',
    quote: 'An organization that coordinated the interests and politics of the various community organizations in Chinatowns, and provided different levels of social support for its members.',
    source: BELSHAW_POST,
    note: 'Toronto, Vancouver and Victoria all still have one.',
  },

  // ── words, with the dictionary’s own glosses ──────────────────────────
  {
    id: 'jamcaa', kind: 'words', title: 'Going for dim sum',
    note: '飲茶 is literally "drink tea", and it means the whole Sunday morning: trolleys, family, an hour of arguing over the bill.',
    words: ['飲茶', '點心', '燒賣', '蝦餃', '叉燒', '腸粉', '蛋撻', '粥', '茶樓'],
  },
  {
    id: 'caacaanteng', kind: 'words', title: 'The café downstairs',
    note: 'The 茶餐廳 is Hong Kong’s own invention: Western food rebuilt in a Cantonese kitchen, served fast and cheap.',
    words: ['茶餐廳', '奶茶', '咖啡', '菠蘿包', '多士', '炒飯', '麵', '雲吞'],
  },
  {
    id: 'kitchen', kind: 'words', title: 'What the cook is doing',
    note: 'Cantonese names the method, not just the dish. These are the verbs on every menu.',
    words: ['炒', '蒸', '煲', '炸', '焗', '燜', '灼', '煎'],
  },
  {
    id: 'family', kind: 'words', title: 'Everyone at the table',
    note: 'Cantonese kinship is precise: your mother’s parents and your father’s parents have different names, and so do older and younger siblings.',
    words: ['媽媽', '爸爸', '公公', '婆婆', '爺爺', '嫲嫲', '哥哥', '姐姐', '妹妹', '細佬'],
  },
  {
    id: 'toddler', kind: 'words', title: 'Things you say to a one-year-old',
    note: 'The everyday verbs a small child hears first — and the ones you will need most in the next year.',
    words: ['食飯', '瞓覺', '沖涼', '玩', '飲', '攞', '睇', '行', '坐', '抱'],
  },
  {
    id: 'manners', kind: 'words', title: 'The polite words',
    note: '唔該 does double duty: thank you for a service, and excuse me to get past. 多謝 is for a gift or a kindness.',
    words: ['唔該', '多謝', '對唔住', '早晨', '拜拜', '請'],
  },
  {
    id: 'street', kind: 'words', title: 'Getting around',
    note: 'Three of these are borrowed from English and rebuilt with Cantonese sounds: 巴士 baa1si2, 的士 dik1si2, 多士 do1si2.',
    words: ['巴士', '地鐵', '的士', '返工', '放工', '屋企', '街'],
  },
];
