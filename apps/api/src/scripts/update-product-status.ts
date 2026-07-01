import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const productIds = [
  '62be28b2-b66f-4ddb-9d02-72a1c56aa67f', // GRA
  'c1088ada-e96e-4f03-8155-7bc5a0678950', // Louis Vuitton
  '779eb8d0-7007-44d9-b00e-5381d51c688b', // Nike
];

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
  console.log('Database connected');

  for (const id of productIds) {
    await ds.query(`UPDATE products SET status = 'active' WHERE id = $1`, [id]);
    console.log(`Updated ${id.substring(0, 8)}... to active`);
  }

  // 验证
  const result = await ds.query(
    `SELECT id, title, status FROM products WHERE id = ANY($1)`,
    [productIds],
  );
  console.log('\nVerification:');
  result.forEach((r: { id: string; title: string; status: string }) => {
    console.log(
      `  ${r.id.substring(0, 8)}... | ${r.status} | ${r.title.substring(0, 35)}`,
    );
  });

  await ds.destroy();
  console.log('\nDone!');
}

main().catch(console.error);
