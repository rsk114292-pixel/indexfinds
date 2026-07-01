import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

config({ path: join(__dirname, '../../.env') });

type ColdStartBrand = {
  name: string;
  slug: string;
  aliases?: string[];
  tier?: number;
  brandType?: string;
  displayMode?: string;
  governanceStatus?: string;
  canonicalKey?: string | null;
  parentSlug?: string | null;
  isIndependent?: boolean;
  isFeatured?: boolean;
  featuredSort?: number;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ColdStartPayload = {
  version: number;
  source: string;
  generatedAt: string;
  brandCount: number;
  brands: ColdStartBrand[];
};

const DATA_PATH = join(__dirname, 'data/brands-cold-start-v2.json');

const appDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
  password:
    process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'lolobuyspreadsheets_dev',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function loadPayload(): ColdStartPayload {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as ColdStartPayload;
}

function joinAliases(aliases?: string[]): string | null {
  if (!aliases || aliases.length === 0) {
    return null;
  }
  return aliases.join(',');
}

async function seedBrandsColdStartV2() {
  await appDataSource.initialize();
  const queryRunner = appDataSource.createQueryRunner();

  try {
    const payload = loadPayload();
    console.log(
      `🏷️ Importing ${payload.brandCount} brands from brands-cold-start-v2.json`,
    );

    let insertedOrUpdated = 0;

    for (const brand of payload.brands) {
      await queryRunner.query(
        `
          INSERT INTO brands (
            name,
            slug,
            aliases,
            tier,
            status,
            "brandType",
            "displayMode",
            "governanceStatus",
            "canonicalKey",
            "isIndependent",
            "isFeatured",
            "featuredSort",
            description,
            metadata
          ) VALUES (
            $1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, $11, $12, $13
          )
          ON CONFLICT (slug) DO UPDATE SET
            name = EXCLUDED.name,
            aliases = EXCLUDED.aliases,
            tier = EXCLUDED.tier,
            status = EXCLUDED.status,
            "brandType" = EXCLUDED."brandType",
            "displayMode" = EXCLUDED."displayMode",
            "governanceStatus" = EXCLUDED."governanceStatus",
            "canonicalKey" = EXCLUDED."canonicalKey",
            "isIndependent" = EXCLUDED."isIndependent",
            "isFeatured" = EXCLUDED."isFeatured",
            "featuredSort" = EXCLUDED."featuredSort",
            description = EXCLUDED.description,
            metadata = EXCLUDED.metadata
        `,
        [
          brand.name,
          brand.slug,
          joinAliases(brand.aliases),
          brand.tier ?? 0,
          brand.brandType ?? 'canonical',
          brand.displayMode ?? 'independent',
          brand.governanceStatus ?? 'approved',
          brand.canonicalKey ?? null,
          brand.isIndependent ?? true,
          brand.isFeatured ?? false,
          brand.featuredSort ?? 0,
          brand.description ?? null,
          brand.metadata ? JSON.stringify(brand.metadata) : null,
        ],
      );

      insertedOrUpdated += 1;
    }

    let parentUpdated = 0;

    for (const brand of payload.brands) {
      if (!brand.parentSlug) {
        continue;
      }

      await queryRunner.query(
        `
          UPDATE brands child
          SET "parentId" = parent.id
          FROM brands parent
          WHERE child.slug = $1
            AND parent.slug = $2
        `,
        [brand.slug, brand.parentSlug],
      );
      parentUpdated += 1;
    }

    console.log(
      `✅ Upserted ${insertedOrUpdated} brands, updated ${parentUpdated} parent relationships`,
    );
  } finally {
    await queryRunner.release();
    await appDataSource.destroy();
  }
}

void seedBrandsColdStartV2().catch((error) => {
  console.error('❌ Failed to seed brands cold-start v2:', error);
  process.exit(1);
});
