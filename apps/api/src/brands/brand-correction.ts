/**
 * 品牌修正规则
 *
 * 当 AI 输出母品牌（如 "Nike"）但标题包含子品牌关键词（如 "Jordan"）时，
 * 自动修正为更具体的子品牌名。
 *
 * 只在 AI 输出母品牌时触发，不会修改已经正确识别的子品牌。
 */

interface BrandCorrectionRule {
  /** title 中的关键词（小写），任一匹配即触发 */
  titleKeywords: string[];
  /** 触发修正的母品牌名（小写） */
  parentBrand: string;
  /** 修正后的子品牌名 */
  correctBrand: string;
}

/**
 * 修正规则表
 * 规则按优先级排列：更具体的关键词应排在前面
 */
const BRAND_CORRECTION_RULES: BrandCorrectionRule[] = [
  // ========== Nike 子品牌 ==========
  {
    titleKeywords: ['jordan', 'jumpman'],
    parentBrand: 'nike',
    correctBrand: 'Air Jordan',
  },
  {
    titleKeywords: ['nike sb', 'sb dunk', 'dunk sb'],
    parentBrand: 'nike',
    correctBrand: 'Nike SB',
  },
  {
    titleKeywords: ['nike acg'],
    parentBrand: 'nike',
    correctBrand: 'Nike ACG',
  },

  // ========== Adidas 子品牌 ==========
  {
    titleKeywords: ['yeezy'],
    parentBrand: 'adidas',
    correctBrand: 'Adidas Yeezy',
  },
  {
    titleKeywords: ['y-3', 'y3 '],
    parentBrand: 'adidas',
    correctBrand: 'Adidas Y-3',
  },
  {
    titleKeywords: ['adidas originals', 'originals'],
    parentBrand: 'adidas',
    correctBrand: 'Adidas Originals',
  },

  // ========== Converse 子品牌 ==========
  {
    titleKeywords: ['cdg', 'comme des garcons', 'comme des garçons'],
    parentBrand: 'converse',
    correctBrand: 'Converse x CDG',
  },

  // ========== Dior 子品牌 ==========
  {
    titleKeywords: ['dior homme', 'dior men'],
    parentBrand: 'dior',
    correctBrand: 'Dior Homme',
  },

  // ========== Prada 子品牌 ==========
  {
    titleKeywords: ['miu miu'],
    parentBrand: 'prada',
    correctBrand: 'Miu Miu',
  },

  // ========== Puma 子品牌 ==========
  {
    titleKeywords: ['fenty'],
    parentBrand: 'puma',
    correctBrand: 'Puma x Fenty',
  },

  // ========== Marc Jacobs 子品牌 ==========
  {
    titleKeywords: ['marc by marc'],
    parentBrand: 'marc jacobs',
    correctBrand: 'Marc by Marc Jacobs',
  },

  // ========== Ralph Lauren 子品牌 ==========
  {
    titleKeywords: ['purple label'],
    parentBrand: 'ralph lauren',
    correctBrand: 'Purple Label',
  },
  {
    titleKeywords: ['polo ralph', 'polo rl'],
    parentBrand: 'ralph lauren',
    correctBrand: 'Polo Ralph Lauren',
  },
];

/**
 * 根据产品标题修正 AI 识别的品牌名
 *
 * @param aiBrand AI 输出的品牌名
 * @param title 产品标题（AI 生成的英文标题）
 * @returns 修正后的品牌名（如果匹配规则），否则返回原始品牌名
 */
export function correctBrandByTitle(aiBrand: string, title: string): string {
  if (!aiBrand || !title) return aiBrand;

  const brandLower = aiBrand.toLowerCase().trim();
  const titleLower = title.toLowerCase();

  for (const rule of BRAND_CORRECTION_RULES) {
    if (brandLower !== rule.parentBrand) continue;

    const matched = rule.titleKeywords.some((kw) => titleLower.includes(kw));
    if (matched) {
      return rule.correctBrand;
    }
  }

  return aiBrand;
}

/** 导出规则表供测试使用 */
export { BRAND_CORRECTION_RULES };
