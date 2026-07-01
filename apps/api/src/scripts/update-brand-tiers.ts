import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

function loadJsonFile(filename: string): any {
  const filePath = join(__dirname, '../seeds/data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

type ColdStartBrand = {
  slug: string;
  tier?: number;
};

type ColdStartPayload = {
  brandCount: number;
  brands: ColdStartBrand[];
};

async function updateBrandTiers() {
  try {
    await AppDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const queryRunner = AppDataSource.createQueryRunner();

    const payload = loadJsonFile(
      'brands-cold-start-v2.json',
    ) as ColdStartPayload;

    let totalUpdated = 0;
    console.log(
      `📁 处理 brands-cold-start-v2.json (${payload.brandCount} 个品牌)...`,
    );

    for (const brand of payload.brands) {
      await queryRunner.query(`UPDATE brands SET tier = $1 WHERE slug = $2`, [
        brand.tier ?? 0,
        brand.slug,
      ]);
      totalUpdated++;
    }

    console.log(`\n📊 总计更新: ${totalUpdated} 个品牌\n`);

    // 显示更新后的分布
    const distribution = await queryRunner.query(`
      SELECT tier, COUNT(*) as count
      FROM brands
      GROUP BY tier
      ORDER BY tier;
    `);

    console.log('📊 更新后的 tier 分布:');
    distribution.forEach((row: any) => {
      const tierName =
        row.tier === 1 ? '核心品牌' : row.tier === 2 ? '热门品牌' : '长尾品牌';
      console.log(`  tier ${row.tier} (${tierName}): ${row.count} 个品牌`);
    });

    await AppDataSource.destroy();
    console.log('\n🎉 更新完成！');
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

updateBrandTiers();
