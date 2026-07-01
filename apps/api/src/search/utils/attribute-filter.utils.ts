import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

/**
 * 基于归一化 product_attribute_values 表的 EXISTS 子查询筛选工具
 * 替代旧的 JSONB @> 查询，与 ProductFacetService 使用同一数据源
 */
export class AttributeExistsFilter {
  /**
   * 添加 EXISTS 子查询筛选（TypeORM QueryBuilder）
   * 匹配逻辑：商品拥有给定值中的任意一个（OR 语义）
   *
   * @param qb - TypeORM SelectQueryBuilder
   * @param attributeName - attributes.name 维度名（'color', 'style', 'gender', 'occasion', 'season'）
   * @param values - 逗号分隔的值字符串或字符串数组
   * @param paramPrefix - 参数前缀，避免多个筛选间参数名冲突
   * @param tableAlias - products 表别名，默认 'product'
   */
  static applyExistsFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    attributeName: string,
    values: string | string[],
    paramPrefix: string,
    tableAlias: string = 'product',
  ): void {
    const valueList = AttributeExistsFilter.parseValues(values);
    if (valueList.length === 0) return;

    const attrNameParam = `${paramPrefix}AttrName`;
    const valuesParam = `${paramPrefix}Values`;

    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM product_attribute_values pav_${paramPrefix}
        JOIN attribute_values av_${paramPrefix} ON av_${paramPrefix}.id = pav_${paramPrefix}.attribute_value_id
        JOIN attributes a_${paramPrefix} ON a_${paramPrefix}.id = av_${paramPrefix}.attribute_id
        WHERE pav_${paramPrefix}.product_id = ${tableAlias}.id
          AND a_${paramPrefix}.name = :${attrNameParam}
          AND LOWER(av_${paramPrefix}.value) IN (:...${valuesParam})
      )`,
      {
        [attrNameParam]: attributeName,
        [valuesParam]: valueList,
      },
    );
  }

  /**
   * 构建原生 SQL EXISTS 条件（用于手写 SQL 场景，如语义搜索）
   *
   * @param attributeName - 维度名
   * @param values - 逗号分隔的值字符串或字符串数组
   * @param startParamIndex - 起始 $N 参数索引
   * @param tableAlias - products 表别名，默认 'p'
   * @returns { sql, params, nextParamIndex }
   */
  static buildRawSqlCondition(
    attributeName: string,
    values: string | string[],
    startParamIndex: number,
    tableAlias: string = 'p',
  ): { sql: string; params: string[]; nextParamIndex: number } {
    const valueList = AttributeExistsFilter.parseValues(values);
    if (valueList.length === 0) {
      return { sql: '', params: [], nextParamIndex: startParamIndex };
    }

    let paramIndex = startParamIndex;
    const attrNameIdx = paramIndex++;
    const inPlaceholders = valueList.map(() => `$${paramIndex++}`);

    const sql = `EXISTS (
      SELECT 1 FROM product_attribute_values pav
      JOIN attribute_values av ON av.id = pav.attribute_value_id
      JOIN attributes a ON a.id = av.attribute_id
      WHERE pav.product_id = ${tableAlias}.id
        AND a.name = $${attrNameIdx}
        AND LOWER(av.value) IN (${inPlaceholders.join(', ')})
    )`;

    return {
      sql,
      params: [attributeName, ...valueList],
      nextParamIndex: paramIndex,
    };
  }

  /**
   * 解析值字符串为小写去重数组
   */
  private static parseValues(values: string | string[]): string[] {
    const list = Array.isArray(values) ? values : values.split(',');

    return list.map((v) => v.trim().toLowerCase()).filter(Boolean);
  }
}
