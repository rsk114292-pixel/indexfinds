import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Sku } from './entities/sku.entity';
import type {
  MixedProductDetail,
  MixedProductListOptions,
} from './dto/mixed-product.types';
import type { ComprehensiveProductAnalysis } from '../ai/ai.types';

@Injectable()
export class MixedProductQueryService {
  private readonly logger = new Logger(MixedProductQueryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private readonly skuRepository: Repository<Sku>,
  ) {}

  /**
   * 获取待处理的混合商品列表
   */
  async getMixedProductsList(options: MixedProductListOptions = {}): Promise<{
    items: Product[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, minMixednessScore = 0.3 } = options;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.primaryCategory', 'primaryCategory')
      .where('product.potentialMixedProduct = :potential', { potential: true })
      .andWhere('product.status = :status', { status: 'pending_review' })
      .andWhere('product.mixednessScore >= :minScore', {
        minScore: minMixednessScore,
      })
      .orderBy('product.mixednessScore', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * 获取单个混合商品详情（包含 AI 分析数据）
   */
  async getMixedProductDetail(productId: string): Promise<MixedProductDetail> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['brand', 'primaryCategory', 'secondaryCategories'],
    });

    if (!product) {
      throw new NotFoundException(`商品 ${productId} 不存在`);
    }

    const skus = await this.skuRepository.find({
      where: { productId },
    });

    // splitMetadata 中存储了 AI 分析结果
    // 注意：数据保存在 aiAnalysisSnapshot 字段中
    const rawMetadata = product.splitMetadata as any;
    let splitMetadata =
      rawMetadata?.aiAnalysisSnapshot as ComprehensiveProductAnalysis | null;

    // 降级处理：如果没有 aiAnalysisSnapshot，尝试从旧的结构中重建
    if (!splitMetadata && rawMetadata?.suggestedGroups) {
      this.logger.warn(
        `商品 ${productId} 使用旧的 splitMetadata 结构，正在重建...`,
      );
      splitMetadata = {
        overview: {
          totalImages: product.images?.length || 0,
          mixednessScore: {
            brandDiversity: 0,
            modelDiversity: 0,
            visualConsistency: 1,
            overallScore: product.mixednessScore || 0,
          },
          isRecommendedToSplit: true,
          detectedBrands: Array.from(
            new Set(
              (rawMetadata.suggestedGroups || []).map((g: any) => g.brand),
            ),
          ),
          detectedModels: Array.from(
            new Set(
              (rawMetadata.suggestedGroups || []).map((g: any) => g.model),
            ),
          ),
        },
        perImageAnalysis: [],
        suggestedGroups: rawMetadata.suggestedGroups || [],
        overallConfidence: rawMetadata.overallConfidence || 0,
        warnings: ['从旧数据结构重建，部分数据可能不完整'],
      };
    }

    return { product, skus, splitMetadata };
  }
}
