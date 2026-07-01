/**
 * 检查特定产品的 SKU 数据
 */
import { runScriptMain, withScriptDataSource } from './lib/script-support';

async function checkSkuData() {
  await withScriptDataSource(async (dataSource) => {
    const result = await dataSource.query(`
      SELECT p.id, p.slug, p.title, s.id as sku_id, s.attributes, s.image
      FROM products p
      LEFT JOIN skus s ON s."productId" = p.id
      WHERE p.slug = 'nike-sneakers-bnapsh'
      LIMIT 50
    `);

    console.log('=== Product SKU Data ===');
    console.log('Total SKUs:', result.length);
    console.log(
      'Sample (first 3):',
      JSON.stringify(result.slice(0, 3), null, 2),
    );

    // 分析属性结构
    const attrKeys = new Set<string>();
    const attrValues: Record<string, Set<string>> = {};

    result.forEach((row: any) => {
      if (row.attributes) {
        const attrs =
          typeof row.attributes === 'string'
            ? JSON.parse(row.attributes)
            : row.attributes;

        Object.entries(attrs).forEach(([key, value]) => {
          attrKeys.add(key);
          if (!attrValues[key]) attrValues[key] = new Set();
          attrValues[key].add(value as string);
        });
      }
    });

    console.log('\n=== Attribute Keys ===');
    console.log(Array.from(attrKeys));

    console.log('\n=== Attribute Values ===');
    for (const key of attrKeys) {
      const vals = Array.from(attrValues[key]);
      console.log(
        `${key}: [${vals.slice(0, 15).join(', ')}${vals.length > 15 ? '...' : ''}] (${vals.length} total)`,
      );
    }
  });
}

void runScriptMain('SKU 数据检查', checkSkuData);
