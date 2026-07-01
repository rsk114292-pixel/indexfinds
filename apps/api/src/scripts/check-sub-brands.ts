import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function checkSubBrands() {
  await withScriptDataSource(async (dataSource) => {
    console.log('✅ 数据库连接成功\n');

    const subBrands = await dataSource.query(`
      SELECT
        b.name as sub_brand,
        b.slug,
        b.tier,
        b."isIndependent",
        p.name as parent_brand
      FROM brands b
      INNER JOIN brands p ON b."parentId" = p.id
      ORDER BY p.name, b.name;
    `);

    console.log(`📊 子品牌总数: ${subBrands.length}\n`);
    console.log('子品牌层级关系:');
    console.log('='.repeat(80));

    let currentParent = '';
    subBrands.forEach((row: any) => {
      if (row.parent_brand !== currentParent) {
        currentParent = row.parent_brand;
        console.log(`\n${currentParent}:`);
      }
      const indie = row.isIndependent ? '✓' : '✗';
      const tierName = row.tier === 1 ? 'T1' : row.tier === 2 ? 'T2' : 'T0';
      console.log(
        `  ├─ ${row.sub_brand.padEnd(25)} [独立:${indie}] [${tierName}]`,
      );
    });
    console.log('\n✅ 检查完成');
  });
}

void runScriptMain('子品牌检查', checkSubBrands);
