import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

const ADDITIONAL_SYNONYMS = [
  // ============ 服装品类 ============
  // 上装
  {
    name: 'blouse/top',
    canonicalTerm: 'blouse',
    synonyms: ['top', 'shirt', 'button-up'],
    category: 'general',
  },
  {
    name: 'cardigan variants',
    canonicalTerm: 'cardigan',
    synonyms: ['cardi', 'knit cardigan', 'button sweater'],
    category: 'general',
  },
  {
    name: 'tank top variants',
    canonicalTerm: 'tank top',
    synonyms: ['tank', 'sleeveless top', 'camisole', 'cami'],
    category: 'general',
  },
  {
    name: 'polo variants',
    canonicalTerm: 'polo',
    synonyms: ['polo shirt', 'golf shirt'],
    category: 'general',
  },
  {
    name: 'crop top variants',
    canonicalTerm: 'crop top',
    synonyms: ['cropped top', 'belly shirt', 'midriff top'],
    category: 'general',
  },

  // 下装
  {
    name: 'shorts variants',
    canonicalTerm: 'shorts',
    synonyms: ['short pants', 'bermudas', 'hot pants'],
    category: 'general',
  },
  {
    name: 'skirt variants',
    canonicalTerm: 'skirt',
    synonyms: ['mini skirt', 'midi skirt', 'maxi skirt'],
    category: 'general',
  },
  {
    name: 'leggings variants',
    canonicalTerm: 'leggings',
    synonyms: ['tights', 'yoga pants', 'jeggings'],
    category: 'general',
  },

  // 连衣裙
  {
    name: 'dress variants',
    canonicalTerm: 'dress',
    synonyms: ['gown', 'frock', 'sundress'],
    category: 'general',
  },
  {
    name: 'maxi dress',
    canonicalTerm: 'maxi dress',
    synonyms: ['long dress', 'floor length dress'],
    category: 'general',
  },
  {
    name: 'mini dress',
    canonicalTerm: 'mini dress',
    synonyms: ['short dress', 'party dress'],
    category: 'general',
  },

  // 外套
  {
    name: 'blazer variants',
    canonicalTerm: 'blazer',
    synonyms: ['sport coat', 'suit jacket'],
    category: 'general',
  },
  {
    name: 'parka variants',
    canonicalTerm: 'parka',
    synonyms: ['anorak', 'winter coat'],
    category: 'general',
  },
  {
    name: 'windbreaker variants',
    canonicalTerm: 'windbreaker',
    synonyms: ['wind jacket', 'shell jacket', 'rain jacket'],
    category: 'general',
  },
  {
    name: 'puffer jacket',
    canonicalTerm: 'puffer',
    synonyms: [
      'puffer jacket',
      'down jacket',
      'quilted jacket',
      'padded jacket',
    ],
    category: 'general',
  },
  {
    name: 'trench coat',
    canonicalTerm: 'trench',
    synonyms: ['trench coat', 'raincoat', 'overcoat'],
    category: 'general',
  },

  // ============ 鞋类 ============
  {
    name: 'boots variants',
    canonicalTerm: 'boots',
    synonyms: ['booties', 'ankle boots', 'combat boots'],
    category: 'general',
  },
  {
    name: 'heels variants',
    canonicalTerm: 'heels',
    synonyms: ['high heels', 'pumps', 'stilettos', 'kitten heels'],
    category: 'general',
  },
  {
    name: 'sandals variants',
    canonicalTerm: 'sandals',
    synonyms: ['slides', 'flip flops', 'thongs', 'slippers'],
    category: 'general',
  },
  {
    name: 'loafers variants',
    canonicalTerm: 'loafers',
    synonyms: ['slip-ons', 'moccasins', 'driving shoes'],
    category: 'general',
  },
  {
    name: 'flats variants',
    canonicalTerm: 'flats',
    synonyms: ['ballet flats', 'flat shoes', 'ballerinas'],
    category: 'general',
  },
  {
    name: 'oxfords variants',
    canonicalTerm: 'oxfords',
    synonyms: ['oxford shoes', 'brogues', 'derby shoes'],
    category: 'general',
  },
  {
    name: 'running shoes',
    canonicalTerm: 'running shoes',
    synonyms: ['runners', 'jogging shoes', 'athletic shoes'],
    category: 'general',
  },

  // ============ 配饰 ============
  {
    name: 'bag variants',
    canonicalTerm: 'bag',
    synonyms: ['purse', 'handbag', 'tote', 'satchel'],
    category: 'general',
  },
  {
    name: 'backpack variants',
    canonicalTerm: 'backpack',
    synonyms: ['rucksack', 'knapsack', 'book bag'],
    category: 'locale',
  },
  {
    name: 'clutch variants',
    canonicalTerm: 'clutch',
    synonyms: ['clutch bag', 'evening bag', 'wristlet'],
    category: 'general',
  },
  {
    name: 'crossbody bag',
    canonicalTerm: 'crossbody',
    synonyms: ['crossbody bag', 'shoulder bag', 'messenger bag'],
    category: 'general',
  },
  {
    name: 'sunglasses variants',
    canonicalTerm: 'sunglasses',
    synonyms: ['shades', 'sunnies', 'sun glasses'],
    category: 'general',
  },
  {
    name: 'scarf variants',
    canonicalTerm: 'scarf',
    synonyms: ['shawl', 'wrap', 'stole', 'pashmina'],
    category: 'general',
  },
  {
    name: 'hat variants',
    canonicalTerm: 'hat',
    synonyms: ['cap', 'beanie', 'fedora', 'beret'],
    category: 'general',
  },
  {
    name: 'belt variants',
    canonicalTerm: 'belt',
    synonyms: ['waist belt', 'leather belt', 'chain belt'],
    category: 'general',
  },
  {
    name: 'watch variants',
    canonicalTerm: 'watch',
    synonyms: ['wristwatch', 'timepiece'],
    category: 'general',
  },
  {
    name: 'jewelry variants',
    canonicalTerm: 'jewelry',
    synonyms: ['jewellery', 'accessories', 'bling'],
    category: 'locale',
  },
  {
    name: 'necklace variants',
    canonicalTerm: 'necklace',
    synonyms: ['chain', 'pendant', 'choker'],
    category: 'general',
  },
  {
    name: 'earrings variants',
    canonicalTerm: 'earrings',
    synonyms: ['ear rings', 'studs', 'hoops', 'dangles'],
    category: 'general',
  },
  {
    name: 'bracelet variants',
    canonicalTerm: 'bracelet',
    synonyms: ['bangle', 'wristband', 'cuff'],
    category: 'general',
  },

  // ============ 风格/场合 ============
  {
    name: 'boho style',
    canonicalTerm: 'boho',
    synonyms: ['bohemian', 'hippie', 'gypsy style'],
    category: 'style',
  },
  {
    name: 'minimalist style',
    canonicalTerm: 'minimalist',
    synonyms: ['minimal', 'simple', 'clean'],
    category: 'style',
  },
  {
    name: 'vintage style',
    canonicalTerm: 'vintage',
    synonyms: ['retro', 'old school', 'classic'],
    category: 'style',
  },
  {
    name: 'chic style',
    canonicalTerm: 'chic',
    synonyms: ['stylish', 'fashionable', 'trendy'],
    category: 'style',
  },
  {
    name: 'sporty style',
    canonicalTerm: 'sporty',
    synonyms: ['athletic', 'activewear', 'sportswear'],
    category: 'style',
  },
  {
    name: 'business casual',
    canonicalTerm: 'business casual',
    synonyms: ['smart casual', 'office casual', 'work casual'],
    category: 'style',
  },
  {
    name: 'cocktail attire',
    canonicalTerm: 'cocktail',
    synonyms: ['cocktail dress', 'semi-formal', 'evening wear'],
    category: 'general',
  },
  {
    name: 'loungewear',
    canonicalTerm: 'loungewear',
    synonyms: ['lounge wear', 'homewear', 'comfort wear', 'cozy wear'],
    category: 'general',
  },
  {
    name: 'swimwear variants',
    canonicalTerm: 'swimwear',
    synonyms: ['swimsuit', 'bathing suit', 'bikini', 'swim trunks'],
    category: 'general',
  },
  {
    name: 'underwear variants',
    canonicalTerm: 'underwear',
    synonyms: ['undies', 'panties', 'briefs', 'boxers', 'lingerie'],
    category: 'general',
  },
  {
    name: 'workout clothes',
    canonicalTerm: 'workout',
    synonyms: [
      'workout clothes',
      'gym wear',
      'fitness wear',
      'exercise clothes',
    ],
    category: 'general',
  },

  // ============ 材质补充 ============
  {
    name: 'suede variants',
    canonicalTerm: 'suede',
    synonyms: ['suede leather', 'nubuck'],
    category: 'material',
  },
  {
    name: 'cashmere variants',
    canonicalTerm: 'cashmere',
    synonyms: ['kashmir', 'pashmina wool'],
    category: 'material',
  },
  {
    name: 'velvet variants',
    canonicalTerm: 'velvet',
    synonyms: ['velour', 'plush'],
    category: 'material',
  },
  {
    name: 'satin variants',
    canonicalTerm: 'satin',
    synonyms: ['silk satin', 'silky'],
    category: 'material',
  },
  {
    name: 'faux leather',
    canonicalTerm: 'faux leather',
    synonyms: ['vegan leather', 'pleather', 'synthetic leather', 'pu leather'],
    category: 'material',
  },

  // ============ 尺寸/fit ============
  {
    name: 'plus size',
    canonicalTerm: 'plus size',
    synonyms: ['curvy', 'extended size', 'full figured', 'big size'],
    category: 'general',
  },
  {
    name: 'petite size',
    canonicalTerm: 'petite',
    synonyms: ['petite size', 'small size', 'short length'],
    category: 'general',
  },
  {
    name: 'oversized fit',
    canonicalTerm: 'oversized',
    synonyms: ['oversize', 'loose fit', 'baggy', 'relaxed fit'],
    category: 'general',
  },
  {
    name: 'slim fit',
    canonicalTerm: 'slim fit',
    synonyms: ['slim', 'skinny', 'fitted', 'tapered'],
    category: 'general',
  },

  // ============ 价格意图相关 ============
  {
    name: 'affordable',
    canonicalTerm: 'affordable',
    synonyms: ['cheap', 'budget', 'inexpensive', 'low price'],
    category: 'general',
  },
  {
    name: 'luxury',
    canonicalTerm: 'luxury',
    synonyms: ['luxurious', 'premium', 'high-end', 'designer'],
    category: 'general',
  },
  {
    name: 'sale items',
    canonicalTerm: 'sale',
    synonyms: ['discount', 'clearance', 'deal', 'bargain', 'markdown'],
    category: 'general',
  },
];

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();
  let added = 0;
  let skipped = 0;

  try {
    console.log('Inserting additional synonyms...\n');

    for (const syn of ADDITIONAL_SYNONYMS) {
      const existing = await queryRunner.query(
        `SELECT id FROM synonym_groups WHERE canonical_term = $1`,
        [syn.canonicalTerm],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO synonym_groups (name, canonical_term, synonyms, category) VALUES ($1, $2, $3, $4)`,
          [syn.name, syn.canonicalTerm, syn.synonyms, syn.category],
        );
        console.log(
          `  + ${syn.category.padEnd(10)} | ${syn.canonicalTerm.padEnd(18)} → ${syn.synonyms.join(', ')}`,
        );
        added++;
      } else {
        skipped++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Added: ${added}, Skipped (already exists): ${skipped}`);

    // 显示统计
    const stats = await queryRunner.query(`
      SELECT category, COUNT(*) as count
      FROM synonym_groups
      GROUP BY category
      ORDER BY category
    `);
    console.log('\nSynonym groups by category:');
    stats.forEach((s: any) =>
      console.log(`  ${s.category.padEnd(12)}: ${s.count}`),
    );

    const total = await queryRunner.query(
      `SELECT COUNT(*) as count FROM synonym_groups`,
    );
    console.log(`\nTotal synonym groups: ${total[0].count}`);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
