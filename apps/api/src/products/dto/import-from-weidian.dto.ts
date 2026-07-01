import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsArray,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ProductStatus } from '../product-status';

/**
 * 从微店导入商品的 DTO
 * 支持通过 URL 或 itemId 导入
 */
export class ImportFromWeidianDto {
  /**
   * 微店商品 URL（可选）
   * 例如：https://weidian.com/item.html?itemID=6900807244
   */
  @IsOptional()
  @IsString()
  @MinLength(10)
  url?: string;

  /**
   * 微店商品 ID（可选）
   * 如果提供 url，会自动提取 itemId
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  itemId?: string;

  /**
   * 微店 token（可选）
   * 用于访问需要登录的商品
   */
  @IsOptional()
  @IsString()
  wdtoken?: string;

  /**
   * 是否强制刷新缓存
   * 默认：false（使用 30 天缓存）
   */
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;

  /**
   * 商品 slug（可选）
   */
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 必须是小写字母、数字和连字符，例如：nike-air-max-90',
  })
  slug?: string;

  /**
   * AI 识别的品牌名（可选）
   * 如果不提供，会通过 AI 自动识别
   */
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brandName?: string;

  /**
   * 品牌 ID（可选）
   * 如果提供，会直接关联该品牌
   */
  @IsOptional()
  @IsUUID()
  brandId?: string;

  /**
   * 主分类 ID（可选）
   * 如果不提供，会通过 AI 自动推荐分类
   */
  @IsOptional()
  @IsUUID()
  primaryCategoryId?: string;

  /**
   * 副分类 ID 列表（可选）
   * 商品可以关联多个副分类
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  secondaryCategoryIds?: string[];

  /**
   * AI 生成的商品标题（可选）
   * 如果不提供，会使用微店原始标题
   */
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  /**
   * AI 生成的商品描述（可选）
   */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /**
   * AI 生成的商品属性（可选）
   * 例如：{ colors: ["黑色", "白色"], gender: "unisex" }
   */
  @IsOptional()
  aiAttributes?: {
    colors?: string[];
    styles?: string[];
    gender?: 'men' | 'women' | 'unisex' | 'kids';
    season?: string[];
    features?: string[];
    sizes?: string[];
  };

  /**
   * 商品状态（可选）
   * 默认：draft（草稿）
   */
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  /**
   * 是否精选商品（可选）
   * 默认：false
   */
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

/**
 * 导入结果返回 DTO
 */
export interface ImportFromWeidianResultDto {
  success: boolean;
  product?: {
    id: string;
    slug: string;
    title: string;
    originalTitle: string;
    weidianItemId: string;
    aiBrandName?: string;
    primaryCategoryId: string;
    skuCount: number;
    priceMin?: number;
    priceMax?: number;
    images: string[];
  };
  skus?: {
    id: string;
    weidianSkuId?: string;
    attributes: Record<string, string>;
    price?: number;
    stock?: number;
  }[];
  errors?: string[];
  warnings?: string[];
}
