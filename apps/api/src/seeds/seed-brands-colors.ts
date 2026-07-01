import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// 加载环境变量
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
});

// 读取JSON文件
function loadJsonFile(filename: string): any {
  const filePath = join(__dirname, 'data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

type ColdStartBrand = {
  name: string;
  slug: string;
  aliases?: string[];
  tier?: number;
  brandType?: string;
  displayMode?: string;
  governanceStatus?: string;
  canonicalKey?: string | null;
  parentSlug?: string | null;
  isIndependent?: boolean;
  isFeatured?: boolean;
  featuredSort?: number;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ColdStartPayload = {
  brandCount: number;
  brands: ColdStartBrand[];
};

async function seedColors(queryRunner: any) {
  console.log('\n🎨 正在导入颜色数据...');

  const colorsData = loadJsonFile('colors.json');
  let inserted = 0;
  let skipped = 0;

  for (const color of colorsData.colors) {
    try {
      // 检查是否已存在
      const existing = await queryRunner.query(
        `SELECT id FROM colors WHERE slug = $1`,
        [color.slug],
      );

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      await queryRunner.query(
        `INSERT INTO colors (name, slug, "nameEn", aliases, "aliasesEn", "hexCode", "sortOrder", "isActive")
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          color.name,
          color.slug,
          color.nameEn,
          color.aliases?.join(',') || null,
          color.aliasesEn?.join(',') || null,
          color.hexCode,
          color.sortOrder,
        ],
      );
      inserted++;
    } catch (error: any) {
      console.error(`  ❌ 颜色 ${color.name} 导入失败:`, error.message);
    }
  }

  console.log(`  ✅ 颜色导入完成: 新增 ${inserted}, 跳过 ${skipped}`);
}

async function seedBrands(queryRunner: any) {
  console.log('\n🏷️ 正在导入品牌数据...');

  const payload = loadJsonFile('brands-cold-start-v2.json') as ColdStartPayload;
  let processed = 0;
  let parentLinked = 0;

  for (const brand of payload.brands) {
    try {
      await queryRunner.query(
        `
          INSERT INTO brands (
            name,
            slug,
            aliases,
            tier,
            status,
            "brandType",
            "displayMode",
            "governanceStatus",
            "canonicalKey",
            "isIndependent",
            "isFeatured",
            "featuredSort",
            description,
            metadata
          ) VALUES (
            $1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            aliases = EXCLUDED.aliases,
            tier = EXCLUDED.tier,
            status = EXCLUDED.status,
            "brandType" = EXCLUDED."brandType",
            "displayMode" = EXCLUDED."displayMode",
            "governanceStatus" = EXCLUDED."governanceStatus",
            "canonicalKey" = EXCLUDED."canonicalKey",
            "isIndependent" = EXCLUDED."isIndependent",
            "isFeatured" = EXCLUDED."isFeatured",
            "featuredSort" = EXCLUDED."featuredSort",
            description = EXCLUDED.description,
            metadata = EXCLUDED.metadata
        `,
        [
          brand.name,
          brand.slug,
          brand.aliases?.join(',') || null,
          brand.tier ?? 0,
          brand.brandType ?? 'canonical',
          brand.displayMode ?? 'independent',
          brand.governanceStatus ?? 'approved',
          brand.canonicalKey ?? null,
          brand.isIndependent ?? true,
          brand.isFeatured ?? false,
          brand.featuredSort ?? 0,
          brand.description ?? null,
          brand.metadata ? JSON.stringify(brand.metadata) : null,
        ],
      );
      processed++;
    } catch (error: any) {
      console.error(`  ❌ 品牌 ${brand.name} 导入失败:`, error.message);
    }
  }

  for (const brand of payload.brands) {
    if (!brand.parentSlug) {
      continue;
    }

    try {
      await queryRunner.query(
        `
          UPDATE brands child
          SET "parentId" = parent.id
          FROM brands parent
          WHERE child.slug = $1
            AND parent.slug = $2
        `,
        [brand.slug, brand.parentSlug],
      );
      parentLinked++;
    } catch (error: any) {
      console.error(`  ❌ 品牌 ${brand.name} 父级关联失败:`, error.message);
    }
  }

  console.log(
    `  ✅ 品牌导入完成: 处理 ${processed}/${payload.brandCount}, 父级关联 ${parentLinked}`,
  );
}

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功');

    const queryRunner = AppDataSource.createQueryRunner();

    // 导入颜色
    await seedColors(queryRunner);

    // 导入品牌
    await seedBrands(queryRunner);

    console.log('\n🎉 Seed data import complete!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ 种子数据导入失败:', error);
    process.exit(1);
  }
}

void seed();
