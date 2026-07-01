import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../entities/product.entity';
import { VisualSearchService } from '../../search/visual-search.service';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: 'weidian_id' | 'variant_key' | 'visual_similarity';
  matchedProductId?: string;
  matchedProductTitle?: string;
  matchedProductImage?: string;
  matchedShopName?: string; // 来源店铺名
  similarity?: number; // 0-100，仅 visual_similarity 时有值
  embedding?: number[]; // 生成的 embedding 向量，供调用方复用
}

export interface CheckAllParams {
  weidianItemId?: string;
  splitSourceWeidianId?: string;
  skuVariantKey?: string;
  imageUrl?: string;
  visualThreshold?: number; // 默认 95
  precomputedEmbedding?: number[]; // 已生成的 embedding，避免重复调 CLIP
}

const NOT_DUPLICATE: DuplicateCheckResult = { isDuplicate: false };
const DEFAULT_VISUAL_THRESHOLD = 95;

@Injectable()
export class UnifiedDuplicateCheckService {
  private readonly logger = new Logger(UnifiedDuplicateCheckService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly visualSearchService: VisualSearchService,
  ) {}

  /**
   * 策略1：weidianItemId 精确匹配（批量导入用）
   */
  async checkByWeidianItemId(itemId: string): Promise<DuplicateCheckResult> {
    if (!itemId) return NOT_DUPLICATE;

    const existing = await this.productRepository.findOne({
      where: { weidianItemId: itemId },
      select: ['id', 'title', 'mainImage', 'weidianShopName'],
    });

    if (existing) {
      return {
        isDuplicate: true,
        matchType: 'weidian_id',
        matchedProductId: existing.id,
        matchedProductTitle: existing.title,
        matchedProductImage: existing.mainImage,
        matchedShopName: existing.weidianShopName,
      };
    }

    return NOT_DUPLICATE;
  }

  /**
   * 策略2：拆分变体键匹配（SKU 拆分同源去重）
   */
  async checkByVariantKey(
    sourceWeidianId: string,
    variantKey: string,
  ): Promise<DuplicateCheckResult> {
    if (!sourceWeidianId || !variantKey) return NOT_DUPLICATE;

    const existing = await this.productRepository.findOne({
      where: {
        splitSourceWeidianId: sourceWeidianId,
        skuVariantKey: variantKey,
      },
      select: ['id', 'title', 'mainImage', 'weidianShopName'],
    });

    if (existing) {
      return {
        isDuplicate: true,
        matchType: 'variant_key',
        matchedProductId: existing.id,
        matchedProductTitle: existing.title,
        matchedProductImage: existing.mainImage,
        matchedShopName: existing.weidianShopName,
      };
    }

    return NOT_DUPLICATE;
  }

  /**
   * 仅生成图片向量（不做搜索），用于 prefetch 预热缓存
   */
  async generateEmbedding(imageUrl: string): Promise<number[] | null> {
    if (!imageUrl || !this.visualSearchService.isAvailable()) return null;
    try {
      return await this.visualSearchService.getImageEmbeddingFromUrl(imageUrl);
    } catch (error) {
      this.logger.warn(
        `向量生成失败: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  /**
   * 策略3：图片视觉相似度匹配（跨路径去重核心能力）
   *
   * @param imageUrl 图片 URL
   * @param threshold 相似度阈值（默认 95）
   * @param precomputedEmbedding 已生成的 embedding，传入则跳过 CLIP 调用
   * @returns 结果中包含 embedding 字段，供调用方复用存储
   */
  async checkByImageSimilarity(
    imageUrl: string,
    threshold = DEFAULT_VISUAL_THRESHOLD,
    precomputedEmbedding?: number[],
  ): Promise<DuplicateCheckResult> {
    if (!imageUrl) return NOT_DUPLICATE;
    if (!this.visualSearchService.isAvailable()) {
      this.logger.warn('视觉搜索服务不可用，跳过图片去重');
      return NOT_DUPLICATE;
    }

    try {
      const embedding =
        precomputedEmbedding ??
        (await this.visualSearchService.getImageEmbeddingFromUrl(imageUrl));

      const duplicates = await this.visualSearchService.searchByEmbedding(
        embedding,
        1,
        threshold,
      );

      if (duplicates.length > 0) {
        const match = duplicates[0];
        return {
          isDuplicate: true,
          matchType: 'visual_similarity',
          matchedProductId: match.product.id,
          matchedProductTitle: match.product.title,
          matchedProductImage: match.product.mainImage,
          matchedShopName: match.product.weidianShopName,
          similarity: match.similarity,
          embedding,
        };
      }

      // 未重复，也返回 embedding 供调用方复用
      return { isDuplicate: false, embedding };
    } catch (error) {
      this.logger.warn(
        `图片去重检查失败: ${error instanceof Error ? error.message : error}`,
      );
      // 失败不阻塞流程
    }

    return NOT_DUPLICATE;
  }

  /**
   * 组合检查：按成本从低到高依次执行，命中即返回
   *
   * 顺序：weidianItemId → variantKey → 视觉相似度
   */
  async checkAll(params: CheckAllParams): Promise<DuplicateCheckResult> {
    // 1. weidianItemId 精确匹配（最快，DB 索引查询）
    if (params.weidianItemId) {
      const result = await this.checkByWeidianItemId(params.weidianItemId);
      if (result.isDuplicate) return result;
    }

    // 2. 拆分变体键匹配（快，DB 查询）
    if (params.splitSourceWeidianId && params.skuVariantKey) {
      const result = await this.checkByVariantKey(
        params.splitSourceWeidianId,
        params.skuVariantKey,
      );
      if (result.isDuplicate) return result;
    }

    // 3. 视觉相似度匹配（慢，需调用 embedding 服务 + pgvector）
    if (params.imageUrl) {
      const result = await this.checkByImageSimilarity(
        params.imageUrl,
        params.visualThreshold ?? DEFAULT_VISUAL_THRESHOLD,
        params.precomputedEmbedding,
      );
      if (result.isDuplicate) return result;
      // 未重复时也返回 embedding，供调用方复用存储
      if (result.embedding) {
        return { isDuplicate: false, embedding: result.embedding };
      }
    }

    return NOT_DUPLICATE;
  }
}
