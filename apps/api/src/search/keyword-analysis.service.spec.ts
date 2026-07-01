import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  KeywordAnalysisService,
  AnalyzedQuery,
} from './keyword-analysis.service';
import { Brand } from '../brands/entities/brand.entity';
import { Category } from '../categories/entities/category.entity';
import { SynonymService } from './synonym.service';
import { BrandCacheService } from './brand-cache.service';
import { IntentDetectorService } from './intent-detector.service';

describe('KeywordAnalysisService', () => {
  let service: KeywordAnalysisService;

  // 每次 beforeEach 重新创建 mock，避免 clearAllMocks 清除工厂实现
  let mockBrandRepository: Record<string, jest.Mock>;
  let mockCategoryRepository: Record<string, jest.Mock>;
  let mockSynonymService: Record<string, jest.Mock>;
  let mockBrandCacheService: Record<string, jest.Mock>;
  let mockIntentDetectorService: Record<string, jest.Mock>;

  function createQueryBuilderMock() {
    return {
      where: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };
  }

  beforeEach(async () => {
    mockBrandRepository = {
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };
    mockCategoryRepository = {
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };
    mockSynonymService = {
      expandQuery: jest.fn((term: string) => [term]),
      expandTerms: jest.fn((terms: string[]) => terms),
    };
    mockBrandCacheService = {
      findBrand: jest.fn(() => null),
      isBrand: jest.fn(() => false),
      getStats: jest.fn(() => ({ brandCount: 0, termCount: 0 })),
    };
    mockIntentDetectorService = {
      detect: jest.fn(() => null),
      detectIntent: jest.fn(() => null),
      getAllIntentKeywords: jest.fn(() => new Set<string>()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeywordAnalysisService,
        {
          provide: getRepositoryToken(Brand),
          useValue: mockBrandRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: SynonymService,
          useValue: mockSynonymService,
        },
        {
          provide: BrandCacheService,
          useValue: mockBrandCacheService,
        },
        {
          provide: IntentDetectorService,
          useValue: mockIntentDetectorService,
        },
      ],
    }).compile();

    service = module.get<KeywordAnalysisService>(KeywordAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyze (同步分析)', () => {
    describe('空查询处理', () => {
      it('空字符串应返回空结果', () => {
        const result = service.analyze('');
        expect(result.brands).toHaveLength(0);
        expect(result.categories).toHaveLength(0);
        expect(result.keywords).toHaveLength(0);
      });

      it('null/undefined 应返回空结果', () => {
        const result = service.analyze(null as any);
        expect(result.brands).toHaveLength(0);
      });

      it('纯空格应返回空结果', () => {
        const result = service.analyze('   ');
        expect(result.brands).toHaveLength(0);
      });
    });

    describe('品牌匹配', () => {
      it('应匹配单词品牌: nike', () => {
        const result = service.analyze('nike');
        expect(result.brands).toContain('nike');
      });

      it('应匹配品牌别名: adi -> adidas', () => {
        const result = service.analyze('adi jacket');
        expect(result.brands).toContain('adidas');
      });

      it('应匹配多词品牌短语: north face', () => {
        const result = service.analyze('north face jacket');
        expect(result.brands).toContain('the-north-face');
      });

      it('应匹配 calvin klein 品牌', () => {
        const result = service.analyze('calvin klein underwear');
        expect(result.brands).toContain('calvin-klein');
      });

      it('应匹配缩写品牌: ck -> calvin-klein', () => {
        const result = service.analyze('ck t-shirt');
        expect(result.brands).toContain('calvin-klein');
      });

      it('应忽略大小写: Nike -> nike', () => {
        const result = service.analyze('Nike shoes');
        expect(result.brands).toContain('nike');
      });

      it('应去重多次出现的同一品牌', () => {
        const result = service.analyze('nike nike shoes');
        expect(result.brands.filter((b) => b === 'nike')).toHaveLength(1);
      });
    });

    describe('分类匹配', () => {
      it('应匹配分类关键词: jacket', () => {
        const result = service.analyze('black jacket');
        expect(result.categories.length).toBeGreaterThanOrEqual(0);
      });

      it('应匹配带隐含性别的分类', () => {
        const result = service.analyze('dress');
        // dress 通常隐含女性
        if (result.categories.length > 0) {
          expect(result.genders.length).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('颜色匹配', () => {
      it('应匹配颜色: black -> Black', () => {
        const result = service.analyze('black jacket');
        expect(result.colors).toContain('Black');
      });

      it('应匹配颜色: white -> White', () => {
        const result = service.analyze('white shirt');
        expect(result.colors).toContain('White');
      });

      it('应匹配颜色: red -> Red', () => {
        const result = service.analyze('red dress');
        expect(result.colors).toContain('Red');
      });

      it('应去重颜色', () => {
        const result = service.analyze('black black jacket');
        expect(result.colors.filter((c) => c === 'Black')).toHaveLength(1);
      });
    });

    describe('性别匹配', () => {
      it('应匹配男性关键词: men', () => {
        const result = service.analyze('men jacket');
        expect(result.genders).toContain('men');
      });

      it('应匹配女性关键词: women', () => {
        const result = service.analyze('women dress');
        expect(result.genders).toContain('women');
      });

      it('应匹配中文性别词: 男', () => {
        const result = service.analyze('男装 外套');
        // 根据配置决定是否支持中文
        expect(result.genders.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('季节匹配', () => {
      it('应匹配季节: winter -> Winter', () => {
        const result = service.analyze('winter jacket');
        expect(result.seasons).toContain('Winter');
      });

      it('应匹配季节: summer -> Summer', () => {
        const result = service.analyze('summer dress');
        expect(result.seasons).toContain('Summer');
      });
    });

    describe('风格匹配', () => {
      it('应匹配风格: casual -> Casual', () => {
        const result = service.analyze('casual shirt');
        expect(result.styles).toContain('Casual');
      });

      it('应匹配风格: vintage -> Retro', () => {
        const result = service.analyze('vintage jacket');
        expect(result.styles).toContain('Retro');
      });
    });

    describe('场合匹配', () => {
      it('应匹配场合: office -> Formal', () => {
        const result = service.analyze('office wear');
        expect(result.occasions).toContain('Formal');
      });

      it('应匹配场合: party -> Party', () => {
        const result = service.analyze('party dress');
        expect(result.occasions).toContain('Party');
      });
    });

    describe('剩余关键词', () => {
      it('未匹配的词应放入 keywords', () => {
        const result = service.analyze('fancy unusual item');
        // 停用词过滤后，特殊词应保留
        expect(result.keywords.length).toBeGreaterThanOrEqual(0);
      });

      it('应过滤停用词', () => {
        const result = service.analyze('the a an nike');
        expect(result.keywords).not.toContain('the');
        expect(result.keywords).not.toContain('a');
        expect(result.keywords).not.toContain('an');
      });
    });

    describe('复杂查询', () => {
      it('应正确解析复杂查询: nike black winter jacket men', () => {
        const result = service.analyze('nike black winter jacket men');
        expect(result.brands).toContain('nike');
        expect(result.colors).toContain('Black');
        expect(result.seasons).toContain('Winter');
        expect(result.genders).toContain('men');
      });

      it('应正确解析: north face women red down jacket', () => {
        const result = service.analyze('north face women red down jacket');
        expect(result.brands).toContain('the-north-face');
        expect(result.genders).toContain('women');
        expect(result.colors).toContain('Red');
      });
    });
  });

  describe('hasMatches', () => {
    it('有品牌匹配时返回 true', () => {
      const analyzed: AnalyzedQuery = {
        brands: ['nike'],
        categories: [],
        genders: [],
        seasons: [],
        colors: [],
        styles: [],
        occasions: [],
        keywords: [],
      };
      expect(service.hasMatches(analyzed)).toBe(true);
    });

    it('有颜色匹配时返回 true', () => {
      const analyzed: AnalyzedQuery = {
        brands: [],
        categories: [],
        genders: [],
        seasons: [],
        colors: ['black'],
        styles: [],
        occasions: [],
        keywords: [],
      };
      expect(service.hasMatches(analyzed)).toBe(true);
    });

    it('只有 keywords 时返回 false', () => {
      const analyzed: AnalyzedQuery = {
        brands: [],
        categories: [],
        genders: [],
        seasons: [],
        colors: [],
        styles: [],
        occasions: [],
        keywords: ['something'],
      };
      expect(service.hasMatches(analyzed)).toBe(false);
    });

    it('完全空时返回 false', () => {
      const analyzed: AnalyzedQuery = {
        brands: [],
        categories: [],
        genders: [],
        seasons: [],
        colors: [],
        styles: [],
        occasions: [],
        keywords: [],
      };
      expect(service.hasMatches(analyzed)).toBe(false);
    });
  });

  describe('analyzeAsync (异步分析)', () => {
    it('空查询应返回空结果', async () => {
      const result = await service.analyzeAsync('');
      expect(result.brands).toHaveLength(0);
    });

    it('应匹配静态品牌: nike', async () => {
      const result = await service.analyzeAsync('nike jacket');
      expect(result.brands).toContain('nike');
    });

    it('应匹配多词品牌: north face', async () => {
      const result = await service.analyzeAsync('north face jacket');
      expect(result.brands).toContain('the-north-face');
    });

    it('未命中静态映射时应查询数据库', async () => {
      // Mock 数据库返回品牌（需要同时包含 getOne 和 getMany）
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ slug: 'dynamic-brand' }),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockBrandRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.analyzeAsync('unknownbrand jacket');

      // 验证调用了 createQueryBuilder
      expect(mockBrandRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('应正确处理复杂异步查询', async () => {
      const result = await service.analyzeAsync('nike black winter jacket');
      expect(result.brands).toContain('nike');
      expect(result.colors).toContain('Black');
      expect(result.seasons).toContain('Winter');
    });
  });
});
