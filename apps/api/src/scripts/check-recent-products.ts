/**
 * 检查最近导入的产品
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    const products = await dataSource.query(`
    SELECT id, title, status, "potentialMixedProduct", "mixednessScore",
           "weidianItemId", "createdAt", "aiBrandName", "brandId"
    FROM products
    ORDER BY "createdAt" DESC
    LIMIT 10
  `);

  console.log('最近导入的产品:\n');
  products.forEach((p: any, i: number) => {
    console.log(`[${i + 1}] ${p.title}`);
    console.log(`    ID: ${p.id}`);
    console.log(`    状态: ${p.status}`);
    console.log(`    AI 品牌: ${p.aiBrandName || '无'}`);
    console.log(`    品牌ID: ${p.brandId || '无'}`);
    console.log(`    微店商品ID: ${p.weidianItemId}`);
    console.log(
      `    混合商品: ${p.potentialMixedProduct ? '是' : '否'} (得分: ${p.mixednessScore || 0})`,
    );
    console.log(`    创建时间: ${p.createdAt}`);
    console.log('');
  });

    const statusStats = await dataSource.query(`
    SELECT status, COUNT(*) as count
    FROM products
    GROUP BY status
  `);

  console.log('\n按状态统计:');
  statusStats.forEach((s: any) => {
    console.log(`  ${s.status}: ${s.count}`);
  });
  });
}

void runScriptMain('最近产品检查', main);
