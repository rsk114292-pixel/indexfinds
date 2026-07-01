import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';
import {
  ProductInteractionEvent,
  ProductInteractionEventType,
} from './entities/product-interaction-event.entity';

/**
 * 综合热度分计算服务
 *
 * 公式：
 *   score = 0.30 × logNorm(viewCount)
 *         + 0.25 × logNorm(salesCount)
 *         + 0.15 × logNorm(clickCount)
 *         + 0.10 × logNorm(favoriteCount)
 *         + 0.10 × freshness(createdAt, halfLife=14d)
 *         + 0.05 × ctr
 *         + 0.05 × isFeatured
 *
 * 新品保护：createdAt < 7天 → 额外加 0.15 基础分
 */

// 权重配置
const WEIGHTS = {
  viewCount: 0.3,
  salesCount: 0.25,
  clickCount: 0.15,
  favoriteCount: 0.1,
  freshness: 0.1,
  ctr: 0.05,
  isFeatured: 0.05,
};

const FRESHNESS_HALF_LIFE_DAYS = 14;
const NEW_PRODUCT_BOOST = 0.15;
const NEW_PRODUCT_DAYS = 7;
const BATCH_SIZE = 500;
const TRUSTED_ACTIVITY_LOOKBACK_DAYS = 30;
const MAX_BUSY_ACTIVE_QUERIES = 4;
const MAX_BUSY_QUERY_AGE_SECONDS = 60;
const UPDATE_STATEMENT_TIMEOUT_MS = 5000;
const SCORE_UPDATE_EPSILON = 0.0000005;
const BUSY_CHECK_BATCH_INTERVAL = 10;
const MAX_RECALCULATION_RUNTIME_MS = 8 * 60 * 1000;
const SUSPICIOUS_VISITOR_EXCLUSION_SQL = `
  (
    event."trustedVisitorId" IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM visit_sessions vs
      WHERE vs.device_id = event."trustedVisitorId"
        AND vs.created_at >= :windowStart
        AND (
          vs.country IN ('CN', 'China', '中国')
          OR (
            vs.landing_page ILIKE '%from=%'
            AND vs.landing_page ILIKE '%products%'
          )
        )
    )
  )
`;

@Injectable()
export class PopularityScoreService {
  private readonly logger = new Logger(PopularityScoreService.name);
  private isRecalculating = false;
  private recalculationCursor?: string;

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductInteractionEvent)
    private readonly productInteractionEventRepository: Repository<ProductInteractionEvent>,
  ) {}

  /**
   * 每小时重新计算所有产品的 popularityScore
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recalculateAll(): Promise<{ updated: number; duration: number }> {
    const start = Date.now();
    if (this.isRecalculating) {
      this.logger.warn('popularityScore 计算仍在运行，跳过本轮');
      return { updated: 0, duration: 0 };
    }

    this.isRecalculating = true;
    try {
      if (await this.isDatabaseBusy()) {
        const duration = Date.now() - start;
        this.logger.warn('Postgres 当前繁忙，跳过本轮 popularityScore 计算');
        return { updated: 0, duration };
      }

      this.logger.log('定时任务：开始计算 popularityScore...');

      // 1. 获取全局最大值用于归一化
      const maxValues = await this.getMaxValues();

      // 2. 分批处理
      let lastProductId = this.recalculationCursor;
      let processedBatches = 0;
      let totalUpdated = 0;
      let stoppedEarly = false;

      while (true) {
        if (Date.now() - start >= MAX_RECALCULATION_RUNTIME_MS) {
          this.logger.warn(
            `popularityScore 计算达到时间预算 ${MAX_RECALCULATION_RUNTIME_MS}ms，提前结束本轮`,
          );
          stoppedEarly = true;
          break;
        }

        if (
          processedBatches > 0 &&
          processedBatches % BUSY_CHECK_BATCH_INTERVAL === 0 &&
          (await this.isDatabaseBusy())
        ) {
          this.logger.warn(
            'Postgres 当前繁忙，提前结束本轮 popularityScore 计算',
          );
          stoppedEarly = true;
          break;
        }

        const products = await this.productRepository.find({
          select: [
            'id',
            'viewCount',
            'salesCount',
            'clickCount',
            'favoriteCount',
            'ctr',
            'isFeatured',
            'createdAt',
            'popularityScore',
          ],
          where: {
            status: ProductStatus.ACTIVE,
            ...(lastProductId ? { id: MoreThan(lastProductId) } : {}),
          },
          order: { id: 'ASC' },
          take: BATCH_SIZE,
        });

        if (products.length === 0) break;
        lastProductId = products[products.length - 1].id;
        processedBatches += 1;

        const updates: { id: string; score: number }[] = [];
        const now = Date.now();
        const interactionStats = await this.getInteractionStats(
          products.map((product) => product.id),
        );

        for (const p of products) {
          const trustedStats = interactionStats.get(p.id) ?? {
            viewCount: 0,
            clickCount: 0,
          };
          const trustedCtr =
            trustedStats.viewCount > 0
              ? trustedStats.clickCount / trustedStats.viewCount
              : 0;
          const score = this.calculateScore(
            {
              ...p,
              viewCount: trustedStats.viewCount,
              clickCount: trustedStats.clickCount,
              ctr: trustedCtr,
            },
            maxValues,
            now,
          );
          const currentScore = Number(p.popularityScore) || 0;
          if (Math.abs(score - currentScore) > SCORE_UPDATE_EPSILON) {
            updates.push({ id: p.id, score });
          }
        }

        // 批量更新
        await this.batchUpdateScores(updates);

        totalUpdated += updates.length;
      }

      this.recalculationCursor = stoppedEarly ? lastProductId : undefined;

      const duration = Date.now() - start;
      this.logger.log(
        `popularityScore 计算完成：${totalUpdated} 个产品，耗时 ${duration}ms`,
      );

      return { updated: totalUpdated, duration };
    } finally {
      this.isRecalculating = false;
    }
  }

  /**
   * 计算单个产品的热度分
   */
  calculateScore(
    product: Pick<
      Product,
      | 'viewCount'
      | 'salesCount'
      | 'clickCount'
      | 'favoriteCount'
      | 'ctr'
      | 'isFeatured'
      | 'createdAt'
    >,
    maxValues: MaxValues,
    now: number = Date.now(),
  ): number {
    const viewScore =
      WEIGHTS.viewCount * logNorm(product.viewCount, maxValues.maxViewCount);
    const salesScore =
      WEIGHTS.salesCount * logNorm(product.salesCount, maxValues.maxSalesCount);
    const clickScore =
      WEIGHTS.clickCount * logNorm(product.clickCount, maxValues.maxClickCount);
    const favScore =
      WEIGHTS.favoriteCount *
      logNorm(product.favoriteCount, maxValues.maxFavoriteCount);
    const freshnessScore =
      WEIGHTS.freshness * freshness(product.createdAt, now);
    const ctrScore = WEIGHTS.ctr * Math.min(Number(product.ctr) || 0, 1);
    const featuredScore = WEIGHTS.isFeatured * (product.isFeatured ? 1 : 0);

    let score =
      viewScore +
      salesScore +
      clickScore +
      favScore +
      freshnessScore +
      ctrScore +
      featuredScore;

    // 新品保护：7 天内的产品额外加分
    const ageInDays =
      (now - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays < NEW_PRODUCT_DAYS) {
      score += NEW_PRODUCT_BOOST;
    }

    return Math.round(score * 1e6) / 1e6;
  }

  /**
   * 获取全局最大值（用于归一化）
   */
  private async getMaxValues(): Promise<MaxValues> {
    const productResult = await this.productRepository
      .createQueryBuilder('p')
      .select('MAX(p.salesCount)', 'maxSalesCount')
      .addSelect('MAX(p.favoriteCount)', 'maxFavoriteCount')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .getRawOne();
    const windowStart = new Date(
      Date.now() - TRUSTED_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const interactionResult =
      await this.productInteractionEventRepository.query(
        `
        SELECT
          COALESCE(MAX(stats."viewCount"), 0)::int AS "maxViewCount",
          COALESCE(MAX(stats."clickCount"), 0)::int AS "maxClickCount"
        FROM (
          SELECT
            event."productId" AS "productId",
            COUNT(*) FILTER (WHERE event."eventType" = $1)::int AS "viewCount",
            COUNT(*) FILTER (WHERE event."eventType" = $2)::int AS "clickCount"
          FROM product_interaction_events event
          WHERE event."createdAt" >= $3
            AND (
              event."trustedVisitorId" IS NULL
              OR NOT EXISTS (
                SELECT 1
                FROM visit_sessions vs
                WHERE vs.device_id = event."trustedVisitorId"
                  AND vs.created_at >= $3
                  AND (
                    vs.country IN ('CN', 'China', '中国')
                    OR (
                      vs.landing_page ILIKE '%from=%'
                      AND vs.landing_page ILIKE '%products%'
                    )
                  )
              )
            )
          GROUP BY event."productId"
        ) stats
      `,
        [
          ProductInteractionEventType.VIEW,
          ProductInteractionEventType.CLICK,
          windowStart,
        ],
      );

    return {
      maxViewCount: Math.max(
        parseInt(interactionResult?.[0]?.maxViewCount, 10) || 0,
        1,
      ),
      maxSalesCount: Math.max(
        parseInt(productResult?.maxSalesCount, 10) || 0,
        1,
      ),
      maxClickCount: Math.max(
        parseInt(interactionResult?.[0]?.maxClickCount, 10) || 0,
        1,
      ),
      maxFavoriteCount: Math.max(
        parseInt(productResult?.maxFavoriteCount, 10) || 0,
        1,
      ),
    };
  }

  private async isDatabaseBusy(): Promise<boolean> {
    try {
      const rows = await this.productRepository.query(`
        SELECT
          COUNT(*) FILTER (
            WHERE state = 'active'
              AND pid <> pg_backend_pid()
              AND now() - query_start > interval '2 seconds'
          )::int AS "activeQueries",
          COALESCE(
            MAX(EXTRACT(EPOCH FROM now() - query_start)) FILTER (
              WHERE state = 'active'
                AND pid <> pg_backend_pid()
            ),
            0
          )::float AS "maxAgeSeconds"
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND query NOT ILIKE '%pg_stat_activity%'
      `);
      const activeQueries =
        parseInt(String(rows?.[0]?.activeQueries ?? 0), 10) || 0;
      const maxAgeSeconds =
        parseFloat(String(rows?.[0]?.maxAgeSeconds ?? 0)) || 0;

      return (
        activeQueries >= MAX_BUSY_ACTIVE_QUERIES ||
        maxAgeSeconds >= MAX_BUSY_QUERY_AGE_SECONDS
      );
    } catch (error) {
      this.logger.warn(
        `无法读取 pg_stat_activity，继续执行 popularityScore 计算: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async getInteractionStats(productIds: string[]) {
    if (productIds.length === 0) {
      return new Map<string, { viewCount: number; clickCount: number }>();
    }

    const windowStart = new Date(
      Date.now() - TRUSTED_ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const rows = await this.productInteractionEventRepository
      .createQueryBuilder('event')
      .select('event."productId"', 'productId')
      .addSelect(
        `COUNT(*) FILTER (WHERE event."eventType" = '${ProductInteractionEventType.VIEW}')`,
        'viewCount',
      )
      .addSelect(
        `COUNT(*) FILTER (WHERE event."eventType" = '${ProductInteractionEventType.CLICK}')`,
        'clickCount',
      )
      .where('event."productId" IN (:...productIds)', { productIds })
      .andWhere('event."createdAt" >= :windowStart', { windowStart })
      .andWhere(SUSPICIOUS_VISITOR_EXCLUSION_SQL, { windowStart })
      .groupBy('event."productId"')
      .getRawMany<{
        productId: string;
        viewCount: string;
        clickCount: string;
      }>();

    return new Map(
      rows.map((row) => [
        row.productId,
        {
          viewCount: parseInt(row.viewCount, 10) || 0,
          clickCount: parseInt(row.clickCount, 10) || 0,
        },
      ]),
    );
  }

  /**
   * 批量更新 popularityScore
   */
  private async batchUpdateScores(
    updates: { id: string; score: number }[],
  ): Promise<void> {
    if (updates.length === 0) return;

    // 使用 CASE WHEN 批量更新，单条 SQL
    const cases = updates
      .map((u) => `WHEN '${u.id}' THEN ${u.score}`)
      .join(' ');
    const ids = updates.map((u) => `'${u.id}'`).join(',');

    await this.productRepository.manager.transaction(async (manager) => {
      await manager.query(
        `SET LOCAL statement_timeout = ${UPDATE_STATEMENT_TIMEOUT_MS}`,
      );
      await manager.query(
        `UPDATE products SET "popularityScore" = CASE id ${cases} END WHERE id IN (${ids})`,
      );
    });
  }
}

// ===== 工具函数 =====

interface MaxValues {
  maxViewCount: number;
  maxSalesCount: number;
  maxClickCount: number;
  maxFavoriteCount: number;
}

/**
 * 对数归一化：log(1 + x) / log(1 + max)
 * 压缩极端值，让中间段产品有区分度
 */
function logNorm(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.log(1 + (Number(value) || 0)) / Math.log(1 + max);
}

/**
 * 新鲜度衰减：exp(-0.693 * ageDays / halfLife)
 * halfLife 天后衰减到 0.5
 */
function freshness(createdAt: Date, now: number): number {
  const ageMs = now - new Date(createdAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.exp((-0.693 * ageDays) / FRESHNESS_HALF_LIFE_DAYS);
}
