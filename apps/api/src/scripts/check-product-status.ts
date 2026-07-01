import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
    synchronize: false,
  });

  await ds.initialize();

  // 查看皮带产品的 SKU 数据
  const beltSkus = await ds.query(`
    SELECT id, attributes, "skuKey"
    FROM skus
    WHERE "productId" = 'f1194dcf-0b3b-4b50-9594-53cde10771aa'
    LIMIT 10
  `);

  console.log('Belt SKUs sample:', JSON.stringify(beltSkus, null, 2));

  await ds.destroy();
}

main().catch(console.error);
