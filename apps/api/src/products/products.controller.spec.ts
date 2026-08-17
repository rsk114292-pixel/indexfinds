import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: {
    search: jest.Mock;
    findActiveBySourceProductId: jest.Mock;
  };

  beforeEach(() => {
    productsService = {
      search: jest.fn().mockResolvedValue([{ id: 'product-1' }]),
      findActiveBySourceProductId: jest
        .fn()
        .mockResolvedValue({ id: 'product-1', slug: 'split-product' }),
    };

    controller = new ProductsController(
      productsService as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('handles the legacy /products/search route without falling through to :id', async () => {
    const result = await controller.searchProducts(' nike ', 50);

    expect(productsService.search).toHaveBeenCalledWith('nike', 20);
    expect(result).toEqual({
      query: 'nike',
      total: 1,
      data: [{ id: 'product-1' }],
    });
  });

  it('returns an empty search response for blank legacy queries', async () => {
    const result = await controller.searchProducts('   ');

    expect(productsService.search).not.toHaveBeenCalled();
    expect(result).toEqual({ query: '', total: 0, data: [] });
  });

  it('resolves public product links through the source product id route', async () => {
    await expect(
      controller.findBySourceProductId('7831607056'),
    ).resolves.toEqual({ id: 'product-1', slug: 'split-product' });
    expect(productsService.findActiveBySourceProductId).toHaveBeenCalledWith(
      '7831607056',
    );
  });
});
