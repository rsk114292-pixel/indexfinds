import { Injectable, Logger } from '@nestjs/common';
import { WeidianNormalizedData } from '../../weidian/interfaces/thor-api.interface';

export const SINGLE_VARIANT_ATTR_ID = -1;
export const SINGLE_VARIANT_VALUE = '默认款式';

export type SkuVariantImageSource =
  | 'attr_image'
  | 'sku_image'
  | 'main_fallback'
  | 'detail_fallback';

export interface SkuVariant {
  attrId: number;
  value: string;
  imageUrl: string;
  imageSource: SkuVariantImageSource;
  imageConfidence: 'high' | 'low';
  price: number;
  skuCount: number;
  sizes: string[];
}

export interface SkuSplitPlan {
  splitDimension: string;
  weidianItemId: string;
  weidianTitle?: string;
  variants: SkuVariant[];
}

@Injectable()
export class SkuSplitAnalyzerService {
  private readonly logger = new Logger(SkuSplitAnalyzerService.name);

  /**
   * 分析微店归一化数据，检测可拆分的款式维度
   * 返回 null 表示既没有可用 SKU 结构，也没有可作为款式图的商品图
   * 单款式/只有尺码的商品也允许拆分（创建 1 个产品）
   */
  analyzeSplitPlan(normalizedData: WeidianNormalizedData): SkuSplitPlan | null {
    const styleDimension = this.detectStyleDimension(normalizedData);

    if (!styleDimension) {
      this.logger.log(
        `[${normalizedData.itemId}] 没有找到可上架的款式维度或商品图，不可拆分`,
      );
      return null;
    }

    // 为每个款式变体提取价格和尺码信息
    const variants: SkuVariant[] = styleDimension.variants.map((v) => {
      const { price, sizes, skuCount } = this.extractVariantSkuInfo(
        normalizedData,
        v.id,
        styleDimension.dimensionName,
      );

      return {
        attrId: v.id,
        value: v.value,
        imageUrl: v.image,
        imageSource: v.imageSource,
        imageConfidence: v.imageConfidence,
        price,
        skuCount,
        sizes,
      };
    });

    this.logger.log(
      `[${normalizedData.itemId}] 检测到 ${variants.length} 个款式变体，维度: ${styleDimension.dimensionName}`,
    );

    return {
      splitDimension: styleDimension.dimensionName,
      weidianItemId: normalizedData.itemId,
      weidianTitle: normalizedData.title,
      variants,
    };
  }

  /**
   * 检测款式维度：属性图优先，其次 SKU 图，再回退到文本款式维度或单款式。
   */
  private detectStyleDimension(normalizedData: WeidianNormalizedData): {
    dimensionName: string;
    variants: {
      id: number;
      value: string;
      image: string;
      imageSource: SkuVariantImageSource;
      imageConfidence: 'high' | 'low';
    }[];
  } | null {
    const fallbackImage = this.resolveFallbackImage(normalizedData);

    // 1. 最可靠路径：微店属性值自带图片，说明该维度就是款式维度。
    for (const attr of normalizedData.attributes) {
      const hasAnyImage = attr.values.some(
        (v) => v.image && v.image.trim() !== '',
      );
      if (hasAnyImage) {
        return {
          dimensionName: attr.name,
          variants: attr.values.map((v) => ({
            id: v.id,
            value: v.value,
            image:
              v.image && v.image.trim() !== '' ? v.image : fallbackImage.url,
            imageSource:
              v.image && v.image.trim() !== ''
                ? 'attr_image'
                : fallbackImage.source,
            imageConfidence: v.image && v.image.trim() !== '' ? 'high' : 'low',
          })),
        };
      }
    }

    // 2. 次可靠路径：属性值没有图片，但某些 SKU 记录带图。
    // 仍按非尺码维度拆分，并用该属性值下第一张 SKU 图作为款式图。
    const skuImageDimension = this.findNonSizeAttribute(normalizedData);
    if (skuImageDimension) {
      const variantsWithSkuImages = skuImageDimension.values.map((v) => {
        const skuImage = this.findFirstSkuImageForAttr(normalizedData, v.id);
        return skuImage
          ? {
              id: v.id,
              value: v.value,
              image: skuImage,
              imageSource: 'sku_image' as const,
              imageConfidence: 'high' as const,
            }
          : null;
      });

      if (variantsWithSkuImages.some(Boolean)) {
        if (!fallbackImage.url && variantsWithSkuImages.some((v) => !v)) {
          return null;
        }

        return {
          dimensionName: skuImageDimension.name,
          variants: skuImageDimension.values.map((v, index) => {
            const skuImageVariant = variantsWithSkuImages[index];
            if (skuImageVariant) return skuImageVariant;
            return {
              id: v.id,
              value: v.value,
              image: fallbackImage.url,
              imageSource: fallbackImage.source,
              imageConfidence: 'low' as const,
            };
          }),
        };
      }
    }

    // 3. 无任何款式图，但存在“颜色/款式/规格”等非尺码维度：
    // 允许文本维度拆分，用商品主图兜底，避免可上架 SKU 被误判不可拆。
    if (skuImageDimension && fallbackImage.url) {
      return {
        dimensionName: skuImageDimension.name,
        variants: skuImageDimension.values.map((v) => ({
          id: v.id,
          value: v.value,
          image: fallbackImage.url,
          imageSource: fallbackImage.source,
          imageConfidence: 'low' as const,
        })),
      };
    }

    // 4. 只有尺码维度：创建一个单款式产品，尺码保留为内部 SKU。
    if (
      normalizedData.skus.length > 0 &&
      normalizedData.attributes.length > 0 &&
      fallbackImage.url
    ) {
      return {
        dimensionName: SINGLE_VARIANT_VALUE,
        variants: [
          {
            id: SINGLE_VARIANT_ATTR_ID,
            value: SINGLE_VARIANT_VALUE,
            image: fallbackImage.url,
            imageSource: fallbackImage.source,
            imageConfidence: 'low',
          },
        ],
      };
    }

    return null;
  }

  private resolveFallbackImage(normalizedData: WeidianNormalizedData): {
    url: string;
    source: SkuVariantImageSource;
  } {
    if (normalizedData.mainImage) {
      return { url: normalizedData.mainImage, source: 'main_fallback' };
    }
    if (normalizedData.images[0]) {
      return { url: normalizedData.images[0], source: 'main_fallback' };
    }
    if (normalizedData.detailImages[0]) {
      return { url: normalizedData.detailImages[0], source: 'detail_fallback' };
    }
    return { url: '', source: 'main_fallback' };
  }

  private findNonSizeAttribute(normalizedData: WeidianNormalizedData):
    | {
        name: string;
        values: { id: number; value: string; image?: string }[];
      }
    | undefined {
    const nonSizeAttributes = normalizedData.attributes.filter(
      (attr) => attr.values.length > 0 && !this.isSizeDimension(attr.name),
    );

    const preferred = nonSizeAttributes.find((attr) =>
      this.isPreferredStyleDimension(attr.name),
    );

    return preferred || nonSizeAttributes[0];
  }

  private isSizeDimension(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    return ['尺码', '尺寸', '码数', '大小', 'size', 'sizes'].includes(
      normalized,
    );
  }

  private isPreferredStyleDimension(name: string): boolean {
    const normalized = name.trim().toLowerCase();
    return [
      '颜色',
      '颜色分类',
      '色',
      '款式',
      '规格',
      '型号',
      '花色',
      'color',
      'colour',
      'style',
      'variant',
    ].includes(normalized);
  }

  private findFirstSkuImageForAttr(
    normalizedData: WeidianNormalizedData,
    attrId: number,
  ): string | undefined {
    return normalizedData.skus.find(
      (sku) => sku.attrIds.includes(attrId) && sku.image?.trim(),
    )?.image;
  }

  /**
   * 通过 attrId 关联 skuInfos，提取该款式的价格和尺码信息
   */
  private extractVariantSkuInfo(
    normalizedData: WeidianNormalizedData,
    styleAttrId: number,
    styleDimensionName: string,
  ): { price: number; sizes: string[]; skuCount: number } {
    // 过滤出包含该款式 attrId 的 SKU
    const matchedSkus =
      styleAttrId === SINGLE_VARIANT_ATTR_ID
        ? normalizedData.skus
        : normalizedData.skus.filter((sku) =>
            sku.attrIds.includes(styleAttrId),
          );

    if (matchedSkus.length === 0) {
      return { price: 0, sizes: [], skuCount: 0 };
    }

    // 取最低价
    const prices = matchedSkus
      .map((s) => s.price)
      .filter((p): p is number => p !== undefined && p > 0);
    const price = prices.length > 0 ? Math.min(...prices) : 0;

    // 提取尺码（移除款式维度，保留其他维度的值）
    const sizes = matchedSkus
      .map((sku) => {
        const sizeEntries = Object.entries(sku.attributes).filter(
          ([key]) => key !== styleDimensionName,
        );
        return sizeEntries.map(([, v]) => v).join('/');
      })
      .filter((s) => s !== '');

    return { price, sizes, skuCount: matchedSkus.length };
  }

  /**
   * 为一个变体提取其对应的尺码 SKU 数据（用于创建产品时附带 SKU 记录）
   */
  extractVariantSizeSkus(
    normalizedData: WeidianNormalizedData,
    styleAttrId: number,
    styleDimensionName: string,
    variantPrice: number,
  ): {
    weidianSkuId?: string;
    attributes: Record<string, string>;
    skuKey: string;
    price: number;
    stock: number;
    image: string | null;
  }[] {
    const matchedSkus =
      styleAttrId === SINGLE_VARIANT_ATTR_ID
        ? normalizedData.skus
        : normalizedData.skus.filter((sku) =>
            sku.attrIds.includes(styleAttrId),
          );

    return matchedSkus.map((sku) => {
      // 移除款式维度，只保留尺码维度
      const sizeAttributes: Record<string, string> = {};
      for (const [key, value] of Object.entries(sku.attributes)) {
        if (key !== styleDimensionName) {
          sizeAttributes[key] = value;
        }
      }

      const skuKey = Object.entries(sizeAttributes)
        .map(([k, v]) => `${k}=${v}`)
        .sort()
        .join(';');

      return {
        weidianSkuId: sku.weidianSkuId,
        attributes: sizeAttributes,
        skuKey,
        price: variantPrice, // 统一用款式价格
        stock: 0, // 不追踪库存
        image: null, // 尺码无独立图片
      };
    });
  }
}
