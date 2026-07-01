/**
 * 品类互补映射（slug-based）
 *
 * 定义每个品类的互补推荐品类，用于"搭配推荐"功能。
 * 当前为纯配置文件硬编码，后续需要动态管理时再迁移到 Settings 表。
 *
 * 注意：slug 必须与数据库中 categories 表的 slug 字段一致。
 * 使用父级分类 slug 时，查询会自动包含其所有子孙分类。
 */
export const COMPLEMENT_MAP: Record<string, string[]> = {
  // ── Tops ──────────────────────────────────────────────
  't-shirts': ['bottoms', 'sneakers', 'hats', 'bags'],
  hoodies: ['bottoms', 'sneakers', 'hats', 'bags', 'jackets'],
  sweaters: ['bottoms', 'sneakers', 'hats', 'bags'],
  cardigans: ['bottoms', 'sneakers', 'bags', 'belts'],
  shirts: ['bottoms', 'sneakers', 'belts', 'bags'],
  'polo-shirts': ['bottoms', 'sneakers', 'belts', 'bags'],
  tops: ['bottoms', 'sneakers', 'bags', 'hats'],

  // ── Bottoms ───────────────────────────────────────────
  bottoms: ['t-shirts', 'hoodies', 'sneakers', 'belts', 'bags'],
  jeans: ['t-shirts', 'hoodies', 'sneakers', 'belts', 'bags'],
  'casual-pants': ['t-shirts', 'hoodies', 'sneakers', 'belts', 'bags'],
  shorts: ['t-shirts', 'sneakers', 'hats', 'bags'],

  // ── Outerwear ─────────────────────────────────────────
  jackets: ['t-shirts', 'bottoms', 'sneakers', 'bags', 'hats'],
  outerwear: ['t-shirts', 'bottoms', 'sneakers', 'bags'],

  // ── Activewear ────────────────────────────────────────
  activewear: ['sneakers', 'bottoms', 'bags', 'hats'],
  'track-suits': ['sneakers', 'bags', 'hats', 'sunglasses'],
  'sports-t-shirts': ['bottoms', 'sneakers', 'bags', 'hats'],

  // ── Dresses ───────────────────────────────────────────
  dresses: ['shoes', 'bags', 'jewelry', 'belts'],

  // ── Shoes ─────────────────────────────────────────────
  sneakers: ['bottoms', 'shorts', 't-shirts', 'bags', 'hats'],
  shoes: ['bottoms', 't-shirts', 'bags', 'hats'],
  boots: ['bottoms', 'jackets', 'bags', 'scarves'],
  slippers: ['shorts', 't-shirts', 'bags', 'hats'],
  'high-heels': ['dresses', 'bags', 'jewelry', 'belts'],

  // ── Bags ──────────────────────────────────────────────
  bags: ['t-shirts', 'hoodies', 'sneakers', 'jackets'],
  backpacks: ['t-shirts', 'hoodies', 'sneakers', 'jackets'],
  handbags: ['t-shirts', 'bottoms', 'sneakers', 'belts'],
  wallets: ['bags', 'belts', 'watches', 'sunglasses'],

  // ── Accessories ───────────────────────────────────────
  hats: ['t-shirts', 'hoodies', 'jackets', 'sneakers'],
  belts: ['bottoms', 'shirts', 'sneakers', 'bags'],
  watches: ['shirts', 'belts', 'bags', 'sneakers'],
  sunglasses: ['t-shirts', 'hats', 'sneakers', 'bags'],
  jewelry: ['dresses', 'shirts', 'bags', 'watches'],
};

/**
 * 通用 fallback 互补品类
 * 当商品品类及其所有祖先都不在 COMPLEMENT_MAP 中时使用
 */
export const FALLBACK_COMPLEMENTS: string[] = [
  'sneakers',
  'bags',
  't-shirts',
  'bottoms',
  'hats',
];
