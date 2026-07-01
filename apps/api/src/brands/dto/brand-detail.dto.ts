import { Expose, Type } from 'class-transformer';

/**
 * 品牌详情响应 DTO
 * 用于品牌详情页，返回完整字段
 */
export class BrandDetailDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  aliases: string[];

  @Expose()
  tier: number;

  @Expose()
  status: string;

  @Expose()
  logoUrl: string;

  @Expose()
  description: string;

  // ========== 父子品牌关系 ==========
  @Expose()
  parentId: string;

  @Expose()
  @Type(() => BrandParentDto)
  parent: BrandParentDto;

  @Expose()
  @Type(() => BrandChildDto)
  children: BrandChildDto[];

  @Expose()
  isIndependent: boolean;

  // ========== 合并信息 ==========
  @Expose()
  mergedIntoId: string;

  // ========== 元数据（仅管理员可见） ==========
  @Expose()
  metadata: {
    aiConfidence?: number;
    aiSource?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    notes?: string;
    rejectReason?: string;
  };

  // ========== 统计 ==========
  @Expose()
  productCount: number;

  // ========== 时间戳 ==========
  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

/**
 * 父品牌简化 DTO
 */
export class BrandParentDto {
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
 * 子品牌简化 DTO
 */
export class BrandChildDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  logoUrl: string;

  @Expose()
  productCount: number;
}

/**
 * 品牌公开详情 DTO（用于前台展示，不包含管理员字段）
 */
export class BrandPublicDetailDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  logoUrl: string;

  @Expose()
  description: string;

  @Expose()
  tier: number;

  @Expose()
  @Type(() => BrandParentDto)
  parent: BrandParentDto;

  @Expose()
  @Type(() => BrandChildDto)
  children: BrandChildDto[];

  @Expose()
  productCount: number;
}
