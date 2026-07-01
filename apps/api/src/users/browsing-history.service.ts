import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBrowsingHistory } from './entities/user-browsing-history.entity';

const MAX_HISTORY_PER_USER = 100;

interface RecordViewDto {
  productId: string;
  brandId?: string;
  categoryId?: string;
}

interface BulkRecordDto {
  items: (RecordViewDto & { viewedAt: number })[];
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'driverError' in error &&
    (error as { driverError?: { code?: string } }).driverError?.code === '23503'
  );
}

@Injectable()
export class BrowsingHistoryService {
  private readonly logger = new Logger(BrowsingHistoryService.name);

  constructor(
    @InjectRepository(UserBrowsingHistory)
    private readonly repo: Repository<UserBrowsingHistory>,
  ) {}

  /**
   * 记录单次浏览（upsert：存在则更新 viewedAt）
   */
  async recordView(userId: string, dto: RecordViewDto): Promise<void> {
    try {
      await this.repo
        .createQueryBuilder()
        .insert()
        .into(UserBrowsingHistory)
        .values({
          user: { id: userId },
          product: { id: dto.productId },
          brandId: dto.brandId || null,
          categoryId: dto.categoryId || null,
        })
        .orUpdate(
          ['viewed_at', 'brand_id', 'category_id'],
          ['user_id', 'product_id'],
        )
        .execute();
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        this.logger.warn(
          `Skipping browsing history for missing product ${dto.productId}`,
        );
        return;
      }
      throw error;
    }

    // 异步清理超出上限的旧记录
    this.pruneOldRecords(userId).catch((err) =>
      this.logger.warn(`Failed to prune browsing history: ${err.message}`),
    );
  }

  /**
   * 批量同步（登录时将本地历史上传）
   */
  async bulkSync(
    userId: string,
    dto: BulkRecordDto,
  ): Promise<{ synced: number }> {
    if (!dto.items || dto.items.length === 0) return { synced: 0 };

    const items = dto.items.slice(0, MAX_HISTORY_PER_USER);
    let synced = 0;

    for (const item of items) {
      try {
        await this.repo
          .createQueryBuilder()
          .insert()
          .into(UserBrowsingHistory)
          .values({
            user: { id: userId },
            product: { id: item.productId },
            brandId: item.brandId || null,
            categoryId: item.categoryId || null,
            viewedAt: new Date(item.viewedAt),
          })
          .orIgnore()
          .execute();
        synced++;
      } catch {
        // 跳过无效记录（如 productId 不存在）
      }
    }

    await this.pruneOldRecords(userId);
    return { synced };
  }

  /**
   * 获取用户浏览历史
   */
  async getHistory(
    userId: string,
    limit = 50,
  ): Promise<{
    data: {
      productId: string;
      brandId: string | null;
      categoryId: string | null;
      viewedAt: Date;
    }[];
  }> {
    const records = await this.repo.find({
      where: { user: { id: userId } },
      order: { viewedAt: 'DESC' },
      take: Math.min(limit, MAX_HISTORY_PER_USER),
      relations: ['product'],
    });

    return {
      data: records
        .filter((r) => r.product) // 排除已删除的商品
        .map((r) => ({
          productId: r.product.id,
          brandId: r.brandId,
          categoryId: r.categoryId,
          viewedAt: r.viewedAt,
        })),
    };
  }

  /**
   * 清空用户浏览历史
   */
  async clearHistory(userId: string): Promise<void> {
    await this.repo.delete({ user: { id: userId } });
  }

  /**
   * 清理超出上限的旧记录
   */
  private async pruneOldRecords(userId: string): Promise<void> {
    const count = await this.repo.count({
      where: { user: { id: userId } },
    });

    if (count <= MAX_HISTORY_PER_USER) return;

    // 找到第 MAX_HISTORY_PER_USER 条的 viewedAt，删除更早的
    const cutoff = await this.repo.find({
      where: { user: { id: userId } },
      order: { viewedAt: 'DESC' },
      skip: MAX_HISTORY_PER_USER,
      take: 1,
    });

    if (cutoff.length > 0) {
      await this.repo
        .createQueryBuilder()
        .delete()
        .from(UserBrowsingHistory)
        .where('user_id = :userId', { userId })
        .andWhere('viewed_at <= :cutoffDate', {
          cutoffDate: cutoff[0].viewedAt,
        })
        .execute();
    }
  }
}
