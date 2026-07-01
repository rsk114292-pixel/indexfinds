import {
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryBrandDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  tier?: number;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending_review', 'merged', 'rejected'])
  status?: string;

  /** @deprecated 请使用 search 字段，q 保留仅为向后兼容 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string; // 搜索品牌名（推荐使用此字段）

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isIndependent?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeChildren?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includePending?: boolean; // 是否包含 pending_review 状态的品牌，默认 false

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeFeaturedProducts?: boolean; // 是否包含每个品牌的精选产品（前4个有图产品），默认 false

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isFeatured?: boolean; // 筛选精选品牌

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasProducts?: boolean; // 只返回有关联产品的品牌

  // Pagination parameters
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  limit?: number = 10; // 0 = 不分页，返回全部
}
