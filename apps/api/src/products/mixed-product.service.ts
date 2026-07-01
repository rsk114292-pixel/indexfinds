import { Injectable, Logger } from '@nestjs/common';
import { MixedProductQueryService } from './mixed-product-query.service';
import { MixedProductSplitService } from './mixed-product-split.service';
import { MixedProductHistoryService } from './mixed-product-history.service';
import { Product } from './entities/product.entity';
import { ProductSplitHistory } from './entities/product-split-history.entity';

// Re-export types for backward compatibility
export type {
  SkuGroupMapping,
  CustomGroup,
  SplitProductRequest,
  SplitPreviewResult,
  SplitExecutionResult,
  RollbackResult,
  MixedProductDetail,
  MixedProductListOptions,
  SplitHistoryListOptions,
} from './dto/mixed-product.types';

import type {
  SplitProductRequest,
  SplitPreviewResult,
  SplitExecutionResult,
  RollbackResult,
  MixedProductDetail,
  MixedProductListOptions,
  SplitHistoryListOptions,
} from './dto/mixed-product.types';

/**
 * MixedProductService - Facade 服务
 *
 * 聚合以下子服务：
 * - MixedProductQueryService: 查询混合商品
 * - MixedProductSplitService: 执行拆分操作
 * - MixedProductHistoryService: 历史记录和回滚
 */
@Injectable()
export class MixedProductService {
  private readonly logger = new Logger(MixedProductService.name);

  constructor(
    private readonly queryService: MixedProductQueryService,
    private readonly splitService: MixedProductSplitService,
    private readonly historyService: MixedProductHistoryService,
  ) {}

  // ============================================================
  // 查询方法 (委托给 MixedProductQueryService)
  // ============================================================

  /**
   * 获取待处理的混合商品列表
   */
  async getMixedProductsList(options: MixedProductListOptions = {}): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.queryService.getMixedProductsList(options);
  }

  /**
   * 获取单个混合商品详情（包含 AI 分析数据）
   */
  async getMixedProductDetail(productId: string): Promise<MixedProductDetail> {
    return this.queryService.getMixedProductDetail(productId);
  }

  // ============================================================
  // 拆分方法 (委托给 MixedProductSplitService)
  // ============================================================

  /**
   * 生成拆分预览 - 自动预填 SKU 映射
   */
  async generateSplitPreview(productId: string): Promise<SplitPreviewResult> {
    return this.splitService.generateSplitPreview(productId);
  }

  /**
   * 执行商品拆分
   */
  async executeSplit(
    request: SplitProductRequest,
  ): Promise<SplitExecutionResult> {
    return this.splitService.executeSplit(request);
  }

  // ============================================================
  // 历史和回滚方法 (委托给 MixedProductHistoryService)
  // ============================================================

  /**
   * 回滚拆分操作
   */
  async rollbackSplit(
    splitHistoryId: string,
    reason: string,
    operatorId?: string,
  ): Promise<RollbackResult> {
    return this.historyService.rollbackSplit(
      splitHistoryId,
      reason,
      operatorId,
    );
  }

  /**
   * 删除拆分历史记录
   */
  async deleteSplitHistory(id: string): Promise<void> {
    return this.historyService.deleteSplitHistory(id);
  }

  /**
   * 批量删除拆分历史记录
   */
  async batchDeleteSplitHistory(ids: string[]): Promise<{ deleted: number }> {
    return this.historyService.batchDeleteSplitHistory(ids);
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
    return this.historyService.getAllSplitHistory(options);
  }

  /**
   * 获取商品的拆分历史
   */
  async getSplitHistory(productId: string): Promise<ProductSplitHistory[]> {
    return this.historyService.getSplitHistory(productId);
  }

  /**
   * 获取拆分历史详情
   */
  async getSplitHistoryDetail(historyId: string) {
    return this.historyService.getSplitHistoryDetail(historyId);
  }
}
