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

  // 更新 HELLSTAR 短裤状态为 active
  const result = await ds.query(`
    UPDATE products
    SET status = 'active'
    WHERE id = '0a5ad25d-6591-4c6c-8371-4fee66c4d808'
    RETURNING id, title, status
  `);

  console.log('=== 更新结果 ===');
  console.log(result);

  await ds.destroy();
}

main().catch(console.error);
