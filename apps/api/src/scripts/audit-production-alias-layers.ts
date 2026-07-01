import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { join } from 'path';

dotenv.config();

const DEFAULT_INPUT = '/tmp/finds-prod-brand-aliases.tsv';
const DEFAULT_MD_OUTPUT = join(
  process.cwd(),
  '../../Docs/03-Planning/brand-system/12-production-alias-layer-audit.md',
);
const DEFAULT_JSON_OUTPUT = '/tmp/finds-prod-alias-layer-audit.json';

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

type BaseClassification =
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

type Layer = 'strict' | 'soft' | 'reject';

type AuditRow = {
  productionName: string;
  localBrand: string;
  alias: string;
  classification: BaseClassification;
  layer: Layer;
  alreadyPresent: boolean;
};

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lolobuyspreadsheets_dev',
  synchronize: false,
});

function getArgValue(prefix: string, fallback: string): string {
  const arg = process.argv.find((value) => value.startsWith(`${prefix}=`));
  return arg ? arg.slice(prefix.length + 1) : fallback;
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
): BaseClassification {
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

function toLayer(classification: BaseClassification): Layer {
  if (
    classification === 'safe-name-variant' ||
    classification === 'safe-acronym' ||
    classification === 'safe-spelling-variant' ||
    classification === 'safe-token-variant'
  ) {
    return 'strict';
  }

  if (
    classification === 'product-hint' ||
    classification === 'generic-model'
  ) {
    return 'soft';
  }

  return 'reject';
}

function loadProductionAliases(inputPath: string): ProdAliasRow[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  return fs
    .readFileSync(inputPath, 'utf8')
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

  const normalizedAliases = await dataSource.query(
    `SELECT alias
     FROM brand_aliases`,
  );

  const localBrands: LocalBrand[] = brands.map((row: any) => ({
    id: row.id,
    name: row.name,
    aliases: splitAliases(row.aliases),
  }));

  const brandByNameKey = new Map<string, LocalBrand>();
  const brandByAliasKey = new Map<string, LocalBrand>();
  const existingAliasKeys = new Set<string>();

  for (const brand of localBrands) {
    brandByNameKey.set(generateCanonicalKey(brand.name), brand);
    for (const alias of brand.aliases) {
      const key = generateCanonicalKey(alias);
      if (!key) {
        continue;
      }
      if (!brandByAliasKey.has(key)) {
        brandByAliasKey.set(key, brand);
      }
      existingAliasKeys.add(key);
    }
  }

  for (const row of normalizedAliases) {
    existingAliasKeys.add(generateCanonicalKey(row.alias));
  }

  return { localBrands, brandByNameKey, brandByAliasKey, existingAliasKeys };
}

function renderMarkdown(summary: any, rows: AuditRow[]) {
  const topRows = (layer: Layer, limit = 30) =>
    rows
      .filter((row) => row.layer === layer)
      .slice(0, limit)
      .map(
        (row) =>
          `| ${row.localBrand} | ${row.alias.replace(/\|/g, '\\|')} | ${row.classification} | ${row.alreadyPresent ? 'yes' : 'no'} |`,
      )
      .join('\n');

  return `# Production Alias Layer Audit

Date: 2026-04-16

## Summary

- Local brand objects: ${summary.localBrandObjects}
- Matched production brand rows: ${summary.matchedProductionRows}
- Evaluated alias candidates: ${summary.evaluatedAliases}
- Strict aliases: ${summary.strict}
- Soft hints: ${summary.soft}
- Reject: ${summary.reject}
- Already present before audit: ${summary.alreadyPresent}

## Strict

These are safe for direct brand binding.

| Brand | Alias | Classification | Already Present |
| --- | --- | --- | --- |
${topRows('strict') || '| - | - | - | - |'}

## Soft

These should not directly auto-bind the brand. Keep them as hint-only words.

| Brand | Alias | Classification | Already Present |
| --- | --- | --- | --- |
${topRows('soft') || '| - | - | - | - |'}

## Reject

These are too risky, too generic, or too noisy for brand binding.

| Brand | Alias | Classification | Already Present |
| --- | --- | --- | --- |
${topRows('reject') || '| - | - | - | - |'}
`;
}

async function main() {
  const inputPath = getArgValue('--input', DEFAULT_INPUT);
  const mdOutputPath = getArgValue('--md-output', DEFAULT_MD_OUTPUT);
  const jsonOutputPath = getArgValue('--json-output', DEFAULT_JSON_OUTPUT);

  await dataSource.initialize();
  console.log('✅ Database connected');

  const productionRows = loadProductionAliases(inputPath);
  const { localBrands, brandByNameKey, brandByAliasKey, existingAliasKeys } =
    await loadLocalBrands();

  const auditRows: AuditRow[] = [];

  for (const row of productionRows) {
    const productionNameKey = generateCanonicalKey(row.name);
    const targetBrand =
      brandByNameKey.get(productionNameKey) || brandByAliasKey.get(productionNameKey);

    if (!targetBrand) {
      continue;
    }

    const existingValues = unique([targetBrand.name, ...targetBrand.aliases]);
    const candidates = unique([
      ...(productionNameKey !== generateCanonicalKey(targetBrand.name) ? [row.name] : []),
      ...row.aliases,
    ]);

    for (const candidate of candidates) {
      const classification = classifyAlias(
        candidate,
        targetBrand.name,
        existingValues,
      );

      if (classification === 'duplicate') {
        continue;
      }

      const aliasKey = generateCanonicalKey(candidate);
      auditRows.push({
        productionName: row.name,
        localBrand: targetBrand.name,
        alias: normalizeWhitespace(candidate),
        classification,
        layer: toLayer(classification),
        alreadyPresent: existingAliasKeys.has(aliasKey),
      });
    }
  }

  auditRows.sort((a, b) => {
    if (a.layer !== b.layer) {
      return a.layer.localeCompare(b.layer);
    }
    if (a.localBrand !== b.localBrand) {
      return a.localBrand.localeCompare(b.localBrand);
    }
    return a.alias.localeCompare(b.alias);
  });

  const summary = {
    localBrandObjects: localBrands.length,
    matchedProductionRows: unique(auditRows.map((row) => row.productionName)).length,
    evaluatedAliases: auditRows.length,
    strict: auditRows.filter((row) => row.layer === 'strict').length,
    soft: auditRows.filter((row) => row.layer === 'soft').length,
    reject: auditRows.filter((row) => row.layer === 'reject').length,
    alreadyPresent: auditRows.filter((row) => row.alreadyPresent).length,
  };

  fs.writeFileSync(
    jsonOutputPath,
    JSON.stringify({ summary, rows: auditRows }, null, 2),
    'utf8',
  );
  fs.writeFileSync(mdOutputPath, renderMarkdown(summary, auditRows), 'utf8');

  console.log(`📄 Markdown report: ${mdOutputPath}`);
  console.log(`📄 JSON report: ${jsonOutputPath}`);
  console.log(JSON.stringify(summary, null, 2));

  await dataSource.destroy();
}

main().catch(async (error) => {
  console.error('❌ Alias audit failed:', error);
  try {
    await dataSource.destroy();
  } catch {}
  process.exit(1);
});
