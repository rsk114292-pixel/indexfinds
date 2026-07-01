import { ExecutionContext } from '@nestjs/common';
import { VisualSearchByProductCacheInterceptor } from './visual-search-cache.interceptor';

function mockHttpContext(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

describe('VisualSearchByProductCacheInterceptor', () => {
  let interceptor: VisualSearchByProductCacheInterceptor;

  beforeEach(() => {
    interceptor = new VisualSearchByProductCacheInterceptor(
      {} as never,
      {} as never,
    );
  });

  it('uses a versioned cache key with public limit normalization', () => {
    const context = mockHttpContext({
      method: 'GET',
      params: { productId: 'product-1' },
      query: { limit: '50', minSimilarity: '25', cacheBust: 'ignored' },
    });

    expect(interceptor.trackBy(context)).toBe(
      'visual-search:by-product:v2:product-1:limit=24:minSimilarity=25',
    );
  });

  it('keeps minSimilarity zero in the normalized cache key', () => {
    const context = mockHttpContext({
      method: 'GET',
      params: { productId: 'product-1' },
      query: { limit: '12', minSimilarity: '0' },
    });

    expect(interceptor.trackBy(context)).toBe(
      'visual-search:by-product:v2:product-1:limit=12:minSimilarity=0',
    );
  });
});
