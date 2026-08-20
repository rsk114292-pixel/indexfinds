const { Client } = require('pg');
const { MeiliSearch } = require('meilisearch');

const apply = process.argv.includes('--apply');
const verifyOnly = process.argv.includes('--verify-only');
const canaryUid = `products_grouping_canary_${Date.now()}`;
const batchSize = 1000;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function main() {
  const database = new Client({
    host: required('DB_HOST'),
    port: Number(process.env.DB_PORT || 5432),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  const meili = new MeiliSearch({
    host: required('MEILISEARCH_HOST'),
    apiKey: required('MEILISEARCH_API_KEY'),
  });

  await database.connect();
  try {
    if (verifyOnly) {
      const { rows } = await database.query(`
        SELECT COUNT(DISTINCT COALESCE("productGroupId"::text, id::text))::int AS count
        FROM products
        WHERE status = 'active'
      `);
      const expectedGroups = Number(rows[0].count);
      const result = await meili.index('products').search('', {
        filter: 'status = "active"',
        distinct: 'productGroupId',
        page: 1,
        hitsPerPage: 100,
      });
      const uniqueGroups = new Set(result.hits.map((hit) => hit.productGroupId))
        .size;
      if (
        result.totalHits !== expectedGroups ||
        uniqueGroups !== result.hits.length
      ) {
        throw new Error(
          `Production verification mismatch: expected=${expectedGroups} total=${result.totalHits} hits=${result.hits.length} unique=${uniqueGroups}`,
        );
      }
      console.log(
        `VERIFY_OK groups=${result.totalHits} pageHits=${result.hits.length} unique=${uniqueGroups}`,
      );
      return;
    }

    const { rows: canaryRows } = await database.query(`
      WITH largest_groups AS (
        SELECT COALESCE("productGroupId"::text, id::text) AS group_key
        FROM products
        WHERE status = 'active'
        GROUP BY 1
        ORDER BY COUNT(*) DESC
        LIMIT 5
      )
      SELECT p.id::text AS id,
             COALESCE(p."productGroupId"::text, p.id::text) AS "productGroupId",
             p.status,
             p.title
      FROM products p
      JOIN largest_groups g
        ON g.group_key = COALESCE(p."productGroupId"::text, p.id::text)
      WHERE p.status = 'active'
      ORDER BY "productGroupId", p."createdAt"
    `);

    const expectedCanaryGroups = new Set(
      canaryRows.map((row) => row.productGroupId),
    ).size;
    await meili
      .createIndex(canaryUid, { primaryKey: 'id' })
      .waitTask({ timeOutMs: 120000 });
    const canary = meili.index(canaryUid);
    await canary
      .updateFilterableAttributes(['status', 'productGroupId'])
      .waitTask({ timeOutMs: 120000 });
    await canary.addDocuments(canaryRows).waitTask({ timeOutMs: 120000 });
    const canaryResult = await canary.search('', {
      filter: 'status = "active"',
      distinct: 'productGroupId',
      page: 1,
      hitsPerPage: 100,
    });

    if (canaryResult.totalHits !== expectedCanaryGroups) {
      throw new Error(
        `Canary mismatch: expected ${expectedCanaryGroups}, got ${canaryResult.totalHits}`,
      );
    }
    console.log(
      `CANARY_OK documents=${canaryRows.length} groups=${expectedCanaryGroups}`,
    );

    if (!apply) {
      console.log('DRY_RUN_OK rerun with --apply to update the products index');
      return;
    }

    const { rows } = await database.query(`
      SELECT id::text AS id,
             COALESCE("productGroupId"::text, id::text) AS "productGroupId"
      FROM products
      WHERE status = 'active'
      ORDER BY id
    `);
    const expectedGroups = new Set(rows.map((row) => row.productGroupId)).size;
    const products = meili.index('products');
    const currentFilters = await products.getFilterableAttributes();
    if (!currentFilters.includes('productGroupId')) {
      await products
        .updateFilterableAttributes([...currentFilters, 'productGroupId'])
        .waitTask({ timeOutMs: 120000 });
    }

    for (let offset = 0; offset < rows.length; offset += batchSize) {
      await products
        .updateDocuments(rows.slice(offset, offset + batchSize))
        .waitTask({ timeOutMs: 120000 });
      console.log(
        `UPDATED ${Math.min(offset + batchSize, rows.length)}/${rows.length}`,
      );
    }

    const result = await products.search('', {
      filter: 'status = "active"',
      distinct: 'productGroupId',
      page: 1,
      hitsPerPage: 100,
    });
    if (result.totalHits !== expectedGroups) {
      throw new Error(
        `Production verification mismatch: expected ${expectedGroups}, got ${result.totalHits}`,
      );
    }
    console.log(`APPLY_OK documents=${rows.length} groups=${expectedGroups}`);
  } finally {
    await meili.deleteIndexIfExists(canaryUid);
    await database.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
