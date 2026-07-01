import {
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../product-status';

const MAX_PRODUCT_PAGE = 250000;

export class QueryProductDto {
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'category contains invalid characters',
  })
  category?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'categories contains invalid characters',
  })
  categories?: string; // 多选分类，逗号分隔 slug：shoes,clothing,bags

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'brand contains invalid characters',
  })
  brand?: string;

  // ========== 分类筛选 ==========
  @IsOptional()
  @IsUUID()
  primaryCategoryId?: string; // 主分类 ID

  @IsOptional()
  @IsUUID()
  secondaryCategoryId?: string; // 副分类 ID

  // ========== 品牌筛选 ==========
  @IsOptional()
  @IsString()
  aiBrandName?: string; // AI 识别的品牌名

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'brands contains invalid characters',
  })
  brands?: string; // 多选品牌，逗号分隔 slug：dior,nike,adidas

  // ========== 状态筛选 ==========
  @IsOptional()
  @IsEnum({ ...ProductStatus, ALL: 'all' })
  status?: ProductStatus | 'all';

  // ========== 搜索 ==========
  /** @deprecated 请使用 search 字段，q 保留仅为向后兼容 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string; // 搜索商品标题或描述（推荐使用此字段）

  // ========== 标记筛选 ==========
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean; // 是否推荐

  // ========== 价格范围 ==========
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number; // 最低价格

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number; // 最高价格

  // ========== AI 属性筛选（支持多选，逗号分隔） ==========
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'color contains invalid characters',
  })
  color?: string; // 单个颜色（兼容旧版）

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'colors contains invalid characters',
  })
  colors?: string; // 多选颜色，逗号分隔：black,white,red

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'style contains invalid characters',
  })
  style?: string; // 单个风格（兼容旧版）

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'styles contains invalid characters',
  })
  styles?: string; // 多选风格，逗号分隔

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'gender contains invalid characters',
  })
  gender?: string; // 单个性别（兼容旧版）

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'genders contains invalid characters',
  })
  genders?: string; // 多选性别，逗号分隔

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'occasions contains invalid characters',
  })
  occasions?: string; // 多选场景，逗号分隔

  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\-_,\s]+$/u, {
    message: 'seasons contains invalid characters',
  })
  seasons?: string; // 多选季节，逗号分隔

  // ========== 排序 ==========
  @IsOptional()
  @IsEnum([
    'createdAt',
    'updatedAt',
    'priceMin',
    'viewCount',
    'salesCount',
    'relevance',
    'newest',
    'price_asc',
    'price_desc',
    'popular',
    'popularityScore',
  ])
  sortBy?: string; // 排序字段

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC'; // 排序方向

  // ========== 分页参数 ==========
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(MAX_PRODUCT_PAGE)
  page?: number; // 页码（默认 1，最大 250000，与搜索结果最大窗口对齐）

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number; // 每页数量（默认 20，最大 100）

  // ========== 个性化偏好参数 ==========
  @IsOptional()
  @IsString()
  preferredBrands?: string; // 用户偏好品牌 ID，逗号分隔

  @IsOptional()
  @IsString()
  preferredCategories?: string; // 用户偏好分类 ID，逗号分隔

  // ========== 批量查询 ==========
  @IsOptional()
  @IsString()
  ids?: string; // 商品 ID 列表，逗号分隔，用于批量查询

  // ========== 死链筛选 ==========
  @IsOptional()
  @IsEnum(['suspected', 'confirmed'])
  deadLink?: 'suspected' | 'confirmed'; // suspected=疑似死链(1次), confirmed=确认死链(≥2次)
}
