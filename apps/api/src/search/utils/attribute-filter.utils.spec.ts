import { AttributeExistsFilter } from './attribute-filter.utils';

describe('AttributeExistsFilter', () => {
  describe('applyExistsFilter', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
      };
    });

    it('应生成 EXISTS 子查询并传递正确的参数', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        'Red',
        'testColor',
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(sql).toContain('EXISTS');
      expect(sql).toContain('product_attribute_values');
      expect(sql).toContain('attribute_values');
      expect(sql).toContain('pav_testColor');
      expect(sql).toContain(':testColorAttrName');
      expect(sql).toContain(':...testColorValues');
      expect(params).toEqual({
        testColorAttrName: 'color',
        testColorValues: ['red'], // 小写
      });
    });

    it('应处理逗号分隔的多个值', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        'Red,Blue,Green',
        'fc',
      );

      const [, params] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(params.fcValues).toEqual(['red', 'blue', 'green']);
    });

    it('应处理数组输入', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'style',
        ['Casual', 'Street'],
        'fs',
      );

      const [, params] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(params.fsAttrName).toBe('style');
      expect(params.fsValues).toEqual(['casual', 'street']);
    });

    it('应 trim 空格并转小写', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'season',
        ' Spring , Summer ',
        'se',
      );

      const [, params] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(params.seValues).toEqual(['spring', 'summer']);
    });

    it('应过滤空值', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        'Red,,Blue,  ,',
        'fc',
      );

      const [, params] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(params.fcValues).toEqual(['red', 'blue']);
    });

    it('应在值为空字符串时不调用 andWhere', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        '',
        'fc',
      );

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应在值全为空格时不调用 andWhere', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        '  ,  ,  ',
        'fc',
      );

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应在空数组时不调用 andWhere', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        [],
        'fc',
      );

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应使用自定义表别名', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        'Red',
        'fc',
        'p',
      );

      const [sql] = mockQueryBuilder.andWhere.mock.calls[0];
      expect(sql).toContain('pav_fc.product_id = p.id');
    });

    it('不同 prefix 应生成不同的表别名避免冲突', () => {
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'color',
        'Red',
        'alpha',
      );
      AttributeExistsFilter.applyExistsFilter(
        mockQueryBuilder,
        'style',
        'Casual',
        'beta',
      );

      const [sql1] = mockQueryBuilder.andWhere.mock.calls[0];
      const [sql2] = mockQueryBuilder.andWhere.mock.calls[1];
      expect(sql1).toContain('pav_alpha');
      expect(sql2).toContain('pav_beta');
      expect(sql1).not.toContain('pav_beta');
      expect(sql2).not.toContain('pav_alpha');
    });
  });

  describe('buildRawSqlCondition', () => {
    it('应生成带编号参数的 EXISTS SQL', () => {
      const result = AttributeExistsFilter.buildRawSqlCondition(
        'color',
        'Red,Blue',
        4,
      );

      expect(result.sql).toContain('EXISTS');
      expect(result.sql).toContain('product_attribute_values');
      expect(result.sql).toContain('$4'); // attributeName
      expect(result.sql).toContain('$5'); // Red
      expect(result.sql).toContain('$6'); // Blue
      expect(result.params).toEqual(['color', 'red', 'blue']);
      expect(result.nextParamIndex).toBe(7);
    });

    it('应从指定索引开始编号', () => {
      const result = AttributeExistsFilter.buildRawSqlCondition(
        'gender',
        'women',
        10,
      );

      expect(result.sql).toContain('$10'); // attributeName
      expect(result.sql).toContain('$11'); // women
      expect(result.params).toEqual(['gender', 'women']);
      expect(result.nextParamIndex).toBe(12);
    });

    it('应在空值时返回空结果', () => {
      const result = AttributeExistsFilter.buildRawSqlCondition('color', '', 4);

      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
      expect(result.nextParamIndex).toBe(4);
    });

    it('应使用自定义表别名', () => {
      const result = AttributeExistsFilter.buildRawSqlCondition(
        'gender',
        'men',
        4,
        'prod',
      );

      expect(result.sql).toContain('pav.product_id = prod.id');
    });

    it('应将值转为小写', () => {
      const result = AttributeExistsFilter.buildRawSqlCondition(
        'style',
        'Casual,STREET',
        1,
      );

      expect(result.params).toEqual(['style', 'casual', 'street']);
    });
  });
});
