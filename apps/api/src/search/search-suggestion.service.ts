import { Injectable } from '@nestjs/common';
import { SynonymService } from './synonym.service';
import { IntentDetectorService } from './intent-detector.service';
import { BRAND_KEYWORDS, CATEGORY_KEYWORDS } from './keyword-mappings';

/**
 * 建议类型
 */
export enum SuggestionType {
  BRAND_TYPO = 'brand_typo', // 品牌拼写错误
  CATEGORY_TYPO = 'category_typo', // 分类拼写错误
  ENGLISH_VARIANT = 'english_variant', // 英美英语变体
  ABBREVIATION = 'abbreviation', // 简称/缩写
  SYNONYM_EXISTS = 'synonym_exists', // 已有同义词覆盖
  CATEGORY_EXISTS = 'category_exists', // 已有分类映射
  INTENT_CATEGORY = 'intent_category', // 意图+分类组合（应该有结果）
  ADD_PRODUCT = 'add_product', // 建议添加商品
  NO_SUGGESTION = 'no_suggestion', // 无具体建议
}

/**
 * 搜索建议结果
 */
export interface SearchSuggestion {
  keyword: string;
  type: SuggestionType;
  suggestion?: {
    from: string;
    to: string;
    confidence: number;
  };
  action: string;
  actionType: 'add_synonym' | 'add_product' | 'none';
}

/**
 * 常见英美英语变体映射
 */
const ENGLISH_VARIANTS: Record<string, string> = {
  trainers: 'sneakers',
  sneakers: 'trainers',
  trousers: 'pants',
  pants: 'trousers',
  jumper: 'sweater',
  sweater: 'jumper',
  flat: 'apartment',
  colour: 'color',
  grey: 'gray',
  favourite: 'favorite',
  centre: 'center',
  catalogue: 'catalog',
  behaviour: 'behavior',
  organise: 'organize',
  realise: 'realize',
};

/**
 * 常见简称映射
 */
const ABBREVIATIONS: Record<string, string> = {
  tee: 't-shirt',
  't-shirt': 'tee',
  hoodie: 'hooded sweatshirt',
  sneaks: 'sneakers',
  jeans: 'denim pants',
};

/**
 * 常见品牌拼写错误
 */
const BRAND_TYPOS: Record<string, string> = {
  // Nike
  ninke: 'nike',
  nkie: 'nike',
  nik: 'nike',
  nikey: 'nike',
  // Adidas
  adss: 'adidas',
  addidas: 'adidas',
  adidias: 'adidas',
  addias: 'adidas',
  adiadas: 'adidas',
  // Gucci
  guccci: 'gucci',
  guci: 'gucci',
  guchi: 'gucci',
  // Balenciaga
  balnciaga: 'balenciaga',
  balenciga: 'balenciaga',
  balenciag: 'balenciaga',
  balencaiga: 'balenciaga',
  // Louis Vuitton
  'louis vitton': 'louis vuitton',
  'loui vuitton': 'louis vuitton',
  'luis vuitton': 'louis vuitton',
  // Prada
  prада: 'prada',
  prad: 'prada',
  // New Balance
  newbalance: 'new balance',
  // Burberry
  burburry: 'burberry',
  burbery: 'burberry',
  // Versace
  versache: 'versace',
  versaci: 'versace',
  // Chanel
  chanl: 'chanel',
  chanell: 'chanel',
  // Dior
  doir: 'dior',
  diior: 'dior',
  // Hermes
  hermez: 'hermes',
  hermès: 'hermes',
  // Supreme
  surpreme: 'supreme',
  supremee: 'supreme',
  // Off-White
  offwhit: 'off-white',
  'off white': 'off-white',
  // Converse
  convers: 'converse',
  converes: 'converse',
};

/**
 * 常见分类拼写错误
 */
const CATEGORY_TYPOS: Record<string, string> = {
  // shoes
  shose: 'shoes',
  shoess: 'shoes',
  sheos: 'shoes',
  shoe: 'shoes',
  // sneakers
  sneaker: 'sneakers',
  sneekers: 'sneakers',
  snekers: 'sneakers',
  // jacket
  jackt: 'jacket',
  jaket: 'jacket',
  // sweater
  sweatter: 'sweater',
  sweter: 'sweater',
  // hoodie
  hoody: 'hoodie',
  hoddie: 'hoodie',
  // dress
  dres: 'dress',
  dreses: 'dresses',
  // pants
  pant: 'pants',
  pnats: 'pants',
  // shirt
  shrit: 'shirt',
  shirst: 'shirts',
  // bag
  bga: 'bag',
  bagg: 'bag',
};

@Injectable()
export class SearchSuggestionService {
  constructor(
    private synonymService: SynonymService,
    private intentDetectorService: IntentDetectorService,
  ) {}

  /**
   * 分析搜索词并生成建议
   */
  analyzeTerm(keyword: string): SearchSuggestion {
    const term = keyword.toLowerCase().trim();
    const tokens = term.split(/\s+/);

    // 0. 检查是否是"意图词+分类词"的组合查询
    if (tokens.length >= 2) {
      const intentCategoryResult = this.checkIntentCategoryCombo(tokens);
      if (intentCategoryResult) {
        return intentCategoryResult;
      }
    }

    // 1. 检查是否已有同义词覆盖
    const expanded = this.synonymService.expandQuery(term);
    if (
      expanded.length > 1 ||
      (expanded.length === 1 && expanded[0] !== term)
    ) {
      return {
        keyword,
        type: SuggestionType.SYNONYM_EXISTS,
        suggestion: {
          from: term,
          to: expanded.filter((e) => e !== term).join(', '),
          confidence: 1,
        },
        action: `已有同义词: ${expanded.filter((e) => e !== term).join(', ')}`,
        actionType: 'none',
      };
    }

    // 2. 检查是否已存在于分类映射中
    if (CATEGORY_KEYWORDS[term]) {
      return {
        keyword,
        type: SuggestionType.CATEGORY_EXISTS,
        suggestion: {
          from: term,
          to: CATEGORY_KEYWORDS[term].slug,
          confidence: 1,
        },
        action: `已映射到分类: ${CATEGORY_KEYWORDS[term].slug}`,
        actionType: 'none',
      };
    }

    // 3. 检查预设品牌拼写错误表
    if (BRAND_TYPOS[term]) {
      const correct = BRAND_TYPOS[term];
      const brandSlug = BRAND_KEYWORDS[correct];
      return {
        keyword,
        type: SuggestionType.BRAND_TYPO,
        suggestion: {
          from: term,
          to: correct,
          confidence: 0.95,
        },
        action: `品牌纠错: ${term} → ${correct}${brandSlug ? ` (${brandSlug})` : ''}`,
        actionType: 'add_synonym',
      };
    }

    // 4. 检查预设分类拼写错误表
    if (CATEGORY_TYPOS[term]) {
      const correct = CATEGORY_TYPOS[term];
      return {
        keyword,
        type: SuggestionType.CATEGORY_TYPO,
        suggestion: {
          from: term,
          to: correct,
          confidence: 0.95,
        },
        action: `拼写纠错: ${term} → ${correct}`,
        actionType: 'add_synonym',
      };
    }

    // 5. 检查英美英语变体
    if (ENGLISH_VARIANTS[term]) {
      return {
        keyword,
        type: SuggestionType.ENGLISH_VARIANT,
        suggestion: {
          from: term,
          to: ENGLISH_VARIANTS[term],
          confidence: 0.9,
        },
        action: `英美变体: ${term} → ${ENGLISH_VARIANTS[term]}`,
        actionType: 'add_synonym',
      };
    }

    // 6. 检查简称
    if (ABBREVIATIONS[term]) {
      return {
        keyword,
        type: SuggestionType.ABBREVIATION,
        suggestion: {
          from: term,
          to: ABBREVIATIONS[term],
          confidence: 0.9,
        },
        action: `简称扩展: ${term} → ${ABBREVIATIONS[term]}`,
        actionType: 'add_synonym',
      };
    }

    // 7. 使用编辑距离算法查找相似品牌
    const brandMatch = this.findSimilarBrand(term);
    if (brandMatch) {
      return {
        keyword,
        type: SuggestionType.BRAND_TYPO,
        suggestion: {
          from: term,
          to: brandMatch.match,
          confidence: brandMatch.confidence,
        },
        action: `可能是品牌: ${term} → ${brandMatch.match}`,
        actionType: 'add_synonym',
      };
    }

    // 8. 使用编辑距离算法查找相似分类
    const categoryMatch = this.findSimilarCategory(term);
    if (categoryMatch) {
      return {
        keyword,
        type: SuggestionType.CATEGORY_TYPO,
        suggestion: {
          from: term,
          to: categoryMatch.match,
          confidence: categoryMatch.confidence,
        },
        action: `可能是分类: ${term} → ${categoryMatch.match}`,
        actionType: 'add_synonym',
      };
    }

    // 9. 多词查询 - 逐词分析
    if (tokens.length > 1) {
      for (const token of tokens) {
        const tokenSuggestion = this.analyzeSingleToken(token);
        if (tokenSuggestion) {
          return {
            keyword,
            type: tokenSuggestion.type,
            suggestion: tokenSuggestion.suggestion,
            action: tokenSuggestion.action,
            actionType: 'add_synonym',
          };
        }
      }
    }

    // 10. 无具体建议，可能需要添加商品
    return {
      keyword,
      type: SuggestionType.ADD_PRODUCT,
      action: '建议添加相关商品或同义词',
      actionType: 'add_product',
    };
  }

  /**
   * 检查是否是"意图词+分类词"的组合查询
   * 例如: "popular bags", "new shoes", "trending jackets"
   */
  private checkIntentCategoryCombo(tokens: string[]): SearchSuggestion | null {
    const intentKeywords = this.intentDetectorService.getAllIntentKeywords();

    let hasIntent = false;
    let hasCategory = false;
    let intentWord = '';
    let categoryWord = '';
    let categorySlug = '';

    for (const token of tokens) {
      if (intentKeywords.has(token)) {
        hasIntent = true;
        intentWord = token;
      }
      if (CATEGORY_KEYWORDS[token]) {
        hasCategory = true;
        categoryWord = token;
        categorySlug = CATEGORY_KEYWORDS[token].slug;
      }
    }

    if (hasIntent && hasCategory) {
      return {
        keyword: tokens.join(' '),
        type: SuggestionType.INTENT_CATEGORY,
        suggestion: {
          from: `${intentWord} + ${categoryWord}`,
          to: categorySlug,
          confidence: 1,
        },
        action: `查询正确: "${intentWord}" 是意图词, "${categoryWord}" 映射到 ${categorySlug} 分类。检查是否有该分类商品`,
        actionType: 'add_product',
      };
    }

    return null;
  }

  /**
   * 分析单个 token
   */
  private analyzeSingleToken(token: string): SearchSuggestion | null {
    // 检查品牌拼写
    if (BRAND_TYPOS[token]) {
      return {
        keyword: token,
        type: SuggestionType.BRAND_TYPO,
        suggestion: {
          from: token,
          to: BRAND_TYPOS[token],
          confidence: 0.95,
        },
        action: `品牌纠错: ${token} → ${BRAND_TYPOS[token]}`,
        actionType: 'add_synonym',
      };
    }

    // 检查分类拼写
    if (CATEGORY_TYPOS[token]) {
      return {
        keyword: token,
        type: SuggestionType.CATEGORY_TYPO,
        suggestion: {
          from: token,
          to: CATEGORY_TYPOS[token],
          confidence: 0.95,
        },
        action: `拼写纠错: ${token} → ${CATEGORY_TYPOS[token]}`,
        actionType: 'add_synonym',
      };
    }

    // 编辑距离查找
    const brandMatch = this.findSimilarBrand(token);
    if (brandMatch && brandMatch.confidence > 0.7) {
      return {
        keyword: token,
        type: SuggestionType.BRAND_TYPO,
        suggestion: {
          from: token,
          to: brandMatch.match,
          confidence: brandMatch.confidence,
        },
        action: `可能是品牌: ${token} → ${brandMatch.match}`,
        actionType: 'add_synonym',
      };
    }

    return null;
  }

  /**
   * 使用编辑距离查找相似品牌
   */
  private findSimilarBrand(
    term: string,
  ): { match: string; confidence: number } | null {
    const brandNames = Object.keys(BRAND_KEYWORDS);
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const brand of brandNames) {
      const distance = this.levenshteinDistance(term, brand);
      // 只考虑编辑距离 <= 2 且长度相近的匹配
      if (
        distance <= 2 &&
        distance < bestDistance &&
        Math.abs(term.length - brand.length) <= 2
      ) {
        bestDistance = distance;
        bestMatch = brand;
      }
    }

    if (bestMatch && bestDistance <= 2) {
      // 计算置信度：距离越小置信度越高
      const confidence =
        1 - bestDistance / Math.max(term.length, bestMatch.length);
      if (confidence >= 0.6) {
        return { match: bestMatch, confidence };
      }
    }

    return null;
  }

  /**
   * 使用编辑距离查找相似分类
   */
  private findSimilarCategory(
    term: string,
  ): { match: string; confidence: number } | null {
    const categoryNames = Object.keys(CATEGORY_KEYWORDS);
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const category of categoryNames) {
      const distance = this.levenshteinDistance(term, category);
      if (
        distance <= 2 &&
        distance < bestDistance &&
        Math.abs(term.length - category.length) <= 2
      ) {
        bestDistance = distance;
        bestMatch = category;
      }
    }

    if (bestMatch && bestDistance <= 2) {
      const confidence =
        1 - bestDistance / Math.max(term.length, bestMatch.length);
      if (confidence >= 0.6) {
        return { match: bestMatch, confidence };
      }
    }

    return null;
  }

  /**
   * Levenshtein 编辑距离算法
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 替换
            matrix[i][j - 1] + 1, // 插入
            matrix[i - 1][j] + 1, // 删除
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 批量分析多个搜索词
   */
  analyzeTerms(keywords: string[]): SearchSuggestion[] {
    return keywords.map((keyword) => this.analyzeTerm(keyword));
  }
}
