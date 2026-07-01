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

const ALL_SYNONYMS = [
  // ================================================================
  // 1. UK/US English differences (locale)
  // ================================================================
  {
    name: 'sneakers/trainers',
    canonicalTerm: 'sneakers',
    synonyms: ['trainers', 'kicks', 'tennis shoes', 'athletic shoes'],
    category: 'locale',
  },
  {
    name: 'pants/trousers',
    canonicalTerm: 'pants',
    synonyms: ['trousers', 'slacks'],
    category: 'locale',
  },
  {
    name: 'sweater/jumper',
    canonicalTerm: 'sweater',
    synonyms: ['jumper', 'pullover', 'knit'],
    category: 'locale',
  },
  {
    name: 'vest/waistcoat',
    canonicalTerm: 'vest',
    synonyms: ['waistcoat', 'gilet'],
    category: 'locale',
  },
  {
    name: 'suspenders/braces',
    canonicalTerm: 'suspenders',
    synonyms: ['braces'],
    category: 'locale',
  },
  {
    name: 'fanny pack/bum bag',
    canonicalTerm: 'fanny pack',
    synonyms: ['bum bag', 'waist bag', 'belt bag'],
    category: 'locale',
  },
  {
    name: 'turtleneck/roll neck',
    canonicalTerm: 'turtleneck',
    synonyms: ['roll neck', 'polo neck', 'mock neck'],
    category: 'locale',
  },
  {
    name: 'bathrobe/dressing gown',
    canonicalTerm: 'bathrobe',
    synonyms: ['dressing gown', 'robe', 'housecoat'],
    category: 'locale',
  },
  {
    name: 'rain boots/wellies',
    canonicalTerm: 'rain boots',
    synonyms: ['wellies', 'wellington boots', 'rubber boots'],
    category: 'locale',
  },
  {
    name: 'backpack/rucksack',
    canonicalTerm: 'backpack',
    synonyms: ['rucksack', 'knapsack', 'book bag'],
    category: 'locale',
  },
  {
    name: 'jewelry/jewellery',
    canonicalTerm: 'jewelry',
    synonyms: ['jewellery'],
    category: 'locale',
  },
  {
    name: 'tracksuit/sweatsuit',
    canonicalTerm: 'tracksuit',
    synonyms: ['sweatsuit', 'track suit', 'jogging suit'],
    category: 'locale',
  },

  // ================================================================
  // 2. Tops
  // ================================================================
  {
    name: 't-shirt variants',
    canonicalTerm: 't-shirt',
    synonyms: ['tee', 'tshirt', 't shirt'],
    category: 'general',
  },
  {
    name: 'hoodie variants',
    canonicalTerm: 'hoodie',
    synonyms: ['hoody', 'hooded sweatshirt'],
    category: 'general',
  },
  {
    name: 'sweatshirt variants',
    canonicalTerm: 'sweatshirt',
    synonyms: ['crew neck', 'crewneck'],
    category: 'general',
  },
  {
    name: 'blouse variants',
    canonicalTerm: 'blouse',
    synonyms: ['button-up', 'button up', 'button down'],
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

  // ================================================================
  // 3. Bottoms
  // ================================================================
  {
    name: 'denim/jeans',
    canonicalTerm: 'jeans',
    synonyms: ['denim', 'jean', 'denim pants'],
    category: 'general',
  },
  {
    name: 'shorts variants',
    canonicalTerm: 'shorts',
    synonyms: ['short pants', 'bermudas'],
    category: 'general',
  },
  {
    name: 'leggings variants',
    canonicalTerm: 'leggings',
    synonyms: ['tights', 'jeggings', 'yoga pants'],
    category: 'general',
  },

  // ================================================================
  // 4. Dresses & one-piece
  // ================================================================
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
  {
    name: 'jumpsuit variants',
    canonicalTerm: 'jumpsuit',
    synonyms: ['romper', 'playsuit', 'one-piece', 'onesie'],
    category: 'general',
  },
  {
    name: 'bodysuit variants',
    canonicalTerm: 'bodysuit',
    synonyms: ['body', 'leotard'],
    category: 'general',
  },

  // ================================================================
  // 5. Outerwear
  // ================================================================
  {
    name: 'jacket/coat',
    canonicalTerm: 'jacket',
    synonyms: ['coat'],
    category: 'general',
  },
  {
    name: 'blazer variants',
    canonicalTerm: 'blazer',
    synonyms: ['sport coat', 'suit jacket'],
    category: 'general',
  },
  {
    name: 'suit variants',
    canonicalTerm: 'suit',
    synonyms: ['two-piece', 'formal suit', 'tuxedo', 'tux'],
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
    synonyms: ['trench coat', 'overcoat'],
    category: 'general',
  },
  {
    name: 'overalls/dungarees',
    canonicalTerm: 'overalls',
    synonyms: ['dungarees', 'bib overalls'],
    category: 'locale',
  },

  // ================================================================
  // 6. Footwear
  // ================================================================
  {
    name: 'boots variants',
    canonicalTerm: 'boots',
    synonyms: ['booties', 'ankle boots', 'combat boots', 'chelsea boots'],
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
    synonyms: ['slides', 'flip flops', 'open toe shoes'],
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
    synonyms: ['runners', 'jogging shoes'],
    category: 'general',
  },
  {
    name: 'slippers variants',
    canonicalTerm: 'slippers',
    synonyms: ['house shoes', 'house slippers', 'mules'],
    category: 'general',
  },

  // ================================================================
  // 7. Bags
  // ================================================================
  {
    name: 'bag variants',
    canonicalTerm: 'bag',
    synonyms: ['purse', 'handbag', 'tote', 'satchel'],
    category: 'general',
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
    name: 'wallet variants',
    canonicalTerm: 'wallet',
    synonyms: ['billfold', 'card holder', 'card case', 'money clip'],
    category: 'general',
  },

  // ================================================================
  // 8. Accessories
  // ================================================================
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
    name: 'hat/cap',
    canonicalTerm: 'hat',
    synonyms: ['cap', 'beanie', 'beret'],
    category: 'general',
  },
  {
    name: 'belt variants',
    canonicalTerm: 'belt',
    synonyms: ['waist belt'],
    category: 'general',
  },
  {
    name: 'watch variants',
    canonicalTerm: 'watch',
    synonyms: ['wristwatch', 'timepiece'],
    category: 'general',
  },
  {
    name: 'necklace variants',
    canonicalTerm: 'necklace',
    synonyms: ['pendant', 'choker'],
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
  {
    name: 'ring variants',
    canonicalTerm: 'ring',
    synonyms: ['band', 'signet ring'],
    category: 'general',
  },
  {
    name: 'tie variants',
    canonicalTerm: 'tie',
    synonyms: ['necktie', 'bow tie', 'bowtie'],
    category: 'general',
  },

  // ================================================================
  // 9. Styles (only precise synonyms)
  // ================================================================
  {
    name: 'athleisure',
    canonicalTerm: 'athleisure',
    synonyms: ['sporty casual', 'athletic leisure'],
    category: 'style',
  },
  {
    name: 'streetwear',
    canonicalTerm: 'streetwear',
    synonyms: ['street style', 'street fashion'],
    category: 'style',
  },
  {
    name: 'preppy',
    canonicalTerm: 'preppy',
    synonyms: ['ivy league', 'collegiate'],
    category: 'style',
  },
  {
    name: 'boho style',
    canonicalTerm: 'boho',
    synonyms: ['bohemian', 'boho chic'],
    category: 'style',
  },
  {
    name: 'vintage style',
    canonicalTerm: 'vintage',
    synonyms: ['retro', 'old school'],
    category: 'style',
  },

  // ================================================================
  // 10. Occasion & categories
  // ================================================================
  {
    name: 'formal',
    canonicalTerm: 'formal',
    synonyms: ['dressy', 'black tie', 'evening wear'],
    category: 'general',
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
    synonyms: ['cocktail dress', 'semi-formal'],
    category: 'general',
  },
  {
    name: 'loungewear',
    canonicalTerm: 'loungewear',
    synonyms: ['lounge wear', 'homewear', 'comfort wear'],
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
    synonyms: ['lingerie', 'briefs', 'boxers'],
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
  {
    name: 'activewear',
    canonicalTerm: 'activewear',
    synonyms: ['sportswear', 'athletic wear'],
    category: 'general',
  },

  // ================================================================
  // 11. Materials
  // ================================================================
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
  {
    name: 'leather variants',
    canonicalTerm: 'leather',
    synonyms: ['genuine leather', 'real leather', 'cowhide'],
    category: 'material',
  },
  {
    name: 'cotton variants',
    canonicalTerm: 'cotton',
    synonyms: ['organic cotton', 'pima cotton'],
    category: 'material',
  },

  // ================================================================
  // 12. Size & Fit
  // ================================================================
  {
    name: 'plus size',
    canonicalTerm: 'plus size',
    synonyms: ['extended size', 'big size'],
    category: 'general',
  },
  {
    name: 'petite size',
    canonicalTerm: 'petite',
    synonyms: ['petite size', 'short length'],
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

  // ================================================================
  // 13. Price intent
  // ================================================================
  {
    name: 'luxury',
    canonicalTerm: 'luxury',
    synonyms: ['premium', 'high-end'],
    category: 'general',
  },
  {
    name: 'sale items',
    canonicalTerm: 'sale',
    synonyms: ['discount', 'clearance', 'deal', 'markdown'],
    category: 'general',
  },
];

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();

  const queryRunner = dataSource.createQueryRunner();

  try {
    // 创建表
    console.log('Creating synonym_groups table...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS synonym_groups (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        canonical_term VARCHAR(100) NOT NULL,
        synonyms TEXT[] NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 创建索引
    console.log('Creating indexes...');
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_synonym_groups_canonical ON synonym_groups(canonical_term)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_synonym_groups_category ON synonym_groups(category)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_synonym_groups_active ON synonym_groups(is_active) WHERE is_active = true
    `);

    // 插入数据
    let added = 0;
    let skipped = 0;

    console.log('\nInserting synonyms...\n');

    for (const syn of ALL_SYNONYMS) {
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
          `  + ${syn.category.padEnd(10)} | ${syn.canonicalTerm.padEnd(20)} → ${syn.synonyms.join(', ')}`,
        );
        added++;
      } else {
        console.log(`  - Skipped (exists): ${syn.canonicalTerm}`);
        skipped++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(
      `Added: ${added}, Skipped: ${skipped}, Total in array: ${ALL_SYNONYMS.length}`,
    );

    // 显示按类别统计
    const stats = await queryRunner.query(`
      SELECT category, COUNT(*) as count
      FROM synonym_groups
      WHERE is_active = true
      GROUP BY category
      ORDER BY count DESC
    `);
    console.log('\nSynonym groups by category:');
    stats.forEach((s: any) =>
      console.log(`  ${s.category.padEnd(12)}: ${s.count}`),
    );

    const total = await queryRunner.query(
      `SELECT COUNT(*) as count FROM synonym_groups WHERE is_active = true`,
    );
    console.log(`\nTotal active synonym groups: ${total[0].count}`);
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
