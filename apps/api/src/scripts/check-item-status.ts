import { Client } from 'pg';

async function checkItemStatus() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await client.connect();
  console.log('Database connected\n');

  // 检查测试商品的状态
  const result = await client.query(`
    SELECT
      id,
      "weidianItemId",
      status,
      "productId",
      ("aiGeneratedData"->>'title') as ai_title,
      ("aiGeneratedData"->>'slug') as slug,
      ("aiGeneratedData"->>'brandId') as brand_id,
      ("aiGeneratedData"->>'primaryCategoryId') as category_id,
      "errorMessage"
    FROM batch_job_items
    WHERE "weidianItemId" = '7545532177'
  `);

  if (result.rows.length === 0) {
    console.log('Item not found');
    await client.end();
    return;
  }

  const item = result.rows[0];
  console.log('=== Item Status ===');
  console.log(`Weidian Item ID: ${item.weidianItemId}`);
  console.log(`Status: ${item.status}`);
  console.log(`AI Title: ${item.ai_title || 'NULL'}`);
  console.log(`Slug: ${item.slug || 'NULL'}`);
  console.log(`Brand ID: ${item.brand_id || 'NULL'}`);
  console.log(`Category ID: ${item.category_id || 'NULL'}`);
  console.log(`Product ID: ${item.productId || 'NULL'}`);
  console.log(`Error: ${item.errorMessage || 'None'}`);

  // 如果已发布，检查产品详情
  if (item.productId) {
    const productResult = await client.query(
      `
      SELECT id, slug, title, "brandId", "primaryCategoryId", status
      FROM products
      WHERE id = $1
    `,
      [item.productId],
    );

    if (productResult.rows.length > 0) {
      const product = productResult.rows[0];
      console.log('\n=== Published Product ===');
      console.log(`Product ID: ${product.id}`);
      console.log(`Title: ${product.title}`);
      console.log(`Slug: ${product.slug}`);
      console.log(`Status: ${product.status}`);
      console.log(`URL: http://localhost:3101/products/${product.slug}`);
    }
  }

  await client.end();
}

checkItemStatus().catch(console.error);
