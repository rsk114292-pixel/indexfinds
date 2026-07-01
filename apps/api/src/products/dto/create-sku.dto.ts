import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsUrl,
  IsObject,
  IsEnum,
  IsUUID,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { SkuStatus } from '../product-status';

export class CreateSkuDto {
  // SKU 编码（可选）
  @IsOptional()
  @IsString()
  skuCode?: string;

  // 关联商品 ID
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  // ========== 微店 SKU 信息 ==========
  @IsOptional()
  @IsString()
  weidianSkuId?: string; // 微店 SKU ID

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  weidianAttrIds?: number[]; // 微店属性 ID 数组

  // ========== SKU 属性 ==========
  @IsNotEmpty()
  @IsObject()
  attributes: Record<string, string>; // { "颜色": "黑色", "尺码": "M" }

  @IsOptional()
  @IsString()
  skuKey?: string; // SKU 唯一标识（例如 "颜色=黑色;尺码=M"）

  // ========== 价格与库存 ==========
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'SKU 价格必须大于 0' })
  @Max(999999, { message: 'SKU 价格不能超过 999999' })
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  // ========== SKU 图片 ==========
  @IsOptional()
  @IsUrl()
  image?: string;

  // ========== SKU 状态 ==========
  @IsOptional()
  @IsEnum(SkuStatus)
  status?: SkuStatus;

  // ========== 微店原始数据 ==========
  @IsOptional()
  @IsObject()
  weidianRawData?: unknown;
}
