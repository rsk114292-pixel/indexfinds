import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { ProductStatusService } from '../products/product-status.service';

interface CliOptions {
  apply: boolean;
  limit?: number;
  groupLimit?: number;
}

interface CandidateRow {
  id: string;
  productGroupId: string;
  title: string;
  aiBrandName: string | null;
  categoryName: string;
  categorySlug: string;
  weidianShopName: string | null;
  createdAt: Date;
  cohort: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { apply: false };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      const value = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.limit = value;
      }
      continue;
    }

    if (arg.startsWith('--group-limit=')) {
      const value = Number.parseInt(arg.slice('--group-limit='.length), 10);
      if (Number.isFinite(value) && value > 0) {
        options.groupLimit = value;
      }
    }
  }

  return options;
}

function printUsage() {
  console.log(
    [
      '用法:',
      '  pnpm sku-split:fastlane',
      '  pnpm sku-split:fastlane -- --group-limit=100',
      '  pnpm sku-split:fastlane:apply',
      '  pnpm sku-split:fastlane -- --apply --limit=500 --group-limit=50',
    ].join('\n'),
  );
}

async function fetchCandidates(
  dataSource: DataSource,
  options: CliOptions,
): Promise<CandidateRow[]> {
  const params: Array<number> = [];
  const groupLimitSql = (() => {
    if (!options.groupLimit) return '';
    params.push(options.groupLimit);
    return `LIMIT $${params.length}`;
  })();

  const itemLimitSql = (() => {
    if (!options.limit) return '';
    params.push(options.limit);
    return `LIMIT $${params.length}`;
  })();

  return dataSource.query(
    `
      WITH eligible_groups AS (
        SELECT
          p."productGroupId",
          MIN(p."createdAt") AS "firstCreatedAt"
        FROM products p
        JOIN category c ON c.id = p."primaryCategoryId"
        WHERE p.status = 'pending_review'
          AND p."skuVariantKey" IS NOT NULL
          AND p."productGroupId" IS NOT NULL
          AND COALESCE(p."potentialMixedProduct", false) = false
        GROUP BY p."productGroupId"
        HAVING BOOL_AND(p."brandId" IS NOT NULL)
          AND BOOL_AND(COALESCE(p."aiBrandName", '') <> '')
          AND COUNT(DISTINCT p."brandId") = 1
          AND COUNT(DISTINCT p."primaryCategoryId") = 1
          AND BOOL_AND(
            NOT EXISTS (
              SELECT 1
              FROM category child
              WHERE child."parentId" = c.id
            )
          )
        ORDER BY MIN(p."createdAt") ASC
        ${groupLimitSql}
      ),
      group_fast_lane AS (
        SELECT
          p.id,
          'group_consistent_leaf'::text AS cohort
        FROM products p
        JOIN eligible_groups g ON g."productGroupId" = p."productGroupId"
        WHERE p.status = 'pending_review'
          AND p."skuVariantKey" IS NOT NULL
      ),
      design_direct_release AS (
        SELECT
          p.id,
          'design_leaf_brand_only'::text AS cohort
        FROM products p
        JOIN category c ON c.id = p."primaryCategoryId"
        WHERE p.status = 'pending_review'
          AND p."skuVariantKey" IS NOT NULL
          AND COALESCE(p."potentialMixedProduct", false) = false
          AND LOWER(COALESCE(p."aiBrandName", '')) = 'design'
          AND NOT EXISTS (
            SELECT 1
            FROM category child
            WHERE child."parentId" = c.id
          )
          AND EXISTS (
            SELECT 1
            FROM sku_split_items s
            CROSS JOIN LATERAL jsonb_array_elements(s."processingLog"::jsonb) evt
            WHERE s."productId" = p.id
              AND evt->>'event' = '发布判定完成'
              AND jsonb_array_length(
                COALESCE(evt->'data'->'reviewReasons', '[]'::jsonb)
              ) = 1
              AND evt->'data'->'reviewReasons'->>0 = '品牌缺失且标题过于泛化'
          )
      ),
      casual_set_context_fuzzy AS (
        SELECT
          p.id,
          'casual_set_context_fuzzy'::text AS cohort
        FROM products p
        JOIN category c ON c.id = p."primaryCategoryId"
        JOIN sku_split_items s ON s."productId" = p.id
        WHERE p.status = 'pending_review'
          AND p."skuVariantKey" IS NOT NULL
          AND COALESCE(p."potentialMixedProduct", false) = false
          AND c.slug = 'casual-set'
          AND NOT EXISTS (
            SELECT 1
            FROM category child
            WHERE child."parentId" = c.id
          )
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(s."processingLog"::jsonb) evt
            WHERE evt->>'event' = '分类解析完成'
              AND evt->'data'->>'matchType' = 'fuzzy'
              AND COALESCE((evt->'data'->>'resolvedByContext')::boolean, false) = true
              AND COALESCE((evt->'data'->>'score')::int, 0) >= 160
          )
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(s."processingLog"::jsonb) evt
            WHERE evt->>'event' = '发布判定完成'
              AND jsonb_array_length(
                COALESCE(evt->'data'->'reviewReasons', '[]'::jsonb)
              ) = 1
              AND evt->'data'->'reviewReasons'->>0 = '分类仅通过模糊匹配命中'
          )
      ),
      combined_candidates AS (
        SELECT id, cohort, 1 AS priority FROM group_fast_lane
        UNION ALL
        SELECT id, cohort, 2 AS priority FROM design_direct_release
        UNION ALL
        SELECT id, cohort, 3 AS priority FROM casual_set_context_fuzzy
      ),
      deduped_candidates AS (
        SELECT DISTINCT ON (id)
          id,
          cohort,
          priority
        FROM combined_candidates
        ORDER BY id, priority
      )
      SELECT
        p.id,
        p."productGroupId",
        p.title,
        p."aiBrandName",
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        p."weidianShopName",
        p."createdAt",
        d.cohort
      FROM products p
      JOIN deduped_candidates d ON d.id = p.id
      LEFT JOIN eligible_groups g ON g."productGroupId" = p."productGroupId"
      JOIN category c ON c.id = p."primaryCategoryId"
      WHERE p.status = 'pending_review'
        AND p."skuVariantKey" IS NOT NULL
      ORDER BY
        COALESCE(g."firstCreatedAt", p."createdAt") ASC,
        p."productGroupId" ASC,
        p."createdAt" ASC
      ${itemLimitSql}
    `,
    params,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (process.argv.includes('--help')) {
    printUsage();
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);
    const productStatusService = app.get(ProductStatusService);
    const candidates = await fetchCandidates(dataSource, options);

    const uniqueGroups = new Set(candidates.map((row) => row.productGroupId));

    console.log(
      `候选商品 ${candidates.length} 条，候选分组 ${uniqueGroups.size} 组`,
    );

    if (candidates.length === 0) {
      console.log('没有命中安全快车道候选。');
      return;
    }

    const preview = candidates.slice(0, 10).map((row) => ({
      cohort: row.cohort,
      id: row.id,
      productGroupId: row.productGroupId,
      brand: row.aiBrandName,
      category: row.categorySlug,
      shop: row.weidianShopName,
      title: row.title,
    }));
    console.table(preview);

    if (!options.apply) {
      console.log('当前为 dry-run，未做任何写入。传 --apply 才会执行审核通过。');
      return;
    }

    let success = 0;
    const failed: Array<{ id: string; reason: string }> = [];

    for (const candidate of candidates) {
      try {
        await productStatusService.approveProduct(candidate.id);
        success += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ id: candidate.id, reason: message });
      }
    }

    console.log(`执行完成: 成功 ${success} 条, 失败 ${failed.length} 条`);
    if (failed.length > 0) {
      console.table(failed.slice(0, 20));
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('执行失败:', error);
  process.exit(1);
});
