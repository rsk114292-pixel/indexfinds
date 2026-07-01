/**
 * 标准化产品 AI 属性 - occasions 和 styles
 *
 * 背景：AI 之前没有词表约束，生成了大量不一致的属性值。
 * 本脚本将现有产品的 occasions 和 styles 统一映射到标准词表。
 *
 * 标准词表：
 *   occasions: Daily Wear, Casual, Sport, Travel, Party, Formal, Outdoor, School
 *   styles:    Streetwear, Casual, Luxury, Classic, Sporty, Minimalist, Elegant, Retro, Athleisure, Avant-Garde
 *
 * 使用方法:
 *   npx ts-node -r tsconfig-paths/register src/scripts/normalize-ai-attributes.ts [--apply]
 *
 *   不带 --apply 参数时为 dry-run 模式（只显示会改什么，不实际修改）
 *   带 --apply 参数时实际执行更新
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

// ============================================================
// 标准词表
// ============================================================
const VALID_OCCASIONS = new Set([
  'Daily Wear',
  'Casual',
  'Sport',
  'Travel',
  'Party',
  'Formal',
  'Outdoor',
  'School',
]);

const VALID_STYLES = new Set([
  'Streetwear',
  'Casual',
  'Luxury',
  'Classic',
  'Sporty',
  'Minimalist',
  'Elegant',
  'Retro',
  'Athleisure',
  'Avant-Garde',
]);

// ============================================================
// 映射表：旧值 → 新值（不区分大小写匹配）
// ============================================================
const OCCASIONS_MAP: Record<string, string> = {
  // Fashion 系列
  fashion: 'Casual',
  'fashion event': 'Party',
  'fashion events': 'Party',
  'fashion statement': 'Party',
  'fashion show': 'Party',
  'fashion forward': 'Casual',
  // 聚会/外出
  'night out': 'Party',
  'evening out': 'Party',
  'evening wear': 'Party',
  evening: 'Party',
  'social gatherings': 'Party',
  'social gathering': 'Party',
  'date night': 'Party',
  cocktail: 'Party',
  'cocktail party': 'Party',
  'art events': 'Party',
  // 正式场合
  business: 'Formal',
  'business casual': 'Formal',
  'smart casual': 'Formal',
  'smart-casual': 'Formal',
  'formal events': 'Formal',
  'formal event': 'Formal',
  wedding: 'Formal',
  office: 'Formal',
  work: 'Formal',
  // 休闲
  'street style': 'Casual',
  'casual wear': 'Casual',
  weekend: 'Casual',
  lunch: 'Casual',
  gift: 'Casual',
  driving: 'Casual',
  layering: 'Casual',
  'car events': 'Casual',
  'fan apparel': 'Casual',
  // 日常
  everyday: 'Daily Wear',
  'everyday wear': 'Daily Wear',
  daily: 'Daily Wear',
  commute: 'Daily Wear',
  'urban commuting': 'Daily Wear',
  // 运动/训练
  sports: 'Sport',
  athletic: 'Sport',
  gym: 'Sport',
  workout: 'Sport',
  running: 'Sport',
  'light running': 'Sport',
  training: 'Sport',
  'soccer match': 'Sport',
  'match day': 'Sport',
  // 户外
  outdoors: 'Outdoor',
  hiking: 'Outdoor',
  camping: 'Outdoor',
  skiing: 'Outdoor',
  // 上学
  campus: 'School',
  college: 'School',
  university: 'School',
  // 出行
  vacation: 'Travel',
  holiday: 'Travel',
  resort: 'Travel',
};

const STYLES_MAP: Record<string, string> = {
  // 运动相关
  basketball: 'Sporty',
  athletic: 'Sporty',
  sport: 'Sporty',
  'sporty casual': 'Sporty',
  technical: 'Sporty',
  performance: 'Sporty',
  utility: 'Sporty',
  motorsport: 'Sporty',
  outdoor: 'Sporty',
  // 奢华相关
  'luxury casual': 'Luxury',
  'luxury collaboration': 'Luxury',
  'high fashion': 'Luxury',
  designer: 'Luxury',
  premium: 'Luxury',
  'high-end': 'Luxury',
  // 经典相关
  heritage: 'Classic',
  timeless: 'Classic',
  traditional: 'Classic',
  preppy: 'Classic',
  aviation: 'Classic',
  // 当代/现代/街头
  contemporary: 'Casual',
  modern: 'Casual',
  resort: 'Casual',
  urban: 'Streetwear',
  street: 'Streetwear',
  'hip-hop': 'Streetwear',
  hiphop: 'Streetwear',
  chunky: 'Streetwear',
  graphic: 'Streetwear',
  collaborative: 'Streetwear',
  // 女性化/优雅
  feminine: 'Elegant',
  chic: 'Elegant',
  sophisticated: 'Elegant',
  // 复古
  vintage: 'Retro',
  'old school': 'Retro',
  throwback: 'Retro',
  // 极简
  simple: 'Minimalist',
  clean: 'Minimalist',
  basic: 'Minimalist',
  // 运动休闲
  'gym casual': 'Athleisure',
  activewear: 'Athleisure',
  // 先锋
  experimental: 'Avant-Garde',
  artistic: 'Avant-Garde',
  bold: 'Avant-Garde',
  deconstructed: 'Avant-Garde',
};

// ============================================================
// 核心映射函数
// ============================================================
function normalizeValue(
  value: string,
  validSet: Set<string>,
  mappingTable: Record<string, string>,
): string | null {
  // 1. 已经是标准值，直接返回
  if (validSet.has(value)) return value;

  // 2. 查映射表（不区分大小写）
  const lowerValue = value.toLowerCase().trim();
  const mapped = mappingTable[lowerValue];
  if (mapped) return mapped;

  // 3. 尝试首字母大写后匹配标准值
  const titleCase = value
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  if (validSet.has(titleCase)) return titleCase;

  // 4. 无法映射，丢弃
  return null;
}

function normalizeArray(
  values: string[] | undefined,
  validSet: Set<string>,
  mappingTable: Record<string, string>,
): { normalized: string[]; changed: boolean; removed: string[] } {
  if (!values || values.length === 0) {
    return { normalized: [], changed: false, removed: [] };
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  const removed: string[] = [];

  for (const val of values) {
    const result = normalizeValue(val, validSet, mappingTable);
    if (result && !seen.has(result)) {
      seen.add(result);
      normalized.push(result);
    } else if (!result) {
      removed.push(val);
    }
  }

  const changed =
    JSON.stringify(values.sort()) !== JSON.stringify(normalized.slice().sort());

  return { normalized, changed, removed };
}

// ============================================================
// 主函数
// ============================================================
async function normalizeAiAttributes() {
  const isDryRun = !process.argv.includes('--apply');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const dataSource = app.get(DataSource);

  console.log(
    `\n🔧 标准化 AI 属性 (${isDryRun ? 'DRY RUN - 不会实际修改' : '⚠️  实际执行修改'})\n`,
  );

  // 查所有有 aiAttributes 的产品
  const products = await dataSource.query(`
    SELECT id, title, "aiAttributes"
    FROM products
    WHERE "aiAttributes" IS NOT NULL
    ORDER BY "createdAt" DESC
  `);

  console.log(`📦 共找到 ${products.length} 个有 aiAttributes 的产品\n`);

  let changedCount = 0;
  let skippedCount = 0;
  const changeLog: Array<{
    id: string;
    title: string;
    occasionsBefore: string[];
    occasionsAfter: string[];
    stylesBefore: string[];
    stylesAfter: string[];
  }> = [];

  for (const product of products) {
    let attrs: Record<string, any>;
    try {
      attrs =
        typeof product.aiAttributes === 'string'
          ? JSON.parse(product.aiAttributes)
          : product.aiAttributes;
    } catch {
      continue;
    }

    const {
      normalized: normalizedOccasions,
      changed: occasionsChanged,
      removed: occasionsRemoved,
    } = normalizeArray(attrs.occasions, VALID_OCCASIONS, OCCASIONS_MAP);

    const {
      normalized: normalizedStyles,
      changed: stylesChanged,
      removed: stylesRemoved,
    } = normalizeArray(attrs.styles, VALID_STYLES, STYLES_MAP);

    if (!occasionsChanged && !stylesChanged) {
      skippedCount++;
      continue;
    }

    changeLog.push({
      id: product.id,
      title: product.title,
      occasionsBefore: attrs.occasions || [],
      occasionsAfter: normalizedOccasions,
      stylesBefore: attrs.styles || [],
      stylesAfter: normalizedStyles,
    });

    if (occasionsRemoved.length > 0) {
      console.log(
        `  ⚠️  occasions 丢弃（无法映射）: ${occasionsRemoved.join(', ')}`,
      );
    }
    if (stylesRemoved.length > 0) {
      console.log(`  ⚠️  styles 丢弃（无法映射）: ${stylesRemoved.join(', ')}`);
    }

    if (!isDryRun) {
      const updatedAttrs = {
        ...attrs,
        occasions: normalizedOccasions,
        styles: normalizedStyles,
      };
      await dataSource.query(
        `UPDATE products SET "aiAttributes" = $1 WHERE id = $2`,
        [JSON.stringify(updatedAttrs), product.id],
      );
    }

    changedCount++;
  }

  // ============================================================
  // 打印变更报告
  // ============================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 变更报告\n');

  for (const log of changeLog) {
    const occasionsChanged =
      JSON.stringify(log.occasionsBefore) !==
      JSON.stringify(log.occasionsAfter);
    const stylesChanged =
      JSON.stringify(log.stylesBefore) !== JSON.stringify(log.stylesAfter);

    console.log(`📦 ${log.title.substring(0, 50)}`);
    if (occasionsChanged) {
      console.log(
        `   occasions: [${log.occasionsBefore.join(', ')}] → [${log.occasionsAfter.join(', ')}]`,
      );
    }
    if (stylesChanged) {
      console.log(
        `   styles:    [${log.stylesBefore.join(', ')}] → [${log.stylesAfter.join(', ')}]`,
      );
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`✅ 需要更新: ${changedCount} 个产品`);
  console.log(`⏭️  无需更新: ${skippedCount} 个产品`);

  if (isDryRun && changedCount > 0) {
    console.log(`\n💡 运行以下命令实际执行更新:`);
    console.log(
      `   npx ts-node -r tsconfig-paths/register src/scripts/normalize-ai-attributes.ts --apply\n`,
    );
  } else if (!isDryRun) {
    console.log(`\n✅ 已更新 ${changedCount} 个产品\n`);
  }

  await app.close();
}

normalizeAiAttributes().catch(console.error);
