import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queue.module';
import { WeidianService } from '../../weidian/weidian.service';
import { Product } from '../../products/entities/product.entity';
import { Sku } from '../../products/entities/sku.entity';

export interface CacheRefreshJobData {
  itemId?: string; // 微店商品ID（单个刷新时使用）
  productId?: string; // 产品ID（单个刷新时使用）
  trigger: 'click' | 'scheduled' | 'manual'; // 触发来源
}

// 前向声明，避免循环依赖
import type { CacheRefreshService } from '../../weidian/cache-refresh.service';

/**
 * 缓存刷新处理器
 * 从微店重新抓取数据，更新 weidian_cache 和 products 表
 */
@Processor(QUEUE_NAMES.CACHE_REFRESH, {
  concurrency: 2, // 限制并发，避免 IP 被封
  lockDuration: 60000, // 60秒锁定
})
export class CacheRefreshProcessor extends WorkerHost {
  private readonly logger = new Logger(CacheRefreshProcessor.name);

  constructor(
    private readonly weidianService: WeidianService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
    @Inject(forwardRef(() => 'CacheRefreshService'))
    private readonly cacheRefreshService: CacheRefreshService,
  ) {
    super();
  }

  async process(job: Job<CacheRefreshJobData>): Promise<void> {
    // 处理每周扫描任务
    if (job.name === 'weekly-scan') {
      this.logger.log('执行每周兜底扫描任务...');
      await this.cacheRefreshService.weeklyRefreshScan();
      return;
    }

    // 处理单个产品刷新任务
    const { itemId, productId, trigger } = job.data;

    if (!itemId || !productId) {
      this.logger.warn('缺少 itemId 或 productId，跳过刷新');
      return;
    }

    this.logger.log(
      `开始刷新缓存: ${itemId} (产品: ${productId}, 触发: ${trigger})`,
    );

    try {
      // 1. 强制刷新抓取微店数据（会自动更新 weidian_cache）
      const freshData = await this.weidianService.scrapeItem({
        itemId,
        forceRefresh: true,
      });

      if (!freshData) {
        this.logger.warn(`微店商品 ${itemId} 抓取失败，可能已下架`);
        return;
      }

      // 2. 更新 products 表
      const product = await this.updateProductFromWeidianData(
        productId,
        freshData,
      );

      // 3. 成功：重置死链计数
      await this.resetDeadLink(productId);

      // 4. 主动触发前端 ISR 刷新
      if (product?.slug) {
        await this.triggerFrontendRevalidate(product.slug);
      }

      this.logger.log(`缓存刷新完成: ${itemId}`);
    } catch (error) {
      this.logger.error(
        `缓存刷新失败: ${itemId} - ${error.message}`,
        error.stack,
      );

      // 判断是否为死链类错误（排除超时和网络抖动）
      if (!this.isTransientError(error)) {
        await this.recordDeadLinkAttempt(productId, error.message);
      }

      throw error; // 抛出让 BullMQ 记录失败
    }
  }

  /**
   * 从微店数据更新产品
   * 注意：对于拆分产品，priceMin/priceMax 应该根据该产品自己的 SKU 计算，
   * 而不是使用微店整体的价格范围
   */
  private async updateProductFromWeidianData(
    productId: string,
    weidianData: any,
  ): Promise<Product | null> {
    // 1. 查找产品
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      this.logger.warn(`产品 ${productId} 不存在，跳过更新`);
      return null;
    }

    // 2. 先更新 SKU 价格和库存（这样后面计算价格范围时能用到最新数据）
    if (weidianData.skus?.length > 0) {
      await this.updateSkuPricesAndStock(productId, weidianData.skus);
    }

    // 3. 根据产品自己的 SKU 重新计算价格范围
    const updates: Record<string, any> = {};
    let hasChanges = false;

    const productSkus = await this.skuRepository.find({
      where: { productId },
      select: ['price'],
    });

    if (productSkus.length > 0) {
      // 计算该产品自己 SKU 的价格范围
      const prices = productSkus.map((sku) => sku.price).filter((p) => p > 0);
      if (prices.length > 0) {
        const calculatedMin = Math.min(...prices);
        const calculatedMax = Math.max(...prices);

        if (Number(product.priceMin) !== calculatedMin) {
          updates.priceMin = calculatedMin;
          hasChanges = true;
        }

        if (Number(product.priceMax) !== calculatedMax) {
          updates.priceMax = calculatedMax;
          hasChanges = true;
        }
      }
    }

    // 4. 更新店铺信息（如果之前没有）
    if (!product.weidianShopId && weidianData.shopId) {
      updates.weidianShopId = weidianData.shopId;
      hasChanges = true;
    }

    if (!product.weidianShopName && weidianData.shopName) {
      updates.weidianShopName = weidianData.shopName;
      hasChanges = true;
    }

    // 5. 保存产品更新
    if (hasChanges) {
      await this.productRepository.update(productId, updates);
      this.logger.log(`产品 ${productId} 已更新: ${JSON.stringify(updates)}`);
    }

    return product;
  }

  /**
   * 通知前端 Next.js 主动刷新指定产品页的 ISR 缓存
   */
  private async triggerFrontendRevalidate(slug: string): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3101';
    const secret = process.env.REVALIDATE_SECRET;

    if (!secret) {
      this.logger.warn('REVALIDATE_SECRET 未配置，跳过前端缓存刷新');
      return;
    }

    try {
      const response = await fetch(`${frontendUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': secret,
        },
        body: JSON.stringify({ slug }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.logger.log(`前端 ISR 已刷新: /products/${slug}`);
      } else {
        this.logger.warn(`前端 ISR 刷新失败: ${response.status}`);
      }
    } catch (error) {
      // 不影响主流程，只记录日志
      this.logger.warn(`前端 ISR 刷新异常: ${error.message}`);
    }
  }

  /**
   * 更新 SKU 价格和库存
   */
  private async updateSkuPricesAndStock(
    productId: string,
    weidianSkus: any[],
  ): Promise<void> {
    // 获取现有 SKU
    const existingSkus = await this.skuRepository.find({
      where: { productId },
    });

    if (existingSkus.length === 0) {
      return;
    }

    // 创建微店 SKU 映射（按 skuKey 匹配）
    const weidianSkuMap = new Map<string, any>();
    for (const sku of weidianSkus) {
      if (sku.skuKey) {
        weidianSkuMap.set(sku.skuKey, sku);
      }
    }

    // 收集所有需要更新的 SKU，然后并发执行
    const pendingUpdates: Array<{ id: string; updates: Record<string, any> }> =
      [];
    for (const sku of existingSkus) {
      const weidianSku = weidianSkuMap.get(sku.skuKey);
      if (!weidianSku) continue;

      const updates: Record<string, any> = {};
      let hasChanges = false;

      // 更新价格
      if (weidianSku.price !== undefined) {
        const newPrice = parseFloat(weidianSku.price);
        if (sku.price !== newPrice) {
          updates.price = newPrice;
          hasChanges = true;
        }
      }

      // 更新库存
      if (weidianSku.stock !== undefined) {
        const newStock = parseInt(weidianSku.stock, 10);
        if (sku.stock !== newStock) {
          updates.stock = newStock;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        pendingUpdates.push({ id: sku.id, updates });
      }
    }

    if (pendingUpdates.length > 0) {
      await Promise.all(
        pendingUpdates.map(({ id, updates }) =>
          this.skuRepository.update(id, updates),
        ),
      );
    }
    const updatedCount = pendingUpdates.length;

    if (updatedCount > 0) {
      this.logger.log(`产品 ${productId} 更新了 ${updatedCount} 个 SKU`);
    }
  }

  /**
   * 判断是否为瞬态错误（超时/网络抖动），瞬态错误不计入死链
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return (
      error.name === 'AbortError' ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('socket hang up') ||
      error.message.includes('504') ||
      error.message.includes('503') ||
      error.message.includes('429') ||
      error.message.includes('rate limit') ||
      error.message.includes('Rate limit')
    );
  }

  /**
   * 记录一次死链失败，满足条件后标记为确认死链
   * 规则：连续 2 次失败（且间隔 >= 24h）才确认为死链
   */
  private async recordDeadLinkAttempt(
    productId: string,
    reason: string,
  ): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'weidianDeadLinkAt', 'weidianDeadLinkAttempts'],
    });
    if (!product) return;

    const now = new Date();
    const attempts = product.weidianDeadLinkAttempts ?? 0;

    if (attempts === 0) {
      // 第一次失败：记录时间和原因，等待下次确认
      await this.productRepository.update(productId, {
        weidianDeadLinkAt: now,
        weidianDeadLinkReason: reason,
        weidianDeadLinkAttempts: 1,
      });
      this.logger.warn(`产品 ${productId} 首次死链疑似，等待24h后二次确认`);
    } else {
      // 已有失败记录：检查是否满足 24h 间隔
      const firstAt = product.weidianDeadLinkAt;
      const hoursSinceFirst = firstAt
        ? (now.getTime() - firstAt.getTime()) / (1000 * 60 * 60)
        : 999;

      if (hoursSinceFirst >= 24) {
        await this.productRepository.update(productId, {
          weidianDeadLinkReason: reason,
          weidianDeadLinkAttempts: attempts + 1,
        });
        this.logger.warn(
          `产品 ${productId} 死链已确认（连续失败 ${attempts + 1} 次）`,
        );
      } else {
        this.logger.debug(
          `产品 ${productId} 死链间隔不足24h（${hoursSinceFirst.toFixed(1)}h），跳过计数`,
        );
      }
    }
  }

  /**
   * 抓取成功时重置死链状态
   */
  private async resetDeadLink(productId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['id', 'weidianDeadLinkAttempts'],
    });
    if (!product || product.weidianDeadLinkAttempts === 0) return;

    await this.productRepository.update(productId, {
      weidianDeadLinkAt: () => 'NULL',
      weidianDeadLinkReason: () => 'NULL',
      weidianDeadLinkAttempts: 0,
    });
    this.logger.log(`产品 ${productId} 死链状态已重置（抓取成功）`);
  }
}
