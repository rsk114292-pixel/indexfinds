const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
const { MeiliSearch } = require('meilisearch');

const apply = process.argv.includes('--apply');
const canaryArg = process.argv.find((arg) => arg.startsWith('--canary='));
const canarySize = canaryArg ? Number(canaryArg.split('=')[1]) : null;
const backupDir = process.env.BACKUP_DIR;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sqlLiteral(value) {
  if (value == null) return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeBackup(payload) {
  if (!backupDir) throw new Error('BACKUP_DIR is required for --apply');
  fs.mkdirSync(backupDir, { recursive: true });
  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const productValues = payload.products
    .map(
      (row) =>
        `(${sqlLiteral(row.id)}::uuid, ${sqlLiteral(row.productGroupId)}::uuid, ${sqlLiteral(row.updatedAt)}::timestamp)`,
    )
    .join(',\n  ');
  const jobValues = payload.jobs
    .map(
      (row) =>
        `(${sqlLiteral(row.id)}::uuid, ${sqlLiteral(row.productGroupId)}::uuid, ${sqlLiteral(row.updatedAt)}::timestamp)`,
    )
    .join(',\n  ');
  const rollback = `BEGIN;
UPDATE products AS p
SET "productGroupId" = backup.group_id,
    "updatedAt" = backup.updated_at
FROM (VALUES
  ${productValues}
) AS backup(id, group_id, updated_at)
WHERE p.id = backup.id;

UPDATE sku_split_jobs AS j
SET "productGroupId" = backup.group_id,
    "updatedAt" = backup.updated_at
FROM (VALUES
  ${jobValues}
) AS backup(id, group_id, updated_at)
WHERE j.id = backup.id;
COMMIT;
`;
  const jsonPath = path.join(backupDir, 'before.json');
  const rollbackPath = path.join(backupDir, 'rollback.sql');
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(rollbackPath, rollback);
  const checksums = [jsonPath, rollbackPath]
    .map((file) => {
      const digest = crypto
        .createHash('sha256')
        .update(fs.readFileSync(file))
        .digest('hex');
      return `${digest}  ${path.basename(file)}`;
    })
    .join('\n');
  fs.writeFileSync(path.join(backupDir, 'SHA256SUMS'), `${checksums}\n`);
}

async function loadMappings(database) {
  const { rows } = await database.query(`
    WITH group_stats AS (
      SELECT "splitSourceWeidianId" AS source_id,
             "productGroupId" AS group_id,
             COUNT(*)::int AS active_count,
             MIN("createdAt") AS first_created
      FROM products
      WHERE status = 'active'
        AND "isFromSplit" = true
        AND "splitSourceWeidianId" IS NOT NULL
        AND "productGroupId" IS NOT NULL
      GROUP BY 1, 2
    ), fragmented AS (
      SELECT source_id
      FROM group_stats
      GROUP BY source_id
      HAVING COUNT(*) = 2
    )
    SELECT stats.source_id AS "sourceId",
           stats.group_id::text AS "groupId",
           stats.active_count AS "activeCount",
           stats.first_created AS "firstCreated"
    FROM group_stats stats
    JOIN fragmented USING (source_id)
    ORDER BY stats.source_id, stats.first_created, stats.group_id
  `);

  const bySource = new Map();
  for (const row of rows) {
    const values = bySource.get(row.sourceId) || [];
    values.push(row);
    bySource.set(row.sourceId, values);
  }

  const mappings = [...bySource.entries()].map(([sourceId, groups]) => ({
    sourceId,
    canonicalGroupId: groups[0].groupId,
    secondaryGroupId: groups[1].groupId,
    activeProducts: groups.reduce((sum, group) => sum + group.activeCount, 0),
  }));

  if (mappings.length === 0) return [];
  const sources = mappings.map((mapping) => mapping.sourceId);
  const { rows: safetyRows } = await database.query(
    `SELECT "splitSourceWeidianId" AS "sourceId",
            COUNT(DISTINCT "productGroupId")::int AS "allGroupCount",
            COUNT(*) FILTER (WHERE status = 'active')::int AS "activeProducts",
            COUNT(DISTINCT "skuVariantKey") FILTER (WHERE status = 'active')::int AS "activeSkuKeys"
     FROM products
     WHERE "splitSourceWeidianId" = ANY($1::varchar[])
       AND "isFromSplit" = true
     GROUP BY 1`,
    [sources],
  );
  const safeBySource = new Map(
    safetyRows.map((row) => [
      row.sourceId,
      row.allGroupCount === 2 && row.activeProducts === row.activeSkuKeys,
    ]),
  );
  return mappings.filter((mapping) => safeBySource.get(mapping.sourceId));
}

async function verifyCatalogCount(database, meili) {
  const { rows } = await database.query(`
    SELECT COUNT(DISTINCT COALESCE("productGroupId"::text, id::text))::int AS count
    FROM products
    WHERE status = 'active'
  `);
  const expected = Number(rows[0].count);
  const result = await meili.index('products').search('', {
    filter: 'status = "active"',
    distinct: 'productGroupId',
    page: 1,
    hitsPerPage: 100,
  });
  if (result.totalHits !== expected) {
    throw new Error(
      `Catalog count mismatch: db=${expected} meili=${result.totalHits}`,
    );
  }
  return expected;
}

async function main() {
  if (canarySize != null && (!Number.isInteger(canarySize) || canarySize < 1)) {
    throw new Error('--canary must be a positive integer');
  }
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
    const candidates = await loadMappings(database);
    const selected = [...candidates]
      .sort((a, b) => a.activeProducts - b.activeProducts)
      .slice(0, canarySize || candidates.length);
    const selectedProducts = selected.reduce(
      (sum, mapping) => sum + mapping.activeProducts,
      0,
    );
    console.log(
      `PLAN candidates=${candidates.length} selected=${selected.length} activeProducts=${selectedProducts}`,
    );
    if (!apply || selected.length === 0) return;

    const sources = selected.map((mapping) => mapping.sourceId);
    const { rows: products } = await database.query(
      `SELECT id::text AS id,
              "productGroupId"::text AS "productGroupId",
              "updatedAt" AS "updatedAt"
       FROM products
       WHERE "splitSourceWeidianId" = ANY($1::varchar[])
       ORDER BY id`,
      [sources],
    );
    const groupIds = selected.flatMap((mapping) => [
      mapping.canonicalGroupId,
      mapping.secondaryGroupId,
    ]);
    const { rows: jobs } = await database.query(
      `SELECT id::text AS id,
              "productGroupId"::text AS "productGroupId",
              "updatedAt" AS "updatedAt"
       FROM sku_split_jobs
       WHERE "productGroupId" = ANY($1::uuid[])
       ORDER BY id`,
      [groupIds],
    );
    writeBackup({
      createdAt: new Date().toISOString(),
      mappings: selected,
      products,
      jobs,
    });

    await database.query('BEGIN');
    let updatedProducts;
    try {
      const productUpdate = await database.query(
        `UPDATE products AS p
         SET "productGroupId" = mapping.canonical_group_id::uuid,
             "updatedAt" = NOW()
         FROM json_to_recordset($1::json) AS mapping(
           source_id varchar,
           secondary_group_id varchar,
           canonical_group_id varchar
         )
         WHERE p."splitSourceWeidianId" = mapping.source_id
           AND p."productGroupId" = mapping.secondary_group_id::uuid
         RETURNING p.id::text AS id, p.status`,
        [
          JSON.stringify(
            selected.map((mapping) => ({
              source_id: mapping.sourceId,
              secondary_group_id: mapping.secondaryGroupId,
              canonical_group_id: mapping.canonicalGroupId,
            })),
          ),
        ],
      );
      updatedProducts = productUpdate.rows;
      await database.query(
        `UPDATE sku_split_jobs AS job
         SET "productGroupId" = mapping.canonical_group_id::uuid,
             "updatedAt" = NOW()
         FROM json_to_recordset($1::json) AS mapping(
           secondary_group_id varchar,
           canonical_group_id varchar
         )
         WHERE job."productGroupId" = mapping.secondary_group_id::uuid`,
        [
          JSON.stringify(
            selected.map((mapping) => ({
              secondary_group_id: mapping.secondaryGroupId,
              canonical_group_id: mapping.canonicalGroupId,
            })),
          ),
        ],
      );
      await database.query('COMMIT');
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }

    const groupBySource = new Map(
      selected.map((mapping) => [mapping.sourceId, mapping.canonicalGroupId]),
    );
    const sourceByProduct = new Map(
      products.map((product) => [product.id, product.productGroupId]),
    );
    const oldGroupToSource = new Map();
    for (const mapping of selected) {
      oldGroupToSource.set(mapping.canonicalGroupId, mapping.sourceId);
      oldGroupToSource.set(mapping.secondaryGroupId, mapping.sourceId);
    }
    const documents = updatedProducts
      .filter((product) => product.status === 'active')
      .map((product) => {
        const sourceId = oldGroupToSource.get(sourceByProduct.get(product.id));
        return { id: product.id, productGroupId: groupBySource.get(sourceId) };
      });
    if (documents.length > 0) {
      await meili
        .index('products')
        .updateDocuments(documents)
        .waitTask({ timeOutMs: 120000 });
    }

    const { rows: verification } = await database.query(
      `SELECT "splitSourceWeidianId" AS "sourceId",
              COUNT(DISTINCT "productGroupId")::int AS groups
       FROM products
       WHERE "splitSourceWeidianId" = ANY($1::varchar[])
       GROUP BY 1`,
      [sources],
    );
    if (verification.some((row) => row.groups !== 1)) {
      throw new Error('Post-merge verification found a fragmented source');
    }
    const catalogGroups = await verifyCatalogCount(database, meili);
    console.log(
      `APPLY_OK sources=${selected.length} updatedProducts=${updatedProducts.length} catalogGroups=${catalogGroups}`,
    );
  } finally {
    await database.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
