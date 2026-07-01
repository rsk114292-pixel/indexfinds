/**
 * 关键词映射配置
 * 用于将用户搜索词解析为结构化筛选条件
 */

/**
 * 品牌关键词映射
 * key: 用户可能输入的词（小写）
 * value: 对应的品牌 slug
 */
export const BRAND_KEYWORDS: Record<string, string> = {
  // Nike
  nike: 'nike',

  // Adidas
  adidas: 'adidas',
  adi: 'adidas',

  // Zara
  zara: 'zara',

  // H&M
  hm: 'h-m',
  'h&m': 'h-m',

  // Uniqlo
  uniqlo: 'uniqlo',

  // Gucci
  gucci: 'gucci',

  // Prada
  prada: 'prada',

  // Balenciaga
  balenciaga: 'balenciaga',

  // Supreme
  supreme: 'supreme',

  // Stussy
  stussy: 'stussy',

  // Off-White
  'off-white': 'off-white',
  offwhite: 'off-white',

  // The North Face
  'north face': 'the-north-face',
  northface: 'the-north-face',
  tnf: 'the-north-face',

  // Champion
  champion: 'champion',

  // Carhartt
  carhartt: 'carhartt',

  // Levi's
  levis: 'levis',
  "levi's": 'levis',

  // Calvin Klein
  'calvin klein': 'calvin-klein',
  ck: 'calvin-klein',

  // Tommy Hilfiger
  'tommy hilfiger': 'tommy-hilfiger',
  tommy: 'tommy-hilfiger',

  // Ralph Lauren
  'ralph lauren': 'ralph-lauren',
  polo: 'ralph-lauren',

  // Burberry
  burberry: 'burberry',

  // Versace
  versace: 'versace',

  // Fendi
  fendi: 'fendi',

  // Louis Vuitton
  'louis vuitton': 'louis-vuitton',
  lv: 'louis-vuitton',

  // Dior
  dior: 'dior',

  // Chanel
  chanel: 'chanel',

  // Hermès
  hermes: 'hermes',

  // New Balance
  'new balance': 'new-balance',
  nb: 'new-balance',

  // Converse
  converse: 'converse',

  // Vans
  vans: 'vans',

  // Puma
  puma: 'puma',

  // Reebok
  reebok: 'reebok',

  // Under Armour
  'under armour': 'under-armour',
  ua: 'under-armour',

  // Patagonia
  patagonia: 'patagonia',

  // Arc'teryx
  "arc'teryx": 'arcteryx',
  arcteryx: 'arcteryx',

  // Canada Goose
  'canada goose': 'canada-goose',

  // Moncler
  moncler: 'moncler',

  // Stone Island
  'stone island': 'stone-island',
};

/**
 * 分类关键词映射
 */
export const CATEGORY_KEYWORDS: Record<
  string,
  { slug: string; impliedGender?: string }
> = {
  // Clothing - general
  clothes: { slug: 'clothing' },
  clothing: { slug: 'clothing' },
  apparel: { slug: 'clothing' },
  wear: { slug: 'clothing' },
  garment: { slug: 'clothing' },
  garments: { slug: 'clothing' },

  // Dresses - typically women's
  dress: { slug: 'dresses', impliedGender: 'women' },
  dresses: { slug: 'dresses', impliedGender: 'women' },
  gown: { slug: 'dresses', impliedGender: 'women' },
  maxi: { slug: 'dresses', impliedGender: 'women' },
  midi: { slug: 'dresses', impliedGender: 'women' },
  mini: { slug: 'dresses', impliedGender: 'women' },

  // T-shirts - neutral
  tshirt: { slug: 't-shirts' },
  't-shirt': { slug: 't-shirts' },
  tee: { slug: 't-shirts' },
  tees: { slug: 't-shirts' },

  // Shirts
  shirt: { slug: 'shirts' },
  shirts: { slug: 'shirts' },
  blouse: { slug: 'shirts', impliedGender: 'women' },

  // Pants
  pants: { slug: 'pants' },
  trousers: { slug: 'pants' },
  jeans: { slug: 'jeans' },
  denim: { slug: 'jeans' },
  chinos: { slug: 'pants' },
  slacks: { slug: 'pants' },

  // Shorts
  shorts: { slug: 'shorts' },

  // Skirts - typically women's
  skirt: { slug: 'skirts', impliedGender: 'women' },
  skirts: { slug: 'skirts', impliedGender: 'women' },

  // Jackets & Coats
  jacket: { slug: 'jackets' },
  jackets: { slug: 'jackets' },
  coat: { slug: 'coats' },
  coats: { slug: 'coats' },
  blazer: { slug: 'blazers' },
  blazers: { slug: 'blazers' },
  parka: { slug: 'jackets' },
  windbreaker: { slug: 'jackets' },
  bomber: { slug: 'jackets' },
  puffer: { slug: 'jackets' },
  down: { slug: 'jackets' },

  // Hoodies & Sweatshirts
  hoodie: { slug: 'hoodies' },
  hoodies: { slug: 'hoodies' },
  sweatshirt: { slug: 'sweatshirts' },
  sweatshirts: { slug: 'sweatshirts' },
  sweater: { slug: 'sweaters' },
  sweaters: { slug: 'sweaters' },
  cardigan: { slug: 'sweaters' },
  pullover: { slug: 'sweaters' },

  // Activewear
  activewear: { slug: 'activewear' },
  sportswear: { slug: 'activewear' },
  athletic: { slug: 'activewear' },
  gym: { slug: 'activewear' },
  workout: { slug: 'activewear' },
  yoga: { slug: 'activewear', impliedGender: 'women' },
  leggings: { slug: 'activewear', impliedGender: 'women' },

  // Underwear
  underwear: { slug: 'underwear' },
  boxers: { slug: 'underwear', impliedGender: 'men' },
  briefs: { slug: 'underwear' },
  bra: { slug: 'underwear', impliedGender: 'women' },
  lingerie: { slug: 'underwear', impliedGender: 'women' },

  // Swimwear
  swimwear: { slug: 'swimwear' },
  swimsuit: { slug: 'swimwear' },
  bikini: { slug: 'swimwear', impliedGender: 'women' },
  trunks: { slug: 'swimwear', impliedGender: 'men' },

  // Accessories
  accessories: { slug: 'accessories' },
  bag: { slug: 'bags' },
  bags: { slug: 'bags' },
  handbag: { slug: 'bags', impliedGender: 'women' },
  backpack: { slug: 'bags' },
  hat: { slug: 'hats' },
  hats: { slug: 'hats' },
  cap: { slug: 'hats' },
  beanie: { slug: 'hats' },
  scarf: { slug: 'scarves' },
  scarves: { slug: 'scarves' },
  belt: { slug: 'belts' },
  belts: { slug: 'belts' },
  wallet: { slug: 'wallets' },
  watch: { slug: 'watches' },
  sunglasses: { slug: 'sunglasses' },
  jewelry: { slug: 'jewelry' },
  necklace: { slug: 'jewelry' },
  bracelet: { slug: 'jewelry' },
  ring: { slug: 'jewelry' },
  earrings: { slug: 'jewelry', impliedGender: 'women' },

  // Footwear
  shoes: { slug: 'shoes' },
  sneakers: { slug: 'sneakers' },
  boots: { slug: 'boots' },
  sandals: { slug: 'sandals' },
  heels: { slug: 'high-heels', impliedGender: 'women' },
  'high-heels': { slug: 'high-heels', impliedGender: 'women' },
  loafers: { slug: 'loafers' },
  flats: { slug: 'flats', impliedGender: 'women' },
  slippers: { slug: 'slippers' },

  // Suits
  suit: { slug: 'suits' },
  suits: { slug: 'suits' },
  tuxedo: { slug: 'suits', impliedGender: 'men' },
};

/**
 * 性别关键词映射
 */
export const GENDER_KEYWORDS: Record<string, string> = {
  men: 'men',
  mens: 'men',
  "men's": 'men',
  male: 'men',
  man: 'men',
  guy: 'men',
  guys: 'men',
  gentleman: 'men',
  him: 'men', // "gift for him" → 男性
  his: 'men', // "his style" → 男性
  boyfriend: 'men',
  husband: 'men',
  dad: 'men',
  father: 'men',

  women: 'women',
  womens: 'women',
  "women's": 'women',
  female: 'women',
  woman: 'women',
  lady: 'women',
  ladies: 'women',
  girl: 'women',
  girls: 'women',
  her: 'women', // "gift for her" → 女性
  hers: 'women',
  girlfriend: 'women',
  wife: 'women',
  mom: 'women',
  mother: 'women',

  kids: 'kids',
  kid: 'kids',
  children: 'kids',
  child: 'kids',
  boys: 'kids',
  boy: 'kids',

  unisex: 'unisex',
  neutral: 'unisex',
};

/**
 * 季节关键词映射
 * 注意：值需要与数据库中 aiAttributes.seasons 的格式一致（首字母大写）
 */
export const SEASON_KEYWORDS: Record<string, string> = {
  spring: 'Spring',

  summer: 'Summer',
  summertime: 'Summer',

  autumn: 'Fall',
  fall: 'Fall',

  winter: 'Winter',
  wintertime: 'Winter',
};

/**
 * 颜色关键词映射
 * 标准 19 色: Black, White, Gray, Red, Pink, Orange, Yellow, Green, Blue, Purple,
 *            Brown, Beige, Navy, Burgundy, Army Green, Gold, Silver, Transparent, Multicolor
 */
export const COLOR_KEYWORDS: Record<string, string> = {
  // Black
  black: 'Black',
  onyx: 'Black',
  ebony: 'Black',

  // White
  white: 'White',
  ivory: 'White',
  cream: 'White',
  pearl: 'White',

  // Gray
  gray: 'Gray',
  grey: 'Gray',
  charcoal: 'Gray',
  slate: 'Gray',
  ash: 'Gray',

  // Red
  red: 'Red',
  crimson: 'Red',
  scarlet: 'Red',

  // Pink
  pink: 'Pink',
  rose: 'Pink',
  blush: 'Pink',
  coral: 'Pink',
  salmon: 'Pink',
  fuchsia: 'Pink',
  magenta: 'Pink',

  // Orange
  orange: 'Orange',
  tangerine: 'Orange',
  peach: 'Orange',
  apricot: 'Orange',
  rust: 'Orange',

  // Yellow
  yellow: 'Yellow',
  mustard: 'Yellow',
  lemon: 'Yellow',

  // Green
  green: 'Green',
  emerald: 'Green',
  forest: 'Green',
  mint: 'Green',
  sage: 'Green',
  lime: 'Green',

  // Blue
  blue: 'Blue',
  royal: 'Blue',
  cobalt: 'Blue',
  teal: 'Blue',
  turquoise: 'Blue',
  cyan: 'Blue',

  // Purple
  purple: 'Purple',
  violet: 'Purple',
  lavender: 'Purple',
  plum: 'Purple',
  lilac: 'Purple',

  // Brown
  brown: 'Brown',
  tan: 'Brown',
  camel: 'Brown',
  chocolate: 'Brown',
  coffee: 'Brown',
  khaki: 'Brown',
  taupe: 'Brown',
  mocha: 'Brown',

  // Beige
  beige: 'Beige',
  nude: 'Beige',
  sand: 'Beige',
  oatmeal: 'Beige',

  // Navy
  navy: 'Navy',
  'navy blue': 'Navy',
  'dark blue': 'Navy',

  // Burgundy
  burgundy: 'Burgundy',
  wine: 'Burgundy',
  maroon: 'Burgundy',
  oxblood: 'Burgundy',

  // Army Green
  'army green': 'Army Green',
  olive: 'Army Green',
  'military green': 'Army Green',
  'khaki green': 'Army Green',

  // Gold
  gold: 'Gold',
  golden: 'Gold',
  champagne: 'Gold',

  // Silver
  silver: 'Silver',
  'metallic silver': 'Silver',
  chrome: 'Silver',

  // Transparent
  transparent: 'Transparent',
  clear: 'Transparent',
  'see-through': 'Transparent',

  // Multicolor
  multicolor: 'Multicolor',
  rainbow: 'Multicolor',
  colorful: 'Multicolor',
  printed: 'Multicolor',
  pattern: 'Multicolor',
  floral: 'Multicolor',
  striped: 'Multicolor',
};

/**
 * 风格关键词映射
 * 标准 10 值: Streetwear, Casual, Luxury, Classic, Sporty, Minimalist, Elegant, Retro, Athleisure, Avant-Garde
 */
export const STYLE_KEYWORDS: Record<string, string> = {
  // Streetwear
  street: 'Streetwear',
  streetwear: 'Streetwear',
  urban: 'Streetwear',
  hiphop: 'Streetwear',
  punk: 'Streetwear',
  rock: 'Streetwear',
  grunge: 'Streetwear',
  edgy: 'Streetwear',

  // Casual
  casual: 'Casual',
  everyday: 'Casual',
  relaxed: 'Casual',
  bohemian: 'Casual',
  boho: 'Casual',
  hippie: 'Casual',

  // Luxury
  luxury: 'Luxury',
  luxurious: 'Luxury',
  premium: 'Luxury',
  designer: 'Luxury',

  // Classic
  classic: 'Classic',
  preppy: 'Classic',
  collegiate: 'Classic',
  ivy: 'Classic',
  heritage: 'Classic',
  timeless: 'Classic',

  // Sporty
  sporty: 'Sporty',
  athletic: 'Sporty',
  sport: 'Sporty',

  // Minimalist
  minimalist: 'Minimalist',
  minimal: 'Minimalist',
  simple: 'Minimalist',
  clean: 'Minimalist',

  // Elegant
  elegant: 'Elegant',
  formal: 'Elegant',
  dressy: 'Elegant',
  sophisticated: 'Elegant',
  romantic: 'Elegant',
  feminine: 'Elegant',
  girly: 'Elegant',
  chic: 'Elegant',

  // Retro
  retro: 'Retro',
  vintage: 'Retro',
  old: 'Retro',
  throwback: 'Retro',

  // Athleisure
  athleisure: 'Athleisure',
  activewear: 'Athleisure',

  // Avant-Garde
  'avant-garde': 'Avant-Garde',
  experimental: 'Avant-Garde',
  artistic: 'Avant-Garde',
  bold: 'Avant-Garde',
};

/**
 * 场合关键词映射
 * 标准 8 值: Daily Wear, Casual, Sport, Travel, Party, Formal, Outdoor, School
 */
export const OCCASION_KEYWORDS: Record<string, string> = {
  // Daily Wear
  daily: 'Daily Wear',
  everyday: 'Daily Wear',
  regular: 'Daily Wear',
  home: 'Daily Wear',
  lounge: 'Daily Wear',
  loungewear: 'Daily Wear',
  sleepwear: 'Daily Wear',
  pajamas: 'Daily Wear',

  // Casual
  casual: 'Casual',

  // Sport
  sports: 'Sport',
  gym: 'Sport',
  workout: 'Sport',
  training: 'Sport',
  running: 'Sport',
  sportswear: 'Sport',

  // Travel
  vacation: 'Travel',
  travel: 'Travel',
  holiday: 'Travel',
  beach: 'Travel',
  resort: 'Travel',

  // Party
  party: 'Party',
  club: 'Party',
  night: 'Party',
  evening: 'Party',
  cocktail: 'Party',
  wedding: 'Party',
  bridal: 'Party',
  prom: 'Party',
  gala: 'Party',
  date: 'Party',
  romantic: 'Party',

  // Formal
  work: 'Formal',
  office: 'Formal',
  business: 'Formal',
  professional: 'Formal',
  formal: 'Formal',

  // Outdoor
  outdoor: 'Outdoor',
  camping: 'Outdoor',
  adventure: 'Outdoor',
  hiking: 'Outdoor',

  // School
  school: 'School',
  campus: 'School',
  college: 'School',
};
