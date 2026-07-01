import { Exclude, Expose, Type } from 'class-transformer';

/**
 * 商品列表响应 DTO
 * 用于商品列表页，只返回必要字段，提升性能
 * 排除: weidianRawData, detailImages, translations, description 等大字段
 */
export class ProductListDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  mainImage: string;

  @Expose()
  priceMin: number;

  @Expose()
  priceMax: number;

  @Expose()
  currency: string;

  @Expose()
  status: string;

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

  // 品牌信息（简化）
  @Expose()
  brandId: string;

  @Expose()
  @Type(() => BrandSimpleDto)
  brand: BrandSimpleDto;

  // 主分类信息（简化）
  @Expose()
  primaryCategoryId: string;

  @Expose()
  @Type(() => CategorySimpleDto)
  primaryCategory: CategorySimpleDto;

  // AI 提取的属性（用于筛选展示）
  @Expose()
  aiAttributes: {
    colors?: string[];
    gender?: string;
    styles?: string[];
  };

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

/**
 * 品牌简化 DTO（用于列表嵌套）
 */
export class BrandSimpleDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  logoUrl: string;
}

/**
 * 分类简化 DTO（用于列表嵌套）
 */
export class CategorySimpleDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;
}

/**
 * 分页响应 DTO
 */
export class PaginatedProductListDto {
  @Expose()
  @Type(() => ProductListDto)
  items: ProductListDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;

  @Expose()
  hasNextPage: boolean;

  @Expose()
  hasPrevPage: boolean;
}
