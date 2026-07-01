import { GenderFilterBuilder } from './gender-filter.builder';
import { AttributeExistsFilter } from './attribute-filter.utils';

// Mock AttributeExistsFilter 来验证调用参数
jest.mock('./attribute-filter.utils', () => ({
  AttributeExistsFilter: {
    applyExistsFilter: jest.fn(),
    buildRawSqlCondition: jest.fn().mockReturnValue({
      sql: 'EXISTS (mock)',
      params: ['gender', 'women', 'unisex'],
      nextParamIndex: 7,
    }),
  },
}));

describe('GenderFilterBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseGenders', () => {
    it('应解析逗号分隔的字符串', () => {
      expect(GenderFilterBuilder.parseGenders('men,women')).toEqual([
        'men',
        'women',
      ]);
    });

    it('应 trim 和转小写', () => {
      expect(GenderFilterBuilder.parseGenders(' Men , Women ')).toEqual([
        'men',
        'women',
      ]);
    });

    it('应处理数组输入', () => {
      expect(GenderFilterBuilder.parseGenders(['Men', 'Unisex'])).toEqual([
        'men',
        'unisex',
      ]);
    });

    it('应处理单个值', () => {
      expect(GenderFilterBuilder.parseGenders('unisex')).toEqual(['unisex']);
    });
  });

  describe('shouldIncludeUnisex', () => {
    it('选择 men 时应包含 unisex', () => {
      expect(GenderFilterBuilder.shouldIncludeUnisex(['men'])).toBe(true);
    });

    it('选择 women 时应包含 unisex', () => {
      expect(GenderFilterBuilder.shouldIncludeUnisex(['women'])).toBe(true);
    });

    it('选择 men 和 women 时应包含 unisex', () => {
      expect(GenderFilterBuilder.shouldIncludeUnisex(['men', 'women'])).toBe(
        true,
      );
    });

    it('只选择 unisex 时不需要额外包含', () => {
      expect(GenderFilterBuilder.shouldIncludeUnisex(['unisex'])).toBe(false);
    });

    it('空列表不需要包含 unisex', () => {
      expect(GenderFilterBuilder.shouldIncludeUnisex([])).toBe(false);
    });
  });

  describe('applyToQueryBuilder', () => {
    let mockQb: any;

    beforeEach(() => {
      mockQb = { andWhere: jest.fn().mockReturnThis() };
    });

    it('选择 women 时应自动扩展为 [women, unisex]', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'women', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['women', 'unisex'],
        'gf',
        'product',
      );
    });

    it('选择 men 时应自动扩展为 [men, unisex]', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'men', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['men', 'unisex'],
        'gf',
        'product',
      );
    });

    it('选择 men,women 时应扩展为 [men, women, unisex]', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'men,women', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['men', 'women', 'unisex'],
        'gf',
        'product',
      );
    });

    it('已包含 unisex 时不应重复添加', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'women,unisex', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['women', 'unisex'], // 不重复
        'gf',
        'product',
      );
    });

    it('只选 unisex 时不应扩展', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'unisex', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['unisex'],
        'gf',
        'product',
      );
    });

    it('空字符串不应调用 applyExistsFilter', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, '', 'gf');

      expect(AttributeExistsFilter.applyExistsFilter).not.toHaveBeenCalled();
    });

    it('应支持自定义表别名', () => {
      GenderFilterBuilder.applyToQueryBuilder(mockQb, 'men', 'gf', 'p');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQb,
        'gender',
        ['men', 'unisex'],
        'gf',
        'p',
      );
    });
  });

  describe('buildRawSqlCondition', () => {
    it('选择 women 时应自动扩展为 [women, unisex]', () => {
      GenderFilterBuilder.buildRawSqlCondition('women', 4);

      expect(AttributeExistsFilter.buildRawSqlCondition).toHaveBeenCalledWith(
        'gender',
        ['women', 'unisex'],
        4,
        'p',
      );
    });

    it('选择 men 时应自动扩展为 [men, unisex]', () => {
      GenderFilterBuilder.buildRawSqlCondition('men', 4, 'prod');

      expect(AttributeExistsFilter.buildRawSqlCondition).toHaveBeenCalledWith(
        'gender',
        ['men', 'unisex'],
        4,
        'prod',
      );
    });

    it('空字符串应返回空结果', () => {
      const result = GenderFilterBuilder.buildRawSqlCondition('', 4);

      expect(result).toEqual({
        sql: '',
        params: [],
        nextParamIndex: 4,
      });
      expect(AttributeExistsFilter.buildRawSqlCondition).not.toHaveBeenCalled();
    });

    it('只选 unisex 时不应扩展', () => {
      GenderFilterBuilder.buildRawSqlCondition('unisex', 4);

      expect(AttributeExistsFilter.buildRawSqlCondition).toHaveBeenCalledWith(
        'gender',
        ['unisex'],
        4,
        'p',
      );
    });
  });
});
