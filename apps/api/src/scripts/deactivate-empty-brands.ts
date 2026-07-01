import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import {
  assertDangerousBrandMaintenanceAllowed,
  clearBrandCache,
  createDataSource,
  parseCliArgs,
} from './lib/bulk-brand-merge';

dotenv.config();

interface EmptyBrandCandidate {
  id: string;
  name: string;
  slug: string;
  tier: number;
  activeCount: number;
  pendingReviewCount: number;
  outOfStockCount: number;
  draftCount: number;
}

interface IdManifest {
  generatedAt?: string;
  source?: string;
  brands: Array<{ id: string; name?: string; slug?: string }>;
}

function usage(): string {
  return `
用法:
  npm run brands:deactivate-empty -- [--tier=3] [--ids-file=./path/to/manifest.json]
                                   [--limit=50] [--output=./tmp/empty-brand-run.json]
                                   [--no-cache-clear] [--apply]

说明:
  默认只 dry-run，不会写入数据库。
  如果提供 --ids-file，会先以 manifest 限定候选范围，再校验这些品牌当前仍满足空品牌停用条件。
  只有显式传入 --apply 才会把品牌状态更新为 inactive。
  当环境看起来像 production 或连接远程数据库时，还必须设置 ALLOW_PROD_BRAND_MAINTENANCE=true。
`.trim();
}

function readIdsFile(filePath: string | undefined): Set<string> | null {
  if (!filePath) {
    return null;
  }

  const resolvedPath = path.resolve(filePath);
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as IdManifest;
  const ids = new Set(
    (parsed.brands || [])
      .map((item) => item.id)
      .filter((item): item is string => Boolean(item)),
  );

  return ids;
}

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

async function queryEmptyBrandCandidates(tier?: number) {
  const dataSource = createDataSource();
  await dataSource.initialize();

  try {
    const rows = (await dataSource.query(
      `
        WITH brand_stats AS (
          SELECT
            b.id,
            b.name,
            b.slug,
            COALESCE(b.tier, 0) AS tier,
            COALESCE(b."isFeatured", false) AS "isFeatured",
            b."parentId" AS "parentId",
            b."logoUrl" AS "logoUrl",
            b.description,
            (
              SELECT COUNT(*)::int
              FROM brands child
              WHERE child."parentId" = b.id
                AND child.status = 'active'
            ) AS "activeChildCount",
            COUNT(*) FILTER (WHERE p.status = 'active')::int AS "activeCount",
            COUNT(*) FILTER (WHERE p.status = 'pending_review')::int AS "pendingReviewCount",
            COUNT(*) FILTER (WHERE p.status = 'out_of_stock')::int AS "outOfStockCount",
            COUNT(*) FILTER (WHERE p.status = 'draft')::int AS "draftCount"
          FROM brands b
          LEFT JOIN products p ON p."brandId" = b.id
          WHERE b.status = 'active'
          GROUP BY
            b.id,
            b.name,
            b.slug,
            b.tier,
            b."isFeatured",
            b."parentId",
            b."logoUrl",
            b.description
        )
        SELECT
          id,
          name,
          slug,
          tier,
          "activeCount",
          "pendingReviewCount",
          "outOfStockCount",
          "draftCount"
        FROM brand_stats
        WHERE name <> 'Design'
          AND "isFeatured" = false
          AND tier NOT IN (1, 2)
          AND "activeChildCount" = 0
          AND "parentId" IS NULL
          AND ("logoUrl" IS NULL OR btrim("logoUrl") = '')
          AND (description IS NULL OR btrim(description) = '')
          AND "activeCount" = 0
          AND "pendingReviewCount" = 0
          AND "outOfStockCount" = 0
          AND "draftCount" = 0
          AND ($1::int IS NULL OR tier = $1::int)
        ORDER BY name ASC
      `,
      [tier ?? null],
    )) as Array<Record<string, unknown>>;

    return rows.map(
      (row) =>
        ({
          id: String(row.id),
          name: String(row.name),
          slug: String(row.slug),
          tier: toNumber(row.tier),
          activeCount: toNumber(row.activeCount),
          pendingReviewCount: toNumber(row.pendingReviewCount),
          outOfStockCount: toNumber(row.outOfStockCount),
          draftCount: toNumber(row.draftCount),
        }) satisfies EmptyBrandCandidate,
    );
  } finally {
    await dataSource.destroy();
  }
}

async function deactivateBrands(ids: string[]) {
  const dataSource = createDataSource();
  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const updated = (await queryRunner.query(
      `
        UPDATE brands
        SET status = 'inactive',
            "updatedAt" = NOW()
        WHERE id = ANY($1::uuid[])
          AND status = 'active'
        RETURNING id, name, slug, status
      `,
      [ids],
    )) as Array<{ id: string; name: string; slug: string; status: string }>;

    await queryRunner.commitTransaction();
    return updated;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.hasFlag('help')) {
    console.log(usage());
    return;
  }

  const tierValue = args.getValue('tier');
  const tier =
    tierValue !== undefined && Number.isFinite(Number(tierValue))
      ? Number(tierValue)
      : undefined;
  const limitValue = args.getValue('limit');
  const limit =
    limitValue !== undefined && Number.isFinite(Number(limitValue))
      ? Number(limitValue)
      : undefined;
  const idsFile = args.getValue('ids-file');
  const outputPath = args.getValue('output');
  const apply = args.hasFlag('apply');
  const clearCacheAfterApply = !args.hasFlag('no-cache-clear');
  const manifestIds = readIdsFile(idsFile);

  const allCandidates = await queryEmptyBrandCandidates(tier);
  const candidates = manifestIds
    ? allCandidates.filter((item) => manifestIds.has(item.id))
    : allCandidates;
  const limitedCandidates =
    limit && limit > 0 ? candidates.slice(0, limit) : candidates;

  console.log(`空品牌候选总数: ${allCandidates.length}`);
  if (manifestIds) {
    console.log(`manifest 限定后候选数: ${candidates.length}`);
  }
  console.log(`本次目标数: ${limitedCandidates.length}`);

  if (limitedCandidates.length > 0) {
    console.table(
      limitedCandidates.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        tier: item.tier,
      })),
    );
  }

  if (!apply) {
    console.log('\n当前为 dry-run。追加 --apply 才会真正停用这些品牌。');
    if (outputPath) {
      const resolvedPath = path.resolve(outputPath);
      fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
      fs.writeFileSync(
        resolvedPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            tier: tier ?? null,
            idsFile: idsFile ?? null,
            count: limitedCandidates.length,
            brands: limitedCandidates,
          },
          null,
          2,
        ),
        'utf8',
      );
      console.log(`已写出 dry-run 结果: ${resolvedPath}`);
    }
    return;
  }

  if (limitedCandidates.length === 0) {
    console.log('没有符合条件的空品牌，未执行写入。');
    return;
  }

  assertDangerousBrandMaintenanceAllowed('空品牌停用');

  const updated = await deactivateBrands(limitedCandidates.map((item) => item.id));
  console.log(`已停用品牌数: ${updated.length}`);

  let clearedKeys = 0;
  if (clearCacheAfterApply) {
    try {
      clearedKeys = await clearBrandCache();
      console.log(`已清理品牌缓存键: ${clearedKeys}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`品牌缓存清理失败: ${message}`);
    }
  }

  if (outputPath) {
    const resolvedPath = path.resolve(outputPath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(
      resolvedPath,
      JSON.stringify(
        {
          executedAt: new Date().toISOString(),
          tier: tier ?? null,
          idsFile: idsFile ?? null,
          updatedCount: updated.length,
          clearedBrandCacheKeys: clearedKeys,
          updated,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`已写出执行结果: ${resolvedPath}`);
  }
}

main().catch((error) => {
  console.error('空品牌停用脚本失败:', error);
  process.exit(1);
});
