import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { AIResponseParserService } from './ai-response-parser.service';
import { AI_PROVIDER } from './interfaces/ai-provider.interface';

describe('AIService', () => {
  let service: AIService;
  let aiProvider: {
    analyzeImages: jest.Mock;
    analyzeMultipleImages: jest.Mock;
    getUsageStats: jest.Mock;
    isAvailable: jest.Mock;
  };
  let parserService: {
    parseAIResponse: jest.Mock;
    parseComprehensiveAnalysisResponse: jest.Mock;
    validateComprehensiveAnalysis: jest.Mock;
  };

  beforeEach(async () => {
    aiProvider = {
      analyzeImages: jest.fn(),
      analyzeMultipleImages: jest.fn(),
      getUsageStats: jest.fn(),
      isAvailable: jest.fn().mockReturnValue(true),
    };

    parserService = {
      parseAIResponse: jest.fn(),
      parseComprehensiveAnalysisResponse: jest.fn(),
      validateComprehensiveAnalysis: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: AI_PROVIDER,
          useValue: aiProvider,
        },
        {
          provide: AIResponseParserService,
          useValue: parserService,
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsageStats', () => {
    it('返回今日使用量统计', async () => {
      aiProvider.getUsageStats.mockResolvedValue({
        used: 10,
        date: '2026-02-04',
      });

      const stats = await service.getUsageStats();

      expect(stats.used).toBe(10);
      expect(stats.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('analyzeProductImage', () => {
    const mockParsedResult = {
      title: 'Nike Air Max 90 Classic Sneakers',
      description: 'Iconic Nike sneakers with excellent cushioning.',
      brandSlug: 'nike',
      brandName: 'Nike',
      category: 'sneakers',
      attributes: {
        colors: ['White', 'Black'],
        styles: ['Sporty', 'Casual'],
        occasions: ['Everyday', 'Sports'],
        seasons: ['Spring', 'Summer', 'Fall'],
        gender: 'unisex',
      },
      confidence: 0.85,
    };

    it('成功解析 AI 返回的结果', async () => {
      aiProvider.analyzeImages.mockResolvedValue(
        JSON.stringify(mockParsedResult),
      );

      const result = await service.analyzeProductImage([
        'https://example.com/image.jpg',
      ]);

      expect(result.title).toBe('Nike Air Max 90 Classic Sneakers');
      expect(result.brandSlug).toBe('nike');
      expect(result.brandName).toBe('Nike');
      expect(result.category).toBe('sneakers');
      expect(result.attributes.colors).toContain('White');
      expect(result.attributes.gender).toBe('unisex');
      expect(aiProvider.analyzeImages).toHaveBeenCalled();
    });

    it('空图片数组返回默认值', async () => {
      const result = await service.analyzeProductImage([]);

      expect(result.title).toBe('Untitled Product');
      expect(result.confidence).toBe(0.1);
      expect(aiProvider.analyzeImages).not.toHaveBeenCalled();
    });

    it('API 调用失败时返回默认值', async () => {
      aiProvider.analyzeImages.mockRejectedValue(new Error('API Error'));

      const result = await service.analyzeProductImage([
        'https://example.com/image.jpg',
      ]);

      expect(result.title).toBe('Untitled Product');
      expect(result.confidence).toBe(0.1);
    });
  });
});
