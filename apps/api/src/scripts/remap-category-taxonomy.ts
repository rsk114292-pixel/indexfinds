import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const REMAP_PLAN: Record<string, string> = {
  hoodies: 'hoodie',
  sweaters: 'sweater',
  'down-jackets': 'down-jacket',
  't-shirts': 't-shirt',
  joggers: 'sweatpants',
  vests: 'vest',
  cardigans: 'cardigan',
  jackets: 'jacket',
  'bucket-hats': 'bucket-hat',
};

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
}

interface ProductRow {
  id: string;
}

function parseApplyFlag(): boolean {
  return process.argv.includes('--apply') || process.env.APPLY === '1';
}

function printHeader(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function getCategoryBySlug(
  ds: DataSource,
  slug: string,
): Promise<CategoryRow | null> {
  const rows = (await ds.query(
    `
      SELECT id, name, slug
      FROM category
      WHERE slug = $1
      LIMIT 1
    `,
    [slug],
  )) as CategoryRow[];

  return rows[0] ?? null;
}

async function hasActiveChildren(ds: DataSource, categoryId: string): Promise<boolean> {
  const rows = (await ds.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM category
        WHERE "parentId" = $1
          AND "isActive" = true
      ) AS "exists"
    `,
    [categoryId],
  )) as Array<{ exists: boolean }>;

  return rows[0]?.exists ?? false;
}

async function getAncestorIds(ds: DataSource, categoryId: string): Promise<string[]> {
  const rows = (await ds.query(
    `
      SELECT id_ancestor AS id
      FROM category_closure
      WHERE id_descendant = $1
    `,
    [categoryId],
  )) as Array<{ id: string }>;

  return rows.map((row) => row.id);
}

async function getPrimaryProducts(
  ds: DataSource,
  categoryId: string,
): Promise<ProductRow[]> {
  return (await ds.query(
    `
      SELECT id
      FROM products
      WHERE "primaryCategoryId" = $1
    `,
    [categoryId],
  )) as ProductRow[];
}

async function getSecondaryCount(
  ds: DataSource,
  categoryId: string,
): Promise<number> {
  const rows = (await ds.query(
    `
      SELECT COUNT(*)::int AS count
      FROM product_secondary_categories
      WHERE "categoryId" = $1
    `,
    [categoryId],
  )) as Array<{ count: number }>;

  return rows[0]?.count ?? 0;
}

async function main() {
  const apply = parseApplyFlag();
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  });

  await ds.initialize();

  try {
    printHeader(apply ? 'Category Remap Apply' : 'Category Remap Dry Run');
    console.log(`Mappings configured: ${Object.keys(REMAP_PLAN).length}`);

    const resolvedMappings: Array<{
      source: CategoryRow;
      target: CategoryRow;
      primaryProducts: ProductRow[];
      secondaryCount: number;
      ancestorIds: string[];
    }> = [];

    for (const [sourceSlug, targetSlug] of Object.entries(REMAP_PLAN)) {
      const source = await getCategoryBySlug(ds, sourceSlug);
      const target = await getCategoryBySlug(ds, targetSlug);

      if (!source || !target) {
        console.log(
          `- skipped ${sourceSlug} -> ${targetSlug}: ${!source ? 'missing source' : 'missing target'}`,
        );
        continue;
      }

      if (await hasActiveChildren(ds, target.id)) {
        console.log(
          `- skipped ${sourceSlug} -> ${targetSlug}: target category is not a leaf`,
        );
        continue;
      }

      const [primaryProducts, secondaryCount, ancestorIds] = await Promise.all([
        getPrimaryProducts(ds, source.id),
        getSecondaryCount(ds, source.id),
        getAncestorIds(ds, target.id),
      ]);

      resolvedMappings.push({
        source,
        target,
        primaryProducts,
        secondaryCount,
        ancestorIds,
      });
    }

    printHeader('Planned Changes');
    for (const mapping of resolvedMappings) {
      console.log(
        `- ${mapping.source.slug} -> ${mapping.target.slug} | primary=${mapping.primaryProducts.length}, secondary=${mapping.secondaryCount}`,
      );
    }

    const touchedPrimary = resolvedMappings.reduce(
      (sum, mapping) => sum + mapping.primaryProducts.length,
      0,
    );
    const touchedSecondary = resolvedMappings.reduce(
      (sum, mapping) => sum + mapping.secondaryCount,
      0,
    );

    printHeader('Summary');
    console.log(`Primary category updates planned: ${touchedPrimary}`);
    console.log(`Secondary category replacements planned: ${touchedSecondary}`);

    if (!apply) {
      console.log('\nDry run only. Re-run with `npm run remap:categories:apply` to write changes.');
      return;
    }

    await ds.transaction(async (trx) => {
      for (const mapping of resolvedMappings) {
        const productIds = mapping.primaryProducts.map((product) => product.id);

        if (productIds.length > 0) {
          await trx.query(
            `
              UPDATE products
              SET "primaryCategoryId" = $1
              WHERE "primaryCategoryId" = $2
            `,
            [mapping.target.id, mapping.source.id],
          );

          // 清理这些商品在 secondary 中残留的旧分类，并补齐新主分类祖先链。
          await trx.query(
            `
              DELETE FROM product_secondary_categories
              WHERE "productId" = ANY($1::uuid[])
                AND "categoryId" = $2
            `,
            [productIds, mapping.source.id],
          );

          for (const ancestorId of mapping.ancestorIds) {
            await trx.query(
              `
                INSERT INTO product_secondary_categories ("productId", "categoryId")
                SELECT unnest($1::uuid[]), $2
                ON CONFLICT DO NOTHING
              `,
              [productIds, ancestorId],
            );
          }
        }

        // 处理所有 secondary category 中的 legacy 引用。
        await trx.query(
          `
            INSERT INTO product_secondary_categories ("productId", "categoryId")
            SELECT "productId", $1
            FROM product_secondary_categories
            WHERE "categoryId" = $2
            ON CONFLICT DO NOTHING
          `,
          [mapping.target.id, mapping.source.id],
        );

        await trx.query(
          `
            DELETE FROM product_secondary_categories
            WHERE "categoryId" = $1
          `,
          [mapping.source.id],
        );
      }
    });

    console.log('\n✅ Category remap applied successfully.');
    console.log('建议下一步重新运行 `npm run audit:categories` 复核残留项。');
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error('❌ 分类映射失败:', error);
  process.exit(1);
});
