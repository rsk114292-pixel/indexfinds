import { Client } from 'pg';
import { Queue } from 'bullmq';

async function reprocessItems() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await client.connect();
  console.log('Database connected');

  // 1. 清除所有缓存
  console.log('\n1. Clearing weidian cache...');
  const cacheResult = await client.query('DELETE FROM weidian_cache');
  console.log(`   Cleared ${cacheResult.rowCount} cache entries`);

  // 2. 获取所有 review 状态的商品
  console.log('\n2. Finding items with status=review...');
  const itemsResult = await client.query(`
    SELECT id, "sourceUrl", batch_job_id, "weidianItemId"
    FROM batch_job_items
    WHERE status = 'review'
    ORDER BY "createdAt" DESC
  `);
  const items = itemsResult.rows;
  console.log(`   Found ${items.length} items`);

  if (items.length === 0) {
    console.log('\nNo items to reprocess');
    await client.end();
    return;
  }

  // 3. 将状态改回 pending
  console.log('\n3. Resetting status to pending...');
  await client.query(`
    UPDATE batch_job_items
    SET status = 'pending',
        "sourceData" = NULL,
        "aiGeneratedData" = NULL,
        "errorMessage" = NULL,
        "retryCount" = 0
    WHERE status = 'review'
  `);
  console.log('   Status reset complete');

  // 4. 添加到队列
  console.log('\n4. Adding items to queue...');
  const batchImportQueue = new Queue('batch-import', {
    connection: {
      host: 'localhost',
      port: 6379,
    },
  });

  for (const item of items) {
    await batchImportQueue.add('import-item', {
      jobId: item.batch_job_id,
      itemId: item.id,
      sourceUrl: item.sourceUrl,
    });
    console.log(`   Added item ${item.weidianItemId} to queue`);
  }

  await batchImportQueue.close();
  console.log('\n✓ Reprocessing started!');
  console.log(
    `\nProcessing ${items.length} items. Check the logs to monitor progress.`,
  );

  await client.end();
}

reprocessItems().catch(console.error);
