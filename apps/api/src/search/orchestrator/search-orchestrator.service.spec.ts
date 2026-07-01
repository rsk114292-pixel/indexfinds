import { Test, TestingModule } from '@nestjs/testing';
import { SearchOrchestratorService } from './search-orchestrator.service';
import { SearchContext, SearchRequest } from './search-context';
import {
  ISearchStrategy,
  ISearchEnhancer,
  ISearchPostProcessor,
} from './search-strategy.interface';

describe('SearchOrchestratorService', () => {
  let service: SearchOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchOrchestratorService],
    }).compile();

    service = module.get<SearchOrchestratorService>(SearchOrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerStrategy', () => {
    it('应正确注册搜索策略', () => {
      const mockStrategy: ISearchStrategy = {
        name: 'TestStrategy',
        canHandle: jest.fn(() => true),
        execute: jest.fn().mockResolvedValue({ products: [], total: 0 }),
      };

      service.registerStrategy(mockStrategy);

      expect(service.getStrategies()).toContain('TestStrategy');
    });
  });

  describe('registerEnhancer', () => {
    it('应正确注册搜索增强器', () => {
      const mockEnhancer: ISearchEnhancer = {
        name: 'TestEnhancer',
        shouldEnhance: jest.fn(() => true),
        enhance: jest.fn().mockResolvedValue(null),
      };

      service.registerEnhancer(mockEnhancer);

      expect(service.getEnhancers()).toContain('TestEnhancer');
    });
  });

  describe('registerPostProcessor', () => {
    it('应正确注册后处理器', () => {
      const mockProcessor: ISearchPostProcessor = {
        name: 'TestProcessor',
        shouldProcess: jest.fn(() => true),
        process: jest.fn().mockResolvedValue(undefined),
      };

      service.registerPostProcessor(mockProcessor);

      expect(service.getPostProcessors()).toContain('TestProcessor');
    });
  });

  describe('execute', () => {
    it('应按顺序执行搜索策略', async () => {
      const mockProduct = { id: 'product-1', title: 'Test Product' };
      const executionOrder: string[] = [];

      const strategy1: ISearchStrategy = {
        name: 'Strategy1',
        canHandle: () => {
          executionOrder.push('canHandle1');
          return false;
        },
        execute: jest.fn(),
      };

      const strategy2: ISearchStrategy = {
        name: 'Strategy2',
        canHandle: () => {
          executionOrder.push('canHandle2');
          return true;
        },
        execute: jest
          .fn()
          .mockResolvedValue({ products: [mockProduct], total: 1 }),
      };

      service.registerStrategy(strategy1);
      service.registerStrategy(strategy2);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      const result = await service.execute(context);

      expect(executionOrder).toEqual(['canHandle1', 'canHandle2']);
      expect(result.total).toBe(1);
      expect(strategy2.execute).toHaveBeenCalled();
    });

    it('找到结果后应停止执行后续策略', async () => {
      const mockProduct = { id: 'product-1', title: 'Test Product' };

      const strategy1: ISearchStrategy = {
        name: 'Strategy1',
        canHandle: () => true,
        execute: jest
          .fn()
          .mockResolvedValue({ products: [mockProduct], total: 1 }),
      };

      const strategy2: ISearchStrategy = {
        name: 'Strategy2',
        canHandle: () => true,
        execute: jest.fn(),
      };

      service.registerStrategy(strategy1);
      service.registerStrategy(strategy2);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 1, // limit 为 1，结果已满足
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      await service.execute(context);

      expect(strategy1.execute).toHaveBeenCalled();
      expect(strategy2.execute).not.toHaveBeenCalled();
    });

    it('无结果时应执行增强器', async () => {
      const mockProduct = { id: 'product-1', title: 'Test Product' };

      const strategy: ISearchStrategy = {
        name: 'Strategy',
        canHandle: () => true,
        execute: jest.fn().mockResolvedValue({ products: [], total: 0 }),
      };

      const enhancer: ISearchEnhancer = {
        name: 'Enhancer',
        shouldEnhance: () => true,
        enhance: jest
          .fn()
          .mockResolvedValue({ products: [mockProduct], total: 1 }),
      };

      service.registerStrategy(strategy);
      service.registerEnhancer(enhancer);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      const result = await service.execute(context);

      expect(enhancer.enhance).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('应执行后处理器', async () => {
      const mockProduct = { id: 'product-1', title: 'Test Product' };

      const strategy: ISearchStrategy = {
        name: 'Strategy',
        canHandle: () => true,
        execute: jest
          .fn()
          .mockResolvedValue({ products: [mockProduct], total: 1 }),
      };

      const processor: ISearchPostProcessor = {
        name: 'Processor',
        shouldProcess: () => true,
        process: jest.fn().mockResolvedValue(undefined),
      };

      service.registerStrategy(strategy);
      service.registerPostProcessor(processor);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      await service.execute(context);

      expect(processor.process).toHaveBeenCalled();
    });

    it('策略执行失败时应继续尝试下一个策略', async () => {
      const mockProduct = { id: 'product-1', title: 'Test Product' };

      const failingStrategy: ISearchStrategy = {
        name: 'FailingStrategy',
        canHandle: () => true,
        execute: jest.fn().mockRejectedValue(new Error('Strategy failed')),
      };

      const successStrategy: ISearchStrategy = {
        name: 'SuccessStrategy',
        canHandle: () => true,
        execute: jest
          .fn()
          .mockResolvedValue({ products: [mockProduct], total: 1 }),
      };

      service.registerStrategy(failingStrategy);
      service.registerStrategy(successStrategy);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      const result = await service.execute(context);

      expect(failingStrategy.execute).toHaveBeenCalled();
      expect(successStrategy.execute).toHaveBeenCalled();
      expect(result.total).toBe(1);
    });

    it('context.completed 为 true 时应跳过后续策略', async () => {
      const strategy1: ISearchStrategy = {
        name: 'Strategy1',
        canHandle: () => true,
        execute: jest.fn().mockImplementation((ctx: SearchContext) => {
          ctx.markCompleted();
          return { products: [], total: 0 };
        }),
      };

      const strategy2: ISearchStrategy = {
        name: 'Strategy2',
        canHandle: () => true,
        execute: jest.fn(),
      };

      service.registerStrategy(strategy1);
      service.registerStrategy(strategy2);

      const request: SearchRequest = {
        query: 'test',
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      await service.execute(context);

      expect(strategy1.execute).toHaveBeenCalled();
      expect(strategy2.execute).not.toHaveBeenCalled();
    });
  });

  describe('SearchContext', () => {
    it('应正确计算 skip 值', () => {
      const request: SearchRequest = {
        page: 3,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      expect(context.skip).toBe(40); // (3-1) * 20
    });

    it('hasResults 应正确判断是否有结果', () => {
      const request: SearchRequest = {
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      expect(context.hasResults()).toBe(false);

      context.setResult({ products: [], total: 0 });
      expect(context.hasResults()).toBe(false);

      context.setResult({ products: [{ id: '1' }] as any, total: 1 });
      expect(context.hasResults()).toBe(true);
    });

    it('needsMoreResults 应正确判断是否需要更多结果', () => {
      const request: SearchRequest = {
        page: 1,
        limit: 2,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        filters: {},
      };
      const context = new SearchContext(request);

      // 无结果时需要更多
      expect(context.needsMoreResults()).toBe(true);

      // total=1, products=1: 已拿到所有结果（1 <= 0+1），不需要更多
      // Phase 2 修复 #12: 增加了 total <= skip + products.length 判断
      context.setResult({ products: [{ id: '1' }] as any, total: 1 });
      expect(context.needsMoreResults()).toBe(false);

      // total=5, products=1: 还有更多数据未拿到，需要继续
      context.setResult({ products: [{ id: '1' }] as any, total: 5 });
      expect(context.needsMoreResults()).toBe(true);

      // total=2, products=2: 刚好满足 limit，且已拿到全部
      context.setResult({
        products: [{ id: '1' }, { id: '2' }] as any,
        total: 2,
      });
      expect(context.needsMoreResults()).toBe(false);
    });

    it('getMergedFilters 应正确合并过滤条件', () => {
      const request: SearchRequest = {
        page: 1,
        limit: 20,
        sortBy: 'relevance',
        sortOrder: 'DESC',
        gender: 'women',
        filters: { brands: 'nike' },
      };
      const context = new SearchContext(request);
      context.setAnalysis({
        analyzedQuery: null,
        effectiveCategory: 'shoes',
        analyzedFilters: { colors: 'black' },
        intentSortBy: 'relevance',
        intentSortApplied: false,
        searchKeywords: [],
        isPureIntentSearch: false,
      });

      const merged = context.getMergedFilters();

      expect(merged.brands).toBe('nike');
      expect(merged.genders).toBe('women');
      expect(merged.colors).toBe('black');
      expect(merged.category).toBe('shoes');
    });
  });
});
