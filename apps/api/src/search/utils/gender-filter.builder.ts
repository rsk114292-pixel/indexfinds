import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { AttributeExistsFilter } from './attribute-filter.utils';

/**
 * 性别过滤条件构建器
 *
 * 统一处理性别过滤逻辑，包括 unisex 的自动包含规则：
 * - 当选择 men 或 women 时，自动包含 unisex 产品
 * - 支持单个性别和多个性别（逗号分隔）
 *
 * 底层使用 product_attribute_values 归一化表（EXISTS 子查询）
 */
export class GenderFilterBuilder {
  /**
   * 解析性别字符串为标准化数组
   */
  static parseGenders(genders: string | string[]): string[] {
    if (Array.isArray(genders)) {
      return genders.map((g) => g.trim().toLowerCase()).filter(Boolean);
    }
    return genders
      .split(',')
      .map((g) => g.trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * 判断是否需要包含 unisex
   * 规则：当选择了 men 或 women 时，自动包含 unisex
   */
  static shouldIncludeUnisex(genderList: string[]): boolean {
    return genderList.some((g) => g === 'men' || g === 'women');
  }

  /**
   * 构建包含 unisex 自动扩展的性别列表
   */
  private static buildEffectiveGenders(genderList: string[]): string[] {
    const shouldIncludeUnisex = this.shouldIncludeUnisex(genderList);
    if (shouldIncludeUnisex && !genderList.includes('unisex')) {
      return [...genderList, 'unisex'];
    }
    return [...genderList];
  }

  /**
   * 应用性别过滤到 TypeORM QueryBuilder
   * 使用 product_attribute_values 归一化表
   */
  static applyToQueryBuilder<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    genders: string | string[],
    paramPrefix: string = 'gender',
    tableAlias: string = 'product',
  ): void {
    const genderList = this.parseGenders(genders);
    if (genderList.length === 0) return;

    const effectiveGenders = this.buildEffectiveGenders(genderList);

    AttributeExistsFilter.applyExistsFilter(
      queryBuilder,
      'gender',
      effectiveGenders,
      paramPrefix,
      tableAlias,
    );
  }

  /**
   * 构建原生 SQL 性别过滤条件
   * 用于需要原生 SQL 的场景（如 semantic-search 的向量查询）
   */
  static buildRawSqlCondition(
    genders: string | string[],
    startParamIndex: number,
    tableAlias: string = 'p',
  ): { sql: string; params: string[]; nextParamIndex: number } {
    const genderList = this.parseGenders(genders);
    if (genderList.length === 0) {
      return { sql: '', params: [], nextParamIndex: startParamIndex };
    }

    const effectiveGenders = this.buildEffectiveGenders(genderList);

    return AttributeExistsFilter.buildRawSqlCondition(
      'gender',
      effectiveGenders,
      startParamIndex,
      tableAlias,
    );
  }
}
