import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

config({ path: join(__dirname, '../../.env') });

type ExportBrandRow = {
  name: string;
  slug: string;
  aliases: string[] | string | null;
  tier: number;
  brandType: string | null;
  displayMode: string | null;
  governanceStatus: string | null;
  canonicalKey: string | null;
  parentSlug: string | null;
  isIndependent: boolean;
  isFeatured: boolean;
  featuredSort: number;
  description: string | null;
  metadata: Record<string, unknown> | string | null;
};

type ColdStartBrand = {
  name: string;
  slug: string;
  aliases: string[];
  tier: number;
  brandType: string;
  displayMode: string;
  governanceStatus: string;
  canonicalKey: string | null;
  parentSlug: string | null;
  isIndependent: boolean;
  isFeatured: boolean;
  featuredSort: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
};

const OUTPUT_PATH = join(
  __dirname,
  '../seeds/data/brands-cold-start-v2.json',
);

const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'lolobuyspreadsheets_dev',
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function normalizeAliases(value: ExportBrandRow['aliases']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMetadata(
  value: ExportBrandRow['metadata'],
): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getDesignFallbackBrand(): ColdStartBrand {
  return {
    name: 'Design',
    slug: 'design',
    aliases: ['design'],
    tier: 3,
    brandType: 'canonical',
    displayMode: 'independent',
    governanceStatus: 'approved',
    canonicalKey: 'design',
    parentSlug: null,
    isIndependent: true,
    isFeatured: false,
    featuredSort: 0,
    description:
      'Fallback brand for products where AI cannot identify the brand',
    metadata: {
      aiSource: 'system-default',
    },
  };
}

async function exportLiveBrandsColdStartV2() {
  await appDataSource.initialize();

  try {
    const rows = await appDataSource.query<ExportBrandRow[]>(`
      SELECT
        b.name,
        b.slug,
        b.aliases,
        b.tier,
        b."brandType",
        b."displayMode",
        b."governanceStatus",
        b."canonicalKey",
        parent.slug AS "parentSlug",
        b."isIndependent",
        b."isFeatured",
        b."featuredSort",
        b.description,
        b.metadata
      FROM brands b
      LEFT JOIN brands parent
        ON parent.id = b."parentId"
      WHERE b.status = 'active'
      ORDER BY b.slug ASC
    `);

    const brands: ColdStartBrand[] = rows.map((row) => ({
      name: row.name,
      slug: row.slug,
      aliases: normalizeAliases(row.aliases),
      tier: row.tier,
      brandType: row.brandType || 'canonical',
      displayMode: row.displayMode || 'independent',
      governanceStatus: row.governanceStatus || 'approved',
      canonicalKey: row.canonicalKey,
      parentSlug: row.parentSlug,
      isIndependent: Boolean(row.isIndependent),
      isFeatured: Boolean(row.isFeatured),
      featuredSort: Number(row.featuredSort || 0),
      description: row.description || null,
      metadata: normalizeMetadata(row.metadata),
    }));

    if (!brands.some((brand) => brand.slug === 'design')) {
      brands.push(getDesignFallbackBrand());
    }

    brands.sort((a, b) => a.slug.localeCompare(b.slug));

    const payload = {
      version: 2,
      source: 'live brands export from brands table',
      generatedAt: new Date().toISOString(),
      brandCount: brands.length,
      brands,
    };

    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

    console.log(
      `✅ Exported ${brands.length} brands to ${OUTPUT_PATH.replace(process.cwd(), '.')}`,
    );
  } finally {
    await appDataSource.destroy();
  }
}

void exportLiveBrandsColdStartV2().catch((error) => {
  console.error('❌ Failed to export live brands cold-start v2:', error);
  process.exit(1);
});
