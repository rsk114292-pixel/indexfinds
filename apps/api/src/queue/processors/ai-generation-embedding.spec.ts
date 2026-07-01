/**
 * 聚焦测试：AI generation processor 中主图 embedding 同步写入逻辑
 * 不测试完整 AI 流程，只验证 embedding 缓存复用
 */

import { VisualSearchService } from '../../search/visual-search.service';

describe('AiGenerationProcessor embedding 同步写入', () => {
  // 直接测试逻辑片段，不实例化整个 processor
  const mockVisualSearchService = {
    saveProductEmbedding: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => jest.clearAllMocks());

  /**
   * 模拟 AI processor 中产品创建后的 embedding 写入逻辑
   * 抽取自 ai-generation.processor.ts lines 491-510
   */
  async function writeEmbeddingIfCached(
    visualSearch: Pick<VisualSearchService, 'saveProductEmbedding'>,
    productId: string,
    mainImage: string | undefined,
    cachedEmbedding: number[] | undefined,
  ) {
    if (cachedEmbedding && mainImage) {
      await visualSearch.saveProductEmbedding(
        productId,
        mainImage,
        0,
        cachedEmbedding,
      );
    }
  }

  it('有缓存 embedding 且有主图时同步写入', async () => {
    await writeEmbeddingIfCached(
      mockVisualSearchService,
      'prod-1',
      'https://img.com/main.jpg',
      [0.1, 0.2, 0.3],
    );

    expect(mockVisualSearchService.saveProductEmbedding).toHaveBeenCalledWith(
      'prod-1',
      'https://img.com/main.jpg',
      0,
      [0.1, 0.2, 0.3],
    );
  });

  it('无缓存 embedding 时不写入', async () => {
    await writeEmbeddingIfCached(
      mockVisualSearchService,
      'prod-1',
      'https://img.com/main.jpg',
      undefined,
    );

    expect(mockVisualSearchService.saveProductEmbedding).not.toHaveBeenCalled();
  });

  it('无主图时不写入', async () => {
    await writeEmbeddingIfCached(
      mockVisualSearchService,
      'prod-1',
      undefined,
      [0.1, 0.2, 0.3],
    );

    expect(mockVisualSearchService.saveProductEmbedding).not.toHaveBeenCalled();
  });
});
