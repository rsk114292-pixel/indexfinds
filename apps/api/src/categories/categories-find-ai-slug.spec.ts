import { CategoriesService } from './categories.service';

const mockService = {
  findAllFlat: jest.fn(),
  normalizeCategoryTerm: CategoriesService.prototype['normalizeCategoryTerm'],
  singularizeToken: CategoriesService.prototype['singularizeToken'],
  buildExactVariants: CategoriesService.prototype['buildExactVariants'],
  tokenizeForFuzzy: CategoriesService.prototype['tokenizeForFuzzy'],
  logger: { warn: jest.fn() },
  findCategoryMatchByAiSlug: null as any,
  findCategoryIdByAiSlug: null as any,
};

mockService.findCategoryMatchByAiSlug =
  CategoriesService.prototype.findCategoryMatchByAiSlug.bind(mockService);
mockService.findCategoryIdByAiSlug =
  CategoriesService.prototype.findCategoryIdByAiSlug.bind(mockService);

describe('CategoriesService.findCategoryIdByAiSlug', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('精确匹配 slug 返回分类 ID', async () => {
    mockService.findAllFlat.mockResolvedValue([
      {
        id: 'cat-1',
        slug: 'outerwear',
        name: 'Outerwear',
        aliases: [],
        level: 1,
      },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('outerwear');

    expect(result).toBe('cat-1');
  });

  it('slug 大小写不敏感', async () => {
    mockService.findAllFlat.mockResolvedValue([
      {
        id: 'cat-1',
        slug: 'outerwear',
        name: 'Outerwear',
        aliases: [],
        level: 1,
      },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('Outerwear');

    expect(result).toBe('cat-1');
  });

  it('精确匹配失败后模糊匹配 name', async () => {
    mockService.findAllFlat.mockResolvedValue([
      { id: 'cat-2', slug: 'tops', name: 'Tops', aliases: [], level: 1 },
      {
        id: 'cat-3',
        slug: 'outerwear',
        name: 'Outerwear',
        aliases: [],
        level: 1,
      },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('outerwear');

    expect(result).toBe('cat-3');
  });

  it('精确匹配失败后支持 alias 命中', async () => {
    mockService.findAllFlat.mockResolvedValue([
      {
        id: 'cat-sets',
        slug: 'sets',
        name: 'Sets',
        nameEn: 'Sets',
        aliases: ['set', 'two-piece'],
        level: 1,
      },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('set');

    expect(result).toBe('cat-sets');
  });

  it('支持 perfume 分类的中英文别名命中', async () => {
    mockService.findAllFlat.mockResolvedValue([
      {
        id: 'cat-perfume',
        slug: 'perfume',
        name: '香水',
        nameEn: 'Perfume',
        aliases: ['香氛', 'fragrance', 'cologne', 'eau de parfum', 'edp'],
        level: 2,
      },
    ]);

    await expect(mockService.findCategoryIdByAiSlug('fragrance')).resolves.toBe(
      'cat-perfume',
    );
    await expect(mockService.findCategoryIdByAiSlug('香氛')).resolves.toBe(
      'cat-perfume',
    );
  });

  it('受控模糊匹配：AI 返回的 slug 比数据库 slug 多一个限定词', async () => {
    mockService.findAllFlat.mockResolvedValue([
      { id: 'cat-1', slug: 'jacket', name: 'Jacket', aliases: [], level: 2 },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('track-jacket');

    expect(result).toBe('cat-1');
  });

  it('受控模糊匹配：数据库 slug 比 AI 返回的 slug 多一个限定词', async () => {
    mockService.findAllFlat.mockResolvedValue([
      {
        id: 'cat-1',
        slug: 'track-jacket',
        name: 'Track Jacket',
        aliases: [],
        level: 2,
      },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('jacket');

    expect(result).toBe('cat-1');
  });

  it('不会再把 sets 错误匹配到 jackets 这类包含关系', async () => {
    mockService.findAllFlat.mockResolvedValue([
      { id: 'cat-1', slug: 'jackets', name: 'Jackets', aliases: [], level: 2 },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('sets');

    expect(result).toBeNull();
  });

  it('空 slug 返回 null', async () => {
    const result = await mockService.findCategoryIdByAiSlug('');
    expect(result).toBeNull();
    expect(mockService.findAllFlat).not.toHaveBeenCalled();
  });

  it('null slug 返回 null', async () => {
    const result = await mockService.findCategoryIdByAiSlug(null as any);
    expect(result).toBeNull();
  });

  it('精确和模糊都匹配不到返回 null', async () => {
    mockService.findAllFlat.mockResolvedValue([
      { id: 'cat-1', slug: 'sneaker', name: 'Sneaker', aliases: [], level: 2 },
    ]);

    const result = await mockService.findCategoryIdByAiSlug('handbag');

    expect(result).toBeNull();
  });
});
