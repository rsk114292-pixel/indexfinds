import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function checkBrandTier() {
  await withScriptDataSource(async (dataSource) => {
    console.log('✅ 数据库连接成功\n');

    const distribution = await dataSource.query(`
      SELECT tier, COUNT(*) as count
      FROM brands
      GROUP BY tier
      ORDER BY tier;
    `);

    console.log('📊 品牌 tier 分布:');
    distribution.forEach((row: any) => {
      const tierName =
        row.tier === 1 ? '核心品牌' : row.tier === 2 ? '热门品牌' : '长尾品牌';
      console.log(`  tier ${row.tier} (${tierName}): ${row.count} 个品牌`);
    });

    const samples = await dataSource.query(`
      SELECT name, tier FROM brands ORDER BY tier, name LIMIT 10;
    `);

    console.log('\n📋 样本数据 (前10个):');
    samples.forEach((s: any) => {
      console.log(
        `  ${s.name.padEnd(20)} → tier=${s.tier} (类型: ${typeof s.tier})`,
      );
    });
    console.log('\n✅ 检查完成');
  });
}

void runScriptMain('品牌 tier 检查', checkBrandTier);
