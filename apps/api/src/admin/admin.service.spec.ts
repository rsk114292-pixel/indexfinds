import { AdminService } from './admin.service';

type FixtureProduct = {
  id: string;
  title: string;
  slug: string;
  mainImage: string | null;
  popularityScore: number;
  viewCount: number;
  clickCount: number;
  salesCount: number;
  favoriteCount: number;
  ctr: number;
  isFeatured: boolean;
  featuredSort: number;
  qcPhotoCount: number;
  createdAt: Date;
  status: string;
  originalTitle?: string | null;
  weidianItemId?: string | null;
  weidianShopName?: string | null;
};

class FakeHotProductQueryBuilder {
  private filters: Array<(product: FixtureProduct) => boolean> = [];
  private sorts: Array<{ field: string; order: 'ASC' | 'DESC' }> = [];
  private offset = 0;
  private limit = Number.MAX_SAFE_INTEGER;

  constructor(private readonly fixtures: FixtureProduct[]) {}

  where(condition: string, params?: Record<string, unknown>) {
    this.filters = [];
    return this.andWhere(condition, params);
  }

  andWhere(condition: string, params?: Record<string, unknown>) {
    this.filters.push(this.buildPredicate(condition, params));
    return this;
  }

  select() {
    return this;
  }

  loadRelationCountAndMap() {
    return this;
  }

  orderBy(field: string, order: 'ASC' | 'DESC') {
    this.sorts = [{ field, order }];
    return this;
  }

  addOrderBy(field: string, order: 'ASC' | 'DESC') {
    this.sorts.push({ field, order });
    return this;
  }

  skip(value: number) {
    this.offset = value;
    return this;
  }

  take(value: number) {
    this.limit = value;
    return this;
  }

  clone() {
    const cloned = new FakeHotProductQueryBuilder(this.fixtures);
    cloned.filters = [...this.filters];
    cloned.sorts = [...this.sorts];
    cloned.offset = this.offset;
    cloned.limit = this.limit;
    return cloned;
  }

  getMany() {
    return this.apply().slice(this.offset, this.offset + this.limit);
  }

  getCount() {
    return this.apply().length;
  }

  private apply() {
    const filtered = this.fixtures.filter((product) =>
      this.filters.every((predicate) => predicate(product)),
    );

    const sorted = [...filtered].sort((left, right) => {
      for (const sort of this.sorts) {
        const leftValue = this.resolveField(left, sort.field);
        const rightValue = this.resolveField(right, sort.field);

        if (leftValue === rightValue) continue;

        const compare = leftValue > rightValue ? 1 : -1;
        return sort.order === 'ASC' ? compare : -compare;
      }

      return 0;
    });

    return sorted.map((product) => ({
      ...product,
      qcMedia: Array.from({ length: product.qcPhotoCount }, (_, index) => ({
        id: `${product.id}-qc-${index}`,
      })),
    }));
  }

  private resolveField(product: FixtureProduct, field: string) {
    const key = field.replace(/^product\./, '').replace(/"/g, '');
    return (product as Record<string, unknown>)[key];
  }

  private buildPredicate(
    condition: string,
    params?: Record<string, unknown>,
  ): (product: FixtureProduct) => boolean {
    if (condition.includes('product.status = :status')) {
      return (product) => product.status === params?.status;
    }

    if (condition.includes('product.title ILIKE :keyword')) {
      const keywordParam =
        typeof params?.keyword === 'string' ? params.keyword : '';
      const exactParam = typeof params?.exact === 'string' ? params.exact : '';
      const keyword = keywordParam.replace(/^%|%$/g, '').toLowerCase();
      const exact = exactParam;
      return (product) =>
        product.title.toLowerCase().includes(keyword) ||
        (product.originalTitle || '').toLowerCase().includes(keyword) ||
        (product.weidianShopName || '').toLowerCase().includes(keyword) ||
        (product.weidianItemId || '') === exact;
    }

    if (condition.includes('NOT EXISTS (SELECT 1 FROM product_qc_media')) {
      return (product) => product.qcPhotoCount === 0;
    }

    if (condition.includes('EXISTS (SELECT 1 FROM product_qc_media')) {
      return (product) => product.qcPhotoCount > 0;
    }

    if (condition.includes('BETWEEN 1 AND 2')) {
      return (product) =>
        product.qcPhotoCount >= 1 && product.qcPhotoCount <= 2;
    }

    if (
      condition.includes('COUNT(*) FROM product_qc_media') &&
      condition.includes('>= 3')
    ) {
      return (product) => product.qcPhotoCount >= 3;
    }

    if (condition.includes('product."isFeatured" = true')) {
      return (product) => product.isFeatured;
    }

    if (condition.includes('product."isFeatured" = false')) {
      return (product) => !product.isFeatured;
    }

    if (
      condition.includes('product."createdAt" >= :thirtyDaysAgo') &&
      condition.includes('product."createdAt" < :sevenDaysAgo')
    ) {
      const thirtyDaysAgo = params?.thirtyDaysAgo as Date;
      const sevenDaysAgo = params?.sevenDaysAgo as Date;
      return (product) =>
        product.createdAt >= thirtyDaysAgo && product.createdAt < sevenDaysAgo;
    }

    if (condition.includes('product."createdAt" >= :sevenDaysAgo')) {
      const sevenDaysAgo = params?.sevenDaysAgo as Date;
      return (product) => product.createdAt >= sevenDaysAgo;
    }

    if (condition.includes('product."createdAt" < :thirtyDaysAgo')) {
      const thirtyDaysAgo = params?.thirtyDaysAgo as Date;
      return (product) => product.createdAt < thirtyDaysAgo;
    }

    if (
      condition.includes('product."popularityScore" >= :minPopularityScore')
    ) {
      const minPopularityScore = Number(params?.minPopularityScore || 0);
      return (product) => product.popularityScore >= minPopularityScore;
    }

    if (condition.includes('product."popularityScore" >= :highHeatThreshold')) {
      const highHeatThreshold = Number(params?.highHeatThreshold || 0);
      return (product) => product.popularityScore >= highHeatThreshold;
    }

    throw new Error(`Unhandled condition: ${condition}`);
  }
}

describe('AdminService', () => {
  const fixtures: FixtureProduct[] = [
    {
      id: 'featured-no-qc',
      title: 'Featured No QC',
      slug: 'featured-no-qc',
      mainImage: null,
      popularityScore: 0.72,
      viewCount: 120,
      clickCount: 80,
      salesCount: 5,
      favoriteCount: 6,
      ctr: 0.5,
      isFeatured: true,
      featuredSort: 1,
      qcPhotoCount: 0,
      createdAt: new Date(Date.now() - 3 * 86400000),
      status: 'active',
      originalTitle: '推荐缺 QC',
      weidianItemId: 'wd-1',
      weidianShopName: 'Hot Shop',
    },
    {
      id: 'qc-one',
      title: 'QC One',
      slug: 'qc-one',
      mainImage: null,
      popularityScore: 0.55,
      viewCount: 90,
      clickCount: 20,
      salesCount: 1,
      favoriteCount: 2,
      ctr: 0.2,
      isFeatured: false,
      featuredSort: 0,
      qcPhotoCount: 1,
      createdAt: new Date(Date.now() - 9 * 86400000),
      status: 'active',
      originalTitle: '一张 QC',
      weidianItemId: 'wd-2',
      weidianShopName: 'Hot Shop',
    },
    {
      id: 'qc-two',
      title: 'QC Two',
      slug: 'qc-two',
      mainImage: null,
      popularityScore: 0.31,
      viewCount: 60,
      clickCount: 10,
      salesCount: 0,
      favoriteCount: 1,
      ctr: 0.1,
      isFeatured: false,
      featuredSort: 0,
      qcPhotoCount: 2,
      createdAt: new Date(Date.now() - 20 * 86400000),
      status: 'active',
      originalTitle: '两张 QC',
      weidianItemId: 'wd-3',
      weidianShopName: 'Cold Shop',
    },
    {
      id: 'qc-complete',
      title: 'QC Complete',
      slug: 'qc-complete',
      mainImage: null,
      popularityScore: 0.84,
      viewCount: 130,
      clickCount: 70,
      salesCount: 4,
      favoriteCount: 7,
      ctr: 0.53,
      isFeatured: false,
      featuredSort: 0,
      qcPhotoCount: 4,
      createdAt: new Date(Date.now() - 40 * 86400000),
      status: 'active',
      originalTitle: '完整 QC',
      weidianItemId: 'wd-4',
      weidianShopName: 'Complete Shop',
    },
    {
      id: 'inactive-no-qc',
      title: 'Inactive No QC',
      slug: 'inactive-no-qc',
      mainImage: null,
      popularityScore: 0.95,
      viewCount: 200,
      clickCount: 100,
      salesCount: 10,
      favoriteCount: 9,
      ctr: 0.5,
      isFeatured: true,
      featuredSort: 0,
      qcPhotoCount: 0,
      createdAt: new Date(Date.now() - 2 * 86400000),
      status: 'inactive',
      originalTitle: '下架商品',
      weidianItemId: 'wd-5',
      weidianShopName: 'Inactive Shop',
    },
  ];

  const createService = () => {
    const productRepository = {
      createQueryBuilder: jest
        .fn()
        .mockImplementation(() => new FakeHotProductQueryBuilder(fixtures)),
      count: jest.fn(),
    };
    const productInteractionEventRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      })),
    };

    return {
      service: new AdminService(
        productRepository as any,
        productInteractionEventRepository as any,
        {} as any,
        {} as any,
        {} as any,
        {
          get: jest.fn(),
          set: jest.fn(),
        } as any,
      ),
      productRepository,
      productInteractionEventRepository,
    };
  };

  it('returns summary counts with active products only', async () => {
    const { service } = createService();

    const result = await service.getHotProducts(1, 20);

    expect(result.meta.total).toBe(4);
    expect(result.data.map((product) => product.id)).toEqual([
      'featured-no-qc',
      'qc-complete',
      'qc-one',
      'qc-two',
    ]);
    expect(result.summary).toEqual({
      withoutQc: 1,
      qcLessThan3: 2,
      featuredWithoutQc: 1,
      highHeatWithoutQc: 1,
    });
  });

  it('scopes summary counts to the current filtered result set', async () => {
    const { service } = createService();

    const result = await service.getHotProducts(
      1,
      20,
      undefined,
      'with',
      undefined,
      undefined,
      'lt3',
    );

    expect(result.meta.total).toBe(2);
    expect(result.data.map((product) => product.id)).toEqual([
      'qc-one',
      'qc-two',
    ]);
    expect(result.summary).toEqual({
      withoutQc: 0,
      qcLessThan3: 2,
      featuredWithoutQc: 0,
      highHeatWithoutQc: 0,
    });
  });

  it('supports combined search and heat filters in summary calculations', async () => {
    const { service } = createService();

    const result = await service.getHotProducts(
      1,
      20,
      'featured',
      undefined,
      undefined,
      undefined,
      undefined,
      0.6,
    );

    expect(result.meta.total).toBe(1);
    expect(result.data.map((product) => product.id)).toEqual([
      'featured-no-qc',
    ]);
    expect(result.summary).toEqual({
      withoutQc: 1,
      qcLessThan3: 0,
      featuredWithoutQc: 1,
      highHeatWithoutQc: 1,
    });
  });
});
