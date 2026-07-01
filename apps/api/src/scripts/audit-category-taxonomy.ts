import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import {
  CategorySeedNode,
  loadCategorySeedData,
} from './category-seed-utils';

dotenv.config();

interface DbCategoryRow {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  aliases: string[] | null;
  parentId: string | null;
  isActive: boolean;
  level: number;
}

interface FlatSeedCategory {
  name: string;
  nameEn: string | null;
  slug: string;
  aliases: string[];
  parentSlug: string | null;
  isLeaf: boolean;
  level: number;
}

interface LegacyCategoryReport {
  slug: string;
  name: string;
  level: number;
  primaryCount: number;
  secondaryCount: number;
  totalCount: number;
  suggestedSlug: string | null;
  suggestedName: string | null;
  reason: string | null;
}

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-\u4e00-\u9fa5]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function singularizeToken(token: string): string {
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 3) {
    return token.slice(0, -1);
  }
  return token;
}

function buildVariants(value?: string | null): Set<string> {
  if (!value) return new Set();
  const normalized = normalizeTerm(value);
  if (!normalized) return new Set();

  return new Set([
    normalized,
    normalized.replace(/-/g, ''),
    normalized
      .split('-')
      .map((token) => singularizeToken(token))
      .join('-'),
  ]);
}

function flattenSeedCategories(
  nodes: CategorySeedNode[],
  parentSlug: string | null = null,
  level = 0,
): FlatSeedCategory[] {
  return nodes.flatMap((node) => {
    const current: FlatSeedCategory = {
      name: node.name,
      nameEn: node.nameEn ?? null,
      slug: node.slug,
      aliases: node.aliases ?? [],
      parentSlug,
      isLeaf: !node.children?.length,
      level,
    };

    const children = node.children?.length
      ? flattenSeedCategories(node.children, node.slug, level + 1)
      : [];

    return [current, ...children];
  });
}

function findSuggestedTarget(
  category: DbCategoryRow,
  canonicalCategories: FlatSeedCategory[],
): { slug: string | null; name: string | null; reason: string | null } {
  const candidates = canonicalCategories
    .filter((canonical) => canonical.isLeaf)
    .map((canonical) => {
    const exactTerms: Array<{ value?: string | null; reason: string; score: number }> =
      [
        { value: canonical.slug, reason: 'canonical slug', score: 300 },
        { value: canonical.name, reason: 'canonical name', score: 260 },
        { value: canonical.nameEn, reason: 'canonical nameEn', score: 250 },
        ...canonical.aliases.map((alias) => ({
          value: alias,
          reason: 'canonical alias',
          score: 280,
        })),
      ];

    let bestReason: string | null = null;
    let bestScore = 0;
    const sourceTerms = [
      category.slug,
      category.name,
      category.nameEn,
      ...(category.aliases ?? []),
    ];

    for (const sourceTerm of sourceTerms) {
      const sourceVariants = buildVariants(sourceTerm);
      if (sourceVariants.size === 0) continue;

      for (const term of exactTerms) {
        const targetVariants = buildVariants(term.value);
        if (
          targetVariants.size > 0 &&
          [...targetVariants].some((variant) => sourceVariants.has(variant))
        ) {
          if (term.score > bestScore) {
            bestScore = term.score;
            bestReason = term.reason;
          }
        }
      }
    }

    return {
      canonical,
      bestScore,
      bestReason,
    };
    });

  const sorted = candidates
    .filter((item) => item.bestScore > 0)
    .sort(
      (a, b) =>
        b.bestScore - a.bestScore ||
        Number(b.canonical.isLeaf) - Number(a.canonical.isLeaf) ||
        b.canonical.level - a.canonical.level,
    );

  const best = sorted[0];
  if (!best) {
    return { slug: null, name: null, reason: null };
  }

  return {
    slug: best.canonical.slug,
    name: best.canonical.nameEn ?? best.canonical.name,
    reason: best.bestReason,
  };
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const seedNodes = await loadCategorySeedData();
  const canonicalCategories = flattenSeedCategories(seedNodes);
  const canonicalSlugSet = new Set(canonicalCategories.map((item) => item.slug));

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
    const categories = (await ds.query(`
      SELECT
        id,
        name,
        "nameEn",
        slug,
        aliases,
        "parentId",
        "isActive",
        level
      FROM category
      ORDER BY level ASC, "sortOrder" ASC, name ASC
    `)) as DbCategoryRow[];

    const primaryCounts = (await ds.query(`
      SELECT "primaryCategoryId" AS "categoryId", COUNT(*)::int AS count
      FROM products
      WHERE "primaryCategoryId" IS NOT NULL
      GROUP BY "primaryCategoryId"
    `)) as Array<{ categoryId: string; count: number }>;

    const secondaryCounts = (await ds.query(`
      SELECT "categoryId", COUNT(*)::int AS count
      FROM product_secondary_categories
      GROUP BY "categoryId"
    `)) as Array<{ categoryId: string; count: number }>;

    const nonLeafAssignments = (await ds.query(`
      SELECT
        c.slug,
        c.name,
        COUNT(p.id)::int AS count
      FROM products p
      INNER JOIN category c ON c.id = p."primaryCategoryId"
      WHERE EXISTS (
        SELECT 1
        FROM category child
        WHERE child."parentId" = c.id
          AND child."isActive" = true
      )
      GROUP BY c.slug, c.name
      ORDER BY count DESC, c.slug ASC
    `)) as Array<{ slug: string; name: string; count: number }>;

    const primaryMap = new Map(primaryCounts.map((row) => [row.categoryId, row.count]));
    const secondaryMap = new Map(
      secondaryCounts.map((row) => [row.categoryId, row.count]),
    );

    const legacyCategories = categories
      .filter((category) => !canonicalSlugSet.has(category.slug))
      .map((category) => {
        const suggestion = findSuggestedTarget(category, canonicalCategories);
        const primaryCount = primaryMap.get(category.id) ?? 0;
        const secondaryCount = secondaryMap.get(category.id) ?? 0;

        return {
          slug: category.slug,
          name: category.name,
          level: category.level,
          primaryCount,
          secondaryCount,
          totalCount: primaryCount + secondaryCount,
          suggestedSlug: suggestion.slug,
          suggestedName: suggestion.name,
          reason: suggestion.reason,
        } as LegacyCategoryReport;
      })
      .sort(
        (a, b) =>
          b.totalCount - a.totalCount ||
          a.level - b.level ||
          a.slug.localeCompare(b.slug),
      );

    printSection('Summary');
    console.log(`Canonical categories in seed: ${canonicalCategories.length}`);
    console.log(`Categories in database: ${categories.length}`);
    console.log(`Legacy categories in database: ${legacyCategories.length}`);
    console.log(`Products assigned to non-leaf primary categories: ${nonLeafAssignments.length}`);

    printSection('Non-Leaf Product Assignments');
    if (nonLeafAssignments.length === 0) {
      console.log('No products currently use non-leaf primary categories.');
    } else {
      for (const row of nonLeafAssignments) {
        console.log(`- ${row.slug} (${row.name}): ${row.count}`);
      }
    }

    printSection('Legacy Categories');
    if (legacyCategories.length === 0) {
      console.log('No legacy categories found.');
    } else {
      for (const row of legacyCategories) {
        const suggestion = row.suggestedSlug
          ? `${row.suggestedSlug} (${row.suggestedName}) via ${row.reason}`
          : 'manual review required';
        console.log(
          `- ${row.slug} | primary=${row.primaryCount}, secondary=${row.secondaryCount}, total=${row.totalCount} | suggestion=${suggestion}`,
        );
      }
    }

    printSection('Auto-Remap Candidates');
    const autoRemap = legacyCategories.filter(
      (row) => row.suggestedSlug && row.totalCount > 0,
    );
    if (autoRemap.length === 0) {
      console.log('No auto-remap candidates with active product usage.');
    } else {
      for (const row of autoRemap) {
        console.log(
          `- ${row.slug} -> ${row.suggestedSlug} | affected=${row.totalCount}`,
        );
      }
    }
  } finally {
    await ds.destroy();
  }
}

main().catch((error) => {
  console.error('❌ 分类体系审计失败:', error);
  process.exit(1);
});
