import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';
import { Brand } from '../brands/entities/brand.entity';
import { ProductSplitHistory } from './entities/product-split-history.entity';
import type {
  RollbackResult,
  SplitHistoryListOptions,
} from './dto/mixed-product.types';

@Injectable()
export class MixedProductHistoryService {
  private readonly logger = new Logger(MixedProductHistoryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductSplitHistory)
    private readonly splitHistoryRepository: Repository<ProductSplitHistory>,
    @InjectRepository(Brand)
    private readonly brandRepository: Repository<Brand>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 回滚拆分操作
   */
  async rollbackSplit(
    splitHistoryId: string,
    reason: string,
    _operatorId?: string,
  ): Promise<RollbackResult> {
    // 获取拆分历史
    const splitHistory = await this.splitHistoryRepository.findOne({
      where: { id: splitHistoryId },
    });

    if (!splitHistory) {
      throw new NotFoundException(`拆分记录 ${splitHistoryId} 不存在`);
    }

    if (splitHistory.status === 'rolled_back') {
      throw new ConflictException('该拆分操作已被回滚');
    }

    // 获取原商品
    const sourceProduct = await this.productRepository.findOne({
      where: { id: splitHistory.sourceProductId },
    });

    if (!sourceProduct) {
      throw new NotFoundException(
        `原商品 ${splitHistory.sourceProductId} 不存在`,
      );
    }

    // 开启事务
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 收集拆分产品关联的品牌 ID（用于后续清理孤儿品牌）
      const splitProducts = await queryRunner.manager.find(Product, {
        where: { id: In(splitHistory.resultProductIds) },
        select: ['id', 'brandId'],
      });
      const brandIds = [
        ...new Set(
          splitProducts
            .map((p) => p.brandId)
            .filter((id): id is string => !!id),
        ),
      ];

      // 删除拆分后创建的商品（级联删除 SKU）
      await queryRunner.manager.delete(Product, {
        id: In(splitHistory.resultProductIds),
      });

      // 恢复原商品状态
      await queryRunner.manager.update(Product, splitHistory.sourceProductId, {
        status: ProductStatus.PENDING_REVIEW, // 恢复到待审核状态
        productGroupId: null as unknown as string, // 清除分组 ID
      });

      // 更新拆分历史状态
      await queryRunner.manager.update(ProductSplitHistory, splitHistoryId, {
        status: 'rolled_back',
        rolledBackAt: new Date(),
        rolledBackReason: reason,
      });

      // 清理孤儿品牌：删除拆分时自动创建的、现在已无关联产品的品牌
      if (brandIds.length > 0) {
        for (const brandId of brandIds) {
          const brand = await queryRunner.manager.findOne(Brand, {
            where: { id: brandId },
          });
          if (!brand) continue;

          // 只清理 AI 自动创建的品牌
          if (brand.metadata?.aiSource !== 'auto-created') continue;

          // 检查是否还有其他产品使用这个品牌
          const productCount = await queryRunner.manager.count(Product, {
            where: { brandId },
          });

          if (productCount === 0) {
            await queryRunner.manager.delete(Brand, { id: brandId });
            this.logger.log(`清理孤儿品牌: ${brand.name} (${brandId})`);
          }
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `拆分回滚成功: ${splitHistoryId}, 已删除 ${splitHistory.resultProductIds.length} 个商品`,
      );

      return {
        success: true,
        restoredProductId: splitHistory.sourceProductId,
        deletedProductIds: splitHistory.resultProductIds,
        reason,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`回滚拆分 ${splitHistoryId} 失败: ${error}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 删除拆分历史记录
   */
  async deleteSplitHistory(id: string): Promise<void> {
    const history = await this.splitHistoryRepository.findOne({
      where: { id },
    });
    if (!history) {
      throw new NotFoundException(`拆分记录 ${id} 不存在`);
    }
    await this.splitHistoryRepository.delete(id);
    this.logger.log(`拆分历史已删除: ${id}`);
  }

  /**
   * 批量删除拆分历史记录
   */
  async batchDeleteSplitHistory(ids: string[]): Promise<{ deleted: number }> {
    const result = await this.splitHistoryRepository.delete(ids);
    const deleted = result.affected ?? 0;
    this.logger.log(`批量删除拆分历史: ${deleted} 条`);
    return { deleted };
  }

  /**
   * 获取所有拆分历史列表（分页）
   */
  async getAllSplitHistory(options: SplitHistoryListOptions = {}): Promise<{
    items: ProductSplitHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, weidianItemId } = options;

    const queryBuilder = this.splitHistoryRepository
      .createQueryBuilder('history')
      .orderBy('history.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (weidianItemId) {
      queryBuilder.andWhere('history.sourceWeidianItemId = :weidianItemId', {
        weidianItemId,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * 获取商品的拆分历史
   */
  async getSplitHistory(productId: string): Promise<ProductSplitHistory[]> {
    return this.splitHistoryRepository.find({
      where: [
        { sourceProductId: productId },
        { resultProductIds: In([productId]) },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取拆分历史详情
   */
  async getSplitHistoryDetail(historyId: string) {
    const history = await this.splitHistoryRepository.findOne({
      where: { id: historyId },
    });

    if (!history) {
      throw new NotFoundException(`拆分记录 ${historyId} 不存在`);
    }

    const resultProducts = await this.productRepository.find({
      where: { id: In(history.resultProductIds) },
      relations: ['skus'],
    });

    // 格式化返回数据，展平结构以便前端使用
    return {
      id: history.id,
      sourceWeidianItemId: history.sourceWeidianItemId,
      sourceUrl: history.sourceUrl,
      resultProductIds: history.resultProductIds,
      splitStrategy: history.splitStrategy,
      status: history.status,
      createdAt: history.createdAt,
      rolledBackAt: history.rolledBackAt,
      rolledBackReason: history.rolledBackReason,
      operatorId: history.operatorId,
      aiAnalysisData: history.aiAnalysisData,
      createdProducts: resultProducts.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        skuCount: p.skus?.length || 0,
        status: p.status,
      })),
    };
  }
}
