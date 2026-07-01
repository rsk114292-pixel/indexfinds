import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUrl,
  IsArray,
  IsObject,
  IsBoolean,
  IsEnum,
  IsUUID,
  Min,
  Max,
  IsInt,
  MinLength,
  MaxLength,
  Matches,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../product-status';
import { ProductQcMediaType } from '../entities/product-qc-media.entity';

@ValidatorConstraint({ name: 'priceRangeValid', async: false })
class PriceRangeValidator implements ValidatorConstraintInterface {
  validate(_value: number, args: ValidationArguments) {
    const obj = args.object as CreateProductDto;
    if (obj.priceMin != null && obj.priceMax != null) {
      return obj.priceMax >= obj.priceMin;
    }
    return true;
  }
  defaultMessage() {
    return 'priceMax 必须大于等于 priceMin';
  }
}

export class ProductQcMediaDto {
  @IsEnum(ProductQcMediaType)
  type: ProductQcMediaType;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  duration?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class CreateProductDto {
  // ========== 基础信息 ==========
  @IsNotEmpty()
  @IsString()
  title: string; // AI 生成的英文标题

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug 必须是小写字母、数字和连字符，例如：nike-air-max-90',
  })
  slug?: string; // URL 友好标识（由系统生成）

  @IsOptional()
  @IsString()
  description?: string; // AI 生成的商品描述

  // ========== 原始数据（微店） ==========
  @IsOptional()
  @IsString()
  originalTitle?: string; // 微店原始标题（中文）

  @IsOptional()
  @IsString()
  originalDescription?: string; // 微店原始描述

  @IsOptional()
  @IsString()
  weidianItemId?: string; // 微店商品 ID

  @IsOptional()
  @IsString()
  weidianShopId?: string; // 微店店铺 ID

  @IsOptional()
  @IsString()
  weidianShopName?: string; // 微店店铺名称

  // ========== 品牌关联 ==========
  @IsOptional()
  @IsUUID()
  brandId?: string; // 品牌 ID（可选，系统自动匹配或创建）

  // ========== AI 品牌识别 ==========
  @IsOptional()
  @IsString()
  aiBrandName?: string; // AI 识别的原始品牌名（用于追溯）

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  brandConfidence?: number; // AI 品牌识别置信度 (0-1)

  // ========== 分类关联 ==========
  @IsNotEmpty()
  @IsUUID()
  primaryCategoryId: string; // 主分类（必填）

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  secondaryCategoryIds?: string[]; // 副分类 ID 数组（可选）

  // ========== 价格（可选，从 SKU 计算） ==========
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999)
  priceMin?: number; // 最低价格

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999)
  @Validate(PriceRangeValidator)
  priceMax?: number; // 最高价格

  @IsOptional()
  @IsString()
  currency?: string; // 货币单位（默认 CNY）

  // ========== 图片 ==========
  @IsOptional()
  @IsUrl()
  mainImage?: string; // 主图 URL

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[]; // 商品图片数组

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  detailImages?: string[]; // 详情图片数组

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductQcMediaDto)
  qcMedia?: ProductQcMediaDto[];

  // ========== AI 提取的属性 ==========
  @IsOptional()
  @IsObject()
  aiAttributes?: {
    colors?: string[];
    styles?: string[];
    occasions?: string[];
    seasons?: string[];
    gender?: string;
    sizes?: string[];
  };

  // 商品原始属性
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  // ========== 微店原始数据缓存 ==========
  @IsOptional()
  @IsObject()
  weidianRawData?: {
    skuInfo?: unknown;
    detailDesc?: unknown;
    lastFetchedAt?: string;
  };

  // ========== 外跳链接 ==========
  @IsOptional()
  @IsUrl()
  sourceUrl?: string; // 微店商品 URL

  // ========== 商品状态 ==========
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  // ========== 统计与标记 ==========
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // ========== 多语言支持（预留） ==========
  @IsOptional()
  @IsObject()
  translations?: Record<string, { title?: string; description?: string }>;
}
