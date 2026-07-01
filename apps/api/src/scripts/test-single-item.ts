import { Client } from 'pg';
import { Queue } from 'bullmq';

async function testSingleItem() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await client.connect();
  console.log('Database connected');

  // 获取一个 Nike 鞋类商品
  const itemsResult = await client.query(`
    SELECT id, "sourceUrl", batch_job_id, "weidianItemId"
    FROM batch_job_items
    WHERE status = 'review' AND "weidianItemId" = '7545532177'
    LIMIT 1
  `);

  if (itemsResult.rows.length === 0) {
    console.log('No test item found');
    await client.end();
    return;
  }

  const item = itemsResult.rows[0];
  console.log(`\nTesting item: ${item.weidianItemId}`);

  // 重置状态
  await client.query(
    `
    UPDATE batch_job_items
    SET status = 'pending',
        "sourceData" = NULL,
        "aiGeneratedData" = NULL,
        "errorMessage" = NULL
    WHERE id = $1
  `,
    [item.id],
  );
  console.log('Status reset to pending');

  // 清除缓存
  await client.query(`DELETE FROM weidian_cache WHERE "itemId" = $1`, [
    item.weidianItemId,
  ]);
  console.log('Cache cleared');

  // 添加到队列
  const batchImportQueue = new Queue('batch-import', {
    connection: { host: 'localhost', port: 6379 },
  });

  await batchImportQueue.add('import-item', {
    jobId: item.batch_job_id,
    itemId: item.id,
    sourceUrl: item.sourceUrl,
  });

  await batchImportQueue.close();
  console.log('\n✓ Item added to queue!');
  console.log('Wait 30-40 seconds, then check the results.');

  await client.end();
}

testSingleItem().catch(console.error);
