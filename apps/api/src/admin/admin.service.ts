import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from '../products/entities/product-interaction-event.entity';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { User } from '../users/entities/user.entity';

const HOT_PRODUCT_HAS_QC_SQL =
  'EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)';
const HOT_PRODUCT_NO_QC_SQL =
  'NOT EXISTS (SELECT 1 FROM product_qc_media pqm WHERE pqm.product_id = product.id)';
const HOT_PRODUCT_QC_COUNT_SQL =
  '(SELECT COUNT(*) FROM product_qc_media pqm WHERE pqm.product_id = product.id)';
const HOT_PRODUCT_HIGH_HEAT_THRESHOLD = 0.6;
const HOT_PRODUCT_TRUSTED_LOOKBACK_DAYS = 30;
const HOT_PRODUCT_SUMMARY_CACHE_TTL_MS = 60_000;

export interface PublicStats {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalBrands: number;
  totalCategories: number;
  totalUsers: number;
  pendingReviews: number;
  todayImports: number;
  recentProducts: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
}

export interface HotProductFilters {
  search?: string;
  qcState?: 'with' | 'without';
  featuredState?: 'featured' | 'not_featured';
  shelfDays?: '7' | '8_30' | '30_plus';
  qcLevel?: 'lt3' | 'gte3';
  minPopularityScore?: number;
}

export interface HotProductSummary {
  withoutQc: number;
  qcLessThan3: number;
  featuredWithoutQc: number;
  highHeatWithoutQc: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductInteractionEvent)
    private readonly productInteractionEventRepository: Repository<ProductInteractionEvent>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private applyHotProductFilters(
    qb: SelectQueryBuilder<Product>,
    {
      search,
      qcState,
      featuredState,
      shelfDays,
      qcLevel,
      minPopularityScore,
    }: HotProductFilters,
  ) {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 86400000);
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    if (search?.trim()) {
      const keyword = `%${search.trim()}%`;
      qb.andWhere(
        `(product.title ILIKE :keyword
          OR product."originalTitle" ILIKE :keyword
          OR product."weidianItemId" = :exact
          OR product."weidianShopName" ILIKE :keyword)`,
        { keyword, exact: search.trim() },
      );
    }

    if (qcState === 'with') {
      qb.andWhere(HOT_PRODUCT_HAS_QC_SQL);
    } else if (qcState === 'without') {
      qb.andWhere(HOT_PRODUCT_NO_QC_SQL);
    }

    if (qcLevel === 'lt3') {
      qb.andWhere(`${HOT_PRODUCT_QC_COUNT_SQL} BETWEEN 1 AND 2`);
    } else if (qcLevel === 'gte3') {
      qb.andWhere(`${HOT_PRODUCT_QC_COUNT_SQL} >= 3`);
    }

    if (featuredState === 'featured') {
      qb.andWhere('product."isFeatured" = true');
    } else if (featuredState === 'not_featured') {
      qb.andWhere('product."isFeatured" = false');
    }

    if (shelfDays === '7') {
      qb.andWhere('product."createdAt" >= :sevenDaysAgo', { sevenDaysAgo });
    } else if (shelfDays === '8_30') {
      qb.andWhere(
        'product."createdAt" >= :thirtyDaysAgo AND product."createdAt" < :sevenDaysAgo',
        { thirtyDaysAgo, sevenDaysAgo },
      );
    } else if (shelfDays === '30_plus') {
      qb.andWhere('product."createdAt" < :thirtyDaysAgo', { thirtyDaysAgo });
    }

    if (
      typeof minPopularityScore === 'number' &&
      Number.isFinite(minPopularityScore)
    ) {
      qb.andWhere('product."popularityScore" >= :minPopularityScore', {
        minPopularityScore,
      });
    }

    return qb;
  }

  async getPublicStats(): Promise<PublicStats> {
    const cacheKey = 'public:stats:v1';
    const cached = await this.cacheManager.get<PublicStats>(cacheKey);
    if (cached) return cached;

    const [totalProducts, totalBrands, totalCategories] = await Promise.all([
      this.productRepository.count(),
      this.brandRepository.count({ where: { status: 'active' } }),
      this.categoryRepository.count(),
    ]);

    const result: PublicStats = { totalProducts, totalBrands, totalCategories };
    await this.cacheManager.set(cacheKey, result, 3_600_000); // 1 hour
    return result;
  }

  async getActiveProductCount(): Promise<number> {
    return this.productRepository.count({ where: { status: 'active' as any } });
  }

  async getHotProducts(
    page: number,
    limit: number,
    search?: string,
    qcState?: 'with' | 'without',
    featuredState?: 'featured' | 'not_featured',
    shelfDays?: '7' | '8_30' | '30_plus',
    qcLevel?: 'lt3' | 'gte3',
    minPopularityScore?: number,
    includeSummary = true,
  ) {
    const skip = (page - 1) * limit;
    const filters: HotProductFilters = {
      search,
      qcState,
      featuredState,
      shelfDays,
      qcLevel,
      minPopularityScore,
    };

    const baseQb = this.applyHotProductFilters(
      this.productRepository
        .createQueryBuilder('product')
        .where('product.status = :status', { status: 'active' }),
      filters,
    );

    const dataQb = this.applyHotProductFilters(
      this.productRepository
        .createQueryBuilder('product')
        .where('product.status = :status', { status: 'active' }),
      filters,
    )
      .select([
        'product.id',
        'product.title',
        'product.slug',
        'product.mainImage',
        'product.popularityScore',
        'product.viewCount',
        'product.clickCount',
        'product.salesCount',
        'product.favoriteCount',
        'product.ctr',
        'product.isFeatured',
        'product.featuredSort',
        'product.createdAt',
      ])
      .loadRelationCountAndMap('product.qcPhotoCount', 'product.qcMedia')
      .orderBy('product.isFeatured', 'DESC')
      .addOrderBy('product.featuredSort', 'ASC')
      .addOrderBy('product.popularityScore', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total, summary] = await Promise.all([
      dataQb.getMany(),
      baseQb.clone().getCount(),
      includeSummary ? this.getHotProductsSummary(filters) : undefined,
    ]);
    const trustedStats = await this.getTrustedInteractionStats(
      data.map((product) => product.id),
    );
    const enrichedData = data.map((product) => {
      const stats = trustedStats.get(product.id) ?? {
        trustedViewCount30d: 0,
        trustedClickCount30d: 0,
        trustedCtr30d: 0,
      };

      return {
        ...product,
        ...stats,
      };
    });

    return {
      data: enrichedData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      ...(summary ? { summary } : {}),
    };
  }

  async getHotProductsSummary(
    filters: HotProductFilters,
  ): Promise<HotProductSummary> {
    const cacheKey = `admin:hot-products:summary:v1:${JSON.stringify({
      search: filters.search?.trim() || '',
      qcState: filters.qcState || '',
      featuredState: filters.featuredState || '',
      shelfDays: filters.shelfDays || '',
      qcLevel: filters.qcLevel || '',
      minPopularityScore: filters.minPopularityScore ?? '',
    })}`;
    const cached = await this.cacheManager.get<HotProductSummary>(cacheKey);
    if (cached) return cached;

    const baseQb = this.applyHotProductFilters(
      this.productRepository
        .createQueryBuilder('product')
        .where('product.status = :status', { status: 'active' }),
      filters,
    );

    const [
      withoutQcCount,
      qcLessThan3Count,
      featuredWithoutQcCount,
      highHeatWithoutQcCount,
    ] = await Promise.all([
      baseQb.clone().andWhere(HOT_PRODUCT_NO_QC_SQL).getCount(),
      baseQb
        .clone()
        .andWhere(`${HOT_PRODUCT_QC_COUNT_SQL} BETWEEN 1 AND 2`)
        .getCount(),
      baseQb
        .clone()
        .andWhere('product."isFeatured" = true')
        .andWhere(HOT_PRODUCT_NO_QC_SQL)
        .getCount(),
      baseQb
        .clone()
        .andWhere(HOT_PRODUCT_NO_QC_SQL)
        .andWhere('product."popularityScore" >= :highHeatThreshold', {
          highHeatThreshold: HOT_PRODUCT_HIGH_HEAT_THRESHOLD,
        })
        .getCount(),
    ]);

    const summary = {
      withoutQc: withoutQcCount,
      qcLessThan3: qcLessThan3Count,
      featuredWithoutQc: featuredWithoutQcCount,
      highHeatWithoutQc: highHeatWithoutQcCount,
    };
    await this.cacheManager.set(
      cacheKey,
      summary,
      HOT_PRODUCT_SUMMARY_CACHE_TTL_MS,
    );
    return summary;
  }

  private async getTrustedInteractionStats(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<
        string,
        {
          trustedViewCount30d: number;
          trustedClickCount30d: number;
          trustedCtr30d: number;
        }
      >();
    }

    const windowStart = new Date(
      Date.now() - HOT_PRODUCT_TRUSTED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const rows = await this.productInteractionEventRepository
      .createQueryBuilder('event')
      .select('event."productId"', 'productId')
      .addSelect(
        `COUNT(*) FILTER (WHERE event."eventType" = '${ProductInteractionEventType.VIEW}')`,
        'trustedViewCount30d',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event."eventType" = '${ProductInteractionEventType.CLICK}')`,
        'trustedClickCount30d',
      )
      .where('event."productId" IN (:...productIds)', { productIds })
      .andWhere('event."createdAt" >= :windowStart', { windowStart })
      .groupBy('event."productId"')
      .getRawMany<{
        productId: string;
        trustedViewCount30d: string;
        trustedClickCount30d: string;
      }>();

    return new Map(
      rows.map((row) => {
        const trustedViewCount30d = parseInt(row.trustedViewCount30d, 10) || 0;
        const trustedClickCount30d =
          parseInt(row.trustedClickCount30d, 10) || 0;
        return [
          row.productId,
          {
            trustedViewCount30d,
            trustedClickCount30d,
            trustedCtr30d:
              trustedViewCount30d > 0
                ? trustedClickCount30d / trustedViewCount30d
                : 0,
          },
        ];
      }),
    );
  }

  async getTabCounts(): Promise<{
    review: number;
    skuSplitReview: number;
    duplicates: number;
    mixed: number;
    split: number;
    deadLinkConfirmed: number;
  }> {
    const cacheKey = 'admin:tab-counts:v2';
    const cached = await this.cacheManager.get<{
      review: number;
      skuSplitReview: number;
      duplicates: number;
      mixed: number;
      split: number;
      deadLinkConfirmed: number;
    }>(cacheKey);
    if (cached) return cached;

    const [row] = await this.productRepository.manager.query(`
      SELECT
        (SELECT COUNT(*) FROM batch_job_items
         WHERE status = 'review'
           AND ("aiGeneratedData" IS NULL OR "aiGeneratedData" -> 'duplicateOf' IS NULL)
        )::int AS review,
        (SELECT COUNT(*) FROM products
         WHERE status = 'pending_review'
           AND "skuVariantKey" IS NOT NULL
        )::int AS "skuSplitReview",
        (SELECT COUNT(*) FROM batch_job_items
         WHERE status = 'review'
           AND "aiGeneratedData" -> 'duplicateOf' IS NOT NULL
        )::int AS duplicates,
        (SELECT COUNT(*) FROM products
         WHERE "potentialMixedProduct" = true
           AND status = 'pending_review'
           AND "mixednessScore" >= 0.3
        )::int AS mixed,
        (SELECT COUNT(*) FROM products
         WHERE status = 'split'
        )::int AS split,
        (SELECT COUNT(*) FROM products
         WHERE "weidianDeadLinkAttempts" >= 2
        )::int AS "deadLinkConfirmed"
    `);

    const result = {
      review: row?.review ?? 0,
      skuSplitReview: row?.skuSplitReview ?? 0,
      duplicates: row?.duplicates ?? 0,
      mixed: row?.mixed ?? 0,
      split: row?.split ?? 0,
      deadLinkConfirmed: row?.deadLinkConfirmed ?? 0,
    };
    await this.cacheManager.set(cacheKey, result, 30_000); // 30s
    return result;
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const startedAt = Date.now();
    const cacheKey = 'admin:dashboard:stats:v1';
    const cached = await this.cacheManager.get<DashboardStats>(cacheKey);
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [productStats] = await this.productRepository.query<
      Array<{
        totalProducts: number;
        pendingReviews: number;
        todayImports: number;
      }>
    >(
      `
      SELECT
        COUNT(*)::int AS "totalProducts",
        COUNT(*) FILTER (WHERE status = 'pending_review')::int AS "pendingReviews",
        COUNT(*) FILTER (WHERE "createdAt" >= $1)::int AS "todayImports"
      FROM products
      `,
      [today],
    );

    const [totalBrands, totalCategories, totalUsers, recentProducts] =
      await Promise.all([
        this.brandRepository.count({ where: { status: 'active' } }),
        this.categoryRepository.count(),
        this.userRepository.count(),
        this.productRepository.find({
          select: ['id', 'title', 'status', 'createdAt'],
          order: { createdAt: 'DESC' },
          take: 5,
        }),
      ]);

    const result: DashboardStats = {
      totalProducts: productStats?.totalProducts ?? 0,
      totalBrands,
      totalCategories,
      totalUsers,
      pendingReviews: productStats?.pendingReviews ?? 0,
      todayImports: productStats?.todayImports ?? 0,
      recentProducts: recentProducts.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
      })),
    };

    await this.cacheManager.set(cacheKey, result, 5 * 60 * 1000);
    const elapsedMs = Date.now() - startedAt;
    if (process.env.NODE_ENV !== 'production' && elapsedMs > 300) {
      console.warn(`[Admin] getDashboardStats 慢请求: ${elapsedMs}ms`);
    }
    return result;
  }
}
