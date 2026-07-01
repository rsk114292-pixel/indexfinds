import { Injectable, Optional } from '@nestjs/common';
import { BM25RankingService } from './bm25-ranking.service';
import { RANKING_WEIGHTS_CONFIG } from '../config/search.config';

export interface RankingFactors {
  relevance: number; // 关键词匹配得分 0-1
  ctr: number; // 点击率 0-1
  createdAt: Date; // 创建时间
}

@Injectable()
export class SearchRankingService {
  private readonly RELEVANCE_WEIGHT = RANKING_WEIGHTS_CONFIG.relevance;
  private readonly CTR_WEIGHT = RANKING_WEIGHTS_CONFIG.ctr;
  private readonly NEWNESS_WEIGHT = RANKING_WEIGHTS_CONFIG.newness;
  private readonly HALF_LIFE_DAYS = RANKING_WEIGHTS_CONFIG.newnessHalfLifeDays;

  constructor(@Optional() private readonly bm25Service?: BM25RankingService) {}

  /**
   * 计算单个商品的综合排序得分
   */
  calculateScore(factors: RankingFactors): number {
    const newness = this.calculateNewness(factors.createdAt);

    const score =
      factors.relevance * this.RELEVANCE_WEIGHT +
      factors.ctr * this.CTR_WEIGHT +
      newness * this.NEWNESS_WEIGHT;

    return Math.round(score * 10000) / 10000;
  }

  /**
   * 计算新鲜度得分（指数衰减）
   */
  private calculateNewness(createdAt: Date): number {
    const now = new Date();
    const ageInDays =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // 指数衰减: e^(-λt), λ = ln(2) / halfLife
    const lambda = Math.LN2 / this.HALF_LIFE_DAYS;
    const newness = Math.exp(-lambda * ageInDays);

    return Math.max(0, Math.min(1, newness));
  }

  /**
   * 计算关键词相关性得分（使用 BM25 算法）
   * 支持两种产品结构以保持向后兼容
   */
  calculateRelevance(
    product: {
      name?: string;
      title?: string;
      description?: string;
      tags?: string[];
      brand?: { name: string } | null;
      primaryCategory?: { name: string } | null;
    },
    searchTerms: string[],
  ): number {
    if (!searchTerms.length) return 1;

    // 使用 BM25 算法（如果可用）
    if (this.bm25Service) {
      return this.bm25Service.calculateRelevance(
        {
          title: product.title || product.name || '',
          description: product.description,
          brand: product.brand,
          primaryCategory: product.primaryCategory,
        },
        searchTerms,
      );
    }

    // 降级到简单匹配算法
    return this.fallbackRelevance(product, searchTerms);
  }

  /**
   * 简单匹配算法（作为 BM25 的降级方案）
   */
  private fallbackRelevance(
    product: {
      name?: string;
      title?: string;
      description?: string;
      tags?: string[];
    },
    searchTerms: string[],
  ): number {
    const productName = product.title || product.name || '';
    const text = [
      productName,
      product.description || '',
      ...(product.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    let matchCount = 0;
    for (const term of searchTerms) {
      if (text.includes(term.toLowerCase())) {
        matchCount++;
      }
    }

    // 基础相关性 = 匹配词数 / 总搜索词数
    const baseRelevance = matchCount / searchTerms.length;

    // 名称精确匹配加分
    const fullQuery = searchTerms.join(' ').toLowerCase();
    const nameBonus = productName.toLowerCase().includes(fullQuery) ? 0.2 : 0;

    return Math.min(1, baseRelevance + nameBonus);
  }

  /**
   * 批量计算并排序
   * 支持两种产品结构：旧的 (name) 和新的 (title + brand + category)
   */
  rankProducts<
    T extends {
      id: string;
      ctr?: number;
      createdAt: Date;
      name?: string;
      title?: string;
      description?: string;
      tags?: string[];
      brand?: { name: string } | null;
      primaryCategory?: { name: string } | null;
    },
  >(products: T[], searchTerms: string[]): T[] {
    const scored = products.map((product) => {
      const relevance = this.calculateRelevance(product, searchTerms);
      const score = this.calculateScore({
        relevance,
        ctr: product.ctr || 0,
        createdAt: product.createdAt,
      });
      return { product, score };
    });

    // 按得分降序排序
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.product);
  }
}
