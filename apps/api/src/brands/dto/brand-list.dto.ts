import { Expose, Type } from 'class-transformer';

/**
 * 品牌列表响应 DTO
 * 用于品牌列表页，只返回必要字段
 */
export class BrandListDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Expose()
  logoUrl: string;

  @Expose()
  tier: number;

  @Expose()
  status: string;

  @Expose()
  productCount: number;

  // 父品牌信息（简化）
  @Expose()
  parentId: string;

  @Expose()
  isIndependent: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

/**
 * 品牌分页响应 DTO
 */
export class PaginatedBrandListDto {
  @Expose()
  @Type(() => BrandListDto)
  items: BrandListDto[];

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

/**
 * 品牌选项 DTO（用于下拉选择）
 */
export class BrandOptionDto {
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
