import { Expose, Type } from 'class-transformer';
import { BrandSimpleDto, CategorySimpleDto } from './product-list.dto';

/**
 * SKU 响应 DTO
 */
export class SkuDto {
  @Expose()
  id: string;

  @Expose()
  skuId: string;

  @Expose()
  title: string;

  @Expose()
  price: number;

  @Expose()
  originalPrice: number;

  @Expose()
  stock: number;

  @Expose()
  image: string;

  @Expose()
  attributes: Record<string, string>;

  @Expose()
  isActive: boolean;
}

export class ProductQcMediaDetailDto {
  @Expose()
  id: string;

  @Expose()
  type: string;

  @Expose()
  url: string;

  @Expose()
  posterUrl?: string | null;

  @Expose()
  mimeType?: string | null;

  @Expose()
  duration?: number | null;

  @Expose()
  sortOrder: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

/**
 * 商品详情响应 DTO
 * 用于商品详情页，返回完整字段
 */
export class ProductDetailDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  // ========== 图片 ==========
  @Expose()
  mainImage: string;

  @Expose()
  images: string[];

  @Expose()
  detailImages: string[];

  @Expose()
  @Type(() => ProductQcMediaDetailDto)
  qcMedia: ProductQcMediaDetailDto[];

  // ========== 价格 ==========
  @Expose()
  priceMin: number;

  @Expose()
  priceMax: number;

  @Expose()
  currency: string;

  // ========== 品牌 ==========
  @Expose()
  brandId: string;

  @Expose()
  @Type(() => BrandDetailDto)
  brand: BrandDetailDto;

  @Expose()
  aiBrandName: string;

  @Expose()
  brandConfidence: number;

  // ========== 分类 ==========
  @Expose()
  primaryCategoryId: string;

  @Expose()
  @Type(() => CategorySimpleDto)
  primaryCategory: CategorySimpleDto;

  @Expose()
  @Type(() => CategorySimpleDto)
  secondaryCategories: CategorySimpleDto[];

  // ========== AI 属性 ==========
  @Expose()
  aiAttributes: {
    colors?: string[];
    styles?: string[];
    occasions?: string[];
    seasons?: string[];
    gender?: string;
    sizes?: string[];
  };

  @Expose()
  attributes: Record<string, any>;

  // ========== SKU ==========
  @Expose()
  @Type(() => SkuDto)
  skus: SkuDto[];

  // ========== 状态与统计 ==========
  @Expose()
  status: string;

  @Expose()
  seoIndexable: boolean;

  @Expose()
  isFeatured: boolean;

  @Expose()
  viewCount: number;

  @Expose()
  salesCount: number;

  @Expose()
  clickCount: number;

  @Expose()
  ctr: number;

  @Expose()
  favoriteCount: number;

  @Expose()
  popularityScore: number;

  // ========== 来源信息 ==========
  @Expose()
  sourceUrl: string;

  @Expose()
  weidianItemId: string;

  @Expose()
  weidianShopId: string;

  @Expose()
  weidianShopName: string;

  // ========== 时间戳 ==========
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  // 注意：以下字段在详情 DTO 中也不暴露
  // - weidianRawData: 仅内部使用
  // - translations: 通过单独接口获取
  // - originalTitle, originalDescription: 仅内部使用
}

/**
 * 品牌详情 DTO（用于详情页嵌套）
 */
export class BrandDetailDto extends BrandSimpleDto {
  @Expose()
  description: string;

  @Expose()
  websiteUrl: string;

  @Expose()
  country: string;

  @Expose()
  tier: string;
}

/**
 * 购买链接响应 DTO
 */
export class BuyLinkDto {
  @Expose()
  productId: string;

  @Expose()
  productTitle: string;

  @Expose()
  buyLink: string;

  @Expose()
  platform: string;

  @Expose()
  originalPrice: number;

  @Expose()
  currency: string;
}
