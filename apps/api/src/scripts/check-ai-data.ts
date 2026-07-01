import { Client } from 'pg';

async function checkAiData() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'lolobuyspreadsheets_dev',
  });

  await client.connect();
  console.log('Database connected');

  const result = await client.query(`
    SELECT
      id,
      "weidianItemId",
      status,
      "aiGeneratedData"
    FROM batch_job_items
    WHERE status = 'review'
    ORDER BY "createdAt" DESC
    LIMIT 3
  `);

  console.log('\n=== AI Generated Data ===\n');
  result.rows.forEach((row, index) => {
    console.log(`[${index + 1}] Item ID: ${row.weidianItemId}`);
    console.log(`Status: ${row.status}`);
    console.log(`AI Data:`, JSON.stringify(row.aiGeneratedData, null, 2));
    console.log('');
  });

  await client.end();
}

checkAiData().catch(console.error);
