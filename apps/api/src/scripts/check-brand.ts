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
  });
  await ds.initialize();

  // 检查 HELLSTAR 品牌
  const brand = await ds.query(
    `SELECT * FROM brands WHERE name ILIKE '%hellstar%'`,
  );
  console.log('HELLSTAR 品牌:', JSON.stringify(brand, null, 2));

  // 检查品牌 tier
  const brandById = await ds.query(
    `SELECT * FROM brands WHERE id = '0e9ddb3f-ab8d-4614-b777-0bac7337e3a9'`,
  );
  console.log('\n品牌详情:', JSON.stringify(brandById, null, 2));

  await ds.destroy();
}

main().catch(console.error);
