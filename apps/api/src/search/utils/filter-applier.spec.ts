import { FilterApplier } from './filter-applier';
import { GenderFilterBuilder } from './gender-filter.builder';
import { AttributeExistsFilter } from './attribute-filter.utils';

// Mock GenderFilterBuilder
jest.mock('./gender-filter.builder', () => ({
  GenderFilterBuilder: {
    applyToQueryBuilder: jest.fn(),
  },
}));

// Mock AttributeExistsFilter
jest.mock('./attribute-filter.utils', () => ({
  AttributeExistsFilter: {
    applyExistsFilter: jest.fn(),
  },
}));

describe('FilterApplier', () => {
  let mockQueryBuilder: any;

  beforeEach(() => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('applyBrandFilter', () => {
    // 父子穿透 SQL 格式
    const expectedSql = (prefix: string) =>
      `(brand.slug IN (:...${prefix}BrandSlugs) OR brand."parentId" IN (SELECT b.id FROM brands b WHERE b.slug IN (:...${prefix}ParentBrandSlugs)))`;

    it('应正确应用单个品牌筛选（含父子穿透）', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('filter'),
        { filterBrandSlugs: ['nike'], filterParentBrandSlugs: ['nike'] },
      );
    });

    it('应正确应用多个品牌筛选', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike,adidas,puma');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('filter'),
        {
          filterBrandSlugs: ['nike', 'adidas', 'puma'],
          filterParentBrandSlugs: ['nike', 'adidas', 'puma'],
        },
      );
    });

    it('应处理品牌名称中的空格（trim）', () => {
      FilterApplier.applyBrandFilter(
        mockQueryBuilder,
        ' nike , adidas , puma ',
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('filter'),
        {
          filterBrandSlugs: ['nike', 'adidas', 'puma'],
          filterParentBrandSlugs: ['nike', 'adidas', 'puma'],
        },
      );
    });

    it('应将品牌名称转换为小写', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'Nike,ADIDAS,PuMa');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('filter'),
        {
          filterBrandSlugs: ['nike', 'adidas', 'puma'],
          filterParentBrandSlugs: ['nike', 'adidas', 'puma'],
        },
      );
    });

    it('应过滤空字符串品牌', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike,,adidas,  ,puma');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('filter'),
        {
          filterBrandSlugs: ['nike', 'adidas', 'puma'],
          filterParentBrandSlugs: ['nike', 'adidas', 'puma'],
        },
      );
    });

    it('应在品牌列表为空时不应用筛选', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, '');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应在仅有空格时不应用筛选', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, '  ,  ,  ');

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('应支持自定义参数前缀', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike', 'customPrefix');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql('customPrefix'),
        {
          customPrefixBrandSlugs: ['nike'],
          customPrefixParentBrandSlugs: ['nike'],
        },
      );
    });
  });

  describe('applyGenderFilter', () => {
    it('应调用 GenderFilterBuilder 处理性别筛选', () => {
      FilterApplier.applyGenderFilter(mockQueryBuilder, 'men');

      expect(GenderFilterBuilder.applyToQueryBuilder).toHaveBeenCalledWith(
        mockQueryBuilder,
        'men',
        'filterGender',
      );
    });

    it('应支持数组形式的性别输入', () => {
      FilterApplier.applyGenderFilter(mockQueryBuilder, ['men', 'women']);

      expect(GenderFilterBuilder.applyToQueryBuilder).toHaveBeenCalledWith(
        mockQueryBuilder,
        ['men', 'women'],
        'filterGender',
      );
    });

    it('应支持自定义参数前缀', () => {
      FilterApplier.applyGenderFilter(
        mockQueryBuilder,
        'unisex',
        'customPrefix',
      );

      expect(GenderFilterBuilder.applyToQueryBuilder).toHaveBeenCalledWith(
        mockQueryBuilder,
        'unisex',
        'customPrefixGender',
      );
    });
  });

  describe('applyJsonArrayFilter', () => {
    it('应调用 AttributeExistsFilter 并正确映射维度名', () => {
      FilterApplier.applyJsonArrayFilter(
        mockQueryBuilder,
        'red',
        'colors',
        'testPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'color', // 'colors' → 'color' 映射
        'red',
        'testPrefix',
      );
    });

    it('应正确映射 seasons → season', () => {
      FilterApplier.applyJsonArrayFilter(
        mockQueryBuilder,
        'spring,summer',
        'seasons',
        'testPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'season',
        'spring,summer',
        'testPrefix',
      );
    });

    it('应正确映射 styles → style', () => {
      FilterApplier.applyJsonArrayFilter(
        mockQueryBuilder,
        'casual',
        'styles',
        'testPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'style',
        'casual',
        'testPrefix',
      );
    });

    it('应在值为空时仍调用（由 AttributeExistsFilter 处理空值）', () => {
      FilterApplier.applyJsonArrayFilter(
        mockQueryBuilder,
        '',
        'colors',
        'testPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'color',
        '',
        'testPrefix',
      );
    });
  });

  describe('applyColorFilter', () => {
    it('应调用 AttributeExistsFilter 筛选颜色', () => {
      FilterApplier.applyColorFilter(mockQueryBuilder, 'red,blue');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'color',
        'red,blue',
        'filterColor',
      );
    });

    it('应支持自定义参数前缀', () => {
      FilterApplier.applyColorFilter(
        mockQueryBuilder,
        'green',
        'customColorPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'color',
        'green',
        'customColorPrefix',
      );
    });
  });

  describe('applySeasonFilter', () => {
    it('应调用 AttributeExistsFilter 筛选季节', () => {
      FilterApplier.applySeasonFilter(mockQueryBuilder, 'spring,summer');

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'season',
        'spring,summer',
        'filterSeason',
      );
    });

    it('应支持自定义参数前缀', () => {
      FilterApplier.applySeasonFilter(
        mockQueryBuilder,
        'winter',
        'customSeasonPrefix',
      );

      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledWith(
        mockQueryBuilder,
        'season',
        'winter',
        'customSeasonPrefix',
      );
    });
  });

  describe('过滤逻辑组合测试', () => {
    it('应支持多个筛选器链式调用', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike');
      FilterApplier.applyGenderFilter(mockQueryBuilder, 'men');
      FilterApplier.applyColorFilter(mockQueryBuilder, 'red');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1); // brand only
      expect(GenderFilterBuilder.applyToQueryBuilder).toHaveBeenCalledTimes(1);
      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledTimes(1);
    });

    it('应正确处理混合空值和有效值的场景', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, ''); // 空，不调用
      FilterApplier.applyGenderFilter(mockQueryBuilder, 'women');
      FilterApplier.applyColorFilter(mockQueryBuilder, 'red');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(0);
      expect(GenderFilterBuilder.applyToQueryBuilder).toHaveBeenCalledTimes(1);
      expect(AttributeExistsFilter.applyExistsFilter).toHaveBeenCalledTimes(1);
    });
  });

  describe('边界情况和特殊字符', () => {
    const expectedSql =
      '(brand.slug IN (:...filterBrandSlugs) OR brand."parentId" IN (SELECT b.id FROM brands b WHERE b.slug IN (:...filterParentBrandSlugs)))';

    it('应处理包含特殊字符的品牌名', () => {
      FilterApplier.applyBrandFilter(
        mockQueryBuilder,
        "o'neill,jack&jones,h&m",
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expectedSql, {
        filterBrandSlugs: ["o'neill", 'jack&jones', 'h&m'],
        filterParentBrandSlugs: ["o'neill", 'jack&jones', 'h&m'],
      });
    });

    it('应处理包含中文的品牌名', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, '耐克,阿迪达斯');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expectedSql, {
        filterBrandSlugs: ['耐克', '阿迪达斯'],
        filterParentBrandSlugs: ['耐克', '阿迪达斯'],
      });
    });

    it('应处理超长品牌列表', () => {
      const longList = Array.from({ length: 100 }, (_, i) => `brand${i}`).join(
        ',',
      );

      FilterApplier.applyBrandFilter(mockQueryBuilder, longList);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        expectedSql,
        expect.objectContaining({
          filterBrandSlugs: expect.arrayContaining([
            'brand0',
            'brand50',
            'brand99',
          ]),
        }),
      );
    });

    it('应处理重复的品牌名（不去重，保留重复）', () => {
      FilterApplier.applyBrandFilter(mockQueryBuilder, 'nike,nike,adidas');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(expectedSql, {
        filterBrandSlugs: ['nike', 'nike', 'adidas'],
        filterParentBrandSlugs: ['nike', 'nike', 'adidas'],
      });
    });
  });
});
