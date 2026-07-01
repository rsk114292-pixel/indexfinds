import { RecommendationService } from './recommendation.service';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let similarProductsService: { findSimilar: jest.Mock };
  let completeTheLookService: { findComplements: jest.Mock };

  beforeEach(() => {
    similarProductsService = {
      findSimilar: jest.fn(),
    };
    completeTheLookService = {
      findComplements: jest.fn(),
    };

    service = new RecommendationService(
      similarProductsService as any,
      completeTheLookService as any,
    );
  });

  it('should share concurrent recommendation loads and reuse local cache', async () => {
    let resolveSimilar: (products: any[]) => void = () => undefined;
    similarProductsService.findSimilar.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSimilar = resolve;
      }),
    );

    const first = service.getSimilarProducts('p1', 12);
    const second = service.getSimilarProducts('p1', 12);
    await new Promise((resolve) => setImmediate(resolve));

    expect(similarProductsService.findSimilar).toHaveBeenCalledTimes(1);

    resolveSimilar([{ id: 'similar-1' }]);

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.data).toHaveLength(1);
    expect(secondResult.meta.count).toBe(1);

    const cached = await service.getSimilarProducts('p1', 12);
    expect(cached.meta.count).toBe(1);
    expect(similarProductsService.findSimilar).toHaveBeenCalledTimes(1);
  });

  it('should return an empty result when too many recommendation loads are active', async () => {
    const resolvers: Array<(products: any[]) => void> = [];
    similarProductsService.findSimilar.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const first = service.getSimilarProducts('p1', 12);
    const second = service.getSimilarProducts('p2', 12);
    await new Promise((resolve) => setImmediate(resolve));

    const third = await service.getSimilarProducts('p3', 12);

    expect(third.data).toEqual([]);
    expect(third.meta.algorithm).toBe('multi-signal-mmr');
    expect(similarProductsService.findSimilar).toHaveBeenCalledTimes(2);

    resolvers[0]([{ id: 'similar-1' }]);
    resolvers[1]([{ id: 'similar-2' }]);
    await Promise.all([first, second]);
  });

  it('should shed cache misses briefly after the load limit is reached', async () => {
    const resolvers: Array<(products: any[]) => void> = [];
    similarProductsService.findSimilar.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );

    const first = service.getSimilarProducts('p1', 12);
    const second = service.getSimilarProducts('p2', 12);
    await new Promise((resolve) => setImmediate(resolve));

    await service.getSimilarProducts('p3', 12);
    resolvers[0]([{ id: 'similar-1' }]);
    resolvers[1]([{ id: 'similar-2' }]);
    await Promise.all([first, second]);

    const shed = await service.getSimilarProducts('p4', 12);

    expect(shed.data).toEqual([]);
    expect(similarProductsService.findSimilar).toHaveBeenCalledTimes(2);
  });
});
