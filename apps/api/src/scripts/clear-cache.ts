import { DataSource } from 'typeorm';

async function clearCache() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await dataSource.initialize();
  console.log('Database connected');

  const result = await dataSource.query(`
    DELETE FROM weidian_cache
    WHERE "itemId" IN ('7545462565', '7545532177', '7592079705', '7544419747', '7545474505')
  `);

  console.log('Cache cleared:', result);
  await dataSource.destroy();
}

clearCache().catch(console.error);
