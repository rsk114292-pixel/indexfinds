import { DataSource } from 'typeorm';

async function checkCache() {
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

  // 查询缓存表
  const caches = await dataSource.query(`
    SELECT
      "itemId",
      title,
      "mainImage",
      images,
      status,
      "lastFetchedAt"
    FROM weidian_cache
    WHERE "itemId" IN ('7545462565', '7545532177', '7592079705')
    LIMIT 5
  `);

  console.log('\n=== Weidian Cache ===');
  caches.forEach((cache: any, index: number) => {
    console.log(`\n[${index + 1}] Item ID: ${cache.itemId}`);
    console.log(`Title: ${cache.title}`);
    console.log(`Main Image: ${cache.mainImage}`);
    console.log(`Images: ${JSON.stringify(cache.images)}`);
    console.log(`Status: ${cache.status}`);
    console.log(`Last Fetched: ${cache.lastFetchedAt}`);
  });

  await dataSource.destroy();
}

checkCache().catch(console.error);
