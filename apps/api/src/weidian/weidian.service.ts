import { Injectable, Logger } from '@nestjs/common';
import {
  ThorSkuInfoResponse,
  ThorDetailDescResponse,
  WeidianNormalizedData,
  WeidianScrapeOptions,
} from './interfaces/thor-api.interface';
import { WeidianThorApiService } from './weidian-thor-api.service';
import { WeidianCacheService } from './weidian-cache.service';
import { WeidianHtmlParserService } from './weidian-html-parser.service';

/**
 * 微店服务（门面模式）
 * 协调 Thor API、缓存和 HTML 解析服务
 */
@Injectable()
export class WeidianService {
  private readonly logger = new Logger(WeidianService.name);

  constructor(
    private readonly thorApiService: WeidianThorApiService,
    private readonly cacheService: WeidianCacheService,
    private readonly htmlParserService: WeidianHtmlParserService,
  ) {}

  /**
   * 抓取微店商品完整信息
   * @param options 抓取选项
   * @returns 归一化的商品数据
   */
  async scrapeItem(
    options: WeidianScrapeOptions,
  ): Promise<WeidianNormalizedData> {
    const { itemId, wdtoken, forceRefresh = false } = options;

    this.logger.log(`开始抓取微店商品: ${itemId}`);

    // 1. 检查缓存
    if (!forceRefresh) {
      const cached = await this.cacheService.getCachedData(itemId);
      if (cached) {
        this.logger.log(`使用缓存数据: ${itemId}`);
        return this.cacheService.denormalizeCachedData(cached);
      }
    }

    // 2. 并发请求 SKU 信息和详情描述
    const [skuInfo, detailDesc] = await Promise.allSettled([
      this.thorApiService.fetchItemSkuInfo(itemId, wdtoken),
      this.thorApiService.fetchDetailDesc(itemId, wdtoken),
    ]);

    // 3. 提取结果
    const skuData = skuInfo.status === 'fulfilled' ? skuInfo.value : null;
    const descData =
      detailDesc.status === 'fulfilled' ? detailDesc.value : null;

    // 4. 归一化数据
    const normalized = this.normalizeData(itemId, skuData, descData);

    // 5. 如果 Thor API 没有返回店铺信息，从 HTML 页面抓取（降级方案）
    if (!normalized.shopId && !normalized.shopName) {
      this.logger.log(
        `[${itemId}] Thor API 未返回店铺信息，尝试从 HTML 页面抓取`,
      );
      const shopInfo =
        await this.htmlParserService.fetchShopInfoFromHtml(itemId);
      if (shopInfo.shopId) normalized.shopId = shopInfo.shopId;
      if (shopInfo.shopName) normalized.shopName = shopInfo.shopName;
    }

    // 6. 保存到缓存
    await this.cacheService.saveCacheData(
      itemId,
      normalized,
      skuData,
      descData,
    );

    this.logger.log(`抓取完成: ${itemId}`);
    return normalized;
  }

  /**
   * 归一化微店数据
   * 注意：微店 API 返回的 itemTitle 可能为空或不准确
   * 最终商品标题应由 AI 根据商品图片生成（见 AIService.generateTitle）
   */
  private normalizeData(
    itemId: string,
    skuData: ThorSkuInfoResponse | null,
    descData: ThorDetailDescResponse | null,
  ): WeidianNormalizedData {
    const normalized: WeidianNormalizedData = {
      itemId,
      images: [],
      detailImages: [],
      attributes: [],
      skus: [],
      rawSkuInfo: skuData ?? undefined,
      rawDetailDesc: descData ?? undefined,
    };

    // 处理 SKU 信息
    if (skuData?.result) {
      const result = skuData.result;

      // 标题和图片
      normalized.title = result.itemTitle;
      normalized.mainImage = result.itemMainPic;

      // 从多个来源收集图片
      const imageSet = new Set<string>();

      // 1. 主图
      if (result.itemMainPic) {
        imageSet.add(result.itemMainPic);
      }

      // 2. 从属性值中提取图片
      if (result.attrList) {
        for (const attr of result.attrList) {
          for (const val of attr.attrValues || []) {
            if (val.img) {
              imageSet.add(val.img);
            }
          }
        }
      }

      // 3. 从SKU中提取图片
      if (result.skuInfos) {
        for (const sku of result.skuInfos) {
          if (sku.skuInfo?.img) {
            imageSet.add(sku.skuInfo.img);
          }
        }
      }

      normalized.images = Array.from(imageSet);
      this.logger.log(`[${itemId}] 收集到 ${normalized.images.length} 张图片`);

      // 店铺信息（兼容多种字段名）
      if (result.seller) {
        normalized.shopId = result.seller.shopId || result.seller.shop_id;
        normalized.shopName = result.seller.shopName || result.seller.shop_name;
      }

      // 属性列表
      normalized.attributes = (result.attrList || []).map((attr) => ({
        name: attr.attrTitle,
        values: attr.attrValues.map((val) => ({
          id: val.attrId,
          value: val.attrValue,
          image: val.img,
        })),
      }));

      // SKU 列表
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

      // 计算价格范围
      const prices = normalized.skus
        .map((s) => s.price)
        .filter((p) => p !== undefined);
      if (prices.length > 0) {
        normalized.priceMin = Math.min(...prices);
        normalized.priceMax = Math.max(...prices);
      }
    }

    // 处理详情描述
    if (descData?.result?.item_detail?.desc_content) {
      normalized.detailImages = descData.result.item_detail.desc_content
        .filter((content) => content.type === 2 && content.url)
        .map((content) => content.url!);
    }

    return normalized;
  }

  /**
   * 从 URL 提取 itemId
   */
  extractItemId(url: string): string | null {
    const patterns = [/itemID=(\d+)/i, /item\/(\d+)/i];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 单独获取店铺信息（用于回填现有商品）
   */
  async getShopInfo(
    itemId: string,
  ): Promise<{ shopId?: string; shopName?: string }> {
    // 先检查缓存
    const cached = await this.cacheService.getCachedData(itemId);

    if (cached?.shopId || cached?.shopName) {
      return {
        shopId: cached.shopId,
        shopName: cached.shopName,
      };
    }

    // 从 HTML 页面抓取
    const shopInfo = await this.htmlParserService.fetchShopInfoFromHtml(itemId);

    // 更新缓存
    if ((shopInfo.shopId || shopInfo.shopName) && cached) {
      await this.cacheService.updateShopInfo(itemId, shopInfo);
    }

    return shopInfo;
  }
}
