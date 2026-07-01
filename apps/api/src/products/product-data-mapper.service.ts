import { Injectable } from '@nestjs/common';
import { SkuAttributeHint } from '../ai/ai.types';
import { CreateSkuData } from './product-creator.service';
import { ImportFromWeidianResultDto } from './dto/import-from-weidian.dto';

/**
 * 微店 SKU 原始数据格式
 */
export interface WeidianSkuRaw {
  weidianSkuId?: string;
  skuId?: string;
  attrIds?: number[];
  attributes?: Record<string, string>;
  skuKey?: string;
  price?: number;
  stock?: number;
  image?: string;
}

/**
 * 商品基础信息（用于构建返回结果）
 */
export interface ProductBasicInfo {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  weidianItemId?: string;
  aiBrandName?: string;
  primaryCategoryId?: string;
  priceMin?: number;
  priceMax?: number;
  images?: string[];
}

/**
 * ProductDataMapperService
 * 商品数据映射服务
 *
 * 职责：
 * - SKU 数据格式转换
 * - 构建 DTO 返回结果
 * - SKU 属性提示生成
 */
@Injectable()
export class ProductDataMapperService {
  /**
   * 映射微店 SKU 数据到内部格式
   */
  mapWeidianSkus(skus?: WeidianSkuRaw[]): CreateSkuData[] {
    if (!skus || skus.length === 0) return [];

    return skus.map((sku) => ({
      weidianSkuId: sku.weidianSkuId || sku.skuId,
      weidianAttrIds: sku.attrIds,
      attributes: sku.attributes,
      skuKey: sku.skuKey,
      price: sku.price,
      stock: sku.stock,
      image: sku.image,
    }));
  }

  /**
   * 映射源数据 SKU 到内部格式
   * 用于从批量导入项创建商品
   */
  mapSourceSkus(skus: WeidianSkuRaw[]): CreateSkuData[] {
    return skus.map((sku) => ({
      weidianSkuId: sku.weidianSkuId || sku.skuId,
      weidianAttrIds: sku.attrIds || [],
      attributes: sku.attributes || {},
      skuKey: sku.skuKey,
      price: sku.price,
      stock: sku.stock || 0,
      image: sku.image,
    }));
  }

  /**
   * 构建 SKU 属性提示（帮助 AI 更准确识别品牌/款式）
   */
  buildSkuHints(skus?: WeidianSkuRaw[]): SkuAttributeHint[] {
    if (!skus || skus.length === 0) return [];

    return skus
      .map((sku, index) => {
        const attrValues = sku.attributes
          ? Object.values(sku.attributes).join(' ')
          : '';
        if (!attrValues) return null;

        return { index, name: attrValues };
      })
      .filter((hint): hint is SkuAttributeHint => hint !== null);
  }

  /**
   * 构建已存在商品的返回结果
   */
  buildExistingProductResult(
    product: ProductBasicInfo,
    additionalWarnings?: string[],
  ): ImportFromWeidianResultDto {
    const warnings = ['商品已存在，已跳过重复导入'];
    if (additionalWarnings) {
      warnings.push(...additionalWarnings);
    }

    return {
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        originalTitle: product.originalTitle || '',
        weidianItemId: product.weidianItemId || '',
        aiBrandName: product.aiBrandName,
        primaryCategoryId: product.primaryCategoryId || '',
        skuCount: 0,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        images: product.images || [],
      },
      warnings,
    };
  }

  /**
   * 构建导入成功的返回结果
   */
  buildSuccessResult(
    product: {
      id: string;
      slug: string;
      title: string;
      originalTitle?: string;
      weidianItemId?: string;
      primaryCategoryId?: string;
      priceMin?: number;
      priceMax?: number;
      images?: string[];
    },
    skus: Array<{
      id: string;
      weidianSkuId?: string;
      attributes?: Record<string, string>;
      price?: number;
      stock?: number;
    }>,
    brandName?: string,
    warnings?: string[],
  ): ImportFromWeidianResultDto {
    return {
      success: true,
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        originalTitle: product.originalTitle || '',
        weidianItemId: product.weidianItemId || '',
        aiBrandName: brandName,
        primaryCategoryId: product.primaryCategoryId || '',
        skuCount: skus.length,
        priceMin: product.priceMin,
        priceMax: product.priceMax,
        images: product.images || [],
      },
      skus: skus.map((sku) => ({
        id: sku.id,
        weidianSkuId: sku.weidianSkuId,
        attributes: sku.attributes || {},
        price: sku.price,
        stock: sku.stock,
      })),
      warnings: warnings && warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * 构建导入失败的返回结果
   */
  buildErrorResult(
    error: string | Error,
    warnings?: string[],
  ): ImportFromWeidianResultDto {
    const message = error instanceof Error ? error.message : error;
    return {
      success: false,
      errors: [message],
      warnings: warnings && warnings.length > 0 ? warnings : undefined,
    };
  }
}
