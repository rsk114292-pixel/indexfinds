import { DataSource } from 'typeorm';

async function deleteProduct() {
  const productId = 'ab89d50b-77b4-4072-80c8-a4707ec7b4ed';

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('✅ Database connected\n');

  try {
    // 删除商品（会级联删除 SKU）
    const result = await dataSource.query(
      'DELETE FROM products WHERE id = $1',
      [productId],
    );

    if (result[1] > 0) {
      console.log(`✅ 商品 ${productId} 已删除`);
    } else {
      console.log(`⚠️ 商品 ${productId} 不存在`);
    }
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
  } finally {
    await dataSource.destroy();
  }
}

deleteProduct().catch(console.error);
