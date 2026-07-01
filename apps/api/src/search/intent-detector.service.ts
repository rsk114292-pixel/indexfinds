import { Injectable } from '@nestjs/common';

/**
 * 搜索意图类型定义
 */
export interface SearchIntent {
  /** 价格意图: budget(低价), mid(中端), luxury(高端) */
  priceIntent?: 'budget' | 'mid' | 'luxury';
  /** 时间意图: new(新品), sale(促销), trending(热门) */
  timeIntent?: 'new' | 'sale' | 'trending';
  /** 目的意图: gift(礼物), self(自用) */
  purposeIntent?: 'gift' | 'self';
}

/**
 * 价格意图关键词映射
 */
const PRICE_KEYWORDS: Record<string, SearchIntent['priceIntent']> = {
  // Budget / 低价
  cheap: 'budget',
  affordable: 'budget',
  budget: 'budget',
  inexpensive: 'budget',
  economical: 'budget',
  bargain: 'budget',
  value: 'budget',
  // Luxury / 高端
  luxury: 'luxury',
  premium: 'luxury',
  designer: 'luxury',
  'high-end': 'luxury',
  highend: 'luxury',
  expensive: 'luxury',
  exclusive: 'luxury',
  luxe: 'luxury',
  deluxe: 'luxury',
};

/**
 * 时间意图关键词映射
 */
const TIME_KEYWORDS: Record<string, SearchIntent['timeIntent']> = {
  // New / 新品
  new: 'new',
  latest: 'new',
  newest: 'new',
  arrivals: 'new',
  fresh: 'new',
  recent: 'new',
  '2026': 'new',
  '2025': 'new',
  // Sale / 促销
  sale: 'sale',
  clearance: 'sale',
  outlet: 'sale',
  discount: 'sale',
  discounted: 'sale',
  markdown: 'sale',
  reduced: 'sale',
  // Trending / 热门
  trending: 'trending',
  popular: 'trending',
  hot: 'trending',
  bestseller: 'trending',
  bestselling: 'trending',
  'best-seller': 'trending',
  viral: 'trending',
};

/**
 * 目的意图关键词映射
 */
const PURPOSE_KEYWORDS: Record<string, SearchIntent['purposeIntent']> = {
  // Gift / 礼物
  gift: 'gift',
  gifts: 'gift',
  present: 'gift',
  presents: 'gift',
  gifting: 'gift',
  birthday: 'gift',
  christmas: 'gift',
  anniversary: 'gift',
  valentine: 'gift',
  valentines: 'gift',
  'mothers day': 'gift',
  'fathers day': 'gift',
};

@Injectable()
export class IntentDetectorService {
  /**
   * 获取所有意图关键词（用于从搜索词中过滤）
   */
  getAllIntentKeywords(): Set<string> {
    const keywords = new Set<string>();
    Object.keys(PRICE_KEYWORDS).forEach((k) => keywords.add(k));
    Object.keys(TIME_KEYWORDS).forEach((k) => keywords.add(k));
    Object.keys(PURPOSE_KEYWORDS).forEach((k) => keywords.add(k));
    return keywords;
  }

  /**
   * 检测搜索查询中的意图
   * @param query 原始搜索查询
   * @param tokens 已分词的 tokens（可选，避免重复分词）
   * @returns 检测到的意图
   */
  detectIntent(query: string, tokens?: string[]): SearchIntent {
    const intent: SearchIntent = {};

    if (!query || !query.trim()) {
      return intent;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const words = tokens || normalizedQuery.split(/\s+/).filter(Boolean);

    // 检测价格意图
    for (const word of words) {
      if (PRICE_KEYWORDS[word]) {
        intent.priceIntent = PRICE_KEYWORDS[word];
        break; // 只取第一个匹配
      }
    }

    // 检测时间意图
    for (const word of words) {
      if (TIME_KEYWORDS[word]) {
        intent.timeIntent = TIME_KEYWORDS[word];
        break;
      }
    }

    // 检测目的意图（支持多词短语）
    for (const phrase of Object.keys(PURPOSE_KEYWORDS)) {
      if (normalizedQuery.includes(phrase)) {
        intent.purposeIntent = PURPOSE_KEYWORDS[phrase];
        break;
      }
    }

    return intent;
  }

  /**
   * 检查是否有任何意图被检测到
   */
  hasIntent(intent: SearchIntent): boolean {
    return !!(intent.priceIntent || intent.timeIntent || intent.purposeIntent);
  }
}
