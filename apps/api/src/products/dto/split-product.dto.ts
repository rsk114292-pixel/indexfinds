import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

// ============================================================
// SKU 到分组的映射
// ============================================================

export class SkuGroupMappingDto {
  @IsNotEmpty()
  @IsUUID()
  skuId: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  groupKey: string;
}

// ============================================================
// 自定义分组（用于前端合并分组后传递）
// ============================================================

export class CustomGroupDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  groupKey: string;

  @IsNotEmpty()
  @IsString()
  brand: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  suggestedTitle?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originalGroupKeys?: string[]; // 被合并的原始分组键
}

// ============================================================
// 拆分请求
// ============================================================

export class SplitProductDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkuGroupMappingDto)
  skuMappings?: SkuGroupMappingDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomGroupDto)
  customGroups?: CustomGroupDto[]; // 自定义分组（合并后的分组）
}

// ============================================================
// 回滚请求
// ============================================================

export class RollbackSplitDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ============================================================
// 查询混合商品列表
// ============================================================

export class QueryMixedProductsDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  minMixednessScore?: number;
}
