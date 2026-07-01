import { Client } from 'pg';

async function checkCategories() {
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
    SELECT id, name, slug
    FROM category
    ORDER BY name
  `);

  console.log('\n=== Available Categories ===\n');
  result.rows.forEach((row, index) => {
    console.log(
      `[${index + 1}] ${row.name} (slug: ${row.slug}, id: ${row.id})`,
    );
  });

  await client.end();
}

checkCategories().catch(console.error);
