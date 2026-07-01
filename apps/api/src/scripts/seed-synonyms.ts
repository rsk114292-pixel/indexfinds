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

const INITIAL_SYNONYMS = [
  // 英美差异
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
    synonyms: ['waistcoat'],
    category: 'locale',
  },
  {
    name: 'suspenders/braces',
    canonicalTerm: 'suspenders',
    synonyms: ['braces'],
    category: 'locale',
  },

  // 时尚术语
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
    name: 'jacket/coat',
    canonicalTerm: 'jacket',
    synonyms: ['coat', 'outerwear'],
    category: 'general',
  },
  {
    name: 'sweatshirt variants',
    canonicalTerm: 'sweatshirt',
    synonyms: ['crew neck', 'crewneck'],
    category: 'general',
  },
  {
    name: 'denim variants',
    canonicalTerm: 'denim',
    synonyms: ['jean', 'jeans'],
    category: 'material',
  },

  // 风格术语
  {
    name: 'athleisure',
    canonicalTerm: 'athleisure',
    synonyms: ['sporty casual', 'athletic leisure'],
    category: 'style',
  },
  {
    name: 'streetwear',
    canonicalTerm: 'streetwear',
    synonyms: ['street style', 'urban'],
    category: 'style',
  },
  {
    name: 'preppy',
    canonicalTerm: 'preppy',
    synonyms: ['ivy league', 'collegiate'],
    category: 'style',
  },

  // 场合/季节
  {
    name: 'formal',
    canonicalTerm: 'formal',
    synonyms: ['dressy', 'elegant', 'fancy'],
    category: 'general',
  },
  {
    name: 'casual',
    canonicalTerm: 'casual',
    synonyms: ['everyday', 'relaxed', 'laid-back'],
    category: 'general',
  },
  {
    name: 'summer',
    canonicalTerm: 'summer',
    synonyms: ['warm weather', 'hot weather'],
    category: 'general',
  },
  {
    name: 'winter',
    canonicalTerm: 'winter',
    synonyms: ['cold weather', 'snow'],
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

    // 插入初始数据
    console.log('Inserting initial synonyms...');
    for (const syn of INITIAL_SYNONYMS) {
      const existing = await queryRunner.query(
        `SELECT id FROM synonym_groups WHERE canonical_term = $1`,
        [syn.canonicalTerm],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO synonym_groups (name, canonical_term, synonyms, category) VALUES ($1, $2, $3, $4)`,
          [syn.name, syn.canonicalTerm, syn.synonyms, syn.category],
        );
        console.log(`  + Added: ${syn.name}`);
      } else {
        console.log(`  - Skipped (exists): ${syn.name}`);
      }
    }

    console.log('\nSeed completed successfully!');

    // 显示统计
    const stats = await queryRunner.query(
      `SELECT COUNT(*) as count FROM synonym_groups`,
    );
    console.log(`Total synonym groups: ${stats[0].count}`);
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
