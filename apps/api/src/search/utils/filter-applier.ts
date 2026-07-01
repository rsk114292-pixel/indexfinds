import { SelectQueryBuilder } from 'typeorm';
import { GenderFilterBuilder } from './gender-filter.builder';
import { AttributeExistsFilter } from './attribute-filter.utils';

/**
 * JSONB 字段名 → 归一化表 attributes.name 的映射
 * 旧代码使用复数形式（colors, seasons），归一化表使用单数（color, season）
 */
const FIELD_TO_ATTRIBUTE: Record<string, string> = {
  colors: 'color',
  styles: 'style',
  occasions: 'occasion',
  seasons: 'season',
  gender: 'gender',
};

/**
 * 统一的过滤器应用工具
 * 减少 keywordRecall / categoryRecall 中的重复过滤代码
 *
 * 底层使用 product_attribute_values 归一化表（EXISTS 子查询）
 */
export class FilterApplier {
  /**
   * 应用品牌筛选（支持父子品牌穿透）
   *
   * 筛选 "nike" 时，同时匹配：
   * - brand.slug = 'nike'（直属 Nike 的产品）
   * - brand.parentId = Nike 的 ID（Air Jordan、Nike SB 等子品牌的产品）
   */
  static applyBrandFilter(
    qb: SelectQueryBuilder<any>,
    brands: string,
    prefix = 'filter',
  ): void {
    const brandSlugs = brands
      .split(',')
      .map((b) => b.trim().toLowerCase())
      .filter(Boolean);
    if (brandSlugs.length > 0) {
      qb.andWhere(
        `(brand.slug IN (:...${prefix}BrandSlugs) OR brand."parentId" IN (SELECT b.id FROM brands b WHERE b.slug IN (:...${prefix}ParentBrandSlugs)))`,
        {
          [`${prefix}BrandSlugs`]: brandSlugs,
          [`${prefix}ParentBrandSlugs`]: brandSlugs,
        },
      );
    }
  }

  /**
   * 应用性别筛选（含 unisex 自动包含）
   */
  static applyGenderFilter(
    qb: SelectQueryBuilder<any>,
    genders: string | string[],
    prefix = 'filter',
  ): void {
    GenderFilterBuilder.applyToQueryBuilder(qb, genders, `${prefix}Gender`);
  }

  /**
   * 应用归一化属性筛选（颜色/风格/场合/季节等）
   * 通过 product_attribute_values 关系表做 EXISTS 子查询
   *
   * @param jsonField - 旧 JSONB 字段名（如 'colors', 'seasons'），会自动映射为归一化维度名
   */
  static applyJsonArrayFilter(
    qb: SelectQueryBuilder<any>,
    values: string,
    jsonField: string,
    prefix: string,
  ): void {
    const attributeName = FIELD_TO_ATTRIBUTE[jsonField] || jsonField;

    AttributeExistsFilter.applyExistsFilter(qb, attributeName, values, prefix);
  }

  /**
   * 应用颜色筛选（便捷方法）
   */
  static applyColorFilter(
    qb: SelectQueryBuilder<any>,
    colors: string,
    prefix = 'filterColor',
  ): void {
    AttributeExistsFilter.applyExistsFilter(qb, 'color', colors, prefix);
  }

  /**
   * 应用季节筛选（便捷方法）
   */
  static applySeasonFilter(
    qb: SelectQueryBuilder<any>,
    seasons: string,
    prefix = 'filterSeason',
  ): void {
    AttributeExistsFilter.applyExistsFilter(qb, 'season', seasons, prefix);
  }
}
