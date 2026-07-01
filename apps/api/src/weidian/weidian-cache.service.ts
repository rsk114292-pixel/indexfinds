import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeidianCache } from '../products/entities/weidian-cache.entity';
import {
  ThorSkuInfoResponse,
  ThorDetailDescResponse,
  WeidianNormalizedData,
} from './interfaces/thor-api.interface';

/**
 * 微店缓存服务
 * 负责管理微店商品数据的缓存
 */
@Injectable()
export class WeidianCacheService {
  private readonly logger = new Logger(WeidianCacheService.name);
  private readonly CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天

  constructor(
    @InjectRepository(WeidianCache)
    private readonly cacheRepository: Repository<WeidianCache>,
  ) {}

  /**
   * 从缓存获取数据
   */
  async getCachedData(itemId: string): Promise<WeidianCache | null> {
    const cached = await this.cacheRepository.findOne({
      where: { itemId },
    });

    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    const age = Date.now() - new Date(cached.lastFetchedAt).getTime();
    if (age > this.CACHE_TTL_MS) {
      this.logger.debug(`缓存已过期: ${itemId}`);
      return null;
    }

    return cached;
  }

  /**
   * 保存缓存数据
   */
  async saveCacheData(
    itemId: string,
    normalized: WeidianNormalizedData,
    skuData: ThorSkuInfoResponse | null,
    descData: ThorDetailDescResponse | null,
  ): Promise<void> {
    try {
      const cache = this.cacheRepository.create({
        itemId,
        title: normalized.title,
        mainImage: normalized.mainImage,
        images: normalized.images,
        detailImages: normalized.detailImages,
        skuInfo: skuData ?? undefined,
        detailDesc: descData ?? undefined,
        shopId: normalized.shopId,
        shopName: normalized.shopName,
        priceMin: normalized.priceMin,
        priceMax: normalized.priceMax,
        status: 'success',
        lastFetchedAt: new Date(),
      });

      await this.cacheRepository.save(cache);
      this.logger.debug(`缓存已保存: ${itemId}`);
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`保存缓存失败: ${itemId}`, stack);
      // 缓存失败不影响主流程
    }
  }

  /**
   * 更新店铺信息到缓存
   */
  async updateShopInfo(
    itemId: string,
    shopInfo: { shopId?: string; shopName?: string },
  ): Promise<void> {
    try {
      await this.cacheRepository.update(
        { itemId },
        {
          shopId: shopInfo.shopId,
          shopName: shopInfo.shopName,
        },
      );
    } catch (error: unknown) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`更新店铺信息缓存失败: ${itemId}`, stack);
    }
  }

  /**
   * 反归一化缓存数据
   * 从缓存的原始数据中重新解析 SKU 和属性
   */
  denormalizeCachedData(cached: WeidianCache): WeidianNormalizedData {
    const normalized: WeidianNormalizedData = {
      itemId: cached.itemId,
      title: cached.title,
      mainImage: cached.mainImage,
      images: cached.images || [],
      detailImages: cached.detailImages || [],
      attributes: [],
      skus: [],
      priceMin: cached.priceMin
        ? parseFloat(cached.priceMin.toString())
        : undefined,
      priceMax: cached.priceMax
        ? parseFloat(cached.priceMax.toString())
        : undefined,
      shopId: cached.shopId,
      shopName: cached.shopName,
      rawSkuInfo: cached.skuInfo,
      rawDetailDesc: cached.detailDesc,
    };

    // 从缓存的原始 skuInfo 中重新解析 SKU 数据
    const skuData = cached.skuInfo as ThorSkuInfoResponse | null;
    if (skuData?.result) {
      const result = skuData.result;

      // 解析属性列表
      normalized.attributes = (result.attrList || []).map((attr) => ({
        name: attr.attrTitle,
        values: attr.attrValues.map((val) => ({
          id: val.attrId,
          value: val.attrValue,
          image: val.img,
        })),
      }));

      // 解析 SKU 列表
      const skuList = result.skuInfos || [];
      normalized.skus = skuList.map((sku) => {
        // 匹配属性值
        const attributes: Record<string, string> = {};
        sku.attrIds.forEach((attrId) => {
          for (const attr of result.attrList) {
            const attrValue = attr.attrValues.find((v) => v.attrId === attrId);
            if (attrValue) {
              attributes[attr.attrTitle] = attrValue.attrValue;
            }
          }
        });

        // 生成 skuKey
        const skuKey = Object.entries(attributes)
          .map(([k, v]) => `${k}=${v}`)
          .sort()
          .join(';');

        return {
          weidianSkuId: sku.skuInfo.id,
          attrIds: sku.attrIds,
          attributes,
          skuKey,
          price: sku.skuInfo.discountPrice / 100, // 分转元
          stock: sku.skuInfo.stock,
          image: sku.skuInfo.img,
        };
      });

      this.logger.log(
        `[${cached.itemId}] 从缓存解析到 ${normalized.skus.length} 个 SKU`,
      );
    }

    return normalized;
  }
}
