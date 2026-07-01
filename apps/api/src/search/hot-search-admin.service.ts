import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HotSearch, HotSearchSource } from './entities/hot-search.entity';
import { SearchLog } from './entities/search-log.entity';
import {
  CreateHotSearchDto,
  UpdateHotSearchDto,
  QueryHotSearchDto,
} from './dto/hot-search-admin.dto';

@Injectable()
export class HotSearchAdminService {
  constructor(
    @InjectRepository(HotSearch)
    private readonly hotSearchRepository: Repository<HotSearch>,
    @InjectRepository(SearchLog)
    private readonly searchLogRepository: Repository<SearchLog>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async findAll(query: QueryHotSearchDto) {
    const { page = 1, limit = 20, search, source, isPinned, isBlocked } = query;

    const qb = this.hotSearchRepository.createQueryBuilder('hs');

    if (search) {
      qb.andWhere('hs.keyword ILIKE :search', { search: `%${search}%` });
    }
    if (source) {
      qb.andWhere('hs.source = :source', { source });
    }
    if (isPinned === 'true') {
      qb.andWhere('hs.is_pinned = true');
    } else if (isPinned === 'false') {
      qb.andWhere('hs.is_pinned = false');
    }
    if (isBlocked === 'true') {
      qb.andWhere('hs.is_blocked = true');
    } else if (isBlocked === 'false') {
      qb.andWhere('hs.is_blocked = false');
    }

    qb.orderBy('hs.is_pinned', 'DESC')
      .addOrderBy('hs.search_count_7d', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    if (!data.length) {
      return { data, total, page, limit };
    }

    const keywords = data.map((item) => item.keyword);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const statsRows = await this.searchLogRepository.query(
      `
      SELECT
        sl.normalized_keyword AS keyword,
        COUNT(*)::int AS "rawSearchCount7d",
        COUNT(
          DISTINCT CONCAT_WS(
            '|',
            COALESCE(
              CAST(sl.user_id AS text),
              NULLIF(sl.device_id, ''),
              NULLIF(sl.session_id, ''),
              NULLIF(sl.visit_id, ''),
              NULLIF(sl.ip_address, ''),
              'anon'
            ),
            sl.normalized_keyword,
            FLOOR(EXTRACT(EPOCH FROM sl.created_at) / 30)::bigint
          )
        )::int AS "dedupSearchCount7d"
      FROM search_logs sl
      WHERE sl.created_at >= $1
        AND sl.normalized_keyword = ANY($2)
      GROUP BY sl.normalized_keyword
      `,
      [sevenDaysAgo, keywords],
    );

    const statsMap = new Map<
      string,
      { rawSearchCount7d: number; dedupSearchCount7d: number }
    >(
      statsRows.map((row: Record<string, string>) => [
        row.keyword,
        {
          rawSearchCount7d: parseInt(row.rawSearchCount7d, 10) || 0,
          dedupSearchCount7d: parseInt(row.dedupSearchCount7d, 10) || 0,
        },
      ]),
    );

    return {
      data: data.map((item) => {
        const stats: { rawSearchCount7d: number; dedupSearchCount7d: number } =
          statsMap.get(item.keyword) || {
            rawSearchCount7d: item.searchCount7d || 0,
            dedupSearchCount7d: item.searchCount7d || 0,
          };
        const suspiciousSearchCount7d = Math.max(
          stats.rawSearchCount7d - stats.dedupSearchCount7d,
          0,
        );

        return {
          ...item,
          rawSearchCount7d: stats.rawSearchCount7d,
          dedupSearchCount7d: stats.dedupSearchCount7d,
          suspiciousSearchCount7d,
          suspiciousRate7d:
            stats.rawSearchCount7d > 0
              ? suspiciousSearchCount7d / stats.rawSearchCount7d
              : 0,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async create(dto: CreateHotSearchDto): Promise<HotSearch> {
    const normalizedKeyword = dto.keyword
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

    const existing = await this.hotSearchRepository.findOne({
      where: { keyword: normalizedKeyword },
    });
    if (existing) {
      throw new ConflictException(`关键词 "${normalizedKeyword}" 已存在`);
    }

    const hotSearch = this.hotSearchRepository.create({
      keyword: normalizedKeyword,
      source: HotSearchSource.MANUAL,
      isPinned: dto.isPinned ?? false,
      sortOrder: dto.sortOrder ?? null,
      displayStartAt: dto.displayStartAt ? new Date(dto.displayStartAt) : null,
      displayEndAt: dto.displayEndAt ? new Date(dto.displayEndAt) : null,
    });

    const saved = await this.hotSearchRepository.save(hotSearch);
    await this.clearHotSearchCache();
    return saved;
  }

  async update(id: string, dto: UpdateHotSearchDto): Promise<HotSearch> {
    const hotSearch = await this.hotSearchRepository.findOne({ where: { id } });
    if (!hotSearch) {
      throw new NotFoundException(`热搜词不存在: ${id}`);
    }

    if (dto.isPinned !== undefined) hotSearch.isPinned = dto.isPinned;
    if (dto.isBlocked !== undefined) {
      hotSearch.isBlocked = dto.isBlocked;
      // 屏蔽时自动取消置顶
      if (dto.isBlocked) {
        hotSearch.isPinned = false;
      }
    }
    if (dto.sortOrder !== undefined) hotSearch.sortOrder = dto.sortOrder;
    if (dto.displayStartAt !== undefined) {
      hotSearch.displayStartAt = dto.displayStartAt
        ? new Date(dto.displayStartAt)
        : null;
    }
    if (dto.displayEndAt !== undefined) {
      hotSearch.displayEndAt = dto.displayEndAt
        ? new Date(dto.displayEndAt)
        : null;
    }

    const saved = await this.hotSearchRepository.save(hotSearch);
    await this.clearHotSearchCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const hotSearch = await this.hotSearchRepository.findOne({ where: { id } });
    if (!hotSearch) {
      throw new NotFoundException(`热搜词不存在: ${id}`);
    }
    if (hotSearch.source !== HotSearchSource.MANUAL) {
      throw new BadRequestException('仅允许删除手动添加的热搜词');
    }
    await this.hotSearchRepository.remove(hotSearch);
    await this.clearHotSearchCache();
  }

  async togglePin(id: string): Promise<HotSearch> {
    const hotSearch = await this.hotSearchRepository.findOne({ where: { id } });
    if (!hotSearch) {
      throw new NotFoundException(`热搜词不存在: ${id}`);
    }
    hotSearch.isPinned = !hotSearch.isPinned;
    const saved = await this.hotSearchRepository.save(hotSearch);
    await this.clearHotSearchCache();
    return saved;
  }

  async toggleBlock(id: string): Promise<HotSearch> {
    const hotSearch = await this.hotSearchRepository.findOne({ where: { id } });
    if (!hotSearch) {
      throw new NotFoundException(`热搜词不存在: ${id}`);
    }
    hotSearch.isBlocked = !hotSearch.isBlocked;
    // 屏蔽时自动取消置顶
    if (hotSearch.isBlocked) {
      hotSearch.isPinned = false;
    }
    const saved = await this.hotSearchRepository.save(hotSearch);
    await this.clearHotSearchCache();
    return saved;
  }

  /**
   * 清除热搜相关的 CacheInterceptor 缓存
   * key 格式为请求 URL，前端调用 limit 固定为 3/5/10
   */
  private async clearHotSearchCache(): Promise<void> {
    const keys = [
      '/products/hot-searches?limit=3',
      '/products/hot-searches?limit=5',
      '/products/hot-searches?limit=10',
      '/products/hot-searches',
    ];
    await Promise.all(keys.map((k) => this.cacheManager.del(k)));
  }
}
