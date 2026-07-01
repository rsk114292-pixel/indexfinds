/**
 * Seed script for attributes and attribute_values tables.
 *
 * Populates the five filter dimensions (gender, style, occasion, season, color)
 * using the static vocabulary from attribute-vocabulary.ts and the active colors
 * from the colors table.
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so it is safe to run multiple times.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-attributes.ts
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-attributes.ts --dry-run
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { ATTRIBUTE_VOCABULARY } from '../common/constants/attribute-vocabulary';

// ---------------------------------------------------------------------------
// Environment & DataSource
// ---------------------------------------------------------------------------
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  synchronize: false,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isDryRun = process.argv.includes('--dry-run');

function slugify(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

/** Display name mapping for each static dimension. */
const DISPLAY_NAMES: Record<string, string> = {
  gender: 'Gender',
  style: 'Style',
  occasion: 'Occasion',
  season: 'Season',
};

/** Fixed sort order for each dimension. */
const DIMENSION_ORDER: Record<string, number> = {
  gender: 0,
  style: 1,
  occasion: 2,
  season: 3,
  color: 4,
};

// ---------------------------------------------------------------------------
// Seed static dimensions (gender, style, occasion, season)
// ---------------------------------------------------------------------------
async function seedStaticDimensions(
  queryRunner: any,
): Promise<{ attrCount: number; valueCount: number; details: string[] }> {
  let attrCount = 0;
  let valueCount = 0;
  const details: string[] = [];

  const dimensionKeys = Object.keys(ATTRIBUTE_VOCABULARY) as Array<
    keyof typeof ATTRIBUTE_VOCABULARY
  >;

  for (const key of dimensionKeys) {
    const dimension = ATTRIBUTE_VOCABULARY[key];
    const displayName = DISPLAY_NAMES[key];
    const sortOrder = DIMENSION_ORDER[key];

    console.log(
      `\n  [${key}] display_name="${displayName}", type="${dimension.type}", sort_order=${sortOrder}`,
    );

    if (!isDryRun) {
      // Insert attribute (skip if already exists)
      await queryRunner.query(
        `INSERT INTO attributes (name, display_name, type, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [key, displayName, dimension.type, sortOrder],
      );
    }

    // Fetch the attribute id (needed even in dry-run to count correctly)
    let attrId: string | null = null;
    if (!isDryRun) {
      const rows = await queryRunner.query(
        `SELECT id FROM attributes WHERE name = $1`,
        [key],
      );
      attrId = rows[0]?.id;
    }

    attrCount++;

    const validValues = dimension.valid as readonly string[];
    let dimValueCount = 0;

    for (let i = 0; i < validValues.length; i++) {
      const value = validValues[i];
      const slug = slugify(value);

      if (isDryRun) {
        console.log(
          `    [dry-run] would insert value="${value}", slug="${slug}", sort_order=${i}`,
        );
      } else {
        await queryRunner.query(
          `INSERT INTO attribute_values (attribute_id, value, slug, sort_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (attribute_id, slug) DO NOTHING`,
          [attrId, value, slug, i],
        );
      }

      dimValueCount++;
      valueCount++;
    }

    details.push(`${validValues.length} ${key}`);
    console.log(`    -> ${dimValueCount} values`);
  }

  return { attrCount, valueCount, details };
}

// ---------------------------------------------------------------------------
// Seed color dimension (from colors table)
// ---------------------------------------------------------------------------
async function seedColorDimension(
  queryRunner: any,
): Promise<{ attrCount: number; valueCount: number; detail: string }> {
  const sortOrder = DIMENSION_ORDER.color;

  console.log(
    `\n  [color] display_name="Color", type="multi_select", sort_order=${sortOrder}`,
  );

  if (!isDryRun) {
    await queryRunner.query(
      `INSERT INTO attributes (name, display_name, type, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      ['color', 'Color', 'multi_select', sortOrder],
    );
  }

  let attrId: string | null = null;
  if (!isDryRun) {
    const rows = await queryRunner.query(
      `SELECT id FROM attributes WHERE name = 'color'`,
    );
    attrId = rows[0]?.id;
  }

  // Fetch active colors
  const colors = await queryRunner.query(
    `SELECT id, "nameEn", slug, "sortOrder" FROM colors WHERE "isActive" = true ORDER BY "sortOrder"`,
  );

  let valueCount = 0;

  for (const color of colors) {
    if (isDryRun) {
      console.log(
        `    [dry-run] would insert value="${color.nameEn}", slug="${color.slug}", ref_color_id=${color.id}, sort_order=${color.sortOrder}`,
      );
    } else {
      await queryRunner.query(
        `INSERT INTO attribute_values (attribute_id, value, slug, ref_color_id, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (attribute_id, slug) DO NOTHING`,
        [attrId, color.nameEn, color.slug, color.id, color.sortOrder],
      );
    }
    valueCount++;
  }

  console.log(`    -> ${valueCount} values (from colors table)`);

  return { attrCount: 1, valueCount, detail: `${valueCount} color` };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seedAttributes() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const queryRunner = AppDataSource.createQueryRunner();

    console.log(
      `\nSeed attributes ${isDryRun ? '(DRY RUN - no writes)' : '(live)'}`,
    );

    // A) Static dimensions
    const staticResult = await seedStaticDimensions(queryRunner);

    // B) Color dimension
    const colorResult = await seedColorDimension(queryRunner);

    // Summary
    const totalAttrs = staticResult.attrCount + colorResult.attrCount;
    const totalValues = staticResult.valueCount + colorResult.valueCount;
    const allDetails = [...staticResult.details, colorResult.detail].join(
      ' + ',
    );

    console.log(`\nSeed complete:`);
    console.log(
      `  attributes: ${totalAttrs} (${Object.keys(ATTRIBUTE_VOCABULARY).join(', ')}, color)`,
    );
    console.log(`  attribute_values: ${totalValues} (${allDetails})`);

    if (isDryRun) {
      console.log('\n  (dry-run mode, nothing was written to the database)');
    }

    await queryRunner.release();
    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedAttributes();
