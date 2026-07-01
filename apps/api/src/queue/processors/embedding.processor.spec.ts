import { EmbeddingProcessor } from './embedding.processor';
import { VisualSearchService } from '../../search/visual-search.service';
import { SemanticSearchService } from '../../search/semantic-search.service';

describe('EmbeddingProcessor', () => {
  let processor: EmbeddingProcessor;
  let mockVisualSearchService: Partial<VisualSearchService>;
  let mockSemanticSearchService: Partial<SemanticSearchService>;

  beforeEach(() => {
    mockVisualSearchService = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateProductEmbeddings: jest
        .fn()
        .mockResolvedValue({ success: 2, failed: 0 }),
      warmByProductSearchCache: jest.fn().mockResolvedValue(undefined),
      countProductsWithoutEmbedding: jest.fn().mockResolvedValue(10),
      batchGenerateEmbeddings: jest.fn().mockResolvedValue({
        totalProducts: 10,
        totalImages: 30,
        success: 30,
        failed: 0,
      }),
    };

    mockSemanticSearchService = {
      isAvailable: jest.fn().mockReturnValue(true),
      generateProductEmbedding: jest.fn().mockResolvedValue(true),
      batchGenerateEmbeddings: jest.fn().mockResolvedValue({
        total: 10,
        success: 10,
        failed: 0,
        skipped: 0,
      }),
    };

    processor = new EmbeddingProcessor(
      mockVisualSearchService as VisualSearchService,
      mockSemanticSearchService as SemanticSearchService,
    );
  });

  const makeJob = (data: any) => ({ data }) as any;

  describe('image 策略可用性检查', () => {
    it('image 服务可用时应执行 image 策略', async () => {
      (mockVisualSearchService.isAvailable as jest.Mock).mockReturnValue(true);

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'image' }),
      );

      expect(
        mockVisualSearchService.generateProductEmbeddings,
      ).toHaveBeenCalledWith('p1');
      expect(
        mockVisualSearchService.warmByProductSearchCache,
      ).toHaveBeenCalledWith('p1');
    });

    it('image 生成没有成功结果时不应预热 by-product 缓存', async () => {
      (
        mockVisualSearchService.generateProductEmbeddings as jest.Mock
      ).mockResolvedValueOnce({ success: 0, failed: 1 });

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'image' }),
      );

      expect(
        mockVisualSearchService.warmByProductSearchCache,
      ).not.toHaveBeenCalled();
    });

    it('image 服务不可用时不应执行 image 策略', async () => {
      (mockVisualSearchService.isAvailable as jest.Mock).mockReturnValue(false);

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'image' }),
      );

      expect(
        mockVisualSearchService.generateProductEmbeddings,
      ).not.toHaveBeenCalled();
    });

    it('batch 任务中 image 服务不可用时不应执行 image 策略', async () => {
      (mockVisualSearchService.isAvailable as jest.Mock).mockReturnValue(false);

      await processor.process(
        makeJob({ type: 'batch', limit: 100, embeddingType: 'image' }),
      );

      expect(
        mockVisualSearchService.batchGenerateEmbeddings,
      ).not.toHaveBeenCalled();
    });
  });

  describe('text 策略可用性检查', () => {
    it('text 服务可用时应执行 text 策略', async () => {
      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'text' }),
      );

      expect(
        mockSemanticSearchService.generateProductEmbedding,
      ).toHaveBeenCalledWith('p1');
    });

    it('text 服务不可用时不应执行 text 策略', async () => {
      (mockSemanticSearchService.isAvailable as jest.Mock).mockReturnValue(
        false,
      );

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'text' }),
      );

      expect(
        mockSemanticSearchService.generateProductEmbedding,
      ).not.toHaveBeenCalled();
    });
  });

  describe('both 类型', () => {
    it('两个服务都可用时应执行两个策略', async () => {
      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'both' }),
      );

      expect(
        mockVisualSearchService.generateProductEmbeddings,
      ).toHaveBeenCalled();
      expect(
        mockSemanticSearchService.generateProductEmbedding,
      ).toHaveBeenCalled();
    });

    it('image 不可用时 both 只执行 text', async () => {
      (mockVisualSearchService.isAvailable as jest.Mock).mockReturnValue(false);

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'both' }),
      );

      expect(
        mockVisualSearchService.generateProductEmbeddings,
      ).not.toHaveBeenCalled();
      expect(
        mockSemanticSearchService.generateProductEmbedding,
      ).toHaveBeenCalled();
    });

    it('两个都不可用时不执行任何策略', async () => {
      (mockVisualSearchService.isAvailable as jest.Mock).mockReturnValue(false);
      (mockSemanticSearchService.isAvailable as jest.Mock).mockReturnValue(
        false,
      );

      await processor.process(
        makeJob({ productId: 'p1', embeddingType: 'both' }),
      );

      expect(
        mockVisualSearchService.generateProductEmbeddings,
      ).not.toHaveBeenCalled();
      expect(
        mockSemanticSearchService.generateProductEmbedding,
      ).not.toHaveBeenCalled();
    });
  });
});
