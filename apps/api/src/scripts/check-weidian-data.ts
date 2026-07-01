import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function main() {
  await withScriptDataSource(async (dataSource) => {
    const stats = await dataSource.query(`
    SELECT
      COUNT(*) as total,
      COUNT("sourceUrl") as with_url,
      COUNT("weidianItemId") as with_item_id
    FROM products
  `);
  console.log('统计:', stats[0]);

    const items = await dataSource.query(`
    SELECT "weidianItemId", "sourceUrl", title
    FROM products
    WHERE "weidianItemId" IS NOT NULL
    LIMIT 3
  `);
  console.log('\n示例:');
  items.forEach((item: any, i: number) => {
    console.log(i + 1 + '. itemId:', item.weidianItemId);
    console.log('   url:', item.sourceUrl || '(空)');
    console.log('   title:', item.title?.substring(0, 40));
  });
  });
}
void runScriptMain('微店数据检查', main);
