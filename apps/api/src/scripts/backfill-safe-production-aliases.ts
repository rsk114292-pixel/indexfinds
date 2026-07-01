import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { join } from 'path';

dotenv.config();

const DEFAULT_INPUT = '/tmp/finds-prod-brand-aliases.tsv';

const PRODUCT_HINT_WORDS = new Set([
  'bag',
  'bags',
  'bracelet',
  'bracelets',
  'watch',
  'watches',
  'wallet',
  'wallets',
  'belt',
  'belts',
  'shoe',
  'shoes',
  'sneaker',
  'sneakers',
  'boot',
  'boots',
  'loafer',
  'loafers',
  'heel',
  'heels',
  'sandal',
  'sandals',
  'tote',
  'totes',
  'hoodie',
  'hoodies',
  'tee',
  'tees',
  'shirt',
  'shirts',
  'sunglasses',
  'glasses',
  'goggles',
  'perfume',
  'parfum',
  'fragrance',
  'necklace',
  'necklaces',
  'ring',
  'rings',
  'earring',
  'earrings',
  'luggage',
  'hardware',
  'driving',
  'jacket',
  'coat',
  'coat',
  'puffer',
  'logo',
  'suit',
  'suits',
  'jean',
  'jeans',
  'denim',
  'underwear',
  'kids',
  'factory',
  'body',
]);

const GENERIC_MODEL_KEYS = new Set([
  'classic',
  'mini',
  'small',
  'medium',
  'large',
  'teen',
  'logo',
  'vintage',
  'v2',
  'v3',
]);

const CJK_PRODUCT_HINTS = [
  '手机',
  '耳机',
  '手表',
  '项链',
  '戒指',
  '包',
  '鞋',
  '外套',
  '裤',
  '裙',
];

type LocalBrand = {
  id: string;
  name: string;
  aliases: string[];
};

type ProdAliasRow = {
  name: string;
  aliases: string[];
};

type Classification =
  | 'duplicate'
  | 'existing-conflict'
  | 'product-hint'
  | 'generic-model'
  | 'too-short'
  | 'too-long'
  | 'low-confidence'
  | 'safe-name-variant'
  | 'safe-acronym'
  | 'safe-spelling-variant'
  | 'safe-token-variant';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  synchronize: false,
});

function getInputPath(): string {
  const arg = process.argv.find((value) => value.startsWith('--input='));
  return arg ? arg.split('=')[1] : DEFAULT_INPUT;
}

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

function shouldResetProdBackfill(): boolean {
  return process.argv.includes('--reset-prod-backfill');
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function stripDiacritics(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function generateCanonicalKey(value: string): string {
  return stripDiacritics(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function tokenize(value: string): string[] {
  return stripDiacritics(value)
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5]+/g)
    .map((token) => token.trim())
    .filter(Boolean);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function splitAliases(raw: string | null | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean);
}

function buildAcronym(tokens: string[]): string {
  return tokens
    .filter((token) => token.length > 0)
    .map((token) => token[0])
    .join('')
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function classifyAlias(
  alias: string,
  brandName: string,
  existingValues: string[],
): Classification {
  const normalizedAlias = normalizeWhitespace(alias);
  const aliasKey = generateCanonicalKey(normalizedAlias);
  const brandKey = generateCanonicalKey(brandName);
  const existingKeys = new Set(existingValues.map((value) => generateCanonicalKey(value)));

  if (!aliasKey || existingKeys.has(aliasKey) || aliasKey === brandKey) {
    return 'duplicate';
  }

  if (normalizedAlias.length < 2) {
    return 'too-short';
  }

  if (normalizedAlias.length > 80) {
    return 'too-long';
  }

  const aliasTokens = tokenize(normalizedAlias);
  const brandTokens = tokenize(brandName);
  const allKnownTokens = new Set(existingValues.flatMap((value) => tokenize(value)));
  for (const token of brandTokens) {
    allKnownTokens.add(token);
  }

  if (aliasTokens.some((token) => PRODUCT_HINT_WORDS.has(token))) {
    return 'product-hint';
  }

  if (
    aliasTokens.length <= 2 &&
    aliasTokens.every((token) => GENERIC_MODEL_KEYS.has(token))
  ) {
    return 'generic-model';
  }

  if (CJK_PRODUCT_HINTS.some((token) => normalizedAlias.includes(token))) {
    return 'product-hint';
  }

  const brandAcronym = buildAcronym(brandTokens);
  const aliasAcronym = buildAcronym(aliasTokens);
  if (
    brandAcronym.length >= 3 &&
    brandAcronym.length <= 6 &&
    (aliasKey === brandAcronym || aliasAcronym === brandAcronym)
  ) {
    return 'safe-acronym';
  }

  if (
    aliasKey.includes(brandKey) ||
    brandKey.includes(aliasKey) ||
    existingValues.some((value) => {
      const key = generateCanonicalKey(value);
      return key && (aliasKey.includes(key) || key.includes(aliasKey));
    })
  ) {
    return 'safe-name-variant';
  }

  const overlappingTokenCount = aliasTokens.filter((token) =>
    allKnownTokens.has(token),
  ).length;
  if (aliasTokens.length > 0 && overlappingTokenCount / aliasTokens.length >= 0.6) {
    return 'safe-token-variant';
  }

  const spellingThreshold = aliasKey.length >= 10 ? 3 : 2;
  if (levenshtein(aliasKey, brandKey) <= spellingThreshold) {
    return 'safe-spelling-variant';
  }

  for (const value of existingValues) {
    const key = generateCanonicalKey(value);
    if (!key) {
      continue;
    }
    const threshold = key.length >= 10 ? 3 : 2;
    if (levenshtein(aliasKey, key) <= threshold) {
      return 'safe-spelling-variant';
    }
  }

  return 'low-confidence';
}

function loadProductionAliases(inputPath: string): ProdAliasRow[] {
  const resolvedPath = inputPath.startsWith('/')
    ? inputPath
    : join(process.cwd(), inputPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`);
  }

  return fs
    .readFileSync(resolvedPath, 'utf8')
    .split(/\n+/)
    .filter(Boolean)
    .map((line) => {
      const [name, rawAliases = ''] = line.split('\t');
      return {
        name: normalizeWhitespace(name),
        aliases: splitAliases(rawAliases),
      };
    });
}

async function loadLocalBrands() {
  const brands = await dataSource.query(
    `SELECT id, name, aliases
     FROM brands
     ORDER BY name ASC`,
  );

  const aliasRows = await dataSource.query(
    `SELECT id, "brandId" as "brandId", alias, "normalizedAlias" as "normalizedAlias"
     FROM brand_aliases`,
  );

  const localBrands: LocalBrand[] = brands.map((row: any) => ({
    id: row.id,
    name: row.name,
    aliases: splitAliases(row.aliases),
  }));

  const brandById = new Map<string, LocalBrand>();
  const brandByNameKey = new Map<string, LocalBrand>();
  const brandByAliasKey = new Map<string, LocalBrand>();
  const normalizedAliasToBrandId = new Map<string, string>();

  for (const brand of localBrands) {
    brandById.set(brand.id, brand);
    brandByNameKey.set(generateCanonicalKey(brand.name), brand);
    for (const alias of brand.aliases) {
      const key = generateCanonicalKey(alias);
      if (key && !brandByAliasKey.has(key)) {
        brandByAliasKey.set(key, brand);
      }
    }
  }

  for (const row of aliasRows) {
    normalizedAliasToBrandId.set(row.normalizedAlias, row.brandId);
    const brand = brandById.get(row.brandId);
    if (!brand) {
      continue;
    }
    if (!brand.aliases.includes(row.alias)) {
      brand.aliases.push(row.alias);
    }
    const key = generateCanonicalKey(row.alias);
    if (key && !brandByAliasKey.has(key)) {
      brandByAliasKey.set(key, brand);
    }
  }

  return {
    localBrands,
    brandById,
    brandByNameKey,
    brandByAliasKey,
    normalizedAliasToBrandId,
  };
}

async function upsertNormalizedAlias(
  brandId: string,
  alias: string,
  normalizedAlias: string,
  aliasType = 'prod_safe_variant',
) {
  const existing = await dataSource.query(
    `SELECT id, "brandId" as "brandId"
     FROM brand_aliases
     WHERE "normalizedAlias" = $1
     LIMIT 1`,
    [normalizedAlias],
  );

  if (existing.length > 0) {
    return existing[0].brandId === brandId ? 'exists' : 'conflict';
  }

  await dataSource.query(
    `INSERT INTO brand_aliases (
       "brandId",
       alias,
       "normalizedAlias",
       "aliasType",
       source,
       "isPreferred"
     )
     VALUES ($1, $2, $3, $4, 'prod_backfill', false)`,
    [brandId, alias, normalizedAlias, aliasType],
  );

  return 'inserted';
}

async function resetProdBackfillAliases() {
  const rows = await dataSource.query(
    `SELECT "brandId" as "brandId", alias
     FROM brand_aliases
     WHERE source = 'prod_backfill'`,
  );

  if (rows.length === 0) {
    return { removedRows: 0, touchedBrands: 0 };
  }

  const byBrand = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!byBrand.has(row.brandId)) {
      byBrand.set(row.brandId, new Set());
    }
    byBrand.get(row.brandId)!.add(row.alias);
  }

  for (const [brandId, aliasesToRemove] of byBrand.entries()) {
    const brandRows = await dataSource.query(
      `SELECT aliases
       FROM brands
       WHERE id = $1
       LIMIT 1`,
      [brandId],
    );

    if (brandRows.length === 0) {
      continue;
    }

    const currentAliases = splitAliases(brandRows[0].aliases);
    const nextAliases = currentAliases.filter((alias) => !aliasesToRemove.has(alias));

    await dataSource.query(
      `UPDATE brands
       SET aliases = $1,
           "updatedAt" = now()
       WHERE id = $2`,
      [nextAliases.length ? nextAliases.join(',') : null, brandId],
    );
  }

  await dataSource.query(`DELETE FROM brand_aliases WHERE source = 'prod_backfill'`);

  return {
    removedRows: rows.length,
    touchedBrands: byBrand.size,
  };
}

async function main() {
  const inputPath = getInputPath();
  const dryRun = isDryRun();
  const resetProdBackfill = shouldResetProdBackfill();

  await dataSource.initialize();
  console.log('✅ Database connected');
  console.log(`📥 Input: ${inputPath}`);
  console.log(`🧪 Mode: ${dryRun ? 'dry-run' : 'apply'}`);

  if (!dryRun && resetProdBackfill) {
    const resetStats = await resetProdBackfillAliases();
    console.log(
      `♻️ Reset previous prod_backfill aliases: ${resetStats.removedRows} rows across ${resetStats.touchedBrands} brands`,
    );
  }

  const productionRows = loadProductionAliases(inputPath);
  const {
    localBrands,
    brandByNameKey,
    brandByAliasKey,
    normalizedAliasToBrandId,
  } = await loadLocalBrands();

  const localBrandCount = localBrands.length;
  const existingLegacyAliasCount = localBrands.reduce(
    (sum, brand) => sum + brand.aliases.length,
    0,
  );

  let matchedBrands = 0;
  let consideredCandidates = 0;
  let insertedNormalized = 0;
  let updatedLegacyBrands = 0;
  let conflicts = 0;
  const rejectedByReason = new Map<string, number>();
  const updatedLegacyBrandIds = new Set<string>();

  for (const row of productionRows) {
    const productionNameKey = generateCanonicalKey(row.name);
    const targetBrand =
      brandByNameKey.get(productionNameKey) || brandByAliasKey.get(productionNameKey);

    if (!targetBrand) {
      continue;
    }

    matchedBrands += 1;

    const existingValues = unique([targetBrand.name, ...targetBrand.aliases]);
    const candidates = unique([
      ...(productionNameKey !== generateCanonicalKey(targetBrand.name) ? [row.name] : []),
      ...row.aliases,
    ]);

    let brandTouched = false;

    for (const candidate of candidates) {
      consideredCandidates += 1;
      const normalizedAlias = normalizeWhitespace(candidate);
      const normalizedKey = generateCanonicalKey(normalizedAlias);

      if (!normalizedKey) {
        continue;
      }

      const classification = classifyAlias(
        normalizedAlias,
        targetBrand.name,
        existingValues,
      );

      if (!classification.startsWith('safe-')) {
        rejectedByReason.set(
          classification,
          (rejectedByReason.get(classification) || 0) + 1,
        );
        continue;
      }

      const existingOwner = normalizedAliasToBrandId.get(normalizedKey);
      if (existingOwner && existingOwner !== targetBrand.id) {
        conflicts += 1;
        rejectedByReason.set(
          'existing-conflict',
          (rejectedByReason.get('existing-conflict') || 0) + 1,
        );
        continue;
      }

      if (!dryRun) {
        const result = await upsertNormalizedAlias(
          targetBrand.id,
          normalizedAlias,
          normalizedKey,
          'prod_safe_variant',
        );

        if (result === 'conflict') {
          conflicts += 1;
          rejectedByReason.set(
            'existing-conflict',
            (rejectedByReason.get('existing-conflict') || 0) + 1,
          );
          continue;
        }

        if (result === 'inserted') {
          insertedNormalized += 1;
          normalizedAliasToBrandId.set(normalizedKey, targetBrand.id);
        }
      } else {
        if (!normalizedAliasToBrandId.has(normalizedKey)) {
          insertedNormalized += 1;
          normalizedAliasToBrandId.set(normalizedKey, targetBrand.id);
        }
      }

      if (!targetBrand.aliases.includes(normalizedAlias)) {
        targetBrand.aliases.push(normalizedAlias);
        existingValues.push(normalizedAlias);
        brandTouched = true;
      }
    }

    if (brandTouched) {
      updatedLegacyBrandIds.add(targetBrand.id);
    }
  }

  if (!dryRun) {
    for (const brand of localBrands) {
      if (!updatedLegacyBrandIds.has(brand.id)) {
        continue;
      }
      await dataSource.query(
        `UPDATE brands
         SET aliases = $1,
             "updatedAt" = now()
         WHERE id = $2`,
        [brand.aliases.join(','), brand.id],
      );
      updatedLegacyBrands += 1;
    }
  } else {
    updatedLegacyBrands = updatedLegacyBrandIds.size;
  }

  const summary = {
    local_brand_objects: localBrandCount,
    matched_production_rows: matchedBrands,
    considered_candidates: consideredCandidates,
    inserted_normalized_aliases: insertedNormalized,
    updated_legacy_brands: updatedLegacyBrands,
    existing_legacy_alias_tokens_before: existingLegacyAliasCount,
    conflicts,
    rejected_by_reason: Object.fromEntries(
      [...rejectedByReason.entries()].sort((a, b) => b[1] - a[1]),
    ),
  };

  console.log('\n📊 Safe alias backfill summary');
  console.log(JSON.stringify(summary, null, 2));

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error('❌ Safe alias backfill failed:', error);
  try {
    await dataSource.destroy();
  } catch {}
  process.exit(1);
});
