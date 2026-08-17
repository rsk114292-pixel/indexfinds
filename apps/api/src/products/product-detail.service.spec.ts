import { NotFoundException } from '@nestjs/common';
import { ProductDetailService } from './product-detail.service';
import { ProductStatus } from './product-status';

describe('ProductDetailService', () => {
  const productRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };
  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  let service: ProductDetailService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager.del.mockResolvedValue(undefined);
    cacheManager.set.mockResolvedValue(undefined);
    service = new ProductDetailService(
      productRepository as any,
      cacheManager as any,
    );
  });

  it('returns a cached active product', async () => {
    const product = {
      id: 'product-1',
      slug: 'active-product',
      status: ProductStatus.ACTIVE,
      qcMedia: [],
    };
    cacheManager.get.mockResolvedValue(product);

    await expect(service.findBySlug(product.slug)).resolves.toBe(product);
    expect(productRepository.findOne).not.toHaveBeenCalled();
  });

  it('does not expose an inactive product from a stale cache entry', async () => {
    cacheManager.get.mockResolvedValue({
      id: 'product-1',
      slug: 'inactive-product',
      status: ProductStatus.INACTIVE,
      qcMedia: [],
    });
    productRepository.findOne.mockResolvedValue(null);

    await expect(service.findBySlug('inactive-product')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(cacheManager.del).toHaveBeenCalledWith(
      'product:detail:slug:inactive-product',
    );
    expect(productRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'inactive-product',
          status: ProductStatus.ACTIVE,
        },
      }),
    );
  });

  it('queries and caches only active products', async () => {
    const product = {
      id: 'product-1',
      slug: 'active-product',
      status: ProductStatus.ACTIVE,
      qcMedia: [],
    };
    cacheManager.get.mockResolvedValue(null);
    productRepository.findOne.mockResolvedValue(product);

    await expect(service.findBySlug(product.slug)).resolves.toBe(product);
    expect(productRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: product.slug, status: ProductStatus.ACTIVE },
      }),
    );
    expect(cacheManager.set).toHaveBeenCalledWith(
      'product:detail:slug:active-product',
      product,
      expect.any(Number),
    );
  });
});
