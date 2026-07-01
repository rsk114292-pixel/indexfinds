/**
 * 品牌模块共享接口
 * 其他模块通过此接口与品牌模块交互，而不直接依赖 BrandsService
 */

export interface IBrandInfo {
  id: string;
  name: string;
  slug: string;
  tier?: number;
  logoUrl?: string;
}

export interface IBrandMatchResult {
  brand?: IBrandInfo;
  isNew: boolean;
  confidence?: number;
}

/**
 * 品牌服务接口
 * 定义其他模块可以调用的品牌相关方法
 */
export interface IBrandService {
  /**
   * 根据品牌名称查找或创建品牌
   */
  findOrCreateByName(
    name: string,
    confidence?: number,
  ): Promise<IBrandInfo | null>;

  /**
   * 根据 ID 查找品牌
   */
  findById(id: string): Promise<IBrandInfo | null>;

  /**
   * 根据 slug 查找品牌
   */
  findBySlug(slug: string): Promise<IBrandInfo | null>;
}

// 注入 Token
export const BRAND_SERVICE = Symbol('BRAND_SERVICE');
