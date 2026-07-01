/**
 * 存量迁移：将 aiAttributes JSON 数据写入规范化属性表
 *
 * 读取每个产品的 aiAttributes JSON，标准化所有维度（gender/style/occasion/season/color），
 * 写入 product_attribute_values 关联表，并回写清洗后的 aiAttributes JSON 保持双写一致。
 *
 * 使用方法:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-attributes-to-tables.ts [--dry-run]
 *
 *   --dry-run  只显示统计信息，不实际修改数据库
 *   不带参数   实际执行迁移
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { ATTRIBUTE_VOCABULARY } from '../common/constants/attribute-vocabulary';

// ---------------------------------------------------------------------------
// 加载环境变量
// ---------------------------------------------------------------------------
config({ path: join(__dirname, '../../.env') });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
});

const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ColorRow {
  id: string;
  nameEn: string;
  slug: string;
  aliasesEn: string | null;
}

interface AttributeValueRow {
  id: string;
  value: string;
  slug: string;
  attr_name: string;
}

interface AiAttributes {
  colors?: string[];
  styles?: string[];
  occasions?: string[];
  seasons?: string[];
  gender?: string;
  sizes?: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Stats tracking
// ---------------------------------------------------------------------------
interface MigrationStats {
  totalProcessed: number;
  withAttributes: number;
  skippedNoAttributes: number;
  totalAssociationsCreated: number;
  colorNormalizations: Record<string, number>; // "Dark Brown → Brown": count
  unrecognizedColorsFallback: Record<string, number>; // raw value: count
  unrecognizedStaticValues: Record<string, string[]>; // dimension: [values]
}

// ---------------------------------------------------------------------------
// Static dimension normalization (inline, no NestJS imports)
// ---------------------------------------------------------------------------
function normalizeStaticValue(dimension: string, raw: string): string | null {
  const vocab =
    ATTRIBUTE_VOCABULARY[dimension as keyof typeof ATTRIBUTE_VOCABULARY];
  if (!vocab) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Direct match (case-insensitive)
  const direct = (vocab.valid as readonly string[]).find(
    (v) => v.toLowerCase() === trimmed.toLowerCase(),
  );
  if (direct) return direct;

  // Synonym match
  const syn = vocab.synonyms[trimmed.toLowerCase()];
  if (syn) return syn;

  return null;
}

function normalizeStaticArray(
  dimension: string,
  rawValues: string[] | undefined,
): { normalized: string[]; unrecognized: string[] } {
  if (!rawValues || rawValues.length === 0) {
    return { normalized: [], unrecognized: [] };
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  const unrecognized: string[] = [];

  for (const val of rawValues) {
    const result = normalizeStaticValue(dimension, val);
    if (result && !seen.has(result)) {
      seen.add(result);
      normalized.push(result);
    } else if (!result) {
      unrecognized.push(val);
    }
  }

  return { normalized, unrecognized };
}

// ---------------------------------------------------------------------------
// Color matching (4-layer, inline)
// ---------------------------------------------------------------------------
let colorsCache: ColorRow[] = [];

function parseAliases(aliasesEn: string | null): string[] {
  if (!aliasesEn) return [];
  // simple-array stores as comma-separated text
  return aliasesEn
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

function matchColor(input: string): { nameEn: string; slug: string } | null {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return null;

  // Layer 1: exact nameEn or slug
  const exact = colorsCache.find(
    (c) => c.nameEn.toLowerCase() === normalized || c.slug === normalized,
  );
  if (exact) return { nameEn: exact.nameEn, slug: exact.slug };

  // Layer 2: alias exact match
  for (const c of colorsCache) {
    const aliases = parseAliases(c.aliasesEn);
    if (aliases.some((a) => a.toLowerCase() === normalized)) {
      return { nameEn: c.nameEn, slug: c.slug };
    }
  }

  // Layer 3: substring matching (alias first, then nameEn, longest wins)
  let bestAlias: ColorRow | null = null;
  let bestAliasLen = 0;
  for (const c of colorsCache) {
    for (const a of parseAliases(c.aliasesEn)) {
      if (normalized.includes(a.toLowerCase()) && a.length > bestAliasLen) {
        bestAlias = c;
        bestAliasLen = a.length;
      }
    }
  }
  if (bestAlias) return { nameEn: bestAlias.nameEn, slug: bestAlias.slug };

  let bestName: ColorRow | null = null;
  let bestNameLen = 0;
  for (const c of colorsCache) {
    if (
      normalized.includes(c.nameEn.toLowerCase()) &&
      c.nameEn.length > bestNameLen
    ) {
      bestName = c;
      bestNameLen = c.nameEn.length;
    }
  }
  if (bestName) return { nameEn: bestName.nameEn, slug: bestName.slug };

  // Layer 4: fallback to Multicolor
  const multicolor = colorsCache.find((c) => c.slug === 'multicolor');
  if (multicolor) {
    return { nameEn: multicolor.nameEn, slug: multicolor.slug };
  }

  return null;
}

function normalizeColors(
  rawColors: string[] | undefined,
  stats: MigrationStats,
): string[] {
  if (!rawColors || rawColors.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawColors) {
    const matched = matchColor(raw);
    if (!matched) continue;

    // Track normalization changes
    if (raw.trim().toLowerCase() !== matched.nameEn.toLowerCase()) {
      const key = `"${raw}" -> "${matched.nameEn}"`;
      stats.colorNormalizations[key] =
        (stats.colorNormalizations[key] || 0) + 1;

      // Track Multicolor fallbacks specifically
      if (
        matched.slug === 'multicolor' &&
        raw.trim().toLowerCase() !== 'multicolor'
      ) {
        stats.unrecognizedColorsFallback[raw] =
          (stats.unrecognizedColorsFallback[raw] || 0) + 1;
      }
    }

    if (!seen.has(matched.nameEn)) {
      seen.add(matched.nameEn);
      result.push(matched.nameEn);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main migration
// ---------------------------------------------------------------------------
async function migrateAttributesToTables() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(
    `\n=== Migrate aiAttributes to Normalized Tables ===` +
      `\n    Mode: ${isDryRun ? 'DRY RUN (no writes)' : 'LIVE (writing to DB)'}` +
      `\n    Batch size: ${BATCH_SIZE}\n`,
  );

  try {
    await AppDataSource.initialize();
    console.log('Database connected.\n');

    // ------------------------------------------------------------------
    // Step 1: Pre-load lookup maps
    // ------------------------------------------------------------------
    console.log('Step 1: Loading lookup maps...');

    // 1a. Load attribute_values with their attribute name
    const avRows: AttributeValueRow[] = await AppDataSource.query(`
      SELECT av.id, av.value, av.slug, a.name AS attr_name
      FROM attribute_values av
      JOIN attributes a ON av.attribute_id = a.id
    `);

    // Build map: { dimension: { slug: attributeValueId } }
    const attrValueMap: Record<string, Record<string, string>> = {};
    // Also build: { dimension: { normalizedValue(lowercase): slug } }
    const attrValueByName: Record<string, Record<string, string>> = {};

    for (const row of avRows) {
      if (!attrValueMap[row.attr_name]) {
        attrValueMap[row.attr_name] = {};
        attrValueByName[row.attr_name] = {};
      }
      attrValueMap[row.attr_name][row.slug] = row.id;
      attrValueByName[row.attr_name][row.value.toLowerCase()] = row.slug;
    }

    console.log(
      `  Loaded ${avRows.length} attribute_values across dimensions: ${Object.keys(attrValueMap).join(', ')}`,
    );

    // 1b. Load all active colors for 4-layer matching
    colorsCache = await AppDataSource.query(
      `SELECT id, "nameEn", slug, "aliasesEn" FROM colors WHERE "isActive" = true ORDER BY "sortOrder"`,
    );
    console.log(`  Loaded ${colorsCache.length} active colors.\n`);

    // ------------------------------------------------------------------
    // Step 2: Process products in batches
    // ------------------------------------------------------------------
    console.log('Step 2: Processing products...\n');

    const stats: MigrationStats = {
      totalProcessed: 0,
      withAttributes: 0,
      skippedNoAttributes: 0,
      totalAssociationsCreated: 0,
      colorNormalizations: {},
      unrecognizedColorsFallback: {},
      unrecognizedStaticValues: {},
    };

    // Get total count first
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM products WHERE status = 'active'`,
    );
    const totalProducts = parseInt(countResult[0].cnt, 10);
    console.log(`  Total products to process: ${totalProducts}\n`);

    let offset = 0;

    while (offset < totalProducts) {
      const products = await AppDataSource.query(
        `SELECT id, "aiAttributes" FROM products WHERE status = 'active' ORDER BY id LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset],
      );

      if (products.length === 0) break;

      // Start a transaction for this batch
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.startTransaction();

      try {
        for (const product of products) {
          stats.totalProcessed++;

          // Parse aiAttributes
          let attrs: AiAttributes | null = null;
          try {
            if (product.aiAttributes == null || product.aiAttributes === '') {
              stats.skippedNoAttributes++;
              continue;
            }
            attrs =
              typeof product.aiAttributes === 'string'
                ? JSON.parse(product.aiAttributes)
                : product.aiAttributes;
          } catch {
            console.warn(
              `  [WARN] Product ${product.id}: invalid aiAttributes JSON, skipping.`,
            );
            stats.skippedNoAttributes++;
            continue;
          }

          if (!attrs || typeof attrs !== 'object') {
            stats.skippedNoAttributes++;
            continue;
          }

          // Check if there are any attribute values to process
          const hasAnyAttrs =
            attrs.gender ||
            (attrs.styles && attrs.styles.length > 0) ||
            (attrs.occasions && attrs.occasions.length > 0) ||
            (attrs.seasons && attrs.seasons.length > 0) ||
            (attrs.colors && attrs.colors.length > 0);

          if (!hasAnyAttrs) {
            stats.skippedNoAttributes++;
            continue;
          }

          stats.withAttributes++;

          // Normalize each dimension
          const attributeValueIds: string[] = [];
          const updatedAttrs = { ...attrs };

          // --- gender (single_select) ---
          if (attrs.gender) {
            const normalizedGender = normalizeStaticValue(
              'gender',
              attrs.gender,
            );
            if (normalizedGender) {
              updatedAttrs.gender = normalizedGender;
              // Resolve to attribute_value_id
              const slug =
                attrValueByName['gender']?.[normalizedGender.toLowerCase()];
              const avId = slug ? attrValueMap['gender']?.[slug] : undefined;
              if (avId) attributeValueIds.push(avId);
            } else {
              console.warn(
                `  [WARN] Product ${product.id}: unrecognized gender "${attrs.gender}"`,
              );
              if (!stats.unrecognizedStaticValues['gender']) {
                stats.unrecognizedStaticValues['gender'] = [];
              }
              if (
                !stats.unrecognizedStaticValues['gender'].includes(attrs.gender)
              ) {
                stats.unrecognizedStaticValues['gender'].push(attrs.gender);
              }
            }
          }

          // --- styles (multi_select) ---
          const { normalized: normalizedStyles, unrecognized: unrecStyles } =
            normalizeStaticArray('style', attrs.styles);
          updatedAttrs.styles = normalizedStyles;
          for (const val of normalizedStyles) {
            const slug = attrValueByName['style']?.[val.toLowerCase()];
            const avId = slug ? attrValueMap['style']?.[slug] : undefined;
            if (avId) attributeValueIds.push(avId);
          }
          if (unrecStyles.length > 0) {
            if (!stats.unrecognizedStaticValues['style']) {
              stats.unrecognizedStaticValues['style'] = [];
            }
            for (const v of unrecStyles) {
              if (!stats.unrecognizedStaticValues['style'].includes(v)) {
                stats.unrecognizedStaticValues['style'].push(v);
              }
            }
          }

          // --- occasions (multi_select) ---
          const {
            normalized: normalizedOccasions,
            unrecognized: unrecOccasions,
          } = normalizeStaticArray('occasion', attrs.occasions);
          updatedAttrs.occasions = normalizedOccasions;
          for (const val of normalizedOccasions) {
            const slug = attrValueByName['occasion']?.[val.toLowerCase()];
            const avId = slug ? attrValueMap['occasion']?.[slug] : undefined;
            if (avId) attributeValueIds.push(avId);
          }
          if (unrecOccasions.length > 0) {
            if (!stats.unrecognizedStaticValues['occasion']) {
              stats.unrecognizedStaticValues['occasion'] = [];
            }
            for (const v of unrecOccasions) {
              if (!stats.unrecognizedStaticValues['occasion'].includes(v)) {
                stats.unrecognizedStaticValues['occasion'].push(v);
              }
            }
          }

          // --- seasons (multi_select) ---
          const { normalized: normalizedSeasons, unrecognized: unrecSeasons } =
            normalizeStaticArray('season', attrs.seasons);
          updatedAttrs.seasons = normalizedSeasons;
          for (const val of normalizedSeasons) {
            const slug = attrValueByName['season']?.[val.toLowerCase()];
            const avId = slug ? attrValueMap['season']?.[slug] : undefined;
            if (avId) attributeValueIds.push(avId);
          }
          if (unrecSeasons.length > 0) {
            if (!stats.unrecognizedStaticValues['season']) {
              stats.unrecognizedStaticValues['season'] = [];
            }
            for (const v of unrecSeasons) {
              if (!stats.unrecognizedStaticValues['season'].includes(v)) {
                stats.unrecognizedStaticValues['season'].push(v);
              }
            }
          }

          // --- colors (4-layer matching) ---
          const normalizedColors = normalizeColors(attrs.colors, stats);
          updatedAttrs.colors = normalizedColors;
          for (const colorName of normalizedColors) {
            const slug = attrValueByName['color']?.[colorName.toLowerCase()];
            const avId = slug ? attrValueMap['color']?.[slug] : undefined;
            if (avId) attributeValueIds.push(avId);
          }

          // --- Write to DB (unless dry-run) ---
          if (!isDryRun) {
            // DELETE existing associations
            await queryRunner.query(
              `DELETE FROM product_attribute_values WHERE product_id = $1`,
              [product.id],
            );

            // INSERT new associations
            if (attributeValueIds.length > 0) {
              const params: (string | undefined)[] = [product.id];
              const valuesClauses: string[] = [];
              for (let i = 0; i < attributeValueIds.length; i++) {
                params.push(attributeValueIds[i]);
                valuesClauses.push(`($1, $${i + 2})`);
              }
              await queryRunner.query(
                `INSERT INTO product_attribute_values (product_id, attribute_value_id)
                 VALUES ${valuesClauses.join(', ')}
                 ON CONFLICT DO NOTHING`,
                params,
              );
            }

            // Write back normalized aiAttributes JSON
            await queryRunner.query(
              `UPDATE products SET "aiAttributes" = $1 WHERE id = $2`,
              [JSON.stringify(updatedAttrs), product.id],
            );
          }

          stats.totalAssociationsCreated += attributeValueIds.length;
        }

        if (!isDryRun) {
          await queryRunner.commitTransaction();
        }
      } catch (err) {
        if (!isDryRun) {
          await queryRunner.rollbackTransaction();
        }
        throw err;
      } finally {
        await queryRunner.release();
      }

      offset += products.length;
      console.log(
        `  Processed ${Math.min(offset, totalProducts)}/${totalProducts} products...`,
      );
    }

    // ------------------------------------------------------------------
    // Step 3: Log summary
    // ------------------------------------------------------------------
    console.log('\n' + '='.repeat(70));
    console.log('Migration Summary');
    console.log('='.repeat(70));
    console.log(
      `  Mode:                        ${isDryRun ? 'DRY RUN' : 'LIVE'}`,
    );
    console.log(`  Total products processed:    ${stats.totalProcessed}`);
    console.log(`  Products with aiAttributes:  ${stats.withAttributes}`);
    console.log(`  Products skipped (no attrs): ${stats.skippedNoAttributes}`);
    console.log(
      `  Total associations created:  ${stats.totalAssociationsCreated}`,
    );

    // Color normalizations
    const colorNormEntries = Object.entries(stats.colorNormalizations).sort(
      (a, b) => b[1] - a[1],
    );
    if (colorNormEntries.length > 0) {
      console.log(
        `\n  Color normalizations (${colorNormEntries.length} unique mappings):`,
      );
      for (const [mapping, count] of colorNormEntries.slice(0, 30)) {
        console.log(`    ${mapping}: ${count} products`);
      }
      if (colorNormEntries.length > 30) {
        console.log(`    ... and ${colorNormEntries.length - 30} more`);
      }
    }

    // Multicolor fallbacks
    const fallbackEntries = Object.entries(
      stats.unrecognizedColorsFallback,
    ).sort((a, b) => b[1] - a[1]);
    if (fallbackEntries.length > 0) {
      console.log(
        `\n  Unrecognized colors that fell back to Multicolor (${fallbackEntries.length} unique):`,
      );
      for (const [val, count] of fallbackEntries) {
        console.log(`    "${val}": ${count} products`);
      }
    }

    // Unrecognized static values
    for (const [dim, values] of Object.entries(
      stats.unrecognizedStaticValues,
    )) {
      if (values.length > 0) {
        console.log(
          `\n  Unrecognized ${dim} values (${values.length}): ${values.join(', ')}`,
        );
      }
    }

    console.log('\n' + '='.repeat(70));

    if (isDryRun) {
      console.log(
        '\nThis was a DRY RUN. No data was modified.' +
          '\nRun without --dry-run to execute the migration.\n',
      );
    } else {
      console.log('\nMigration completed successfully.\n');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('\nMigration failed:', error);
    try {
      await AppDataSource.destroy();
    } catch {
      // ignore cleanup errors
    }
    process.exit(1);
  }
}

migrateAttributesToTables();
