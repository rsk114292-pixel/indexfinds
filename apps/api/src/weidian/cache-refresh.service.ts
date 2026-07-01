import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES } from '../queue/queue.module';
import { WeidianCache } from '../products/entities/weidian-cache.entity';
import { Product } from '../products/entities/product.entity';
import { ProductStatus } from '../products/product-status';
import { IsNull, Not } from 'typeorm';

/**
 * 缓存刷新服务
 * 负责管理微店缓存的智能刷新策略：
 * 1. 主策略：点击触发 + 4小时冷却
 * 2. 兜底策略：每周扫描一次，分批更新
 */
@Injectable()
export class CacheRefreshService implements OnModuleInit {
  private readonly logger = new Logger(CacheRefreshService.name);

  // 冷却时间：4小时
  private readonly COOLDOWN_MS = 4 * 60 * 60 * 1000;

  // 兜底扫描阈值：25天（提前于30天过期前刷新）
  private readonly STALE_THRESHOLD_DAYS = 25;

  // 每批处理数量
  private readonly BATCH_SIZE = 50;

  constructor(
    @InjectQueue(QUEUE_NAMES.CACHE_REFRESH)
    private readonly cacheRefreshQueue: Queue,
    @InjectRepository(WeidianCache)
    private readonly cacheRepository: Repository<WeidianCache>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * 模块初始化时设置每周定时任务
   */
  async onModuleInit(): Promise<void> {
    // 使用 BullMQ 的 repeat 功能实现每周定时任务
    // 每周日凌晨 3 点执行
    await this.cacheRefreshQueue.add(
      'weekly-scan',
      { trigger: 'scheduled' },
      {
        repeat: {
          pattern: '0 3 * * 0', // 每周日凌晨 3 点
        },
        jobId: 'weekly-cache-scan',
      },
    );
    this.logger.log('已设置每周缓存刷新定时任务（每周日凌晨 3 点）');
  }

  /**
   * 点击触发刷新检查
   * 在用户点击产品（外跳）时调用
   */
  async triggerRefreshOnClick(productId: string): Promise<void> {
    try {
      // 1. 查找产品
      const product = await this.productRepository.findOne({
        where: { id: productId },
        select: ['id', 'weidianItemId'],
      });

      if (!product?.weidianItemId) {
        this.logger.debug(`产品 ${productId} 没有关联的微店商品ID，跳过刷新`);
        return;
      }

      // 2. 检查缓存
      const cache = await this.cacheRepository.findOne({
        where: { itemId: product.weidianItemId },
        select: ['itemId', 'lastFetchedAt'],
      });

      if (!cache) {
        this.logger.debug(
          `微店商品 ${product.weidianItemId} 没有缓存，跳过刷新`,
        );
        return;
      }

      // 3. 检查冷却期
      const age = Date.now() - new Date(cache.lastFetchedAt).getTime();
      if (age < this.COOLDOWN_MS) {
        this.logger.debug(
          `微店商品 ${product.weidianItemId} 在冷却期内（${Math.round(age / 60000)}分钟前刷新），跳过`,
        );
        return;
      }

      // 4. 加入队列异步刷新
      await this.cacheRefreshQueue.add(
        'refresh',
        {
          itemId: product.weidianItemId,
          productId: product.id,
          trigger: 'click',
        },
        {
          // 使用 itemId 作为 jobId，避免重复任务
          jobId: `refresh-${product.weidianItemId}`,
          // 如果已有相同任务在队列中，不重复添加
          removeOnComplete: true,
          removeOnFail: { count: 3 },
        },
      );

      this.logger.log(
        `已将微店商品 ${product.weidianItemId} 加入刷新队列（点击触发）`,
      );
    } catch (error) {
      // 刷新失败不影响主流程
      this.logger.error(`触发刷新检查失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 每周兜底扫描
   * 每周日凌晨 3 点执行，找出快过期的缓存并分批刷新
   */
  async weeklyRefreshScan(): Promise<void> {
    this.logger.log('开始每周兜底扫描...');

    try {
      // 找出 >25天 未刷新的产品
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - this.STALE_THRESHOLD_DAYS);

      const staleProducts = await this.productRepository
        .createQueryBuilder('p')
        .innerJoin(WeidianCache, 'wc', 'p.weidianItemId = wc.itemId')
        .where('wc.lastFetchedAt < :staleDate', { staleDate })
        .andWhere('p.status IN (:...statuses)', {
          statuses: [ProductStatus.ACTIVE, ProductStatus.PENDING_REVIEW],
        })
        .andWhere('p.isFromSplit = false') // 拆分产品由管理员人工管理，不参与自动刷新
        .select(['p.id', 'p.weidianItemId'])
        .getMany();

      if (staleProducts.length === 0) {
        this.logger.log('没有需要刷新的过期缓存');
        return;
      }

      this.logger.log(`找到 ${staleProducts.length} 个需要刷新的产品`);

      // 分批加入队列，均匀分布到一周内
      const totalBatches = Math.ceil(staleProducts.length / this.BATCH_SIZE);
      const intervalMs = Math.floor((7 * 24 * 60 * 60 * 1000) / totalBatches);

      for (let i = 0; i < staleProducts.length; i += this.BATCH_SIZE) {
        const batch = staleProducts.slice(i, i + this.BATCH_SIZE);
        const batchIndex = Math.floor(i / this.BATCH_SIZE);
        const delay = batchIndex * intervalMs;

        // 为每个产品创建刷新任务（批量入队，减少 Redis 往返）
        await this.cacheRefreshQueue.addBulk(
          batch.map((product) => ({
            name: 'refresh',
            data: {
              itemId: product.weidianItemId,
              productId: product.id,
              trigger: 'scheduled' as const,
            },
            opts: {
              jobId: `scheduled-${product.weidianItemId}`,
              delay,
              removeOnComplete: true,
              removeOnFail: { count: 3 },
            },
          })),
        );

        this.logger.log(
          `第 ${batchIndex + 1}/${totalBatches} 批（${batch.length} 个）已加入队列，延迟 ${Math.round(delay / 3600000)} 小时`,
        );
      }

      this.logger.log('每周兜底扫描完成');
    } catch (error) {
      this.logger.error(`每周兜底扫描失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 手动触发兜底扫描（供管理后台调用）
   */
  async manualRefreshScan(options?: {
    staleDays?: number;
    batchSize?: number;
  }): Promise<{ total: number; batches: number }> {
    const staleDays = options?.staleDays || this.STALE_THRESHOLD_DAYS;
    const batchSize = options?.batchSize || this.BATCH_SIZE;

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - staleDays);

    const staleProducts = await this.productRepository
      .createQueryBuilder('p')
      .innerJoin(WeidianCache, 'wc', 'p.weidianItemId = wc.itemId')
      .where('wc.lastFetchedAt < :staleDate', { staleDate })
      .andWhere('p.status IN (:...statuses)', {
        statuses: [ProductStatus.ACTIVE, ProductStatus.PENDING_REVIEW],
      })
      .andWhere('p.isFromSplit = false') // 拆分产品由管理员人工管理，不参与批量刷新
      .select(['p.id', 'p.weidianItemId'])
      .getMany();

    if (staleProducts.length === 0) {
      return { total: 0, batches: 0 };
    }

    // 分批加入队列，每批间隔 1 小时
    const intervalMs = 60 * 60 * 1000;

    for (let i = 0; i < staleProducts.length; i += batchSize) {
      const batch = staleProducts.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      const delay = batchIndex * intervalMs;

      await this.cacheRefreshQueue.addBulk(
        batch.map((product) => ({
          name: 'refresh',
          data: {
            itemId: product.weidianItemId,
            productId: product.id,
            trigger: 'manual' as const,
          },
          opts: {
            jobId: `refresh-${product.weidianItemId}`,
            delay,
            removeOnComplete: true,
            removeOnFail: { count: 3 },
          },
        })),
      );
    }

    return {
      total: staleProducts.length,
      batches: Math.ceil(staleProducts.length / batchSize),
    };
  }

  /**
   * 获取死链统计数据
   */
  async getDeadLinkStats(): Promise<{
    suspected: number;
    confirmed: number;
  }> {
    const suspected = await this.productRepository.count({
      where: {
        weidianDeadLinkAttempts: 1,
        weidianDeadLinkAt: Not(IsNull()),
      },
    });

    const confirmedRaw = await this.productRepository
      .createQueryBuilder('p')
      .where('p.weidianDeadLinkAttempts >= 2')
      .getCount();

    return { suspected, confirmed: confirmedRaw };
  }

  /**
   * 重置单个产品的死链状态（管理员标记为误判）
   */
  async resetDeadLink(productId: string): Promise<void> {
    await this.productRepository.update(productId, {
      weidianDeadLinkAt: () => 'NULL',
      weidianDeadLinkReason: () => 'NULL',
      weidianDeadLinkAttempts: 0,
    });
  }
}
