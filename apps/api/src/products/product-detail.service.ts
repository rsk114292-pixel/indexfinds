import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductStatus } from './product-status';
import {
  PRODUCT_DETAIL_CACHE_PREFIX,
  PRODUCT_DETAIL_CACHE_TTL_MS,
} from './product-query.constants';

@Injectable()
export class ProductDetailService {
  private readonly logger = new Logger(ProductDetailService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async invalidateProductDetailCacheBySlug(
    slug?: string | null,
  ): Promise<void> {
    if (!slug) return;

    try {
      await this.cacheManager.del(this.getProductDetailCacheKey(slug));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to invalidate product detail cache [${slug}]: ${message}`,
      );
    }
  }

  async findOne(id: string): Promise<Product> {
    const product = this.sortQcMedia(
      await this.productRepository.findOne({
        where: { id },
        relations: [
          'brand',
          'primaryCategory',
          'secondaryCategories',
          'skus',
          'qcMedia',
        ],
      }),
    );

    if (!product) {
      throw new NotFoundException(`商品 ID ${id} 不存在`);
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const cacheKey = this.getProductDetailCacheKey(slug);
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached?.status === ProductStatus.ACTIVE) {
      return this.sortQcMedia(cached);
    }
    if (cached) {
      await this.invalidateProductDetailCacheBySlug(slug);
    }

    const product = this.sortQcMedia(
      await this.productRepository.findOne({
        where: { slug, status: ProductStatus.ACTIVE },
        relations: [
          'brand',
          'primaryCategory',
          'secondaryCategories',
          'skus',
          'qcMedia',
        ],
      }),
    );

    if (!product) {
      throw new NotFoundException(`商品 slug "${slug}" 不存在`);
    }

    await this.cacheManager.set(cacheKey, product, PRODUCT_DETAIL_CACHE_TTL_MS);

    return product;
  }

  async findByWeidianItemId(weidianItemId: string): Promise<Product | null> {
    if (!weidianItemId) return null;
    return this.productRepository.findOne({
      where: { weidianItemId },
    });
  }

  async getAllSlugs(
    page?: number,
    limit?: number,
  ): Promise<{ slugs: string[]; total?: number }> {
    const where = { status: ProductStatus.ACTIVE };

    if (page !== undefined && limit !== undefined) {
      const [products, total] = await this.productRepository.findAndCount({
        where,
        select: ['slug'],
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return { slugs: products.map((product) => product.slug), total };
    }

    const products = await this.productRepository.find({
      where,
      select: ['slug'],
      order: { createdAt: 'DESC' },
    });
    return { slugs: products.map((product) => product.slug) };
  }

  private getProductDetailCacheKey(slug: string): string {
    return `${PRODUCT_DETAIL_CACHE_PREFIX}${slug}`;
  }

  private sortQcMedia<T extends Product | null>(product: T): T {
    if (product?.qcMedia?.length) {
      product.qcMedia = [...product.qcMedia].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
    }
    return product;
  }
}
