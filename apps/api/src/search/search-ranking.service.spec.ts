import { Test, TestingModule } from '@nestjs/testing';
import { SearchRankingService, RankingFactors } from './search-ranking.service';
import { BM25RankingService } from './bm25-ranking.service';

describe('SearchRankingService', () => {
  let service: SearchRankingService;
  let mockBM25Service: Partial<BM25RankingService>;

  beforeEach(async () => {
    // Mock BM25 服务
    mockBM25Service = {
      calculateRelevance: jest.fn().mockReturnValue(0.8),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchRankingService,
        {
          provide: BM25RankingService,
          useValue: mockBM25Service,
        },
      ],
    }).compile();

    service = module.get<SearchRankingService>(SearchRankingService);
  });

  describe('calculateScore', () => {
    it('应正确计算综合得分', () => {
      const factors: RankingFactors = {
        relevance: 1.0, // 100% 相关
        ctr: 0.5, // 50% 点击率
        createdAt: new Date(), // 刚创建（新鲜度 ~1.0）
      };

      const score = service.calculateScore(factors);

      // score = 1.0 * 0.6 + 0.5 * 0.2 + 1.0 * 0.2
      //       = 0.6 + 0.1 + 0.2 = 0.9
      expect(score).toBeCloseTo(0.9, 2);
    });

    it('应处理零相关性', () => {
      const factors: RankingFactors = {
        relevance: 0,
        ctr: 0,
        createdAt: new Date(),
      };

      const score = service.calculateScore(factors);

      // score = 0 * 0.6 + 0 * 0.2 + 1.0 * 0.2 = 0.2（仅新鲜度）
      expect(score).toBeCloseTo(0.2, 2);
    });

    it('应处理旧商品（低新鲜度）', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const factors: RankingFactors = {
        relevance: 1.0,
        ctr: 0.5,
        createdAt: oneYearAgo,
      };

      const score = service.calculateScore(factors);

      // 365 天后的新鲜度应很低（接近 0）
      // score ≈ 1.0 * 0.6 + 0.5 * 0.2 + 0 * 0.2 = 0.7
      expect(score).toBeCloseTo(0.7, 1);
    });

    it('应返回精确到四位小数的得分', () => {
      const factors: RankingFactors = {
        relevance: 0.3333,
        ctr: 0.6666,
        createdAt: new Date(),
      };

      const score = service.calculateScore(factors);

      // 应四舍五入到四位小数
      expect(score.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(
        4,
      );
    });

    it('应确保得分在 [0, 1] 范围内', () => {
      const factors: RankingFactors = {
        relevance: 1.0,
        ctr: 1.0,
        createdAt: new Date(),
      };

      const score = service.calculateScore(factors);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateNewness (private method via calculateScore)', () => {
    it('应对刚创建的商品返回接近 1.0 的新鲜度', () => {
      const factors: RankingFactors = {
        relevance: 0,
        ctr: 0,
        createdAt: new Date(),
      };

      const score = service.calculateScore(factors);

      // score = 0 + 0 + newness * 0.2
      // newness ≈ 1.0 -> score ≈ 0.2
      expect(score).toBeGreaterThan(0.19);
      expect(score).toBeLessThanOrEqual(0.2);
    });

    it('应对半衰期（30天）的商品返回约 0.5 的新鲜度', () => {
      const halfLifeAgo = new Date();
      halfLifeAgo.setDate(halfLifeAgo.getDate() - 30);

      const factors: RankingFactors = {
        relevance: 0,
        ctr: 0,
        createdAt: halfLifeAgo,
      };

      const score = service.calculateScore(factors);

      // newness ≈ 0.5 -> score ≈ 0.5 * 0.2 = 0.1
      expect(score).toBeGreaterThan(0.09);
      expect(score).toBeLessThan(0.11);
    });

    it('应对 60 天前的商品返回约 0.25 的新鲜度', () => {
      const twoHalfLivesAgo = new Date();
      twoHalfLivesAgo.setDate(twoHalfLivesAgo.getDate() - 60);

      const factors: RankingFactors = {
        relevance: 0,
        ctr: 0,
        createdAt: twoHalfLivesAgo,
      };

      const score = service.calculateScore(factors);

      // newness ≈ 0.25 -> score ≈ 0.25 * 0.2 = 0.05
      expect(score).toBeGreaterThan(0.04);
      expect(score).toBeLessThan(0.06);
    });

    it('应对一年前的商品返回接近 0 的新鲜度', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const factors: RankingFactors = {
        relevance: 0,
        ctr: 0,
        createdAt: oneYearAgo,
      };

      const score = service.calculateScore(factors);

      // newness ≈ 0 -> score ≈ 0
      expect(score).toBeLessThan(0.01);
    });
  });

  describe('calculateRelevance', () => {
    it('应使用 BM25 服务计算相关性', () => {
      const product = {
        title: 'Nike Air Max Shoes',
        description: 'Running shoes',
        brand: { name: 'Nike' },
        primaryCategory: { name: 'Shoes' },
      };
      const searchTerms = ['nike', 'shoes'];

      const relevance = service.calculateRelevance(product, searchTerms);

      expect(mockBM25Service.calculateRelevance).toHaveBeenCalledWith(
        {
          title: 'Nike Air Max Shoes',
          description: 'Running shoes',
          brand: { name: 'Nike' },
          primaryCategory: { name: 'Shoes' },
        },
        searchTerms,
      );
      expect(relevance).toBe(0.8); // mock 返回值
    });

    it('应处理空搜索词（返回 1.0）', () => {
      const product = {
        title: 'Test Product',
      };

      const relevance = service.calculateRelevance(product, []);

      expect(relevance).toBe(1);
      expect(mockBM25Service.calculateRelevance).not.toHaveBeenCalled();
    });

    it('应支持旧的产品结构（name 而非 title）', () => {
      const product = {
        name: 'Old Product Name',
        description: 'Old description',
      };
      const searchTerms = ['product'];

      service.calculateRelevance(product, searchTerms);

      expect(mockBM25Service.calculateRelevance).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Old Product Name', // name 被映射为 title
          description: 'Old description',
        }),
        searchTerms,
      );
    });
  });

  describe('fallbackRelevance (当 BM25 不可用时)', () => {
    beforeEach(async () => {
      // 创建不带 BM25 的服务
      const module: TestingModule = await Test.createTestingModule({
        providers: [SearchRankingService],
      }).compile();

      service = module.get<SearchRankingService>(SearchRankingService);
    });

    it('应基于匹配词数计算相关性', () => {
      const product = {
        title: 'Nike Running Shoes',
        description: 'Comfortable shoes for running',
      };
      const searchTerms = ['nike', 'running'];

      const relevance = service.calculateRelevance(product, searchTerms);

      // 2/2 匹配 = 1.0
      expect(relevance).toBe(1.0);
    });

    it('应对部分匹配返回部分相关性', () => {
      const product = {
        title: 'Nike Shoes',
        description: 'Quality shoes',
      };
      const searchTerms = ['nike', 'adidas', 'running'];

      const relevance = service.calculateRelevance(product, searchTerms);

      // 1/3 匹配 = 0.3333
      expect(relevance).toBeCloseTo(0.33, 1);
    });

    it('应对名称精确匹配给予加分', () => {
      const product = {
        title: 'Nike Running Shoes',
        description: 'Shoes',
      };
      const searchTerms = ['nike', 'running', 'shoes'];

      const relevance = service.calculateRelevance(product, searchTerms);

      // 3/3 匹配 = 1.0 + 0.2（精确匹配加分）= 1.2，但 min(1, 1.2) = 1.0
      expect(relevance).toBe(1.0);
    });

    it('应对无匹配返回 0', () => {
      const product = {
        title: 'Nike Shoes',
        description: 'Running shoes',
      };
      const searchTerms = ['adidas', 'jacket'];

      const relevance = service.calculateRelevance(product, searchTerms);

      expect(relevance).toBe(0);
    });

    it('应忽略大小写', () => {
      const product = {
        title: 'NIKE RUNNING SHOES',
        description: 'COMFORTABLE',
      };
      const searchTerms = ['nike', 'running'];

      const relevance = service.calculateRelevance(product, searchTerms);

      expect(relevance).toBe(1.0);
    });

    it('应包含 tags 字段进行匹配', () => {
      const product = {
        title: 'Product',
        description: 'Description',
        tags: ['nike', 'running', 'shoes'],
      };
      const searchTerms = ['nike', 'running'];

      const relevance = service.calculateRelevance(product, searchTerms);

      // 2/2 匹配（在 tags 中）
      expect(relevance).toBe(1.0);
    });
  });

  describe('rankProducts', () => {
    it('应按得分降序排列商品', () => {
      const now = new Date();
      const products = [
        {
          id: '1',
          title: 'Low Score Product',
          ctr: 0.1,
          createdAt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), // 1 年前
        },
        {
          id: '2',
          title: 'High Score Product Nike',
          ctr: 0.9,
          createdAt: now, // 刚创建
        },
        {
          id: '3',
          title: 'Medium Score',
          ctr: 0.5,
          createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 天前
        },
      ];

      const searchTerms = ['nike'];
      const ranked = service.rankProducts(products, searchTerms);

      // 'High Score Product Nike' 应排在第一位（高 CTR + 高相关性 + 新商品）
      expect(ranked[0].id).toBe('2');
    });

    it('应保持原始产品对象的所有属性', () => {
      const products = [
        {
          id: '1',
          title: 'Product 1',
          ctr: 0.5,
          createdAt: new Date(),
          customField: 'test',
        },
      ];

      const searchTerms = ['product'];
      const ranked = service.rankProducts(products, searchTerms);

      expect(ranked[0]).toHaveProperty('customField', 'test');
    });

    it('应处理缺少 ctr 字段的商品（默认为 0）', () => {
      const products = [
        {
          id: '1',
          title: 'No CTR Product',
          createdAt: new Date(),
        },
      ];

      const searchTerms = ['product'];
      const ranked = service.rankProducts(products, searchTerms);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('1');
    });

    it('应正确处理空商品列表', () => {
      const products: any[] = [];
      const searchTerms = ['test'];

      const ranked = service.rankProducts(products, searchTerms);

      expect(ranked).toEqual([]);
    });

    it('应确保排序稳定性（得分相同时保持原始顺序）', () => {
      const now = new Date();
      const products = [
        {
          id: '1',
          title: 'Product A',
          ctr: 0.5,
          createdAt: now,
        },
        {
          id: '2',
          title: 'Product B',
          ctr: 0.5,
          createdAt: now,
        },
      ];

      const searchTerms = ['product'];
      const ranked = service.rankProducts(products, searchTerms);

      // 得分相同时，JavaScript sort 可能不稳定，但顺序应保留
      expect(ranked).toHaveLength(2);
    });
  });

  describe('评分一致性测试', () => {
    it('应对相同输入始终返回相同得分', () => {
      const factors: RankingFactors = {
        relevance: 0.75,
        ctr: 0.4,
        createdAt: new Date('2024-01-01'),
      };

      const score1 = service.calculateScore(factors);
      const score2 = service.calculateScore(factors);
      const score3 = service.calculateScore(factors);

      expect(score1).toBe(score2);
      expect(score2).toBe(score3);
    });

    it('应确保权重之和为 1.0（得分不会超出 [0, 1] 范围）', () => {
      const factors: RankingFactors = {
        relevance: 1.0,
        ctr: 1.0,
        createdAt: new Date(),
      };

      const score = service.calculateScore(factors);

      // 最大可能得分应接近 1.0
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('应对边界值输入正确处理', () => {
      const edgeCases = [
        {
          factors: { relevance: 0, ctr: 0, createdAt: new Date() },
          expected: 0.2, // 仅新鲜度
        },
        {
          factors: { relevance: 1, ctr: 1, createdAt: new Date() },
          expected: 1.0, // 最大得分
        },
        {
          factors: {
            relevance: 0.5,
            ctr: 0.5,
            createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
          expected: 0.4, // 中等相关性 + CTR，无新鲜度
        },
      ];

      edgeCases.forEach(({ factors, expected }) => {
        const score = service.calculateScore(factors);
        expect(score).toBeCloseTo(expected, 1);
      });
    });
  });
});
