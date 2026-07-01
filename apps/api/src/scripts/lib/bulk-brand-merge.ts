import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

dotenv.config();

export const DEFAULT_COUNT_STATUSES = [
  'active',
  'pending_review',
  'out_of_stock',
] as const;

export const DEFAULT_EXCLUDED_TIERS = [1, 2];

type NullableString = string | null | undefined;

const PRODUCTION_ENV_VALUES = new Set(['prod', 'production']);
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface BulkMergeConfig {
  targetBrandName?: string;
  targetBrandSlug?: string;
  threshold: number;
  minOperationalCount: number;
  countStatuses: string[];
  excludedTiers: number[];
  excludeFeatured: boolean;
  excludeParentBrands: boolean;
  excludeChildBrands: boolean;
  excludeBrandsWithPendingReview: boolean;
  excludeBrandsWithLogo: boolean;
  excludeBrandsWithDescription: boolean;
  excludeNames: string[];
}

export interface BrandCandidateRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: number | null;
  isFeatured: boolean;
  parentId: string | null;
  logoUrl: string | null;
  description: string | null;
  activeChildCount: number;
  activeCount: number;
  pendingReviewCount: number;
  outOfStockCount: number;
  draftCount: number;
  inactiveCount: number;
  splitCount: number;
  operationalCount: number;
  exclusionReasons: string[];
  mergeCandidate: boolean;
}

export interface MergePreviewReport {
  generatedAt: string;
  targetBrand: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  config: BulkMergeConfig;
  totalBrands: number;
  candidateCount: number;
  excludedCount: number;
  reasonCounts: Record<string, number>;
  candidates: BrandCandidateRow[];
  excluded: BrandCandidateRow[];
}

export interface MergeExecutionResult {
  sourceBrandId: string;
  sourceBrandName: string;
  targetBrandId: string;
  targetBrandName: string;
  movedProductCount: number;
  movedChildBrandCount: number;
  mergedAliases: string[];
}

type RawBrandRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  tier: number | null;
  isFeatured: boolean;
  parentId: string | null;
  logoUrl: string | null;
  description: string | null;
  activeChildCount: number | string;
  activeCount: number | string;
  pendingReviewCount: number | string;
  outOfStockCount: number | string;
  draftCount: number | string;
  inactiveCount: number | string;
  splitCount: number | string;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function hasText(value: NullableString): boolean {
  return Boolean(value && value.trim());
}

export function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseNumberCsv(value: string | undefined): number[] {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

export function parseCliArgs(argv: string[]) {
  const flags = new Set<string>();
  const values = new Map<string, string>();

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      continue;
    }

    const body = arg.slice(2);
    const eqIndex = body.indexOf('=');
    if (eqIndex === -1) {
      flags.add(body);
      continue;
    }

    const key = body.slice(0, eqIndex);
    const value = body.slice(eqIndex + 1);
    values.set(key, value);
  }

  return {
    hasFlag(flag: string) {
      return flags.has(flag);
    },
    getValue(key: string) {
      return values.get(key);
    },
  };
}

export function createBulkMergeConfig(argv: string[]): {
  config: BulkMergeConfig;
  options: {
    help: boolean;
    apply: boolean;
    json: boolean;
    outputPath?: string;
    limit?: number;
    continueOnError: boolean;
    clearCache: boolean;
  };
} {
  const args = parseCliArgs(argv);
  const threshold = Number(args.getValue('threshold') ?? '10');
  const minOperationalCount = Number(
    args.getValue('min-operational-count') ?? '0',
  );
  const limit = args.getValue('limit');

  return {
    config: {
      targetBrandName: args.getValue('target-name') ?? 'Design',
      targetBrandSlug: args.getValue('target-slug'),
      threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : 10,
      minOperationalCount:
        Number.isFinite(minOperationalCount) && minOperationalCount >= 0
          ? minOperationalCount
          : 0,
      countStatuses:
        parseCsv(args.getValue('count-statuses')).length > 0
          ? parseCsv(args.getValue('count-statuses'))
          : [...DEFAULT_COUNT_STATUSES],
      excludedTiers:
        parseNumberCsv(args.getValue('exclude-tiers')).length > 0
          ? parseNumberCsv(args.getValue('exclude-tiers'))
          : [...DEFAULT_EXCLUDED_TIERS],
      excludeFeatured: !args.hasFlag('include-featured'),
      excludeParentBrands: !args.hasFlag('include-parent-brands'),
      excludeChildBrands: !args.hasFlag('include-child-brands'),
      excludeBrandsWithPendingReview: !args.hasFlag(
        'include-with-pending-review',
      ),
      excludeBrandsWithLogo: !args.hasFlag('include-with-logo'),
      excludeBrandsWithDescription: !args.hasFlag('include-with-description'),
      excludeNames: parseCsv(args.getValue('exclude-names')),
    },
    options: {
      help: args.hasFlag('help'),
      apply: args.hasFlag('apply'),
      json: args.hasFlag('json'),
      outputPath: args.getValue('output'),
      limit:
        limit && Number.isFinite(Number(limit)) && Number(limit) > 0
          ? Number(limit)
          : undefined,
      continueOnError: args.hasFlag('continue-on-error'),
      clearCache: !args.hasFlag('no-cache-clear'),
    },
  };
}

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
    ssl:
      process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });
}

function normalizeEnvValue(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function isProductionLikeEnvironment(): boolean {
  return ['NODE_ENV', 'APP_ENV', 'ENVIRONMENT'].some((key) =>
    PRODUCTION_ENV_VALUES.has(normalizeEnvValue(process.env[key])),
  );
}

function isRemoteDatabaseHost(): boolean {
  const host = normalizeEnvValue(process.env.DB_HOST);
  if (!host) {
    return false;
  }

  return !LOCAL_DB_HOSTS.has(host);
}

export function assertDangerousBrandMaintenanceAllowed(action: string): void {
  const allowProductionWrite =
    normalizeEnvValue(process.env.ALLOW_PROD_BRAND_MAINTENANCE) === 'true';

  if (!isProductionLikeEnvironment() && !isRemoteDatabaseHost()) {
    return;
  }

  if (allowProductionWrite) {
    return;
  }

  const nodeEnv = process.env.NODE_ENV || '<unset>';
  const appEnv = process.env.APP_ENV || '<unset>';
  const environment = process.env.ENVIRONMENT || '<unset>';
  const dbHost = process.env.DB_HOST || '<unset>';

  throw new Error(
    [
      `${action} 已被安全保护阻止。`,
      '检测到当前环境可能连接生产或远程数据库。',
      '如确认要执行写操作，请显式设置 ALLOW_PROD_BRAND_MAINTENANCE=true 后重试。',
      `NODE_ENV=${nodeEnv}, APP_ENV=${appEnv}, ENVIRONMENT=${environment}, DB_HOST=${dbHost}`,
    ].join(' '),
  );
}

function toNumber(value: number | string): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

export function parseAliases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function mergeAliases(...aliasSources: unknown[]): string[] {
  const merged = new Set<string>();

  for (const aliasSource of aliasSources) {
    for (const alias of parseAliases(aliasSource)) {
      merged.add(alias);
    }
  }

  return Array.from(merged);
}

export function serializeAliases(aliases: string[]): string | null {
  return aliases.length > 0 ? aliases.join(',') : null;
}

export async function buildMergePreviewReport(
  dataSource: DataSource,
  config: BulkMergeConfig,
): Promise<MergePreviewReport> {
  const rows = (await dataSource.query(
    `
      SELECT
        b.id,
        b.name,
        b.slug,
        b.status,
        b.tier,
        b."isFeatured" AS "isFeatured",
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
        COUNT(*) FILTER (WHERE p.status = 'draft')::int AS "draftCount",
        COUNT(*) FILTER (WHERE p.status = 'inactive')::int AS "inactiveCount",
        COUNT(*) FILTER (WHERE p.status = 'split')::int AS "splitCount"
      FROM brands b
      LEFT JOIN products p ON p."brandId" = b.id
      GROUP BY
        b.id,
        b.name,
        b.slug,
        b.status,
        b.tier,
        b."isFeatured",
        b."parentId",
        b."logoUrl",
        b.description
      ORDER BY b.name ASC
    `,
  )) as RawBrandRow[];

  const targetBrand = rows.find((row) => {
    const nameMatches =
      config.targetBrandName &&
      normalizeName(row.name) === normalizeName(config.targetBrandName);
    const slugMatches =
      config.targetBrandSlug &&
      normalizeName(row.slug) === normalizeName(config.targetBrandSlug);

    return row.status === 'active' && Boolean(nameMatches || slugMatches);
  });

  if (!targetBrand) {
    const targetDescriptor = config.targetBrandSlug
      ? `name="${config.targetBrandName}", slug="${config.targetBrandSlug}"`
      : `name="${config.targetBrandName}"`;
    throw new Error(`未找到可用的目标品牌: ${targetDescriptor}`);
  }

  const excludedNames = new Set(config.excludeNames.map(normalizeName));
  const reasonCounts = new Map<string, number>();

  const normalizedRows = rows.map((row) => {
    const operationalCount = config.countStatuses.reduce((sum, status) => {
      switch (status) {
        case 'active':
          return sum + toNumber(row.activeCount);
        case 'pending_review':
          return sum + toNumber(row.pendingReviewCount);
        case 'out_of_stock':
          return sum + toNumber(row.outOfStockCount);
        case 'draft':
          return sum + toNumber(row.draftCount);
        case 'inactive':
          return sum + toNumber(row.inactiveCount);
        case 'split':
          return sum + toNumber(row.splitCount);
        default:
          return sum;
      }
    }, 0);

    const exclusionReasons: string[] = [];

    if (row.id === targetBrand.id) {
      exclusionReasons.push('target_brand');
    }
    if (row.status !== 'active') {
      exclusionReasons.push(`brand_status:${row.status}`);
    }
    if (config.excludeFeatured && row.isFeatured) {
      exclusionReasons.push('featured_brand');
    }
    if (
      row.tier !== null &&
      config.excludedTiers.includes(Number(row.tier))
    ) {
      exclusionReasons.push(`tier_excluded:${row.tier}`);
    }
    if (config.excludeParentBrands && toNumber(row.activeChildCount) > 0) {
      exclusionReasons.push('has_active_children');
    }
    if (config.excludeChildBrands && row.parentId) {
      exclusionReasons.push('is_child_brand');
    }
    if (
      config.excludeBrandsWithPendingReview &&
      toNumber(row.pendingReviewCount) > 0
    ) {
      exclusionReasons.push('has_pending_review');
    }
    if (config.excludeBrandsWithLogo && hasText(row.logoUrl)) {
      exclusionReasons.push('has_logo');
    }
    if (config.excludeBrandsWithDescription && hasText(row.description)) {
      exclusionReasons.push('has_description');
    }
    if (excludedNames.has(normalizeName(row.name))) {
      exclusionReasons.push('manual_name_exclusion');
    }
    if (operationalCount >= config.threshold) {
      exclusionReasons.push(`operational_count_gte:${config.threshold}`);
    }
    if (operationalCount < config.minOperationalCount) {
      exclusionReasons.push(
        `operational_count_lt:${config.minOperationalCount}`,
      );
    }

    for (const reason of exclusionReasons) {
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    }

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      tier: row.tier === null ? null : Number(row.tier),
      isFeatured: row.isFeatured,
      parentId: row.parentId,
      logoUrl: row.logoUrl,
      description: row.description,
      activeChildCount: toNumber(row.activeChildCount),
      activeCount: toNumber(row.activeCount),
      pendingReviewCount: toNumber(row.pendingReviewCount),
      outOfStockCount: toNumber(row.outOfStockCount),
      draftCount: toNumber(row.draftCount),
      inactiveCount: toNumber(row.inactiveCount),
      splitCount: toNumber(row.splitCount),
      operationalCount,
      exclusionReasons,
      mergeCandidate: exclusionReasons.length === 0,
    } satisfies BrandCandidateRow;
  });

  const candidates = normalizedRows
    .filter((row) => row.mergeCandidate)
    .sort(
      (a, b) =>
        a.operationalCount - b.operationalCount ||
        a.pendingReviewCount - b.pendingReviewCount ||
        a.name.localeCompare(b.name),
    );
  const excluded = normalizedRows
    .filter((row) => !row.mergeCandidate)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    targetBrand: {
      id: targetBrand.id,
      name: targetBrand.name,
      slug: targetBrand.slug,
      status: targetBrand.status,
    },
    config,
    totalBrands: normalizedRows.length,
    candidateCount: candidates.length,
    excludedCount: excluded.length,
    reasonCounts: Object.fromEntries(
      Array.from(reasonCounts.entries()).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
    candidates,
    excluded,
  };
}

export async function mergeBrandIntoTarget(
  dataSource: DataSource,
  sourceBrandId: string,
  targetBrandId: string,
): Promise<MergeExecutionResult> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const sourceRows = (await queryRunner.query(
      `
        SELECT id, name, status, aliases, "parentId"
        FROM brands
        WHERE id = $1
        FOR UPDATE
      `,
      [sourceBrandId],
    )) as Array<{
      id: string;
      name: string;
      status: string;
      aliases: string | null;
      parentId: string | null;
    }>;

    const targetRows = (await queryRunner.query(
      `
        SELECT id, name, status, aliases
        FROM brands
        WHERE id = $1
        FOR UPDATE
      `,
      [targetBrandId],
    )) as Array<{
      id: string;
      name: string;
      status: string;
      aliases: string | null;
    }>;

    const sourceBrand = sourceRows[0];
    const targetBrand = targetRows[0];

    if (!sourceBrand) {
      throw new Error(`未找到源品牌: ${sourceBrandId}`);
    }
    if (!targetBrand) {
      throw new Error(`未找到目标品牌: ${targetBrandId}`);
    }
    if (sourceBrand.id === targetBrand.id) {
      throw new Error(`不能将品牌 ${sourceBrand.name} 合并到自身`);
    }
    if (sourceBrand.status !== 'active') {
      throw new Error(
        `源品牌 ${sourceBrand.name} 当前状态为 ${sourceBrand.status}，无法合并`,
      );
    }
    if (targetBrand.status !== 'active') {
      throw new Error(
        `目标品牌 ${targetBrand.name} 当前状态为 ${targetBrand.status}，无法接收合并`,
      );
    }
    if (sourceBrand.parentId) {
      throw new Error(
        `源品牌 ${sourceBrand.name} 是子品牌，默认不执行自动合并`,
      );
    }

    const movedChildBrands = (await queryRunner.query(
      `
        UPDATE brands
        SET "parentId" = $1,
            "updatedAt" = NOW()
        WHERE "parentId" = $2
        RETURNING id
      `,
      [targetBrandId, sourceBrandId],
    )) as Array<{ id: string }>;

    const movedProducts = (await queryRunner.query(
      `
        UPDATE products
        SET "brandId" = $1,
            "updatedAt" = NOW()
        WHERE "brandId" = $2
        RETURNING id
      `,
      [targetBrandId, sourceBrandId],
    )) as Array<{ id: string }>;

    const mergedAliases = mergeAliases(
      targetBrand.aliases,
      [sourceBrand.name],
      sourceBrand.aliases,
    );

    await queryRunner.query(
      `
        UPDATE brands
        SET aliases = $1,
            "updatedAt" = NOW()
        WHERE id = $2
      `,
      [serializeAliases(mergedAliases), targetBrandId],
    );

    await queryRunner.query(
      `
        UPDATE brands
        SET status = 'merged',
            "mergedIntoId" = $1,
            "updatedAt" = NOW()
        WHERE id = $2
      `,
      [targetBrandId, sourceBrandId],
    );

    await queryRunner.commitTransaction();

    return {
      sourceBrandId: sourceBrand.id,
      sourceBrandName: sourceBrand.name,
      targetBrandId: targetBrand.id,
      targetBrandName: targetBrand.name,
      movedProductCount: movedProducts.length,
      movedChildBrandCount: movedChildBrands.length,
      mergedAliases,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export async function clearBrandCache(): Promise<number> {
  const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  let deleted = 0;

  try {
    await redis.connect();

    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        '*brands*',
        'COUNT',
        '100',
      );
      cursor = nextCursor;

      if (keys.length > 0) {
        deleted += keys.length;
        await redis.unlink(...keys);
      }
    } while (cursor !== '0');

    return deleted;
  } finally {
    redis.disconnect();
  }
}

export function printPreviewSummary(
  report: MergePreviewReport,
  limit = 20,
): void {
  console.log(`目标品牌: ${report.targetBrand.name} (${report.targetBrand.id})`);
  console.log(`品牌总数: ${report.totalBrands}`);
  console.log(`候选品牌数: ${report.candidateCount}`);
  console.log(`排除品牌数: ${report.excludedCount}`);
  console.log(
    `阈值口径: ${report.config.minOperationalCount} <= ${report.config.countStatuses.join(' + ')} < ${report.config.threshold}`,
  );

  const topCandidates = report.candidates.slice(0, limit).map((row) => ({
    name: row.name,
    operational: row.operationalCount,
    active: row.activeCount,
    pending: row.pendingReviewCount,
    outOfStock: row.outOfStockCount,
    draft: row.draftCount,
    tier: row.tier ?? '-',
    featured: row.isFeatured ? 'Y' : '',
    hasLogo: hasText(row.logoUrl) ? 'Y' : '',
    hasParent: row.parentId ? 'Y' : '',
  }));

  if (topCandidates.length > 0) {
    console.log(`\n候选品牌预览（前 ${topCandidates.length} 条）:`);
    console.table(topCandidates);
  } else {
    console.log('\n没有符合当前规则的候选品牌。');
  }

  const reasonEntries = Object.entries(report.reasonCounts).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  if (reasonEntries.length > 0) {
    console.log('\n排除原因统计:');
    console.table(
      reasonEntries.map(([reason, count]) => ({
        reason,
        count,
      })),
    );
  }
}

export function writeJsonReport(outputPath: string, data: unknown): void {
  const resolvedPath = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`已写出报告: ${resolvedPath}`);
}

export function previewUsage(scriptName: string): string {
  return `
用法:
  ${scriptName} [--target-name=Design] [--target-slug=design] [--threshold=10]
               [--min-operational-count=0]
               [--count-statuses=active,pending_review,out_of_stock]
               [--exclude-tiers=1,2] [--exclude-names=BrandA,BrandB]
               [--include-featured] [--include-parent-brands] [--include-child-brands]
               [--include-with-pending-review] [--include-with-logo] [--include-with-description]
               [--limit=20] [--output=./tmp/brand-merge-preview.json] [--json]

说明:
  默认只做预览，不会修改数据。
  默认排除 featured、tier 1/2、父品牌、子品牌、有待审核商品、带 logo、带 description 的品牌。
  默认统计口径为 active + pending_review + out_of_stock。
`.trim();
}

export function executeUsage(scriptName: string): string {
  return `
用法:
  ${scriptName} [--target-name=Design] [--target-slug=design] [--threshold=10]
               [--min-operational-count=0]
               [--count-statuses=active,pending_review,out_of_stock]
               [--exclude-tiers=1,2] [--exclude-names=BrandA,BrandB]
               [--include-featured] [--include-parent-brands] [--include-child-brands]
               [--include-with-pending-review] [--include-with-logo] [--include-with-description]
               [--limit=20] [--output=./tmp/brand-merge-run.json]
               [--continue-on-error] [--no-cache-clear] [--apply]

说明:
  默认只 dry-run，不会修改数据。
  只有显式加 --apply 才会真正执行批量合并。
  当环境看起来像 production 或连接远程数据库时，还必须设置 ALLOW_PROD_BRAND_MAINTENANCE=true。
`.trim();
}
