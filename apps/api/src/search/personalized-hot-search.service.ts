import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotSearch } from './entities/hot-search.entity';
import { SearchLog } from './entities/search-log.entity';
import { SearchAnalyticsService } from './search-analytics.service';

@Injectable()
export class PersonalizedHotSearchService {
  private readonly logger = new Logger(PersonalizedHotSearchService.name);

  constructor(
    @InjectRepository(HotSearch)
    private readonly hotSearchRepository: Repository<HotSearch>,
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  /**
   * 获取个性化热搜词
   * 混合三个来源：置顶词 + 个性化词 + 通用热搜填充
   * 无用户上下文时退化为通用热搜
   */
  async getPersonalizedHotSearches(
    limit: number = 10,
    userId?: string,
    sessionId?: string,
  ): Promise<{ keyword: string; count: number; source: string }[]> {
    // 无用户上下文时直接退化
    if (!userId && !sessionId) {
      return this.fallbackToGeneral(limit);
    }

    try {
      // 1. 获取通用热搜（包含置顶）
      const generalResults = await this.analyticsService.getHotSearches(limit);

      // 2. 获取个性化词（基于用户搜索历史）
      const personalKeywords = await this.getUserTrendingKeywords(
        userId,
        sessionId,
        5, // 最多取 5 个个性化词
      );

      if (personalKeywords.length === 0) {
        // 无个性化数据，退化为通用热搜
        return generalResults.map((hs) => ({
          keyword: hs.keyword,
          count: hs.searchCount7d,
          source: hs.isPinned ? 'pinned' : 'general',
        }));
      }

      // 3. 混合：置顶词优先 → 个性化词 → 通用词填充
      const result: { keyword: string; count: number; source: string }[] = [];
      const usedKeywords = new Set<string>();

      // 置顶词优先
      for (const hs of generalResults) {
        if (hs.isPinned) {
          result.push({
            keyword: hs.keyword,
            count: hs.searchCount7d,
            source: 'pinned',
          });
          usedKeywords.add(hs.keyword);
        }
      }

      // 个性化词
      for (const pk of personalKeywords) {
        if (result.length >= limit) break;
        if (usedKeywords.has(pk.keyword)) continue;
        result.push({
          keyword: pk.keyword,
          count: pk.count,
          source: 'personal',
        });
        usedKeywords.add(pk.keyword);
      }

      // 通用词填充
      for (const hs of generalResults) {
        if (result.length >= limit) break;
        if (usedKeywords.has(hs.keyword)) continue;
        result.push({
          keyword: hs.keyword,
          count: hs.searchCount7d,
          source: 'general',
        });
        usedKeywords.add(hs.keyword);
      }

      return result.slice(0, limit);
    } catch (error) {
      this.logger.error('个性化热搜获取失败，退化为通用热搜', error);
      return this.fallbackToGeneral(limit);
    }
  }

  /**
   * 获取用户近 30 天的高频搜索词，在 hot_searches 中找趋势匹配
   */
  private async getUserTrendingKeywords(
    userId?: string,
    sessionId?: string,
    limit: number = 5,
  ): Promise<{ keyword: string; count: number }[]> {
    // 获取用户高频搜索词
    const qb = this.searchLogRepository
      .createQueryBuilder('sl')
      .select('sl.normalized_keyword', 'keyword')
      .addSelect('COUNT(*)', 'freq')
      .where("sl.created_at >= NOW() - INTERVAL '30 days'");

    if (userId) {
      qb.andWhere('sl.user_id = :userId', { userId });
    } else if (sessionId) {
      qb.andWhere('sl.session_id = :sessionId', { sessionId });
    } else {
      return [];
    }

    const userKeywords = await qb
      .groupBy('sl.normalized_keyword')
      .orderBy('freq', 'DESC')
      .limit(20)
      .getRawMany<{ keyword: string; freq: string }>();

    if (userKeywords.length === 0) return [];

    const keywords = userKeywords.map((k) => k.keyword);

    // 在 hot_searches 中找这些关键词中有搜索量的词
    const now = new Date();
    const trending = await this.hotSearchRepository
      .createQueryBuilder('hs')
      .where('hs.keyword IN (:...keywords)', { keywords })
      .andWhere('hs.is_blocked = false')
      .andWhere("LOWER(TRIM(hs.keyword)) <> 'search_term_string'")
      .andWhere('hs.search_count_7d > 0')
      .andWhere(
        '(hs.display_start_at IS NULL OR hs.display_start_at <= :now)',
        { now },
      )
      .andWhere('(hs.display_end_at IS NULL OR hs.display_end_at >= :now)', {
        now,
      })
      .orderBy('hs.search_count_7d', 'DESC')
      .take(limit)
      .getMany();

    return trending.map((hs) => ({
      keyword: hs.keyword,
      count: hs.searchCount7d,
    }));
  }

  private async fallbackToGeneral(
    limit: number,
  ): Promise<{ keyword: string; count: number; source: string }[]> {
    const results = await this.analyticsService.getHotSearches(limit);
    return results.map((hs) => ({
      keyword: hs.keyword,
      count: hs.searchCount7d,
      source: hs.isPinned ? 'pinned' : 'general',
    }));
  }
}
